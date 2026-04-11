// ── Types ────────────────────────────────────────────────────
export interface Destination {
  id: string
  city: string
  country: string
  region: string
  short_description: string
  latitude: number
  longitude: number
  budget_level: string
  ideal_durations: string[]
  avg_temp_monthly: Record<string, { avg: number; max: number; min: number }> | null
  culture: number
  adventure: number
  nature: number
  beaches: number
  nightlife: number
  cuisine: number
  wellness: number
  urban: number
  seclusion: number
  categories: string | null
  best_time_to_visit: string | null
}

export interface UserPreferences {
  styles: string[]
  regions: string[]
  budget: string
  climate: string
  groupSize: string
  travelDateStart: string
  travelDateEnd: string
}

// ── Encoding Maps ────────────────────────────────────────────
const BUDGET_ENCODING: Record<string, number> = {
  'Budget':    0.0,
  'Mid-range': 0.5,
  'Luxury':    1.0,
}

const STYLE_TO_COLUMN: Record<string, string> = {
  'Adventure':      'adventure',
  'Culture':        'culture',
  'Beach & Relax':  'beaches',
  'Nature':         'nature',
  'Food & Cuisine': 'cuisine',
  'Nightlife':      'nightlife',
  'Wellness':       'wellness',
  'Urban':          'urban',
  'Seclusion':      'seclusion',
}

const CLIMATE_RANGES: Record<string, { min: number; max: number }> = {
  'Tropical':   { min: 28,  max: 50  },
  'Warm':       { min: 22,  max: 28  },
  'Mild':       { min: 15,  max: 22  },
  'Cold/Snow':  { min: -30, max: 15  },
}

// ── Helpers ──────────────────────────────────────────────────

function climateScore(
  avgTempMonthly: Record<string, { avg: number; max: number; min: number }> | null,
  travelMonth: number,
  climatePreference: string
): number {
  if (!avgTempMonthly) return 0.5
  const monthData = avgTempMonthly[String(travelMonth)]
  if (!monthData) return 0.5
  const destTemp = monthData.avg
  const range    = CLIMATE_RANGES[climatePreference]
  if (!range)    return 0.5
  if (destTemp >= range.min && destTemp <= range.max) return 1.0
  const distance = destTemp < range.min ? range.min - destTemp : destTemp - range.max
  return Math.max(0, 1 - distance / 15)
}

function buildDestinationVector(
  dest: Destination,
  travelMonth: number,
  climatePreference: string,
  durationEncoded: number
): number[] {
  const budget = BUDGET_ENCODING[dest.budget_level] ?? 0.5
  const durations: string[] = Array.isArray(dest.ideal_durations) ? dest.ideal_durations : []
  const durationFromData = durations.length > 0
    ? Math.max(...durations.map(d => ({
          'Weekend':    0.25,
          'Short trip': 0.5,
          'One week':   0.75,
          'Long trip':  1.0,
        }[d] ?? 0.5)))
    : 0.5
  const duration = (durationFromData + durationEncoded) / 2
  const climate = climateScore(dest.avg_temp_monthly, travelMonth, climatePreference)

  return [
    dest.culture/5, dest.adventure/5, dest.nature/5, dest.beaches/5,
    dest.nightlife/5, dest.cuisine/5, dest.wellness/5, dest.urban/5,
    dest.seclusion/5, budget, duration, climate
  ]
}

function buildUserVector(prefs: UserPreferences, durationEncoded: number): number[] {
  const styleVector: Record<string, number> = {
    culture: 0, adventure: 0, nature: 0, beaches: 0,
    nightlife: 0, cuisine: 0, wellness: 0, urban: 0, seclusion: 0,
  }
  for (const style of prefs.styles) {
    const column = STYLE_TO_COLUMN[style]
    if (column) styleVector[column] = 1.0
  }
  const budget = BUDGET_ENCODING[prefs.budget] ?? 0.5
  return [
    styleVector.culture, styleVector.adventure, styleVector.nature, styleVector.beaches,
    styleVector.nightlife, styleVector.cuisine, styleVector.wellness, styleVector.urban,
    styleVector.seclusion, budget, durationEncoded, 1.0
  ]
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot  = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return (magA === 0 || magB === 0) ? 0 : dot / (magA * magB)
}

export function inferPreferences(itineraries: any[], interactions: any[] = []): UserPreferences {
  // Styles scoring map
  const styleScores: Record<string, number> = {}
  const budgets: string[] = []
  const climates: string[] = []
  
  // 1. Process Saved Itineraries (Hard Signal - Weight 1.0)
  itineraries.forEach(it => {
    const meta = it.trip_metadata as any
    if (meta?.styles) {
      meta.styles.forEach((s: string) => {
        styleScores[s] = (styleScores[s] || 0) + 1.0
      })
    }
    if (meta?.budget) budgets.push(meta.budget)
    if (meta?.climate) climates.push(meta.climate)
  })

  // 2. Process Clicks (Interest Signal - Weight 0.8 - User requested "stronger impact")
  // interactions should come with the destination object joined
  interactions.forEach(inter => {
    const dest = inter.destinations
    if (!dest) return

    // Extract styles from destination columns
    const possibleStyles = [
      { key: 'culture',   label: 'Culture' },
      { key: 'adventure', label: 'Adventure' },
      { key: 'nature',    label: 'Nature' },
      { key: 'beaches',   label: 'Beach & Relax' },
      { key: 'nightlife', label: 'Nightlife' },
      { key: 'cuisine',   label: 'Food & Cuisine' },
      { key: 'wellness',  label: 'Wellness' },
      { key: 'urban',     label: 'Urban' },
      { key: 'seclusion', label: 'Seclusion' }
    ]

    possibleStyles.forEach(s => {
      // If the destination scores high (>=3) in this style, record interest
      if ((dest[s.key] || 0) >= 3) {
        styleScores[s.label] = (styleScores[s.label] || 0) + 0.8
      }
    })
    
    // Also consider clicked budgets/climate if available
    if (dest.budget_level) budgets.push(dest.budget_level)
  })

  // Get top 3 styles by weighted score
  const topStyles = Object.entries(styleScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([style]) => style)

  // Fallbacks if no data
  const finalStyles = topStyles.length > 0 ? topStyles : ['Culture', 'Urban']

  const topBudget = budgets.length > 0
    ? budgets.sort((a,b) => budgets.filter(v => v===b).length - budgets.filter(v => v===a).length).pop() || 'Mid-range'
    : 'Mid-range'

  const topClimate = climates.length > 0
    ? climates.sort((a,b) => climates.filter(v => v===b).length - climates.filter(v => v===a).length).pop() || 'Warm'
    : 'Warm'

  return {
    styles: finalStyles,
    regions: ['africa', 'asia', 'europe', 'middle_east', 'north_america', 'oceania', 'south_america'],
    budget: topBudget,
    climate: topClimate,
    groupSize: 'Couple',
    travelDateStart: new Date().toISOString().split('T')[0],
    travelDateEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }
}

export function scoreDestinations(
  destinations: Destination[],
  prefs: UserPreferences
) {
  const start = new Date(prefs.travelDateStart)
  const end   = new Date(prefs.travelDateEnd)
  const ms    = end.getTime() - start.getTime()
  const durationDays = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1)
  
  const encoded = durationDays <= 3 ? 0.25 : durationDays <= 6 ? 0.5 : durationDays <= 10 ? 0.75 : 1.0
  const travelMonth = new Date(prefs.travelDateStart).getMonth() + 1

  const userVector = buildUserVector(prefs, encoded)

  return destinations.map(dest => {
    const destVector = buildDestinationVector(dest, travelMonth, prefs.climate, encoded)
    const similarity = cosineSimilarity(userVector, destVector)
    return {
      ...dest,
      match_score: Math.round(similarity * 100),
      trip_duration_days: durationDays
    }
  }).sort((a, b) => b.match_score - a.match_score)
}
