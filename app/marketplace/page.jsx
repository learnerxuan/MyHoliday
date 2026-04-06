'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
import ListingCard from '@/components/ui/ListingCard'

export default function MarketplacePage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [listings, setListings] = useState([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') 

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
        setUser({ id: currentUser.id, email: currentUser.email, role })

        // Fetch all listings with rich embedded nested data
        const { data: listingsData } = await supabase
          .from('marketplace_listings')
          .select(`
            id, user_id, desired_budget, status, created_at,
            destinations ( city, country ),
            itineraries ( content ),
            marketplace_offers ( id, status, guide_id )
          `)
          .order('created_at', { ascending: false })
          
        const formattedListings = (listingsData || []).map(l => {
          let parsedMeta = {}
          try { 
            // the JSONB usually has stringified JSON internally or is direct
            parsedMeta = typeof l.itineraries?.content === 'string' 
              ? JSON.parse(l.itineraries.content) 
              : (l.itineraries?.content || {})
          } catch(e) {}
          
          const days = parsedMeta.trip_days || 5
          const pax = parsedMeta.group_size ? parseInt(parsedMeta.group_size) : 2
          
          // Fallback to beautiful mock tags mimicking wireframe if empty
          let tags = parsedMeta.preferred_styles || []
          if (!tags || tags.length === 0) {
            tags = ['Culture', 'Budget']
          } else if (tags.length > 2) {
            tags = tags.slice(0, 2)
          }

          const offers = l.marketplace_offers || []
          let displayStatus = l.status
          if (l.status === 'open') {
            displayStatus = offers.length > 0 ? 'has_offers' : 'awaiting'
          }

          // Mock finding a top guide for UI demonstration purposes
          // In real prod, we would fetch tour_guides(full_name) via relation
          let guideInfo = null
          if (offers.length > 0) {
            guideInfo = {
              name: 'Ahmad R.',
              location: l.destinations?.city || 'City'
            }
          }

          return {
            ...l,
            city_name: l.destinations?.city || 'Unknown',
            country_name: l.destinations?.country || 'Destination',
            days,
            pax,
            tags,
            displayStatus,
            offerCount: offers.length,
            guideInfo,
            offers
          }
        })

        setListings(formattedListings)
      } catch (err) {
        setError('Failed to load marketplace data.')
      } finally {
        setLoading(false)
      }
    }

    fetchSessionAndData()
  }, [router])

  // Process filter locally
  const filteredListings = listings.filter(item => {
    if (filter === 'all') return true
    if (filter === 'open') return item.status === 'open'
    if (filter === 'has_offers') return item.displayStatus === 'has_offers' || item.offerCount > 0
    if (filter === 'my') {
      if (user?.role === 'guide') {
        return item.offers.some(o => o.guide_id === user.id)
      } else {
        return item.user_id === user.id
      }
    }
    return true
  })

  if (loading) {
    return (
      <section className="py-20 max-w-5xl mx-auto px-12 flex justify-center">
        <Spinner />
      </section>
    )
  }

  return (
    <section className="py-20 max-w-[1280px] mx-auto px-8 lg:px-12 bg-white">
      
      {/* Hero Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
        <div className="flex flex-col justify-center">
          <p className="text-[#d48c44] font-extrabold tracking-[0.2em] text-xs uppercase mb-4 font-body">Marketplace</p>
          <h1 className="font-display font-extrabold text-[56px] text-charcoal leading-tight mb-5 tracking-tight">
            Find a Tour Guide
          </h1>
          <p className="text-secondary/90 text-[17px] mb-10 max-w-md leading-relaxed font-body">
            Post your saved itinerary. Verified local guides browse and send their best offer. Negotiate and confirm your booking.
          </p>
          <div>
            <button 
              onClick={() => router.push('/marketplace/new')} 
              className="bg-[#1A1A1A] hover:bg-black text-white text-[15px] px-8 py-3.5 rounded-[10px] transition-colors font-bold tracking-wide shadow-lg shadow-black/10"
            >
              Post My Itinerary
            </button>
          </div>
        </div>

        {/* Right Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="bg-[#FAF9F7] p-6 rounded-2xl border border-border/60 flex flex-col justify-end aspect-[4/2.5]">
            <div className="w-10 h-10 shadow-sm bg-white rounded-lg flex items-center justify-center text-xl mb-auto">📋</div>
            <p className="font-medium text-[#7A7367] text-[13.5px] leading-snug mt-4">Post itinerary as listing</p>
          </div>
          <div className="bg-[#FAF9F7] p-6 rounded-2xl border border-border/60 flex flex-col justify-end aspect-[4/2.5]">
            <div className="w-10 h-10 shadow-sm bg-white rounded-lg flex items-center justify-center text-xl mb-auto">💬</div>
            <p className="font-medium text-[#7A7367] text-[13.5px] leading-snug mt-4">Guides send price offers</p>
          </div>
          <div className="bg-[#FAF9F7] p-6 rounded-2xl border border-border/60 flex flex-col justify-end aspect-[4/2.5]">
            <div className="w-10 h-10 shadow-sm bg-white rounded-lg flex items-center justify-center text-[22px] mb-auto">🤝</div>
            <p className="font-medium text-[#7A7367] text-[13.5px] leading-snug mt-4">Negotiate via chat</p>
          </div>
          <div className="bg-[#FAF9F7] p-6 rounded-2xl border border-border/60 flex flex-col justify-end aspect-[4/2.5]">
            <div className="w-10 h-10 shadow-sm bg-white rounded-lg flex items-center justify-center text-[20px] mb-auto">🟩</div>
            <p className="font-medium text-[#7A7367] text-[13.5px] leading-snug mt-4">Confirm and book</p>
          </div>
        </div>
      </div>

      {error && <p className="text-error mb-4">{error}</p>}

      {/* Filter Bar */}
      <div className="flex gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'open', 'has_offers', 'my'].map((f) => {
          const labels = {
            'all': 'All Listings',
            'open': 'Open',
            'has_offers': 'Has Offers',
            'my': 'My Listings'
          }
          const isActive = filter === f
          return (
            <button 
              key={f}
              onClick={() => setFilter(f)} 
              className={`px-6 py-[9px] rounded-lg border font-bold text-[13px] tracking-wide transition-all whitespace-nowrap ${
                isActive 
                ? 'bg-[#FAF9F7] border-charcoal text-charcoal' 
                : 'bg-white border-border text-secondary/60 hover:bg-[#FAF9F7]'
              }`}
            >
              {labels[f]}
            </button>
          )
        })}
      </div>

      {/* Listing Grid */}
      {filteredListings.length === 0 ? (
        <div className="text-center py-24 bg-[#FAF9F7] border border-border/60 rounded-2xl">
          <p className="text-secondary/60 font-medium">No empty listings found for this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <div key={listing.id} onClick={() => router.push(`/marketplace/${listing.id}`)}>
              <ListingCard 
                city={listing.city_name} 
                country={listing.country_name}
                budget={listing.desired_budget} 
                displayStatus={listing.displayStatus}
                days={listing.days}
                pax={listing.pax}
                tags={listing.tags}
                guideInfo={listing.guideInfo}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}