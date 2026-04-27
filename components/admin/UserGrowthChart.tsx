'use client'

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { GrowthData } from '@/lib/actions/reports'

export default function UserGrowthChart({ data }: { data: GrowthData[] }) {
  const formatXAxis = (tickItem: string) => {
    const [year, month] = tickItem.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('default', { month: 'short' })
  }

  return (
    <div className="w-full bg-white rounded-3xl border border-border p-8 shadow-sm">
      <div className="mb-8">
        <h2 className="text-xl font-display font-extrabold text-charcoal">User Growth</h2>
        <p className="text-secondary text-sm font-body">Comparison of monthly sign-ups for Travellers and Guides.</p>
      </div>
      
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDE9" />
            <XAxis 
              dataKey="month" 
              tickFormatter={formatXAxis}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#888', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#888', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                padding: '12px'
              }}
            />
            <Legend verticalAlign="top" height={36}/>
            <Line 
              type="monotone" 
              dataKey="travellers" 
              name="Travellers"
              stroke="#C4874A" 
              strokeWidth={4}
              dot={{ r: 4, fill: '#C4874A', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={1500}
            />
            <Line 
              type="monotone" 
              dataKey="guides" 
              name="Guides"
              stroke="#1A1A1A" 
              strokeWidth={4}
              dot={{ r: 4, fill: '#1A1A1A', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
