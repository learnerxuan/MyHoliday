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

// ── Budget string normalisation ───────────────────────────────
// chat_sessions.planner_state stores budget_profile in lowercase
// (e.g. "mid-range"), while the rest of the system uses title-case
// "Mid-range". Normalise so frequency counting works correctly.
function normaliseBudget(raw: string): string {
  if (!raw || raw === 'unknown') return ''
  const map: Record<string, string> = {
    'budget':    'Budget',
    'mid-range': 'Mid-range',
    'midrange':  'Mid-range',
    'luxury':    'Luxury',
  }
  return map[raw.toLowerCase()] ?? raw
}

// ── Exported Helpers ─────────────────────────────────────────

/**
 * Extract a click-count map of countries the user has interacted with
 * across clicks, saved itineraries, and chat sessions.
 * Used to apply a country affinity boost in discovery ranking.
 *
 * @returns Map<country, clickCount>
 */
export function extractPreferredCountries(
  interactions: any[],
  itineraries: any[],
  chatSessions: any[] = []
): Map<string, number> {
  const counts = new Map<string, number>()

  // Clicks carry the strongest country signal
  interactions.forEach(inter => {
    const country = inter.destinations?.country
    if (country) counts.set(country, (counts.get(country) || 0) + 1)
  })

  // Saved itineraries — if trip_metadata stores the destination country
  itineraries.forEach(it => {
    const meta = it.trip_metadata as any
    if (meta?.country) counts.set(meta.country, (counts.get(meta.country) || 0) + 1)
  })

  // Chat sessions — country of the destination the user planned for
  chatSessions.forEach(session => {
    const country = session.destinations?.country
    if (country) counts.set(country, (counts.get(country) || 0) + 1)
  })

  return counts
}

/**
 * Infer user preferences from all available behavioural signals.
 *
 * Signal weights:
 *   Saved itineraries  → styles/budget/regions  (weight 1.0)
 *   Click interactions → styles/budget/regions  (weight 0.8)
 *   Chat sessions      → styles/budget/regions  (weight 0.9)
 *
 * @param itineraries  Rows from `itineraries` table with `trip_metadata`
 * @param interactions Rows from `user_interactions` joined with `destinations(*)`
 * @param chatSessions Rows from `chat_sessions` joined with `destinations(region)`
 */
export function inferPreferences(
  itineraries: any[],
  interactions: any[] = [],
  chatSessions: any[] = []
): UserPreferences {
  const styleScores: Record<string, number> = {}
  const budgets: string[] = []
  const climates: string[] = []
  const preferredRegions = new Set<string>()

  // ── 1. Saved Itineraries (Hard Signal — weight 1.0) ──────────
  itineraries.forEach(it => {
    const meta = it.trip_metadata as any
    if (meta?.styles) {
      meta.styles.forEach((s: string) => {
        styleScores[s] = (styleScores[s] || 0) + 1.0
      })
    }
    if (meta?.budget) budgets.push(meta.budget)
    if (meta?.climate) climates.push(meta.climate)
    if (Array.isArray(meta?.regions)) {
      meta.regions.forEach((r: string) => preferredRegions.add(r))
    }
  })

  // ── 2. Click Interactions (Interest Signal — weight 0.8) ──────
  const possibleStyles = [
    { key: 'culture',   label: 'Culture' },
    { key: 'adventure', label: 'Adventure' },
    { key: 'nature',    label: 'Nature' },
    { key: 'beaches',   label: 'Beach & Relax' },
    { key: 'nightlife', label: 'Nightlife' },
    { key: 'cuisine',   label: 'Food & Cuisine' },
    { key: 'wellness',  label: 'Wellness' },
    { key: 'urban',     label: 'Urban' },
    { key: 'seclusion', label: 'Seclusion' },
  ]

  interactions.forEach(inter => {
    const dest = inter.destinations
    if (!dest) return

    possibleStyles.forEach(s => {
      // If destination scores >= 3 in a category, record style interest
      if ((dest[s.key] || 0) >= 3) {
        styleScores[s.label] = (styleScores[s.label] || 0) + 0.8
      }
    })

    if (dest.budget_level) budgets.push(dest.budget_level)

    // Infer region from the actual destination.region column
    if (dest.region) preferredRegions.add(dest.region)
  })

  // ── 3. Chat Sessions (Strong Interest Signal — weight 0.9) ────
  chatSessions.forEach(session => {
    const state = session.planner_state as any
    if (!state) return

    // preferred_styles from planner_state are exact display labels
    if (Array.isArray(state.preferred_styles)) {
      state.preferred_styles.forEach((s: string) => {
        styleScores[s] = (styleScores[s] || 0) + 0.9
      })
    }

    // budget_profile stored lowercase in planner_state — normalise
    if (state.budget_profile && state.budget_profile !== 'unknown') {
      const normalised = normaliseBudget(state.budget_profile)
      if (normalised) budgets.push(normalised)
    }

    // Region from the destination the user chatted about
    // (joined via destinations(region) in the DB query)
    const chatDestRegion = session.destinations?.region
    if (chatDestRegion) preferredRegions.add(chatDestRegion)
  })

  // ── Resolve top styles (up to 3) ─────────────────────────────
  const topStyles = Object.entries(styleScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([style]) => style)

  const finalStyles = topStyles.length > 0 ? topStyles : ['Culture', 'Urban']

  // ── Resolve budget (most frequent wins) ───────────────────────
  const topBudget = budgets.length > 0
    ? budgets
        .sort((a, b) => budgets.filter(v => v === b).length - budgets.filter(v => v === a).length)
        .pop() || 'Mid-range'
    : 'Mid-range'

  // ── Resolve climate (most frequent wins) ──────────────────────
  const topClimate = climates.length > 0
    ? climates
        .sort((a, b) => climates.filter(v => v === b).length - climates.filter(v => v === a).length)
        .pop() || 'Warm'
    : 'Warm'

  // ── Resolve regions from destinations.region ─────────────────
  // Regions are inferred from clicked/saved/chatted destination rows.
  // Fall back to all regions only when there are zero signals.
  const ALL_REGIONS = [
    'africa', 'asia', 'europe', 'middle_east',
    'north_america', 'oceania', 'south_america'
  ]
  const finalRegions = preferredRegions.size > 0
    ? Array.from(preferredRegions)
    : ALL_REGIONS

  return {
    styles: finalStyles,
    regions: finalRegions,
    budget: topBudget,
    climate: topClimate,
    groupSize: 'Couple',
    travelDateStart: new Date().toISOString().split('T')[0],
    travelDateEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
