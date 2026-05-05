'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface LiveOverviewStatsProps {
  initialTravellers: number
  initialGuides: number
  initialReturnCustomers: number
}

export default function LiveOverviewStats({
  initialTravellers,
  initialGuides,
  initialReturnCustomers
}: LiveOverviewStatsProps) {
  const [travellers, setTravellers] = useState(initialTravellers)
  const [guides, setGuides] = useState(initialGuides)
  const [returnCustomers, setReturnCustomers] = useState(initialReturnCustomers)

  useEffect(() => {
    // 1. Live Travellers
    const fetchTravellers = async () => {
      const { count } = await supabase
        .from('traveller_profiles')
        .select('*', { count: 'exact', head: true })
      if (count !== null) setTravellers(count)
    }

    const travellersChannel = supabase.channel('live-travellers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'traveller_profiles' }, fetchTravellers)
      .subscribe()

    // 2. Live Approved Guides
    const fetchGuides = async () => {
      const { count } = await supabase
        .from('tour_guides')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'approved')
      if (count !== null) setGuides(count)
    }

    const guidesChannel = supabase.channel('live-guides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_guides' }, fetchGuides)
      .subscribe()

    // 3. Live Return Customers
    const fetchReturnCustomers = async () => {
      const { data: itinUsers } = await supabase.from('itineraries').select('user_id')
      if (itinUsers) {
        const userCounts: Record<string, number> = {}
        itinUsers.forEach(item => {
          userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1
        })
        const count = Object.values(userCounts).filter(c => c > 1).length
        setReturnCustomers(count)
      }
    }

    const itinerariesChannel = supabase.channel('live-itineraries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itineraries' }, fetchReturnCustomers)
      .subscribe()

    return () => {
      supabase.removeChannel(travellersChannel)
      supabase.removeChannel(guidesChannel)
      supabase.removeChannel(itinerariesChannel)
    }
  }, [])

  return (
    <>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Travellers</h2>
        <div className="text-4xl font-display font-black text-slate-800">
          {travellers}
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Approved Guides</h2>
        <div className="text-4xl font-display font-black text-slate-800">
          {guides}
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Return Customers</h2>
        <div className="text-4xl font-display font-black text-slate-800">
          {returnCustomers}
        </div>
      </div>
    </>
  )
}
