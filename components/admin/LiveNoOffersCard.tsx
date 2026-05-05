'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface LiveNoOffersCardProps {
  initialCount: number
}

export default function LiveNoOffersCard({ initialCount }: LiveNoOffersCardProps) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    const fetchCount = async () => {
      // Fetch all listings and all offers to calculate accurately
      const [listingsRes, offersRes] = await Promise.all([
        supabase.from('marketplace_listings').select('id'),
        supabase.from('marketplace_offers').select('listing_id')
      ])

      if (listingsRes.data && offersRes.data) {
        const listingIds = listingsRes.data.map(l => l.id)
        const offerListingIds = new Set(offersRes.data.map(o => o.listing_id))
        const noOffers = listingIds.filter(id => !offerListingIds.has(id)).length
        setCount(noOffers)
      }
    }

    // Subscribe to both tables
    const listingsChannel = supabase.channel('no-offers-listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, fetchCount)
      .subscribe()
    
    const offersChannel = supabase.channel('no-offers-offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_offers' }, fetchCount)
      .subscribe()

    return () => {
      supabase.removeChannel(listingsChannel)
      supabase.removeChannel(offersChannel)
    }
  }, [])

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">New Itineraries</h2>
      </div>
      <div className="text-4xl font-display font-black text-slate-800">
        {count}
      </div>
    </div>
  )
}
