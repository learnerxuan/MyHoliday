import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Client } from 'pg'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const listingId = (await params).id

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(`
      *,
      destinations(city,country)
    `)
    .eq('id', listingId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  const { data: userData } = await supabase.auth.getUser()
  const role = userData?.user?.user_metadata?.role || 'traveller'

  if ((role === 'traveller' || role === 'traveler') && data.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden. You are not the owner of this listing.' }, { status: 403 })
  }

  if (role === 'guide' && (data.status === 'closed' || data.is_suspended)) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  const { data: itinerary, error: itineraryError } = await supabase
    .from('itineraries')
    .select('title, content, trip_metadata')
    .eq('id', data.itinerary_id)
    .single()

  if (itineraryError && itineraryError.code !== 'PGRST116') {
    return NextResponse.json({ error: itineraryError.message }, { status: 400 })
  }

  let travellerName = 'Anonymous Traveller'
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()
    const profileResult = await client.query(
      'SELECT full_name FROM public.traveller_profiles WHERE user_id = $1::uuid LIMIT 1',
      [data.user_id]
    )
    await client.end()
    if (profileResult.rows?.[0]?.full_name) {
      travellerName = profileResult.rows[0].full_name
    }
  } catch {
    travellerName = 'Anonymous Traveller'
  }

  const formattedData = {
    ...data,
    city_name: data.destinations?.city || 'Unknown',
    itinerary_title: itinerary?.title || 'Untitled Itinerary',
    itinerary_content: itinerary?.content || null,
    trip_metadata: itinerary?.trip_metadata || null,
    traveller_name: travellerName
  }

  return NextResponse.json(formattedData)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const listingId = (await params).id
  const body = await request.json()
  const { status } = body

  const allowedStatuses = ['open', 'negotiating', 'confirmed', 'closed']

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data: listing, error: listingError } = await supabase
    .from('marketplace_listings')
    .select('id, user_id')
    .eq('id', listingId)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (listing.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('marketplace_listings')
    .update({ status })
    .select(`
      *,
      destinations(city,country)
    `)
    .eq('id', listingId)
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const listingId = (await params).id

  const { data: listing, error: listingError } = await supabase
    .from('marketplace_listings')
    .select('id, user_id')
    .eq('id', listingId)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (listing.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: deleteError } = await supabase
    .from('marketplace_listings')
    .update({ status: 'closed' })
    .eq('id', listingId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
