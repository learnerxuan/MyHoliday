'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
    // Fetch user session and role first
    const fetchSessionAndData = async () => {
      try {
        const profileRes = await fetch('/api/profile')
        if (!profileRes.ok) {
          router.push('/auth/login')
          return
        }
        
        const userData = await profileRes.json()
        setUser(userData)

        if (userData.role === 'traveler') {
          // Fetch traveller's own listings
          const listingsRes = await fetch('/api/marketplace/listings')
          const listingsData = await listingsRes.json()
          setListings(listingsData)
        } else if (userData.role === 'guide') {
          if (userData.verification_status === 'approved') {
            setSelectedCityId(userData.city_id)
            
            // Fetch cities for the filter dropdown
            const destRes = await fetch('/api/destinations')
            const destData = await destRes.json()
            setDestinations(destData)

            // Fetch listings scoped to guide's city
            const listingsRes = await fetch(`/api/marketplace/listings?destination_id=${userData.city_id}`)
            const listingsData = await listingsRes.json()
            
            // Guides only see 'open' status listings on the board
            setListings(listingsData.filter(item => item.status === 'open'))
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

  // Handle guide changing the city filter
  const handleCityFilterChange = async (e) => {
    const newCityId = e.target.value
    setSelectedCityId(newCityId)
    setLoading(true)
    
    try {
      const res = await fetch(`/api/marketplace/listings?destination_id=${newCityId}`)
      const data = await res.json()
      setListings(data.filter(item => item.status === 'open'))
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