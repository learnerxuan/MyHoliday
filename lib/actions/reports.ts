'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface GrowthData {
  month: string
  travellers: number
  guides: number
}

export async function getUserGrowthData(): Promise<GrowthData[]> {
  const supabase = await createSupabaseServerClient()
  
  // 1. Fetch data
  const { data: travellers } = await supabase
    .from('traveller_profiles')
    .select('created_at')
  
  const { data: guides } = await supabase
    .from('tour_guides')
    .select('created_at')

  const stats: Record<string, { travellers: number; guides: number }> = {}

  // 2. Aggregate
  travellers?.forEach(t => {
    const month = new Date(t.created_at).toISOString().substring(0, 7) // YYYY-MM
    if (!stats[month]) stats[month] = { travellers: 0, guides: 0 }
    stats[month].travellers++
  })

  guides?.forEach(g => {
    const month = new Date(g.created_at).toISOString().substring(0, 7)
    if (!stats[month]) stats[month] = { travellers: 0, guides: 0 }
    stats[month].guides++
  })

  // 3. Filter out current month (April 2026)
  const currentMonth = new Date().toISOString().substring(0, 7)
  const filtered = Object.keys(stats)
    .filter(m => m < currentMonth)
    .sort()
    .map(m => ({
      month: m,
      travellers: stats[m].travellers,
      guides: stats[m].guides
    }))

  // 4. Ensure we show data starting from Jan 2026
  const result: GrowthData[] = []
  const date = new Date(2026, 0, 1) // Jan 2026

  while (date.toISOString().substring(0, 7) < currentMonth) {
    const m = date.toISOString().substring(0, 7)
    const existing = filtered.find(d => d.month === m)
    result.push(existing || { month: m, travellers: 0, guides: 0 })
    date.setMonth(date.getMonth() + 1)
  }

  return result
}

export async function getDashboardStats() {
  const supabase = await createSupabaseServerClient()
  
  const { count: travellerCount } = await supabase
    .from('traveller_profiles')
    .select('*', { count: 'exact', head: true })

  const { count: guideCount } = await supabase
    .from('tour_guides')
    .select('*', { count: 'exact', head: true })
    
  const { count: pendingGuides } = await supabase
    .from('tour_guides')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'pending')

  return {
    travellerCount: travellerCount || 0,
    guideCount: guideCount || 0,
    pendingGuides: pendingGuides || 0
  }
}
