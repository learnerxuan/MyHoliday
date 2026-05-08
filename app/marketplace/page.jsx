'use client'

import { useState, useEffect } from 'react'
import { useAppRouter as useRouter } from '@/components/providers/PageTransitionProvider'
import { supabase } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
import ListingCard from '@/components/ui/ListingCard'
import Modal from '@/components/ui/Modal'

const formatMYR = (amount) => `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const GuideListingCard = ({ title, travellerName, dates, budget, tags, status, offerAmount, onClick, onSubmitOffer }) => {
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
          <button 
            onClick={(e) => { e.stopPropagation(); onSubmitOffer && onSubmitOffer(); }}
            className="bg-amber text-white px-3.5 py-[7px] text-[11px] rounded-lg font-bold hover:bg-amberdark transition-colors"
          >
            Submit Offer
          </button>
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
  const [guideAnalytics, setGuideAnalytics] = useState({
    offersSent: 0,
    offersAccepted: 0,
    completedTrips: 0,
    totalEarnings: 0
  })
  const [listings, setListings] = useState([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all' for traveller, 'requests' initialized for guide
  const [listingToDelete, setListingToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

          const { data: myOffersData } = await supabase
            .from('marketplace_offers')
            .select('status, proposed_price, marketplace_listings(status)')
            .eq('guide_id', guideData.id)

          if (myOffersData) {
            const offersAccepted = myOffersData.filter(o => o.status === 'accepted').length
            const offersSent = myOffersData.length - offersAccepted
            const completedTrips = myOffersData.filter(o => o.status === 'accepted' && o.marketplace_listings?.status === 'completed').length
            const totalEarnings = myOffersData
              .filter(o => o.status === 'accepted' && o.marketplace_listings?.status === 'completed')
              .reduce((sum, o) => sum + (Number(o.proposed_price) || 0), 0)
            
            setGuideAnalytics({ offersSent, offersAccepted, completedTrips, totalEarnings })
          }
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
            is_suspended,
            created_at,
            destinations ( city, country ),
            marketplace_offers ( id, status, guide_id, proposed_price, tour_guides ( full_name ) )
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

        const userIds = [...new Set((listingsData || []).map(l => l.user_id).filter(Boolean))]
        let travellerMap = {}

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('traveller_profiles')
            .select('user_id, full_name')
            .in('user_id', userIds)
          
          if (profilesData) {
            travellerMap = Object.fromEntries(
              profilesData.map(item => [item.user_id, item.full_name])
            )
          }
        }

        const formattedListings = (listingsData || [])
          .filter(l => !(role === 'guide' && l.is_suspended))
          .map((l) => {
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

          const groupSize =
            parsedMeta.group_size ||
            tripMeta.group_size ||
            parsedMeta.pax ||
            tripMeta.pax ||
            1

          let pax = ''
          const gsStr = String(groupSize).toLowerCase()
          if (gsStr.includes('solo')) pax = '1 pax'
          else if (gsStr.includes('couple')) pax = '2 pax'
          else if (gsStr.includes('small group')) pax = 'Small Group'
          else if (gsStr.includes('large group')) pax = 'Large Group'
          else pax = `${groupSize} pax`
          let tags = parsedMeta.preferred_styles || tripMeta.preferred_styles || []
          if (!tags || tags.length === 0) {
            tags = ['Culture', 'Budget']
          } else if (tags.length > 2) {
            tags = tags.slice(0, 2)
          }

          const offers = l.marketplace_offers || []

          let displayStatus = l.status
          if (l.is_suspended) {
            displayStatus = 'suspended'
          } else if (l.status === 'open') {
            displayStatus = offers.length > 0 ? 'has_offers' : 'awaiting'
          }

          let guideInfo = null
          const acceptedOffer = offers.find(o => o.status === 'accepted')
          const primaryOffer = acceptedOffer || (offers.length > 0 ? offers[0] : null)
          
          if (primaryOffer) {
            guideInfo = {
              name: primaryOffer.tour_guides?.full_name || 'Ahmad R.',
              location: l.destinations?.city || 'City',
              status: primaryOffer.status === 'accepted' ? 'Accepted' : 'Offer received'
            }
          }

          const startDate = parsedMeta.start_date || tripMeta.travel_date_start || tripMeta.start_date || tripMeta.travel_dates?.start
          const endDate = parsedMeta.end_date || tripMeta.travel_date_end || tripMeta.end_date || tripMeta.travel_dates?.end

          let formattedDateRange = `${days} Days`
          if (startDate && endDate) {
            try {
              const start = new Date(startDate)
              const end = new Date(endDate)
              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const formatStr = (d) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                formattedDateRange = `${formatStr(start)} - ${formatStr(end)} (${days} days)`
              }
            } catch (err) {}
          }

          return {
            ...l,
            title: itinerary?.title || 'Untitled Itinerary',
            city_name: l.destinations?.city || 'Unknown',
            country_name: l.destinations?.country || 'Destination',
            travellerName: travellerMap[l.user_id] || 'Anonymous Traveller',
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
        if (errorStr.includes('AbortError') || errorStr.includes('lock request is aborted')) {
          return // Ignore standard fast-refresh AbortErrors
        }
        console.error('Marketplace page error:', errorStr)
        setError(errorStr.includes('Failed') ? errorStr : 'Failed to load marketplace data: ' + errorStr)
      } finally {
        setLoading(false)
      }
    }

    fetchSessionAndData()
  }, [router])

  const isGuide = user?.role === 'guide'

  const confirmDelete = async () => {
    if (!listingToDelete) return
    
    const targetId = listingToDelete.id
    
    // Optimistic UI Update: Instantly remove the card and close the modal
    setListings(prev => prev.filter(l => String(l.id) !== String(targetId)))
    setListingToDelete(null)

    // Perform database deletion silently in the background
    try {
      const { error: deleteError } = await supabase
        .from('marketplace_listings')
        .delete()
        .eq('id', targetId)

      if (deleteError) throw deleteError
    } catch (err) {
      console.error('Failed to delete listing in background:', err)
      // Revert is omitted for simplicity, but could be added here
    }
  }

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
      if (filter === 'settled') return item.status === 'confirmed'
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
      <div className="w-full bg-warmwhite min-h-screen font-body pb-24 -mt-7 md:-mt-6 p-4 sm:p-6 lg:px-8">
      <section className="max-w-5xl mx-auto p-6 lg:p-12 bg-white rounded-[24px] shadow-sm border border-border/50 flex justify-center">
        <div className="text-center py-20 max-w-xl mx-auto border border-border/60 rounded-3xl bg-[#FAF9F7] shadow-sm">
           <div className="text-[48px] mb-4">⏳</div>
           <h2 className="text-3xl font-display font-extrabold text-charcoal mb-4">Awaiting Admin Approval</h2>
           <p className="text-secondary leading-relaxed px-8 text-[15px]">
              Your tour guide account is currently being reviewed securely by our administrators. 
              Once your verification is approved, you&apos;ll be able to browse traveller itineraries in your city and submit offers.
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
    <div className="min-h-screen bg-warmwhite flex flex-col -mt-7 md:-mt-6 p-4 sm:p-6 pb-20 font-body">
    <section className="max-w-7xl mx-auto w-full bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden flex flex-col">
      
      {/* ── TRAVELLER VIEW ── */}
      {!isGuide ? (
        <>
          {/* Hero Layout (Dark Island Header) */}
          <div 
            className="text-warmwhite relative overflow-hidden pt-8 sm:pt-10 px-4 sm:px-10 pb-8 sm:pb-10"
            style={{ background: '#0f0f0f' }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(196,135,74,0.22) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(196,135,74,0.10) 0%, transparent 65%)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

            <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-white/10 text-amber text-xs font-semibold px-3 py-1 rounded-full border border-amber/20 mb-3 uppercase tracking-widest">
                  Marketplace
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold font-display mb-4 text-warmwhite leading-tight">
                  Find a Tour Guide
                </h1>
                <p className="text-sm sm:text-[15px] font-body text-warmwhite/80 leading-relaxed max-w-lg mb-8">
                  Post your saved itinerary. Verified local guides browse and send their best offer. Negotiate and confirm your booking.
                </p>
                <button 
                  onClick={() => router.push('/marketplace/new')} 
                  className="bg-amber hover:bg-amberdark text-white text-[15px] px-8 py-3.5 rounded-[10px] transition-colors font-bold tracking-wide shadow-lg shadow-black/10"
                >
                  Post My Itinerary
                </button>
              </div>

              {/* Right Info Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 md:mt-0 max-w-sm w-full">
                {[["📋", "Post itinerary as listing"], ["💬", "Guides send price offers"], ["🤝", "Negotiate via chat"], ["🟩", "Confirm and book"]].map(([icon, label]) => (
                  <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <div className="text-[22px] sm:text-[26px] mb-2 sm:mb-3">{icon}</div>
                    <div className="text-[12px] sm:text-[13px] text-warmwhite/90 font-medium leading-snug">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-12 sm:pb-16 bg-[#FAFAFA] flex-1">
            {error && <p className="text-error mb-4">{error}</p>}

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide pb-1">
                {['all', 'open', 'has_offers', 'settled'].map((f) => {
                  const labels = {
                    'all': 'All Listings',
                    'open': 'Open',
                    'has_offers': 'Has Offers',
                    'settled': 'Settled'
                  }
                  const isActive = filter === f
                  const hasNotification = f === 'has_offers' && listings.some(l => l.offerCount > 0)
                  return (
                    <button 
                      key={f}
                      onClick={() => setFilter(f)} 
                      className={`px-5 py-2.5 rounded-full border text-[13px] transition-all whitespace-nowrap flex-1 md:flex-none tracking-wide font-semibold flex items-center justify-center gap-2 ${
                          isActive 
                          ? 'bg-charcoal border-charcoal text-white shadow-sm' 
                          : 'bg-white border-[#E5E0DA] text-[#888] hover:border-amber/50 hover:bg-[#FDFBF7]'
                      }`}
                    >
                      {labels[f]}
                      {hasNotification && (
                        <span className="w-2 h-2 rounded-full bg-error" title="New offers received!" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

          {/* Listing Grid */}
          {filteredListings.length === 0 ? (
            <div className="text-center py-24 bg-[#FAF9F7] border border-border/60 rounded-2xl">
              <p className="text-secondary/60 font-medium">
                {filter === 'settled' 
                  ? "You don't have any settled bookings yet." 
                  : filter === 'has_offers'
                  ? "You haven't received any guide offers yet."
                  : filter === 'open'
                  ? "You don't have any open listings."
                  : "You haven't posted any listings yet."}
              </p>
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
                    dates={listing.dates}
                    days={listing.days}
                    pax={listing.pax}
                    tags={listing.tags}
                    guideInfo={listing.guideInfo}
                    onDelete={() => setListingToDelete(listing)}
                  />
                </div>
              ))}
            </div>
          )}
          </div>
        </>
      ) : (
        <>
          {/* ── GUIDE VIEW ── */}
          <div 
            className="text-warmwhite relative overflow-hidden pt-8 sm:pt-10 px-4 sm:px-10 pb-8 sm:pb-10"
            style={{ background: '#0f0f0f' }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(59,109,17,0.22) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(59,109,17,0.10) 0%, transparent 65%)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

            <div className="relative flex flex-col md:flex-row md:items-stretch justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-[#EAF3DE]/20 text-[#EAF3DE] text-xs font-semibold px-3 py-1 rounded-full border border-[#EAF3DE]/30 mb-3 uppercase tracking-widest">
                  Tour Guide Workspace
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold font-display mb-4 text-warmwhite leading-tight">
                  Find your next client
                </h1>
                <p className="text-sm sm:text-[15px] font-body text-warmwhite/80 leading-relaxed max-w-lg mb-8">
                  Browse itineraries posted by travellers visiting your certified city. Submit competitive price offers and secure bookings.
                </p>
                <div className="flex flex-wrap items-center gap-4 bg-white/5 border border-white/10 py-3 px-5 rounded-xl inline-flex w-fit backdrop-blur-sm">
                  <div className="font-bold text-[13px] text-warmwhite flex gap-2 items-center">
                     Status: <span className="bg-[#EAF3DE] text-[#3B6D11] text-[11px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">Verified</span>
                  </div>
                  <div className="hidden sm:block w-[1px] h-4 bg-white/20"></div>
                  <div className="text-[13px] text-warmwhite/80 font-medium">Assigned to: <strong className="text-warmwhite ml-1">{guideProfile?.destinations?.city}, {guideProfile?.destinations?.country}</strong></div>
                </div>
              </div>

              {/* Right Info Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 md:mt-0 max-w-sm w-full self-stretch">
                {[
                  { label: "Offers Sent", value: guideAnalytics.offersSent },
                  { label: "Offers Accepted", value: guideAnalytics.offersAccepted },
                  { label: "Completed Trips", value: guideAnalytics.completedTrips },
                  { label: "Total Earnings", value: `RM ${guideAnalytics.totalEarnings.toLocaleString('en-MY')}` }
                ].map((stat) => (
                  <div key={stat.label} className="bg-warmwhite/5 border border-warmwhite/10 rounded-2xl p-4 flex flex-col justify-center gap-2 h-full">
                    <span className="text-[28px] font-display font-extrabold text-white leading-none">{stat.value}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-warmwhite/60">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-12 sm:pb-16 bg-[#FAFAFA] flex-1">
          
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
                    onClick={() => {
                      const isActionable = listing.status === 'open' && !myOffer
                      if (isActionable) {
                        router.push(`/marketplace/${listing.id}/offer`)
                      } else {
                        router.push(`/marketplace/${listing.id}`)
                      }
                    }}
                    onSubmitOffer={() => router.push(`/marketplace/${listing.id}/offer`)}
                 />
              )
            })}
          </div>
                  </div>
                </>
              )}

      {/* Delete Confirmation Modal */}
      {listingToDelete && (
        <Modal title="Withdraw Listing" onClose={() => !isDeleting && setListingToDelete(null)}>
          <p className="text-secondary mb-6 text-[15px] leading-relaxed">
            Are you sure you want to withdraw your listing for <strong>{listingToDelete.city_name}, {listingToDelete.country_name}</strong>? This action cannot be undone, but your itinerary will remain in your saved list.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <button 
              onClick={() => setListingToDelete(null)}
              className="px-5 py-2.5 rounded-xl text-secondary font-bold hover:bg-[#F0EBE3] transition-colors text-[13px]"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button 
              onClick={confirmDelete}
              className="px-5 py-2.5 rounded-xl bg-error text-white font-bold hover:bg-red-600 transition-colors text-[13px] border border-transparent flex items-center justify-center min-w-[100px]"
              disabled={isDeleting}
            >
              {isDeleting ? <div className="w-4 h-4 rounded-full animate-spin border-2 border-white/20 border-t-white" /> : 'Withdraw'}
            </button>
          </div>
        </Modal>
      )}

    </section>
    </div>
  )
}