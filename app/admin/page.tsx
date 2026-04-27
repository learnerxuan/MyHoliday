import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient()
  
  const { count, error } = await supabase
    .from('traveller_profiles')
    .select('*', { count: 'exact', head: true })

  const totalTravellers = count || 0

  const { count: guidesCount } = await supabase
    .from('tour_guides')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'approved')

  const totalApprovedGuides = guidesCount || 0

  // Fetch top 3 most clicked destinations using the API (bypassing IPv6 issues)
  let topDestinations: any[] = []
  try {
    const { data: interactions, error: interactError } = await supabase
      .from('user_interactions')
      .select('destination_id, destinations(city, country)')
      .eq('type', 'click')

    if (interactError) throw interactError

    if (interactions && interactions.length > 0) {
      // Aggregate clicks in JS
      const counts: Record<string, { city: string, country: string, count: number }> = {}
      
      interactions.forEach((item: any) => {
        const dest = item.destinations
        if (!dest) return
        
        const key = `${dest.city}, ${dest.country}`
        if (!counts[key]) {
          counts[key] = { city: dest.city, country: dest.country, count: 0 }
        }
        counts[key].count++
      })

      topDestinations = Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(item => ({
          city: item.city,
          country: item.country,
          click_count: item.count
        }))
    }
  } catch (err) {
    console.error('Error fetching top destinations via API:', err)
  }

  return (
    <main className="min-h-screen bg-warmwhite p-8">
      <div className="max-w-4xl mx-auto font-body text-charcoal">
        <h1 className="text-3xl font-display font-extrabold mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Travellers</h2>
            <div className="text-4xl font-display font-black text-slate-800">
              {totalTravellers}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Approved Guides</h2>
            <div className="text-4xl font-display font-black text-slate-800">
              {totalApprovedGuides}
            </div>
          </div>
        </div>

        <section className="bg-white p-8 rounded-3xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-slate-800">Top 3 Most Clicked Destinations</h2>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-widest">
              Live Trends
            </span>
          </div>

          {topDestinations.length > 0 ? (
            <div className="space-y-6">
              {topDestinations.map((dest, index) => (
                <div key={dest.city} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 ? 'bg-amber-100 text-amber-600' : 
                    index === 1 ? 'bg-slate-100 text-slate-500' : 
                    'bg-orange-50 text-orange-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-bold text-slate-700">{dest.city}</span>
                      <span className="text-sm text-gray-400 font-medium">{dest.click_count} clicks</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          index === 0 ? 'bg-amber-400' : 
                          index === 1 ? 'bg-slate-400' : 
                          'bg-orange-300'
                        }`}
                        style={{ width: `${(dest.click_count / topDestinations[0].click_count) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400 mt-1 block">{dest.country}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="text-gray-300 mb-2">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-lg font-medium">No interaction data yet</p>
                <p className="text-sm">Clicks will appear here once travellers start browsing destinations.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
