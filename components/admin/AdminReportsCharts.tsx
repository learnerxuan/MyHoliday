'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { ReactNode } from 'react'
import type { AdminReportsData } from '@/lib/actions/reports'

const palette = ['#C4874A', '#1A1A1A', '#3B82F6', '#10B981', '#F43F5E', '#94A3B8', '#8B6A3E']

const chartMargin = { top: 8, right: 18, left: 0, bottom: 8 }

export default function AdminReportsCharts({ data }: { data: AdminReportsData }) {
  const maxFunnel = Math.max(...data.journeyFunnel.map(item => item.value), 1)

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartPanel
          title="User And Guide Growth"
          description="Monthly registration trend for traveller profiles and tour guide accounts."
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.growth} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDE9" />
              <XAxis dataKey="month" tickFormatter={formatMonth} axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="travellers" name="Travellers" stroke="#C4874A" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="guides" name="Guides" stroke="#1A1A1A" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Full Journey Funnel"
          description="Counts through the main traveller journey. Values are raw counts, not unique users for every stage."
        >
          <div className="space-y-4">
            {data.journeyFunnel.map((item, index) => (
              <div key={item.name}>
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="text-sm font-semibold text-charcoal">{index + 1}. {item.name}</span>
                  <span className="text-sm text-secondary font-bold">{item.value.toLocaleString()}</span>
                </div>
                <div className="h-3 bg-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber rounded-full"
                    style={{ width: `${Math.max((item.value / maxFunnel) * 100, item.value > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartPanel>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartPanel
          title="Marketplace Status"
          description="Listing status distribution and offer outcomes."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DonutChart data={data.marketplace.listingStatus} title="Listings" />
            <DonutChart data={data.marketplace.offerStatus} title="Offers" />
          </div>
        </ChartPanel>

        <ChartPanel
          title="AI Planner Engagement"
          description="Itinerary creation volume grouped by week."
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.aiPlanner.itineraryVolume} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDE9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="value" name="Itineraries" stroke="#C4874A" fill="#C4874A" fillOpacity={0.18} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartPanel
          title="Destination Demand"
          description="Top destinations across listings, saved itineraries, and interactions."
        >
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data.destinations.topDestinations} margin={chartMargin} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0EDE9" />
              <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis dataKey="destination" type="category" width={120} axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="interactions" name="Interactions" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              <Bar dataKey="listings" name="Listings" fill="#C4874A" radius={[0, 6, 6, 0]} />
              <Bar dataKey="itineraries" name="Itineraries" fill="#1A1A1A" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Supply Vs Demand"
          description="Marketplace listings compared with approved guides by destination."
        >
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data.destinations.supplyDemand} margin={chartMargin} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0EDE9" />
              <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis dataKey="destination" type="category" width={120} axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="listings" name="Listings" fill="#C4874A" radius={[0, 6, 6, 0]} />
              <Bar dataKey="approvedGuides" name="Approved Guides" fill="#10B981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartPanel
          title="Accommodation Mix"
          description="Historical trip dataset distribution by accommodation type."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.mlDataset.accommodationMix} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDE9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Records" fill="#8B6A3E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Transportation Mix"
          description="Historical trip dataset distribution by transportation type."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.mlDataset.transportMix} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDE9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Records" fill="#1A1A1A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>
    </div>
  )
}

function DonutChart({ data, title }: { data: Array<{ name: string; value: number }>; title: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return (
      <div className="min-h-[260px] rounded-2xl bg-subtle flex flex-col items-center justify-center text-center p-6">
        <p className="font-semibold text-charcoal">No {title.toLowerCase()} data</p>
        <p className="text-sm text-secondary mt-1">This chart will populate when records exist.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[260px] flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={palette[index % palette.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <p className="font-display font-black text-2xl text-charcoal">{total.toLocaleString()}</p>
      <p className="text-xs uppercase tracking-widest text-tertiary font-bold">{title}</p>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
        {data.map((item, index) => (
          <span key={item.name} className="inline-flex items-center gap-1 text-xs text-secondary">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
            {item.name}: {item.value}
          </span>
        ))}
      </div>
    </div>
  )
}

function ChartPanel({
  title,
  description,
  children
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-display font-extrabold text-charcoal">{title}</h2>
        <p className="text-secondary text-sm mt-1">{description}</p>
      </div>
      {children}
    </div>
  )
}

function formatMonth(value: string) {
  const [year, month] = value.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('en', { month: 'short' })
}

const tooltipStyle = {
  borderRadius: '14px',
  border: '1px solid #EBEBEB',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)',
  padding: '12px'
}
