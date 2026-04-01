import { createSupabaseServerClient } from '@/lib/supabase/server'

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

// Climate preference → ideal temperature range (°C)
const CLIMATE_RANGES: Record<string, { min: number; max: number }> = {
  'Tropical':   { min: 28,  max: 50  },
  'Warm':       { min: 22,  max: 28  },
  'Mild':       { min: 15,  max: 22  },
  'Cold/Snow':  { min: -30, max: 15  },
}

// ── Types ────────────────────────────────────────────────────
interface UserPreferences {
  styles: string[]        // e.g. ['Adventure', 'Food & Cuisine']
  budget: string          // e.g. 'Mid-range'
  climate: string         // e.g. 'Tropical'
  groupSize: string       // e.g. 'Couple' — passed to AI, not scored
  travelDateStart: string // e.g. '2026-12-10'
  travelDateEnd: string   // e.g. '2026-12-18'
}

interface Destination {
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

interface ScoredDestination extends Destination {
  match_score: number
  trip_duration_days: number
  travel_date_start: string
  travel_date_end: string
}

// ── Duration Helper ──────────────────────────────────────────

/**
 * Derive trip duration in days from start and end dates.
 */
function getTripDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end   = new Date(endDate)
  const ms    = end.getTime() - start.getTime()
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
}

/**
 * Encode trip duration (days) to 0–1.
 */
function encodeDuration(days: number): number {
  if (days <= 3)  return 0.25  // Weekend
  if (days <= 6)  return 0.5   // Short trip
  if (days <= 10) return 0.75  // One week
  return 1.0                   // Long trip
}

/**
 * Get human-readable duration label from days.
 */
export function getDurationLabel(days: number): string {
  if (days <= 3)  return 'Weekend'
  if (days <= 6)  return 'Short trip'
  if (days <= 10) return 'One week'
  return 'Long trip'
}

// ── Climate Helper ───────────────────────────────────────────

/**
 * Score how well a destination's temperature in the travel month
 * matches the user's climate preference.
 * Returns 0–1.
 */
function climateScore(
  avgTempMonthly: Record<string, { avg: number; max: number; min: number }> | null,
  travelMonth: number, // 1–12
  climatePreference: string
): number {
  if (!avgTempMonthly) return 0.5 // neutral if no data

  const monthData = avgTempMonthly[String(travelMonth)]
  if (!monthData) return 0.5

  const destTemp = monthData.avg
  const range    = CLIMATE_RANGES[climatePreference]
  if (!range)    return 0.5

  // Perfect match — temp is within preferred range
  if (destTemp >= range.min && destTemp <= range.max) return 1.0

  // How far outside the range is the temperature?
  const distance = destTemp < range.min
    ? range.min - destTemp
    : destTemp - range.max

  // Score drops off linearly — 0 score at 15°C outside the range
  return Math.max(0, 1 - distance / 15)
}

// ── Vector Builders ──────────────────────────────────────────

/**
 * Build a feature vector for a destination.
 * All values normalized to 0–1.
 * Vector: [culture, adventure, nature, beaches, nightlife, cuisine,
 *          wellness, urban, seclusion, budget, duration, climate]
 */
function buildDestinationVector(
  dest: Destination,
  travelMonth: number,
  climatePreference: string,
  durationEncoded: number
): number[] {
  const budget  = BUDGET_ENCODING[dest.budget_level] ?? 0.5

  // Duration — take max score across ideal durations, then blend with
  // the user's actual trip duration (helps rank destinations that fit
  // the trip length even if they list multiple ideal durations)
  const durations: string[] = Array.isArray(dest.ideal_durations)
    ? dest.ideal_durations
    : []
  const durationFromData = durations.length > 0
    ? Math.max(...durations.map(d => {
        const map: Record<string, number> = {
          'Weekend':    0.25,
          'Short trip': 0.5,
          'One week':   0.75,
          'Long trip':  1.0,
        }
        return map[d] ?? 0.5
      }))
    : 0.5

  // Blend the two duration signals equally
  const duration = (durationFromData + durationEncoded) / 2

  const climate = climateScore(
    dest.avg_temp_monthly,
    travelMonth,
    climatePreference
  )

  return [
    dest.culture    / 5,
    dest.adventure  / 5,
    dest.nature     / 5,
    dest.beaches    / 5,
    dest.nightlife  / 5,
    dest.cuisine    / 5,
    dest.wellness   / 5,
    dest.urban      / 5,
    dest.seclusion  / 5,
    budget,
    duration,
    climate,
  ]
}

/**
 * Build a feature vector for the user.
 * Multiple style selections → max strategy (each selected = 1.0).
 */
function buildUserVector(
  prefs: UserPreferences,
  durationEncoded: number
): number[] {
  const styleVector: Record<string, number> = {
    culture:   0,
    adventure: 0,
    nature:    0,
    beaches:   0,
    nightlife: 0,
    cuisine:   0,
    wellness:  0,
    urban:     0,
    seclusion: 0,
  }

  for (const style of prefs.styles) {
    const column = STYLE_TO_COLUMN[style]
    if (column) styleVector[column] = 1.0
  }

  const budget  = BUDGET_ENCODING[prefs.budget] ?? 0.5
  // User's climate preference is always a perfect match from their side
  const climate = 1.0

  return [
    styleVector.culture,
    styleVector.adventure,
    styleVector.nature,
    styleVector.beaches,
    styleVector.nightlife,
    styleVector.cuisine,
    styleVector.wellness,
    styleVector.urban,
    styleVector.seclusion,
    budget,
    durationEncoded,
    climate,
  ]
}

/**
 * Compute cosine similarity between two vectors.
 * Returns 0–1.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dot  = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  if (magA === 0 || magB === 0) return 0
  return dot / (magA * magB)
}

// ── API Handler ──────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const prefs: UserPreferences = body.preferences

    // Validate required fields
    if (
      !prefs?.styles?.length ||
      !prefs?.budget ||
      !prefs?.climate ||
      !prefs?.travelDateStart ||
      !prefs?.travelDateEnd
    ) {
      return Response.json(
        { error: 'Missing required preferences: styles, budget, climate, travelDateStart, travelDateEnd' },
        { status: 400 }
      )
    }

    // Derive duration and travel month from dates
    const durationDays    = getTripDurationDays(prefs.travelDateStart, prefs.travelDateEnd)
    const durationEncoded = encodeDuration(durationDays)
    const travelMonth     = new Date(prefs.travelDateStart).getMonth() + 1 // 1–12

    // Fetch all destinations
    const supabase = await createSupabaseServerClient()
    const { data: destinationsArray, error: dbError } = await supabase
      .from('destinations')
      .select(`
        id, city, country, region, short_description,
        latitude, longitude, budget_level, ideal_durations,
        avg_temp_monthly,
        culture, adventure, nature, beaches, nightlife,
        cuisine, wellness, urban, seclusion,
        categories, best_time_to_visit
      `)

    if (dbError || !destinationsArray) {
      throw new Error(dbError?.message || 'Failed to fetch destinations')
    }

    const destinations: Destination[] = destinationsArray

    // Build user vector
    const userVector = buildUserVector(prefs, durationEncoded)

    // Score each destination
    const scored: ScoredDestination[] = destinations.map(dest => {
      const destVector  = buildDestinationVector(
        dest,
        travelMonth,
        prefs.climate,
        durationEncoded
      )
      const similarity  = cosineSimilarity(userVector, destVector)
      const match_score = Math.round(similarity * 100)

      return {
        ...dest,
        match_score,
        trip_duration_days: durationDays,
        travel_date_start:  prefs.travelDateStart,
        travel_date_end:    prefs.travelDateEnd,
      }
    })

    // Sort by match score descending
    scored.sort((a, b) => b.match_score - a.match_score)

    // Return top 20 results alongside trip metadata
    return Response.json({
      destinations: scored.slice(0, 20),
      trip_meta: {
        duration_days:  durationDays,
        duration_label: getDurationLabel(durationDays),
        travel_month:   travelMonth,
        date_start:     prefs.travelDateStart,
        date_end:       prefs.travelDateEnd,
        group_size:     prefs.groupSize,
        climate:        prefs.climate,
      },
    })

  } catch (error) {
    console.error('Recommendation engine error:', error)
    return Response.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}