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

  return (
    <main className="min-h-screen bg-warmwhite p-8">
      <div className="max-w-4xl mx-auto font-body text-charcoal">
        <h1 className="text-3xl font-display font-extrabold mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>
    </main>
  )
}
