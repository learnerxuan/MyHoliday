import { supabase } from '@/lib/supabase/client'

const MONTH_INDEX = {
  jan: '1', january: '1',
  feb: '2', february: '2',
  mar: '3', march: '3',
  apr: '4', april: '4',
  may: '5',
  jun: '6', june: '6',
  jul: '7', july: '7',
  aug: '8', august: '8',
  sep: '9', september: '9',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
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
  const dbMonthKey = MONTH_INDEX[monthKey]

  let lat = 35   // default fallback (Japan)
  let lng = 135

  // 1. Check DB first (destinations.avg_temp_monthly)
  if (destination_id) {
    const { data } = await supabase
      .from('destinations')
      .select('avg_temp_monthly, latitude, longitude')
      .eq('id', destination_id)
      .single()

    if (data) {
      // Record actual coordinates for fallback API accuracy
      if (data.latitude) lat = data.latitude
      if (data.longitude) lng = data.longitude

      if (dbMonthKey && data.avg_temp_monthly) {
        const monthData = data.avg_temp_monthly[dbMonthKey]
        if (monthData?.avg !== undefined) {
          const temp = monthData.avg
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
  }

  // 2. Fall back to Open-Meteo API (completely free, no key needed)
  // Use the current year and the requested month to get a climate normal
  const monthNum = Number(dbMonthKey || (new Date().getMonth() + 1))
  const year = new Date().getFullYear()
  const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`
  const endDate = `${year}-${String(monthNum).padStart(2, '0')}-28`

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
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
