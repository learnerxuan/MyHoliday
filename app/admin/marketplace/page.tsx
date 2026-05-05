import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ListingList from './ListingList'

export default async function AdminMarketplacePage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    redirect('/')
  }

  const { data: listingsData, error } = await supabase
    .from('marketplace_listings')
    .select(`
      id,
      user_id,
      itinerary_id,
      desired_budget,
      status,
      is_suspended,
      created_at,
      destinations ( city, country )
    `)
    .order('created_at', { ascending: false })

  let listings = listingsData || []

  if (listings.length > 0) {
    // Fetch Traveller Profiles
    const userIds = [...new Set(listings.map((l: any) => l.user_id).filter(Boolean))]
    const { data: profiles } = await supabase
      .from('traveller_profiles')
      .select('user_id, full_name')
      .in('user_id', userIds)

    const profileMap = Object.fromEntries(
      (profiles || []).map(p => [p.user_id, p.full_name])
    )

    // Fetch Itineraries
    const itineraryIds = [...new Set(listings.map((l: any) => l.itinerary_id).filter(Boolean))]
    const { data: itineraries } = await supabase
      .from('itineraries')
      .select('id, title')
      .in('id', itineraryIds)
      
    const itineraryMap = Object.fromEntries(
      (itineraries || []).map(i => [i.id, i.title])
    )

    listings = listings.map((l: any) => ({
      ...l,
      traveller_profiles: { full_name: profileMap[l.user_id] || 'Unknown' },
      itineraries: { title: itineraryMap[l.itinerary_id] || 'Untitled' }
    }))
  }

  if (error) {
    console.error('Error fetching marketplace listings:', error)
  }

  return (
    <main className="min-h-screen bg-warmwhite">
      <ListingList listings={listings || []} />
    </main>
  )
}
