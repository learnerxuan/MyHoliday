import Link from 'next/link'
import {
  AlertTriangle,
  Bot,
  CircleDollarSign,
  ClipboardList,
  Compass,
  HandCoins,
  ShieldCheck,
  Users
} from 'lucide-react'
import MarketplaceLiveStats from '@/components/admin/MarketplaceLiveStats'
import { getAdminDashboardData } from '@/lib/actions/reports'

export const dynamic = 'force-dynamic'

const currency = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  maximumFractionDigits: 0
})

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData()

  const kpis = [
    {
      title: 'Active Travellers',
      value: data.activeTravellers.toLocaleString(),
      detail: 'Traveller profiles marked active',
      icon: Users,
      tone: 'text-blue-600 bg-blue-50'
    },
    {
      title: 'Approved Guides',
      value: data.approvedGuides.toLocaleString(),
      detail: 'Ready to receive marketplace offers',
      icon: ShieldCheck,
      tone: 'text-emerald-600 bg-emerald-50'
    },
    {
      title: 'Open AI Sessions',
      value: data.openAiSessions.toLocaleString(),
      detail: 'Unfinished planning sessions',
      icon: Bot,
      tone: 'text-violet-600 bg-violet-50'
    },
    {
      title: 'Suspended Listings',
      value: data.suspendedListings.toLocaleString(),
      detail: 'Hidden from guide marketplace view',
      icon: AlertTriangle,
      tone: data.suspendedListings > 0 ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-50'
    },
    {
      title: 'Completed GMV',
      value: currency.format(data.completedGmv),
      detail: 'Completed transaction volume',
      icon: CircleDollarSign,
      tone: 'text-amber bg-amber/10'
    },
    {
      title: 'Platform Revenue',
      value: currency.format(data.platformRevenue),
      detail: 'Service charge from completed transactions',
      icon: HandCoins,
      tone: 'text-charcoal bg-black/5'
    }
  ]

  return (
    <main className="min-h-screen bg-warmwhite py-10 px-6">
      <div className="max-w-6xl mx-auto font-body text-charcoal">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold">Admin Dashboard</h1>
            <p className="text-secondary mt-2 text-sm">Live operations, action queues, and current platform health.</p>
          </div>
          <Link
            href="/admin/reports"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-charcoal text-white text-sm font-semibold hover:bg-black transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            View Reports
          </Link>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
          {kpis.map(item => {
            const Icon = item.icon
            return (
              <div key={item.title} className="bg-white border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.tone}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-tertiary font-bold">Current</span>
                </div>
                <h2 className="text-sm font-semibold text-secondary mb-1">{item.title}</h2>
                <p className="text-3xl font-display font-black text-charcoal">{item.value}</p>
                <p className="text-xs text-tertiary mt-3">{item.detail}</p>
              </div>
            )
          })}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          <ActionCard
            title="Guide Approvals"
            value={data.pendingGuides}
            description="Applications waiting for admin review."
            href="/admin/tour-guides/requests"
            action="Review requests"
          />
          <ActionCard
            title="Suspended Listings"
            value={data.suspendedListings}
            description="Marketplace listings currently hidden from guides."
            href="/admin/marketplace"
            action="Open marketplace"
          />
          <ActionCard
            title="Listings With No Offers"
            value={data.listingsWithNoOffers}
            description="Traveller plans that may need guide supply attention."
            href="/admin/marketplace"
            action="Check listings"
          />
        </section>

        <MarketplaceLiveStats
          initialListingsCount={data.listingsCount}
          initialListingsWithNoOffers={data.listingsWithNoOffers}
          initialOffers={data.offers}
        />

        <section className="bg-white p-8 rounded-3xl shadow-sm border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-display font-bold text-charcoal">Top 3 Most Clicked Destinations</h2>
              <p className="text-sm text-secondary mt-1">Based on recorded destination click interactions.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-widest">
              <Compass className="w-3 h-3" />
              Live Trends
            </span>
          </div>

          {data.topClickedDestinations.length > 0 ? (
            <div className="space-y-6">
              {data.topClickedDestinations.map((dest, index) => (
                <div key={`${dest.city}-${dest.country}`} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 ? 'bg-amber/15 text-amberdark' :
                    index === 1 ? 'bg-slate-100 text-slate-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-end gap-3 mb-1">
                      <span className="font-bold text-charcoal truncate">{dest.city}</span>
                      <span className="text-sm text-secondary font-medium whitespace-nowrap">{dest.click_count} clicks</span>
                    </div>
                    <div className="w-full bg-subtle h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber"
                        style={{ width: `${(dest.click_count / data.topClickedDestinations[0].click_count) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-tertiary mt-1 block">{dest.country}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-subtle rounded-2xl">
              <p className="text-lg font-semibold text-charcoal">No click interaction data yet</p>
              <p className="text-sm text-secondary mt-1">Destination clicks will appear here once travellers browse the catalogue.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function ActionCard({
  title,
  value,
  description,
  href,
  action
}: {
  title: string
  value: number
  description: string
  href: string
  action: string
}) {
  const active = value > 0

  return (
    <div className={`bg-white border rounded-3xl p-6 shadow-sm ${active ? 'border-amber/40' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-charcoal">{title}</h2>
          <p className="text-xs text-secondary mt-1 leading-5">{description}</p>
        </div>
        <span className={`min-w-10 h-10 px-3 rounded-2xl flex items-center justify-center font-display font-black ${
          active ? 'bg-amber/10 text-amberdark' : 'bg-black/5 text-secondary'
        }`}>
          {value}
        </span>
      </div>
      <Link href={href} className="inline-flex text-sm font-semibold text-amberdark hover:text-charcoal transition-colors">
        {action}
      </Link>
    </div>
  )
}
