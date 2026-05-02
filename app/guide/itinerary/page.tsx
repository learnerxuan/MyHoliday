'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
import { useRouter } from 'next/navigation'

const formatMYR = (amount: number) => `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export default function GuideItineraryMarketplace() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get guide profile for city
        const { data: guide } = await supabase
          .from('tour_guides')
          .select('id, city_id, verification_status')
          .eq('user_id', user.id)
          .single()

        if (!guide || guide.verification_status !== 'approved' || !guide.city_id) {
          setLoading(false)
          return
        }

        // Fetch listings for this city
        const { data: listingsData, error: listingsError } = await supabase
          .from('marketplace_listings')
          .select(`
            id,
            user_id,
            itinerary_id,
            desired_budget,
            status,
            created_at,
            destinations ( city, country ),
            marketplace_offers ( id, guide_id, status )
          `)
          .eq('destination_id', guide.city_id)
          .order('created_at', { ascending: false })

        if (listingsError) throw listingsError

        // Fetch itineraries and travellers
        const itineraryIds = [...new Set((listingsData || []).map(l => l.itinerary_id))]
        const userIds = [...new Set((listingsData || []).map(l => l.user_id))]

        let itineraryMap: any = {}
        if (itineraryIds.length > 0) {
          const { data: itins } = await supabase.from('itineraries').select('id, title, trip_metadata').in('id', itineraryIds)
          itineraryMap = Object.fromEntries((itins || []).map(i => [i.id, i]))
        }

        let travellerMap: any = {}
        if (userIds.length > 0) {
          const { data: travellers } = await supabase.from('traveller_profiles').select('user_id, full_name').in('user_id', userIds)
          travellerMap = Object.fromEntries((travellers || []).map(t => [t.user_id, t.full_name]))
        }

        const formatted = (listingsData || []).map(l => {
          const itin = itineraryMap[l.itinerary_id]
          const tripMeta = itin?.trip_metadata || {}
          const days = tripMeta.trip_days || tripMeta.duration_days || 5
          const pax = tripMeta.group_size || tripMeta.pax || 1
          
          return {
            ...l,
            title: itin?.title || 'Untitled Itinerary',
            travellerName: travellerMap[l.user_id] || 'Anonymous Traveller',
            city: l.destinations?.city || 'Unknown',
            country: l.destinations?.country || '',
            days,
            pax,
            hasMyOffer: l.marketplace_offers?.some((o: any) => o.guide_id === guide.id)
          }
        })

        setListings(formatted)
      } catch (error) {
        console.error('Error fetching marketplace:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMarketplace()
  }, [])

  const filteredListings = listings.filter(l => {
    const query = search.toLowerCase()
    return l.title.toLowerCase().includes(query) || l.travellerName.toLowerCase().includes(query)
  })

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-charcoal mb-1">Marketplace Requests</h1>
          <p className="text-secondary text-sm font-body">Browse and bid on itineraries posted by travellers visiting your city.</p>
        </div>
        <div className="relative w-full md:w-80">
          <svg className="w-5 h-5 absolute left-3 top-2.5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search itineraries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber bg-white shadow-sm"
          />
        </div>
      </div>

      {filteredListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-border shadow-sm">
          <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-charcoal text-lg font-semibold font-body">No requests found</p>
          <p className="text-secondary text-sm mt-1">There are currently no open marketplace requests in your city.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map(listing => (
            <div key={listing.id} className="bg-white rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col cursor-pointer" onClick={() => router.push(`/marketplace/${listing.id}`)}>
               <div className="flex justify-between items-start mb-5">
                 <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-display font-bold text-2xl group-hover:scale-105 transition-transform">
                     {listing.travellerName?.charAt(0) || 'T'}
                   </div>
                   <div>
                     <h3 className="font-bold text-charcoal text-lg font-display leading-tight truncate max-w-[160px]">{listing.title}</h3>
                     <p className="text-sm text-secondary font-body mt-0.5">
                       {listing.travellerName}
                     </p>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="font-display font-extrabold text-lg text-amber">{formatMYR(listing.desired_budget)}</div>
                   <div className="text-[10px] text-secondary/70 uppercase tracking-widest mt-0.5">Budget</div>
                 </div>
               </div>
               
               <div className="flex gap-2 mb-4">
                  <span className="text-[11px] font-bold px-2.5 py-1 bg-black/5 text-charcoal rounded-lg">{listing.days} Days</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 bg-black/5 text-charcoal rounded-lg">{listing.pax} Pax</span>
                  {listing.hasMyOffer && (
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-amber/10 text-amberdark rounded-lg">Offer Sent</span>
                  )}
               </div>

               <div className="border-t border-border pt-4 mt-auto">
                 <div className="flex justify-between items-center text-sm font-body mb-2">
                   <span className="text-tertiary">Posted</span>
                   <span className="font-semibold text-charcoal">
                     {new Date(listing.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                   </span>
                 </div>
                 <div className="flex justify-between items-center text-sm font-body mt-3">
                   <span className="text-tertiary">Status</span>
                   <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border font-bold text-[11px] uppercase tracking-wider ${
                     listing.status === 'open' ? 'bg-green-50 border-green-200 text-green-700' : 
                     listing.status === 'negotiating' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                     'bg-gray-50 border-gray-200 text-gray-700'
                   }`}>
                     {listing.status === 'open' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>}
                     {listing.status === 'open' ? 'Accepting Offers' : listing.status}
                   </span>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
