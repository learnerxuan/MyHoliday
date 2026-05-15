import { NextResponse } from 'next/server'
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

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.user_metadata?.role !== 'guide' && user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Only guides can access schedule data' }, { status: 403 })
  }

  try {
    // Get guide profile
    const { data: guide, error: guideError } = await supabase
      .from('tour_guides')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (guideError || !guide) {
      return NextResponse.json({ error: 'Guide profile not found' }, { status: 404 })
    }

    // Get offers where marketplace_listing is 'confirmed'
    const { data: offersData, error: offersError } = await supabase
      .from('marketplace_offers')
      .select(`
        id,
        proposed_price,
        created_at,
        guide_id,
        status,
        marketplace_listings!inner (
          id,
          status,
          itinerary_id,
          destinations (
            city,
            country
          )
        )
      `)
      .eq('guide_id', guide.id)
      .eq('marketplace_listings.status', 'confirmed')
      .neq('status', 'withdrawn')

    if (offersError) {
      return NextResponse.json({ error: offersError.message }, { status: 500 })
    }

    if (!offersData || offersData.length === 0) {
      return NextResponse.json({ records: [] })
    }

    // Collect itinerary IDs
    const itineraryIds = offersData
      .map(o => {
        const listing = Array.isArray(o.marketplace_listings) ? o.marketplace_listings[0] : o.marketplace_listings
        return listing?.itinerary_id
      })
      .filter(Boolean) as string[]

    // Fetch itineraries separately to avoid schema cache issues
    let itinerariesMap: Record<string, { id: string; title: string; content: unknown; trip_metadata: unknown }> = {}

    if (itineraryIds.length > 0) {
      const { data: itinerariesData } = await supabase
        .from('itineraries')
        .select('id, title, content, trip_metadata')
        .in('id', itineraryIds)

      if (itinerariesData) {
        itinerariesMap = itinerariesData.reduce((acc, curr) => {
          acc[curr.id] = curr
          return acc
        }, {} as typeof itinerariesMap)
      }
    }

    // Process and map records
    const records = offersData
      .map(offer => {
        const listing = Array.isArray(offer.marketplace_listings) ? offer.marketplace_listings[0] : offer.marketplace_listings
        if (!listing) return null

        const destination = Array.isArray(listing.destinations) ? listing.destinations[0] : listing.destinations
        const itinerary = itinerariesMap[listing.itinerary_id]

        const content = parseObject(itinerary?.content)
        const tripMeta = parseObject(itinerary?.trip_metadata)
        const travelDates = parseObject(tripMeta.travel_dates)

        const days = content.trip_days || content.duration_days || tripMeta.trip_days || tripMeta.duration_days || null
        const startDate = firstString(content.start_date, tripMeta.travel_date_start, tripMeta.start_date, travelDates.start)
        const endDate = firstString(content.end_date, tripMeta.travel_date_end, tripMeta.end_date, travelDates.end)
        const timingStatus = deriveTimingStatus(startDate, endDate)

        // Skip completed tours
        if (timingStatus === 'Completed') return null

        return {
          id: offer.id,
          price: asNumber(offer.proposed_price),
          acceptedAt: asString(offer.created_at),
          guideId: asString(offer.guide_id),
          listingId: asString(listing.id),
          title: asString(itinerary?.title) || 'Trip',
          city: asString(destination?.city) || 'Unknown Location',
          country: asString(destination?.country),
          startDate,
          endDate,
          days: days ? `${String(days)} Days` : '',
          pax: String(content.group_size || content.pax || tripMeta.group_size || tripMeta.pax || '1 pax'),
          timingStatus,
        }
      })
      .filter(Boolean)

    // Sort: Ongoing first, then Upcoming by start date
    records.sort((a, b) => {
      if (!a || !b) return 0
      if (a.timingStatus === 'Ongoing' && b.timingStatus !== 'Ongoing') return -1
      if (a.timingStatus !== 'Ongoing' && b.timingStatus === 'Ongoing') return 1
      if (a.startDate && b.startDate) {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      }
      return new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime()
    })

    return NextResponse.json({ records })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load schedule' },
      { status: 500 }
    )
  }
}
