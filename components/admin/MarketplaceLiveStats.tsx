'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface MarketplaceLiveStatsProps {
  initialListingsCount: number
  initialOffers: any[]
}

export default function MarketplaceLiveStats({ 
  initialListingsCount, 
  initialOffers 
}: MarketplaceLiveStatsProps) {
  const [listingsCount, setListingsCount] = useState(initialListingsCount)
  const [offers, setOffers] = useState(initialOffers)

  useEffect(() => {
    // Subscribe to marketplace_listings
    const listingsChannel = supabase
      .channel('live-listings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketplace_listings' },
        async () => {
          const { count } = await supabase
            .from('marketplace_listings')
            .select('*', { count: 'exact', head: true })
          if (count !== null) setListingsCount(count)
        }
      )
      .subscribe()

    // Subscribe to marketplace_offers
    const offersChannel = supabase
      .channel('live-offers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketplace_offers' },
        async () => {
          const { data } = await supabase
            .from('marketplace_offers')
            .select('id, listing_id, status')
          if (data) setOffers(data)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(listingsChannel)
      supabase.removeChannel(offersChannel)
    }
  }, [])

  const totalOffers = offers.length
  const acceptedOffers = offers.filter(o => o.status === 'accepted').length
  const pendingOffers = offers.filter(o => o.status === 'pending').length
  const rejectedOffers = offers.filter(o => o.status === 'rejected').length

  // Calculate listings with no offers
  // Note: For this to be accurate, we need the actual listing IDs or another query.
  // Let's fetch listing IDs as well in the effect.
  
  const [listingIds, setListingIds] = useState<string[]>([])

  useEffect(() => {
    const fetchListingIds = async () => {
      const { data } = await supabase.from('marketplace_listings').select('id')
      if (data) setListingIds(data.map(l => l.id))
    }
    fetchListingIds()

    const sub = supabase
      .channel('listing-ids')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, fetchListingIds)
      .subscribe()
    
    return () => { supabase.removeChannel(sub) }
  }, [])

  const listingsWithNoOffers = listingIds.filter(id => !offers.some(o => o.listing_id === id)).length

  // Donut chart math
  const donutTotal = totalOffers || 1
  const radius = 54
  const circumference = 2 * Math.PI * radius
  
  const acceptedDash = (acceptedOffers / donutTotal) * circumference
  const pendingDash = (pendingOffers / donutTotal) * circumference
  const rejectedDash = (rejectedOffers / donutTotal) * circumference

  const acceptedOffset = 0
  const pendingOffset = -(acceptedDash)
  const rejectedOffset = -(acceptedDash + pendingDash)

  return (
    <section className="bg-white p-8 rounded-3xl shadow-md border border-gray-100 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-slate-800">Marketplace Activity</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: stat cards */}
        <div className="space-y-4">
          {/* Listings posted */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-violet-100/60 border border-violet-200/50">
            <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-violet-500 uppercase tracking-wider">Itineraries Listed</div>
              <div className="text-3xl font-display font-black text-slate-800">{listingsCount}</div>
            </div>
          </div>

          {/* Offers sent */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100/60 border border-blue-200/50">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Offers Sent</div>
              <div className="text-3xl font-display font-black text-slate-800">{totalOffers}</div>
            </div>
          </div>

          {/* Accepted offers */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-100/60 border border-emerald-200/50">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Accepted Offers</div>
              <div className="text-3xl font-display font-black text-slate-800">{acceptedOffers}</div>
            </div>
          </div>
        </div>

        {/* Right: Donut chart */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
              <circle cx="64" cy="64" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
              {totalOffers > 0 ? (
                <>
                  <circle
                    cx="64" cy="64" r={radius}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="14"
                    strokeDasharray={`${acceptedDash} ${circumference - acceptedDash}`}
                    strokeDashoffset={acceptedOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                  <circle
                    cx="64" cy="64" r={radius}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="14"
                    strokeDasharray={`${pendingDash} ${circumference - pendingDash}`}
                    strokeDashoffset={pendingOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                  <circle
                    cx="64" cy="64" r={radius}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="14"
                    strokeDasharray={`${rejectedDash} ${circumference - rejectedDash}`}
                    strokeDashoffset={rejectedOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </>
              ) : null}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-display font-black text-slate-800">{totalOffers}</span>
              <span className="text-[8px] font-semibold text-gray-400 uppercase tracking-widest">Offers</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-gray-500 font-medium">Accepted</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-[10px] text-gray-500 font-medium">Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-[10px] text-gray-500 font-medium">Rejected</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
