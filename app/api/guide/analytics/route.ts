import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type DbRecord = Record<string, unknown>

const asRecords = (value: unknown): DbRecord[] => Array.isArray(value) ? value as DbRecord[] : []
const asString = (value: unknown) => typeof value === 'string' ? value : ''
const asNumber = (value: unknown) => Number(value || 0)

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.user_metadata?.role !== 'guide' && user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Only guides can access analytics' }, { status: 403 })
  }

  try {
    const emptyAnalytics = {
      offersSent: 0,
      offersAccepted: 0,
      completedTrips: 0,
      totalEarnings: 0,
    }

    const { data: guide, error: guideError } = await supabase
      .from('tour_guides')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (guideError) {
      return NextResponse.json({ error: guideError.message }, { status: 400 })
    }

    if (!guide?.id) {
      return NextResponse.json(emptyAnalytics)
    }

    const { data: offersData, error: offersError } = await supabase
      .from('marketplace_offers')
      .select('id, status')
      .eq('guide_id', guide.id)
      .neq('status', 'withdrawn')

    if (offersError) {
      return NextResponse.json({ error: offersError.message }, { status: 400 })
    }

    const offers = asRecords(offersData)
    const offerIds = offers.map((offer) => asString(offer.id)).filter(Boolean)

    if (!offerIds.length) {
      return NextResponse.json(emptyAnalytics)
    }

    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, offer_id, status, guide_payout')
      .eq('status', 'completed')
      .in('offer_id', offerIds)

    if (transactionsError) {
      return NextResponse.json({ error: transactionsError.message }, { status: 400 })
    }

    const completedTransactions = asRecords(transactionsData)

    return NextResponse.json({
      offersSent: offers.length,
      offersAccepted: offers.filter((offer) => asString(offer.status) === 'accepted').length,
      completedTrips: completedTransactions.length,
      totalEarnings: completedTransactions.reduce((total, transaction) => total + asNumber(transaction.guide_payout), 0),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load guide analytics' },
      { status: 500 }
    )
  }
}
