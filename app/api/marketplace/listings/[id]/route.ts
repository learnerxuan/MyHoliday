import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(`
      *,
      destinations(city)
    `)
    .eq('id', (await params).id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  const { data: userData } = await supabase.auth.getUser()
  const role = userData?.user?.user_metadata?.role || 'traveller'

  if (role === 'traveller' && data.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden. You are not the owner of this listing.' }, { status: 403 })
  }

  const { data: itinerary, error: itineraryError } = await supabase
    .from('itineraries')
    .select('title, content, trip_metadata')
    .eq('id', data.itinerary_id)
    .single()

  if (itineraryError && itineraryError.code !== 'PGRST116') {
    return NextResponse.json({ error: itineraryError.message }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('traveller_profiles')
    .select('full_name')
    .eq('user_id', data.user_id)
    .single()

  const formattedData = {
    ...data,
    city_name: data.destinations?.city || 'Unknown',
    itinerary_title: itinerary?.title || 'Untitled Itinerary',
    itinerary_content: itinerary?.content || null,
    trip_metadata: itinerary?.trip_metadata || null,
    traveller_name: profile?.full_name || 'Anonymous Traveller'
  }

  return NextResponse.json(formattedData)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { status } = body

  const allowedStatuses = ['open', 'negotiating', 'confirmed', 'closed']

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data: listing, error: listingError } = await supabase
    .from('marketplace_listings')
    .select('id, user_id')
    .eq('id', (await params).id)
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
    .eq('id', (await params).id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}