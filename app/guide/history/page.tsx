'use client'

import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
import Link from 'next/link'

const CalendarIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const GroupIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const InfoChip = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <span className="flex items-center gap-1.5 px-2 rounded border border-[#EAE6DF] bg-white text-[#7A7367] text-[10px] font-bold uppercase leading-none h-[22px] whitespace-nowrap shrink-0">
    {icon}
    <span className="pt-[1px]">{children}</span>
  </span>
)

export default function SchedulePage() {
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Not authenticated')

        // Get guide profile
        const { data: guide, error: guideError } = await supabase
          .from('tour_guides')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        if (guideError || !guide) throw new Error('Could not find guide profile')

        // 1. Get this guide's accepted offers where the associated listing is confirmed.
        const { data: acceptedOffers, error: offersError } = await supabase
          .from('marketplace_offers')
          .select(`
            id,
            proposed_price,
            created_at,
            guide_id,
            marketplace_listings!inner (
              id,
              status,
              itinerary_id,
              destinations (
                id,
                city,
                country
              )
            )
          `)
          .eq('guide_id', guide.id)
          .eq('status', 'accepted')
          .eq('marketplace_listings.status', 'confirmed')

        if (offersError) throw new Error(offersError.message)

        if (!acceptedOffers || acceptedOffers.length === 0) {
          setOffers([])
          setLoading(false)
          return
        }

        // Extract itinerary IDs to fetch them
        const itineraryIds = acceptedOffers
          .map(o => {
            const listing = Array.isArray(o.marketplace_listings) ? o.marketplace_listings[0] : o.marketplace_listings
            return listing?.itinerary_id
          })
          .filter(Boolean)

        let itinerariesMap: Record<string, any> = {}

        if (itineraryIds.length > 0) {
          // 2. Fetch itineraries
          const { data: itinerariesData, error: itinsError } = await supabase
            .from('itineraries')
            .select('id, title, content, trip_metadata')
            .in('id', itineraryIds)

          if (!itinsError && itinerariesData) {
            itinerariesMap = itinerariesData.reduce((acc, curr) => {
              acc[curr.id] = curr
              return acc
            }, {} as Record<string, any>)
          }
        }

        // Process data
        const processedOffers = acceptedOffers.map(offer => {
          const listing = Array.isArray(offer.marketplace_listings) ? offer.marketplace_listings[0] : offer.marketplace_listings
          if (!listing) return null
          
          const destination = Array.isArray(listing.destinations) ? listing.destinations[0] : listing.destinations
          const itinerary = itinerariesMap[listing.itinerary_id]

          const rawContent = itinerary?.content || {}
          const content = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
          const tripMeta = itinerary?.trip_metadata || {}

          const days = content?.trip_days || content?.duration_days || tripMeta?.trip_days || null
          const startDate = content?.start_date || tripMeta?.travel_date_start || tripMeta?.start_date || tripMeta?.travel_dates?.start || null
          const endDate = content?.end_date || tripMeta?.travel_date_end || tripMeta?.end_date || tripMeta?.travel_dates?.end || null

          let timingStatus = 'Upcoming'
          const now = new Date()
          if (startDate && endDate) {
            const start = new Date(startDate)
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            if (now > end) timingStatus = 'Completed'
            else if (now >= start && now <= end) timingStatus = 'Ongoing'
            else timingStatus = 'Upcoming'
          } else if (startDate) {
            const start = new Date(startDate)
            if (now >= start) timingStatus = 'Ongoing'
          }

          return {
            id: offer.id,
            price: offer.proposed_price,
            acceptedAt: offer.created_at,
            guideId: offer.guide_id,
            listingId: listing.id,
            title: itinerary?.title || 'Trip',
            city: destination?.city || 'Unknown Location',
            country: destination?.country || '',
            startDate: startDate,
            endDate: endDate,
            days: days ? `${days} Days` : '',
            pax: content?.group_size || content?.pax || tripMeta?.group_size || tripMeta?.pax || '1 pax',
            timingStatus: timingStatus,
          }
        }).filter((offer): offer is NonNullable<typeof offer> => offer !== null && offer.timingStatus !== 'Completed')

        // Sort by start date if available, otherwise by acceptedAt (latest first)
        processedOffers.sort((a, b) => {
          if (a.startDate && b.startDate) {
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          }
          return new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime()
        })

        setOffers(processedOffers)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return ''
    }
  }

  const formatMYR = (amount: any) => `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-border/60 shadow-sm min-h-[600px] w-full">
      <div className="max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-display font-extrabold text-charcoal mb-2">My Schedule</h1>
        <p className="text-secondary font-body mb-8">View your upcoming and ongoing accepted tours.</p>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner />
          </div>
        ) : error ? (
          <div className="py-10 text-center text-error bg-error-bg rounded-xl">
            {error}
          </div>
        ) : offers.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl">
            <div className="text-4xl mb-4">📅</div>
            <h2 className="text-xl font-display font-bold text-charcoal mb-2">No Scheduled Tours</h2>
            <p className="text-secondary text-sm max-w-sm mx-auto mb-6">
              You don&apos;t have any accepted offers yet. Browse the marketplace to find new opportunities!
            </p>
            <Link href="/marketplace" className="px-6 py-3 bg-amber text-warmwhite font-bold rounded-xl shadow-sm hover:bg-amberdark transition-colors inline-block">
              Go to Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {offers.map(offer => {
              const dateRange = offer.startDate && offer.endDate 
                ? `${formatDate(offer.startDate)} - ${formatDate(offer.endDate)}` 
                : offer.days || 'Dates TBD'
                
              return (
                <div key={offer.id} className="bg-[#FAF9F7] border border-[#E5E0DA] rounded-2xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-[#E8E3DC] text-[#7A7367] text-[10px] font-extrabold uppercase tracking-widest rounded-lg">
                          {offer.city}{offer.country ? `, ${offer.country}` : ''}
                        </span>
                        <span className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-lg flex items-center gap-1 ${
                          offer.timingStatus === 'Ongoing' ? 'bg-blue-100 text-blue-800' :
                          offer.timingStatus === 'Upcoming' ? 'bg-amber/20 text-amberdark' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            offer.timingStatus === 'Ongoing' ? 'bg-blue-600 animate-pulse' :
                            offer.timingStatus === 'Upcoming' ? 'bg-amberdark' :
                            'bg-gray-500'
                          }`}></span> {offer.timingStatus}
                        </span>
                      </div>
                      <h3 className="text-xl font-display font-extrabold text-charcoal mb-3">
                        {offer.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <InfoChip icon={<CalendarIcon />}>{dateRange}</InfoChip>
                        <InfoChip icon={<GroupIcon />}>{offer.pax}</InfoChip>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:items-end gap-3 mt-4 sm:mt-0 border-t sm:border-t-0 border-[#E5E0DA] pt-4 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-extrabold text-secondary uppercase tracking-widest mb-1">Agreed Price</p>
                        <p className="text-2xl font-display font-extrabold text-amber">{formatMYR(offer.price)}</p>
                      </div>
                      <Link 
                        href={`/marketplace/${offer.listingId}?from=schedule`}
                        className="px-5 py-2.5 bg-charcoal text-white text-sm font-bold rounded-xl shadow hover:bg-black transition-colors text-center"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
