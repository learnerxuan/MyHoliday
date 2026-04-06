'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import ListingCard from '@/components/ui/ListingCard'
import Select from '@/components/ui/Select'

// Status derivation strictly for frontend display
function getDisplayStatus(dbStatus, offerCount) {
  if (dbStatus === 'open' && offerCount === 0) return 'awaiting'
  if (dbStatus === 'open' && offerCount > 0) return 'has_offers'
  return dbStatus // 'negotiating', 'confirmed', 'closed' pass through
}

export default function MarketplacePage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [listings, setListings] = useState([])
  const [error, setError] = useState('')

  // Guide specific state
  const [destinations, setDestinations] = useState([])
  const [selectedCityId, setSelectedCityId] = useState('')

  useEffect(() => {
    const fetchSessionAndData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.user) {
          router.push('/auth/login')
          return
        }
        
        const currentUser = session.user
        const role = currentUser.user_metadata?.role || 'traveller'
        const baseUserData = { id: currentUser.id, email: currentUser.email, role }

        if (role === 'traveller') {
          setUser(baseUserData)
          
          const { data: listingsData } = await supabase
            .from('marketplace_listings')
            .select('*, destinations(city)')
            .eq('traveller_id', currentUser.id)
            
          const formattedListings = (listingsData || []).map(l => ({
            ...l,
            city_name: l.destinations?.city || 'Unknown'
          }))
          setListings(formattedListings)
        } else if (role === 'guide') {
          const { data: guideData } = await supabase
            .from('tour_guides')
            .select('verification_status, destinations(id, city)')
            .eq('user_id', currentUser.id)
            .single()
            
          const city_id = guideData?.destinations?.id || ''
          setUser({
            ...baseUserData,
            verification_status: guideData?.verification_status,
            city_id
          })
          
          if (guideData?.verification_status === 'approved') {
            setSelectedCityId(city_id)
            
            const { data: destData } = await supabase.from('destinations').select('*')
            setDestinations(destData || [])

            const { data: listingsData } = await supabase
              .from('marketplace_listings')
              .select('*, destinations(city)')
              .eq('destination_id', city_id)
              
            const formattedListings = (listingsData || []).map(l => ({
              ...l,
              city_name: l.destinations?.city || 'Unknown'
            }))
            
            setListings(formattedListings.filter(item => item.status === 'open'))
          }
        }
      } catch (err) {
        setError('Failed to load marketplace data.')
      } finally {
        setLoading(false)
      }
    }

    fetchSessionAndData()
  }, [router])

  const handleCityFilterChange = async (e) => {
    const newCityId = e.target.value
    setSelectedCityId(newCityId)
    setLoading(true)
    
    try {
      const { data: listingsData } = await supabase
        .from('marketplace_listings')
        .select('*, destinations(city)')
        .eq('destination_id', newCityId)
        
      const formattedListings = (listingsData || []).map(l => ({
        ...l,
        city_name: l.destinations?.city || 'Unknown'
      }))
      setListings(formattedListings.filter(item => item.status === 'open'))
    } catch (err) {
      setError('Failed to filter listings.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="py-20 max-w-5xl mx-auto px-12 flex justify-center">
        <Spinner />
      </section>
    )
  }

  // --- GUIDE VIEW ---
  if (user?.role === 'guide') {
    if (user.verification_status !== 'approved') {
      return (
        <section className="py-20 max-w-5xl mx-auto px-12 text-center">
          <PageHeader tag="Marketplace" title="Browse Listings" />
          <p className="text-secondary mt-8">Your account is pending verification.</p>
        </section>
      )
    }

    return (
      <section className="py-20 max-w-5xl mx-auto px-12">
        <div className="flex justify-between items-end mb-10">
          <PageHeader tag="Marketplace" title="Browse Listings" />
          <div className="w-64">
            <Select 
              value={selectedCityId} 
              onChange={handleCityFilterChange}
              options={destinations.map(d => ({ label: d.city, value: d.id }))}
            />
          </div>
        </div>

        {error && <p className="text-error mb-4">{error}</p>}

        {listings.length === 0 ? (
          <div className="text-center py-12 bg-warmwhite border border-border rounded-xl">
            <p className="text-secondary">No open listings in your city right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => {
              const displayStatus = getDisplayStatus(listing.status, listing.offer_count)
              return (
                <div key={listing.id} onClick={() => router.push(`/marketplace/${listing.id}`)}>
                  <ListingCard 
                    city={listing.city_name} 
                    desiredBudget={listing.desired_budget} 
                    displayStatus={displayStatus}
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>
    )
  }

  // --- TRAVELLER VIEW ---
  return (
    <section className="py-20 max-w-5xl mx-auto px-12">
      <div className="flex justify-between items-end mb-10">
        <PageHeader tag="Marketplace" title="Your Listings" />
        <Button 
          variant="primary" 
          onClick={() => router.push('/marketplace/new')}
        >
          Post New Itinerary
        </Button>
      </div>

      {error && <p className="text-error mb-4">{error}</p>}

      {listings.length === 0 ? (
        <div className="text-center py-12 bg-warmwhite border border-border rounded-xl">
          <p className="text-secondary mb-6">You haven't posted any listings yet.</p>
          <Button 
            variant="primary" 
            onClick={() => router.push('/marketplace/new')}
          >
            Post Your First Itinerary
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => {
            const displayStatus = getDisplayStatus(listing.status, listing.offer_count)
            return (
              <div key={listing.id} onClick={() => router.push(`/marketplace/${listing.id}`)}>
                <ListingCard 
                  city={listing.city_name} 
                  desiredBudget={listing.desired_budget} 
                  displayStatus={displayStatus}
                />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}