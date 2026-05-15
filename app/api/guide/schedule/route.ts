import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type DbRecord = Record<string, unknown>

const asRecord = (value: unknown): DbRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as DbRecord : {}

const asString = (value: unknown) => typeof value === 'string' ? value : ''
const asNumber = (value: unknown) => Number(value || 0)

function parseObject(value: unknown): DbRecord {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return asRecord(parsed)
    } catch {
      return {}
    }
  }
  return asRecord(value)
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

function deriveTimingStatus(startDate: string, endDate: string) {
  const now = new Date()

  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Upcoming'

    end.setHours(23, 59, 59, 999)
    if (now > end) return 'Completed'
    if (now >= start && now <= end) return 'Ongoing'
    return 'Upcoming'
  }

  if (startDate) {
    const start = new Date(startDate)
    if (!Number.isNaN(start.getTime()) && now >= start) return 'Ongoing'
  }

  return 'Upcoming'
}

function mapScheduleRow(row: DbRecord) {
  const content = parseObject(row.content)
  const tripMeta = parseObject(row.trip_metadata)
  const travelDates = parseObject(tripMeta.travel_dates)

  const days = content.trip_days || content.duration_days || tripMeta.trip_days || tripMeta.duration_days || null
  const startDate = firstString(content.start_date, tripMeta.travel_date_start, tripMeta.start_date, travelDates.start)
  const endDate = firstString(content.end_date, tripMeta.travel_date_end, tripMeta.end_date, travelDates.end)
  const timingStatus = deriveTimingStatus(startDate, endDate)

  return {
    id: asString(row.offer_id),
    price: asNumber(row.proposed_price),
    acceptedAt: asString(row.accepted_at),
    guideId: asString(row.guide_id),
    listingId: asString(row.listing_id),
    title: asString(row.title) || 'Trip',
    city: asString(row.city) || 'Unknown Location',
    country: asString(row.country),
    startDate,
    endDate,
    days: days ? `${String(days)} Days` : '',
    pax: String(content.group_size || content.pax || tripMeta.group_size || tripMeta.pax || '1 pax'),
    timingStatus,
  }
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.user_metadata?.role !== 'guide' && user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Only guides can access schedule data' }, { status: 403 })
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
        SELECT
          mo.id AS offer_id,
          mo.proposed_price,
          mo.created_at AS accepted_at,
          mo.guide_id,
          ml.id AS listing_id,
          d.city,
          d.country,
          i.title,
          i.content,
          i.trip_metadata,
          t.status AS transaction_status
        FROM public.tour_guides tg
        JOIN public.marketplace_offers mo
          ON mo.guide_id = tg.id
        JOIN public.marketplace_listings ml
          ON ml.id = mo.listing_id
        JOIN public.destinations d
          ON d.id = ml.destination_id
        LEFT JOIN public.itineraries i
          ON i.id = ml.itinerary_id
        LEFT JOIN public.transactions t
          ON t.offer_id = mo.id
        WHERE tg.user_id = $1
          AND mo.status <> 'withdrawn'
          AND (
            mo.status = 'accepted'
            OR mo.payment_enabled = true
            OR t.status = 'completed'
          )
        ORDER BY
          COALESCE(
            i.content->>'start_date',
            i.trip_metadata->>'travel_date_start',
            i.trip_metadata->>'start_date',
            i.trip_metadata->'travel_dates'->>'start'
          ) ASC NULLS LAST,
          mo.created_at DESC
      `,
      [user.id]
    )

    const records = result.rows.map((row) => mapScheduleRow(row))

    return NextResponse.json({ records })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load schedule' },
      { status: 500 }
    )
  } finally {
    await client.end().catch(() => {})
  }
}
