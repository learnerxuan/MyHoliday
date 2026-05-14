import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.user_metadata?.role !== 'guide' && user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Only guides can access analytics' }, { status: 403 })
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    return NextResponse.json({ error: 'Database connection is not configured' }, { status: 500 })
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()

    const result = await client.query(
      `
        WITH guide AS (
          SELECT id
          FROM public.tour_guides
          WHERE user_id = $1
          LIMIT 1
        )
        SELECT
          COALESCE(COUNT(mo.id), 0)::int AS "offersSent",
          COALESCE(COUNT(mo.id) FILTER (WHERE mo.status = 'accepted'), 0)::int AS "offersAccepted",
          COALESCE(COUNT(t.id) FILTER (WHERE t.status = 'completed'), 0)::int AS "completedTrips",
          COALESCE(SUM(t.guide_payout) FILTER (WHERE t.status = 'completed'), 0)::float AS "totalEarnings"
        FROM guide
        LEFT JOIN public.marketplace_offers mo
          ON mo.guide_id = guide.id
          AND mo.status <> 'withdrawn'
        LEFT JOIN public.transactions t
          ON t.offer_id = mo.id
      `,
      [user.id]
    )

    return NextResponse.json(result.rows[0] || {
      offersSent: 0,
      offersAccepted: 0,
      completedTrips: 0,
      totalEarnings: 0,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load guide analytics' },
      { status: 500 }
    )
  } finally {
    await client.end().catch(() => {})
  }
}
