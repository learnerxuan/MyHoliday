import { getUserGrowthData, getDashboardStats } from '@/lib/actions/reports'
import UserGrowthChart from '@/components/admin/UserGrowthChart'
import { Users, MapPin, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const [growthData, stats] = await Promise.all([
    getUserGrowthData(),
    getDashboardStats()
  ])

  return (
    <main className="min-h-screen bg-warmwhite py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-display font-extrabold text-charcoal">Admin Analytics</h1>
          <p className="text-secondary font-body mt-2">Track platform growth and user activity.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard 
            title="Total Travellers" 
            value={stats.travellerCount} 
            icon={<Users className="w-6 h-6 text-amber" />} 
            description="Active traveller profiles"
          />
          <StatCard 
            title="Total Guides" 
            value={stats.guideCount} 
            icon={<MapPin className="w-6 h-6 text-charcoal" />} 
            description="Certified local experts"
          />
          <StatCard 
            title="Pending Requests" 
            value={stats.pendingGuides} 
            icon={<Clock className="w-6 h-6 text-amber" />} 
            description="Applications awaiting review"
            highlight={stats.pendingGuides > 0}
          />
        </div>

        {/* Growth Chart */}
        <UserGrowthChart data={growthData} />
      </div>
    </main>
  )
}

function StatCard({ 
  title, 
  value, 
  icon, 
  description, 
  highlight = false 
}: { 
  title: string
  value: number
  icon: React.ReactNode
  description: string
  highlight?: boolean
}) {
  return (
    <div className="bg-white rounded-3xl border border-border p-6 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${highlight ? 'bg-amber/10' : 'bg-black/5'}`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest font-body">Current</span>
      </div>
      <h3 className="text-secondary text-sm font-semibold font-body mb-1">{title}</h3>
      <p className="text-4xl font-display font-extrabold text-charcoal mb-2">{value}</p>
      <p className="text-xs text-tertiary font-body mt-auto">{description}</p>
    </div>
  )
}
