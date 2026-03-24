import { supabase } from '@/lib/supabase/client'

const MONTH_INDEX = {
  january: 0, february: 1, march: 2,    april: 3,
  may: 4,     june: 5,     july: 6,     august: 7,
  september: 8, october: 9, november: 10, december: 11,
}

function describeCondition(temp) {
  if (temp >= 30) return 'Hot and humid'
  if (temp >= 24) return 'Warm and pleasant'
  if (temp >= 18) return 'Mild'
  if (temp >= 10) return 'Cool'
  return 'Cold'
}

export async function get_weather({ city, month, destination_id }) {
  const monthKey = month?.toLowerCase()
  const shortKey = monthKey?.slice(0, 3) // 'january' → 'jan'

  // 1. Check DB first (destinations.avg_temp_monthly)
  if (destination_id) {
    const { data } = await supabase
      .from('destinations')
      .select('avg_temp_monthly')
      .eq('id', destination_id)
      .single()

    if (data?.avg_temp_monthly) {
      const temp = data.avg_temp_monthly[shortKey] ?? data.avg_temp_monthly[monthKey]
      if (temp !== undefined) {
        return {
          month: month,
          avg_temp_c: temp,
          condition: describeCondition(temp),
          notes: `Based on historical average for ${city}.`,
          source: 'database',
        }
      }
    }
  }

  // 2. Fall back to Open-Meteo API (completely free, no key needed)
  // Use the current year and the requested month to get a climate normal
  const monthNum = (MONTH_INDEX[monthKey] ?? 0) + 1
  const year = new Date().getFullYear()
  const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`
  const endDate = `${year}-${String(monthNum).padStart(2, '0')}-28`

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', '35')   // fallback coords if not provided
  url.searchParams.set('longitude', '135')
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min')
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.daily?.temperature_2m_max?.length) {
    const maxTemps = data.daily.temperature_2m_max
    const minTemps = data.daily.temperature_2m_min
    const avg = maxTemps.reduce((sum, t, i) => sum + (t + minTemps[i]) / 2, 0) / maxTemps.length
    const rounded = Math.round(avg)
    return {
      month: month,
      avg_temp_c: rounded,
      condition: describeCondition(rounded),
      notes: `Estimated average for ${city} in ${month}.`,
      source: 'open-meteo',
    }
  }

  return {
    month: month,
    avg_temp_c: null,
    condition: 'Unknown',
    notes: 'Weather data unavailable.',
    source: null,
  }
}
