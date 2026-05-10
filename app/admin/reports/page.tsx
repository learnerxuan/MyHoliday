import {
  Activity,
  Bot,
  CircleDollarSign,
  HandCoins,
  Landmark,
  MessageSquareText,
  ShieldCheck,
  TrendingUp,
  Users
} from 'lucide-react'
import type { ReactNode } from 'react'
import AdminReportActions from '@/components/admin/AdminReportActions'
import AdminReportsCharts from '@/components/admin/AdminReportsCharts'
import { getAdminReportsData } from '@/lib/actions/reports'

export const dynamic = 'force-dynamic'

const currency = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  maximumFractionDigits: 0
})

export default async function AdminReportsPage() {
  const data = await getAdminReportsData()

  return (
    <main className="min-h-screen bg-warmwhite py-12 px-6">
      <div className="max-w-7xl mx-auto font-body text-charcoal">
        <div className="mb-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <h1 className="text-4xl font-display font-extrabold text-charcoal">Admin Analytics</h1>
            <p className="text-secondary mt-2">
              Historical performance, marketplace conversion, destination demand, and dataset health.
            </p>
          </div>
          <AdminReportActions data={data} />
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
          <StatCard
            title="Total Travellers"
            value={data.overview.totalTravellers.toLocaleString()}
            description={`${data.overview.activeTravellers.toLocaleString()} active traveller profiles`}
            icon={<Users className="w-5 h-5" />}
            tone="text-blue-600 bg-blue-50"
          />
          <StatCard
            title="Approved Guides"
            value={data.overview.approvedGuides.toLocaleString()}
            description="Guides available for marketplace supply"
            icon={<ShieldCheck className="w-5 h-5" />}
            tone="text-emerald-600 bg-emerald-50"
          />
          <StatCard
            title="Completed GMV"
            value={currency.format(data.overview.completedGmv)}
            description={`${data.overview.completedTransactions.toLocaleString()} completed transactions`}
            icon={<CircleDollarSign className="w-5 h-5" />}
            tone="text-amberdark bg-amber/10"
          />
          <StatCard
            title="Platform Revenue"
            value={currency.format(data.overview.platformRevenue)}
            description="Service charge from completed transactions"
            icon={<HandCoins className="w-5 h-5" />}
            tone="text-charcoal bg-black/5"
          />
          <StatCard
            title="Average Transaction"
            value={currency.format(data.overview.averageTransactionValue)}
            description="ATV for completed transactions"
            icon={<Landmark className="w-5 h-5" />}
            tone="text-violet-600 bg-violet-50"
          />
          <StatCard
            title="Match Rate"
            value={`${data.marketplace.matchRate.toFixed(1)}%`}
            description="Confirmed listings divided by all listings"
            icon={<TrendingUp className="w-5 h-5" />}
            tone="text-success bg-success-bg"
          />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <InsightCard
            title="AI Completion Rate"
            value={`${data.aiPlanner.completionRate.toFixed(1)}%`}
            description="Completed chat sessions divided by all chat sessions."
            icon={<Bot className="w-5 h-5" />}
          />
          <InsightCard
            title="Avg Messages / Session"
            value={data.aiPlanner.averageMessagesPerSession.toFixed(1)}
            description="Total planner messages divided by all chat sessions."
            icon={<MessageSquareText className="w-5 h-5" />}
          />
          <InsightCard
            title="Avg Offers / Listing"
            value={data.marketplace.averageOffersPerListing.toFixed(1)}
            description="Marketplace competitiveness across all listings."
            icon={<Activity className="w-5 h-5" />}
          />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <DatasetCard title="Historical Records" value={data.mlDataset.totalRecords} detail="Rows in historical_trips" />
          <DatasetCard title="Dataset Destinations" value={data.mlDataset.distinctDestinations} detail="Distinct historical destinations" />
          <DatasetCard title="Avg Trip Duration" value={Number(data.mlDataset.averageDuration.toFixed(1))} detail="Days in historical trip data" />
        </section>

        <AdminReportsCharts data={data} />
      </div>
      <style>{`
        @media print {
          .no-print,
          nav,
          header,
          footer,
          [aria-label="Open Next.js Dev Tools"] {
            display: none !important;
          }

          body {
            background: white !important;
          }

          main {
            padding: 0 !important;
            background: white !important;
          }

          main * {
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  )
}

function StatCard({
  title,
  value,
  description,
  icon,
  tone
}: {
  title: string
  value: string
  description: string
  icon: ReactNode
  tone: string
}) {
  return (
    <div className="bg-white rounded-3xl border border-border p-6 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${tone}`}>{icon}</div>
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Current</span>
      </div>
      <h3 className="text-secondary text-sm font-semibold mb-1">{title}</h3>
      <p className="text-3xl font-display font-extrabold text-charcoal mb-2">{value}</p>
      <p className="text-xs text-tertiary mt-auto leading-5">{description}</p>
    </div>
  )
}

function InsightCard({
  title,
  value,
  description,
  icon
}: {
  title: string
  value: string
  description: string
  icon: ReactNode
}) {
  return (
    <div className="bg-white border border-border rounded-3xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-subtle flex items-center justify-center text-amberdark">
          {icon}
        </div>
        <p className="text-3xl font-display font-black text-charcoal">{value}</p>
      </div>
      <h2 className="font-bold text-charcoal">{title}</h2>
      <p className="text-sm text-secondary mt-1 leading-6">{description}</p>
    </div>
  )
}

function DatasetCard({ title, value, detail }: { title: string; value: number; detail: string }) {
  return (
    <div className="bg-charcoal text-white rounded-3xl p-6 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-white/60 font-bold">{title}</p>
      <p className="text-3xl font-display font-black mt-3">{value.toLocaleString()}</p>
      <p className="text-sm text-white/70 mt-2">{detail}</p>
    </div>
  )
}
