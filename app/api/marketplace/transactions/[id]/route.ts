import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// PATCH /api/marketplace/transactions/[id]
// Traveller calls this to complete the mock payment
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const transactionId = (await params).id
  const body = await request.json()
  const { status } = body

  if (status !== 'completed') {
    return NextResponse.json({ error: 'Only "completed" status transitions are allowed here' }, { status: 400 })
  }

  // Fetch the transaction to verify the caller is the payer
  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select('id, offer_id, payer_id, status')
    .eq('id', transactionId)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  if (existing.payer_id !== user.id) {
    return NextResponse.json({ error: 'Only the payer can complete this transaction' }, { status: 403 })
  }

  if (existing.status !== 'pending') {
    return NextResponse.json({ error: 'Transaction is not in a payable state' }, { status: 409 })
  }

  // Complete the transaction
  const { data: updated, error: updateError } = await supabase
    .from('transactions')
    .update({ status: 'completed' })
    .eq('id', transactionId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  // Post a system message to notify guide of payment
  await supabase
    .from('marketplace_messages')
    .insert([{
      offer_id: existing.offer_id,
      sender_id: user.id,
      sender_type: 'traveler',
      content: `__PAYMENT_COMPLETED__:${updated.total_amount}`
    }])

  return NextResponse.json(updated)
}
