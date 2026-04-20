'use client'

import { useState, useEffect } from 'react'
import { useAppRouter as useRouter } from '@/components/providers/PageTransitionProvider'
import { supabase } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
import ListingCard from '@/components/ui/ListingCard'

const formatMYR = (amount) => `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const GuideListingCard = ({ title, travellerName, dates, budget, tags, status, offerAmount, onClick }) => {
  // If listing is open and no offer is submitted by me, I can submit an offer
  const isActionable = status === "open" && !offerAmount
  return (
    <div className="bg-white border border-border rounded-xl p-5 cursor-pointer hover:border-charcoal transition-all hover:shadow-md" onClick={onClick}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-[16px] font-bold text-charcoal">{title}</div>
          <div className="text-[11.5px] text-secondary mt-1 tracking-wide">{dates} · {travellerName || 'Anonymous Traveller'}</div>
        </div>
        <div className="text-right">
          <div className="font-display font-extrabold text-[18px] text-amber">{budget}</div>
          <div className="text-[10px] text-secondary/70 uppercase tracking-widest mt-0.5">traveller budget</div>
        </div>
      </div>
      <div className="flex gap-1.5 mb-4 flex-wrap items-center">
        {tags.map(t => <span key={t} className="text-[10px] font-bold px-2 py-1 bg-subtle text-amber rounded">{t}</span>)}
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded ${status === 'open' ? 'bg-[#F0EDE9] text-[#888]' : status === 'negotiating' ? 'bg-[#EFF6FF] text-[#185FA5]' : 'bg-[#ECFDF5] text-[#059669]'}`}>
          {status === 'open' ? 'Open for Offers' : status === 'negotiating' ? 'In Negotiation' : 'Confirmed'}
        </span>
      </div>
      <div className="flex justify-between items-center pt-3.5 border-t border-[#F0EDE9]">
        {offerAmount ? (
          <div><span className="text-[10px] text-[#AAA] tracking-wide uppercase font-semibold">Your Offer:</span> <span className="text-[14px] font-extrabold font-display text-amber ml-1.5">{offerAmount}</span></div>
        ) : (
          <div className="text-[12px] text-secondary/80">0 offers submitted</div>
        )}
        {isActionable ? (
          <button className="bg-amber text-white px-3.5 py-[7px] text-[11px] rounded-lg font-bold hover:bg-amberdark transition-colors">Submit Offer</button>
        ) : status === 'negotiating' ? (
           <button className="bg-charcoal text-white px-3.5 py-[7px] text-[11px] rounded-lg font-bold hover:bg-black transition-colors">View Chat</button>
        ) : (
           <button className="bg-transparent text-charcoal border border-border px-3.5 py-[7px] text-[11px] rounded-lg font-bold hover:border-charcoal transition-colors">View Details</button>
        )}
      </div>
    </div>
  )
}

export default function MarketplacePage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [guideProfile, setGuideProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all' for traveller, 'requests' initialized for guide

  useEffect(() => {
    const getAuthUserWithRetry = async (retries = 3) => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        return user
      } catch (err) {
        if (retries > 0 && (err.name === 'AbortError' || err.name === 'LockAcquireTimeoutError' || (err.message && err.message.includes('Lock')))) {
          await new Promise(resolve => setTimeout(resolve, 300))
          return getAuthUserWithRetry(retries - 1)
        }
        throw err
      }
    }

    const fetchSessionAndData = async () => {
      try {
        const currentUser = await getAuthUserWithRetry()

        if (!currentUser) {
          router.push('/auth/login')
          return
        }

        const role = currentUser.user_metadata?.role || 'traveler'

        let gProfile = null

        if (role === 'guide') {
          const { data: guideData, error: guideError } = await supabase
            .from('tour_guides')
            .select('id, verification_status, city_id, destinations(city, country)')
            .eq('user_id', currentUser.id)
            .single()

          if (guideError && guideError.code !== 'PGRST116') {
            throw guideError
          }

          gProfile = guideData
          setGuideProfile(guideData)
          setFilter('requests')
        }

        setUser({
          id: currentUser.id,
          email: currentUser.email,
          role
        })

        let listingsQuery = supabase
          .from('marketplace_listings')
          .select(`
            id,
            user_id,
            itinerary_id,
            destination_id,
            desired_budget,
            status,
            created_at,
            destinations ( city, country ),
            marketplace_offers ( id, status, guide_id, proposed_price )
          `)
          .order('created_at', { ascending: false })

        if (role === 'guide') {
          if (gProfile?.verification_status === 'approved' && gProfile?.city_id) {
            listingsQuery = listingsQuery.eq('destination_id', gProfile.city_id)
          } else {
            listingsQuery = listingsQuery.is('id', null)
          }
        } else {
          listingsQuery = listingsQuery.eq('user_id', currentUser.id)
        }

        const { data: listingsData, error: listingsError } = await listingsQuery

        if (listingsError) {
          throw new Error(listingsError.message || JSON.stringify(listingsError))
        }

        const itineraryIds = [
          ...new Set((listingsData || []).map(l => l.itinerary_id).filter(Boolean))
        ]

        let itineraryMap = {}

        if (itineraryIds.length > 0) {
          const { data: itinerariesData, error: itinerariesError } = await supabase
            .from('itineraries')
            .select('id, title, content, trip_metadata')
            .in('id', itineraryIds)

          if (itinerariesError) {
            throw new Error(itinerariesError.message || JSON.stringify(itinerariesError))
          }

          itineraryMap = Object.fromEntries(
            (itinerariesData || []).map(item => [item.id, item])
          )
        }

        const formattedListings = (listingsData || []).map((l) => {
          const itinerary = itineraryMap[l.itinerary_id]
          const rawContent = itinerary?.content

          let parsedMeta = {}
          try {
            parsedMeta =
              typeof rawContent === 'string'
                ? JSON.parse(rawContent)
                : (rawContent || {})
          } catch (e) {
            parsedMeta = {}
          }

          const tripMeta = itinerary?.trip_metadata || {}
          const days =
            parsedMeta.trip_days ||
            tripMeta.trip_days ||
            parsedMeta.duration_days ||
            5

          const pax =
            parsedMeta.group_size
              ? parseInt(parsedMeta.group_size)
              : tripMeta.group_size || 2

          let tags = parsedMeta.preferred_styles || tripMeta.preferred_styles || []
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

          let guideInfo = null
          if (offers.length > 0) {
            guideInfo = {
              name: 'Ahmad R.',
              location: l.destinations?.city || 'City'
            }
          }

          const startDate = parsedMeta.start_date || tripMeta.start_date || tripMeta.travel_dates?.start
          const endDate = parsedMeta.end_date || tripMeta.end_date || tripMeta.travel_dates?.end

          let formattedDateRange = `${days} Days`
          if (startDate && endDate) {
            try {
              const start = new Date(startDate)
              const end = new Date(endDate)
              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const sMonth = start.toLocaleDateString('en-US', { month: 'short' })
                const eMonth = end.toLocaleDateString('en-US', { month: 'short' })
                if (sMonth === eMonth && start.getFullYear() === end.getFullYear()) {
                  formattedDateRange = `${start.getDate()} - ${end.getDate()} ${sMonth} ${start.getFullYear()}`
                } else if (start.getFullYear() === end.getFullYear()) {
                  formattedDateRange = `${start.getDate()} ${sMonth} - ${end.getDate()} ${eMonth} ${start.getFullYear()}`
                } else {
                  formattedDateRange = `${start.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
                }
              }
            } catch (err) {}
          }

          return {
            ...l,
            title: itinerary?.title || 'Untitled Itinerary',
            city_name: l.destinations?.city || 'Unknown',
            country_name: l.destinations?.country || 'Destination',
            dates: formattedDateRange,
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
        const errorStr = err?.message || err?.name || String(err)
        console.error('Marketplace page error:', errorStr, err)
        setError(errorStr.includes('Failed') ? errorStr : 'Failed to load marketplace data: ' + errorStr)
      } finally {
        setLoading(false)
      }
    }

    fetchSessionAndData()
  }, [router])

  const isGuide = user?.role === 'guide'

  // Refine Guide vs Traveller filters
  const filteredListings = listings.filter(item => {
    if (isGuide) {
      const myOffer = item.offers.find(o => o.guide_id === guideProfile?.id && o.status !== 'withdrawn')
      if (filter === 'requests') {
         // Show listings where the guide has not sent an offer, or if it is generally 'open'
         // We'll exclude ones where we already submitted an offer for this tab.
         if (myOffer) return false;
         return item.status === 'open' || item.status === 'awaiting'
      }
      if (filter === 'my_offers') return !!myOffer && item.status !== 'confirmed';
      if (filter === 'confirmed') return !!myOffer && item.status === 'confirmed';
      return false
    } else {
      if (filter === 'all') return true
      if (filter === 'open') return item.status === 'open' || item.status === 'awaiting' || item.status === 'has_offers'
      if (filter === 'has_offers') return item.displayStatus === 'has_offers' || item.offerCount > 0
      if (filter === 'my') return item.user_id === user?.id
      return true
    }
  })

  if (loading) {
    return (
      <section className="py-20 max-w-5xl mx-auto px-12 flex justify-center">
        <Spinner />
      </section>
    )
  }

  // --- GUIDE APPROVAL BARRIER ---
  if (isGuide && guideProfile?.verification_status !== 'approved') {
    return (
      <div className="w-full bg-warmwhite min-h-screen font-body pb-24 pt-8 sm:pt-12 px-4 sm:px-6 lg:px-8">
      <section className="max-w-5xl mx-auto p-6 lg:p-12 bg-white rounded-[24px] shadow-sm border border-border/50 flex justify-center">
        <div className="text-center py-20 max-w-xl mx-auto border border-border/60 rounded-3xl bg-[#FAF9F7] shadow-sm">
           <div className="text-[48px] mb-4">⏳</div>
           <h2 className="text-3xl font-display font-extrabold text-charcoal mb-4">Awaiting Admin Approval</h2>
           <p className="text-secondary leading-relaxed px-8 text-[15px]">
              Your tour guide account is currently being reviewed securely by our administrators. 
              Once your verification is approved, you'll be able to browse traveller itineraries in your city and submit offers.
           </p>
           {guideProfile?.verification_status === 'rejected' && (
             <div className="mt-8 bg-error-bg text-error px-6 py-4 rounded-xl text-sm border border-error/20 inline-block mx-8">
               Your application was not approved. Please contact support.
             </div>
           )}
        </div>
      </section>
      </div>
    )
  }

  return (
    <div className="w-full bg-warmwhite min-h-screen font-body pb-24 pt-8 sm:pt-12 px-4 sm:px-6 lg:px-8">
    <section className="max-w-5xl mx-auto p-6 lg:p-12 bg-white rounded-[24px] shadow-sm border border-border/50">
      
      {/* ── TRAVELLER VIEW ── */}
      {!isGuide ? (
        <>
          {/* Hero Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[#d48c44] text-[11px] font-bold py-1.5 rounded-md mb-4 uppercase tracking-[0.2em] leading-none">
                Marketplace
              </div>
              <h1 className="font-display font-extrabold text-[44px] text-charcoal leading-tight mb-4 tracking-tight">
                Find a Tour Guide
              </h1>
              <p className="text-secondary text-[16px] leading-relaxed mb-8 max-w-lg">
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
            <div className="grid grid-cols-2 gap-4">
              {[["📋", "Post itinerary as listing"], ["💬", "Guides send price offers"], ["🤝", "Negotiate via chat"], ["🟩", "Confirm and book"]].map(([icon, label]) => (
                <div key={label} className="bg-[#FAF9F7] border border-border/60 rounded-2xl p-5 shadow-sm">
                  <div className="text-[26px] mb-3">{icon}</div>
                  <div className="text-[13.5px] text-secondary font-medium leading-snug">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-error mb-4">{error}</p>}

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide pb-1">
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
                    className={`px-5 py-2.5 rounded-lg border text-[13px] transition-all whitespace-nowrap flex-1 md:flex-none tracking-wide ${
                        isActive 
                        ? 'bg-[#F0EBE3] border-[#1A1A1A] text-[#1A1A1A] font-bold' 
                        : 'bg-transparent border-[#E5E0DA] text-[#888] font-semibold hover:border-[#1A1A1A]'
                    }`}
                  >
                    {labels[f]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Listing Grid */}
          {filteredListings.length === 0 ? (
            <div className="text-center py-24 bg-[#FAF9F7] border border-border/60 rounded-2xl">
              <p className="text-secondary/60 font-medium">You haven't posted any listings yet for this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </>
      ) : (
        <>
          {/* ── GUIDE VIEW ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#EAF3DE] text-[#3B6D11] text-[11px] font-bold px-3 py-1.5 rounded-md mb-4 uppercase tracking-widest leading-none">
                <span className="text-[13px]">💼</span> Tour Guide Workspace
              </div>
              <h1 className="font-display font-extrabold text-[44px] text-charcoal leading-tight mb-4 tracking-tight">
                Find your next client
              </h1>
              <p className="text-secondary text-[16px] leading-relaxed mb-8 max-w-lg">
                Browse itineraries posted by travellers visiting your certified city. Submit competitive price offers and secure bookings.
              </p>
              <div className="flex items-center gap-4 bg-[#FAF9F7] border border-border/50 py-3 px-5 rounded-xl inline-flex w-fit">
                <div className="font-bold text-[13px] text-charcoal flex gap-2 items-center">
                   Status: <span className="bg-[#EAF3DE] text-[#3B6D11] text-[11px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">Verified</span>
                </div>
                <div className="w-[1px] h-4 bg-border"></div>
                <div className="text-[13px] text-secondary font-medium">Assigned to: <strong className="text-charcoal ml-1">{guideProfile?.destinations?.city}, {guideProfile?.destinations?.country}</strong></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[["🔍", "Browse open listings"], ["💸", "Submit price offers"], ["💬", "Chat with travellers"], ["📅", "Manage bookings"]].map(([icon, label]) => (
                <div key={label} className="bg-[#FAF9F7] border border-border/60 rounded-2xl p-5 shadow-sm">
                  <div className="text-[26px] mb-3">{icon}</div>
                  <div className="text-[13.5px] text-secondary font-medium leading-snug">{label}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide pb-1">
              {['requests', 'my_offers', 'confirmed'].map((t) => {
                const labels = {
                  'requests': 'Available Requests',
                  'my_offers': 'My Offers',
                  'confirmed': 'Confirmed Bookings'
                }
                const isActive = filter === t
                return (
                  <button 
                    key={t}
                    onClick={() => setFilter(t)} 
                    className={`px-5 py-2.5 rounded-lg border text-[13px] transition-all whitespace-nowrap flex-1 md:flex-none tracking-wide ${
                        isActive 
                        ? 'bg-[#F0EBE3] border-[#1A1A1A] text-[#1A1A1A] font-bold' 
                        : 'bg-transparent border-[#E5E0DA] text-[#888] font-semibold hover:border-[#1A1A1A]'
                    }`}
                  >
                    {labels[t]}
                  </button>
                )
              })}
            </div>
            <div className="text-[12px] text-[#888] w-full md:w-auto text-left md:text-right uppercase tracking-widest font-semibold">
              Showing listings for <strong className="text-charcoal ml-1">{guideProfile?.destinations?.city}, {guideProfile?.destinations?.country}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredListings.length === 0 ? (
              <div className="col-span-full text-center py-24 bg-[#FAF9F7] border border-border/60 rounded-2xl">
                <p className="text-secondary/70 font-medium">No records found for this filter in your city.</p>
              </div>
            ) : filteredListings.map(listing => {
              const myOffer = listing.offers?.find(o => o.guide_id === guideProfile?.id)
              return (
                 <GuideListingCard 
                    key={listing.id}
                    title={listing.title}
                    travellerName={listing.travellerName}
                    dates={listing.dates}
                    budget={formatMYR(listing.desired_budget)}
                    tags={listing.tags}
                    status={listing.status}
                    offerAmount={myOffer ? formatMYR(myOffer.proposed_price) : null}
                    onClick={() => router.push(`/marketplace/${listing.id}`)}
                 />
              )
            })}
          </div>
        </>
      )}

    </section>
    </div>
  )
}