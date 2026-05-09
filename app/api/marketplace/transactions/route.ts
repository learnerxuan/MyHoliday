import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { calculateMarketplaceAmounts } from '@/lib/marketplace/payment'

// GET /api/marketplace/transactions?offer_id=xxx
// Returns the transaction associated with a specific offer (for traveller payment panel)
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const offerId = searchParams.get('offer_id')

  if (!offerId) {
    return NextResponse.json({ error: 'offer_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('offer_id', offerId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data || null)
}

// POST /api/marketplace/transactions
// Guide calls this to enable payment — creates a pending transaction and sets payment_enabled on the offer
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only guides can enable payment
  if (user.user_metadata?.role !== 'guide') {
    return NextResponse.json({ error: 'Only tour guides can enable payment' }, { status: 403 })
  }

  const body = await request.json()
  const { offer_id, payer_id, payee_id, total_amount } = body

  if (!offer_id || !payer_id || !payee_id || !total_amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const totalNum = parseFloat(total_amount)
  const { serviceCharge, guidePayout } = calculateMarketplaceAmounts(totalNum)

  // Check no transaction already exists for this offer
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('offer_id', offer_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Transaction already exists for this offer' }, { status: 409 })
  }

  // Create the transaction
  const paymentReference = crypto.randomUUID()
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert([{
      offer_id,
      payer_id,
      payee_id,
      total_amount: totalNum,
      service_charge: serviceCharge,
      guide_payout: guidePayout,
      status: 'pending',
      payment_reference: paymentReference
    }])
    .select()
    .single()

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 400 })
  }

  // Set payment_enabled = true on the offer
  const { error: offerError } = await supabase
    .from('marketplace_offers')
    .update({ payment_enabled: true })
    .eq('id', offer_id)

  if (offerError) {
    console.error('Failed to set payment_enabled on offer:', offerError)
  }

  // Post a system message to notify traveller
  await supabase
    .from('marketplace_messages')
    .insert([{
      offer_id,
      sender_id: user.id,
      sender_type: 'guide',
      content: `__PAYMENT_ENABLED__:${totalNum}`
    }])

  return NextResponse.json(transaction)
}
