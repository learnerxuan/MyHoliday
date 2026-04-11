'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────
type StyleOption =
  | 'Adventure' | 'Culture' | 'Beach & Relax' | 'Nature'
  | 'Food & Cuisine' | 'Nightlife' | 'Wellness' | 'Urban' | 'Seclusion'

type Budget    = 'Budget' | 'Mid-range' | 'Luxury'
type Climate   = 'Tropical' | 'Warm' | 'Mild' | 'Cold/Snow'
type GroupSize = 'Solo' | 'Couple' | 'Small Group' | 'Large Group'
type Pace      = 'Relaxed' | 'Balanced' | 'Packed'

interface Preferences {
  styles:          StyleOption[]
  regions:         string[]
  budget:          Budget | ''
  climate:         Climate | ''
  pace:            Pace | ''
  groupSize:       GroupSize | ''
  travelDateStart: string
  travelDateEnd:   string
}

// ── Static data ──────────────────────────────────────────────
const STYLES: { value: StyleOption; icon: string; desc: string }[] = [
  { value: 'Adventure',      icon: '🏔️', desc: 'Hiking, climbing, thrills' },
  { value: 'Culture',        icon: '🏛️', desc: 'History, art, heritage'   },
  { value: 'Beach & Relax',  icon: '🏖️', desc: 'Sun, sand, chill vibes'  },
  { value: 'Nature',         icon: '🌿', desc: 'Wildlife, forests, parks' },
  { value: 'Food & Cuisine', icon: '🍜', desc: 'Local flavours, markets'  },
  { value: 'Nightlife',      icon: '🌙', desc: 'Bars, clubs, live music'  },
  { value: 'Wellness',       icon: '🧘', desc: 'Spas, retreats, yoga'     },
  { value: 'Urban',          icon: '🏙️', desc: 'City life, architecture'  },
  { value: 'Seclusion',      icon: '🌄', desc: 'Off-the-beaten-path'      },
]

const BUDGETS: { value: Budget; icon: string; desc: string }[] = [
  { value: 'Budget',    icon: '💰', desc: 'Hostels, street food, local transport'   },
  { value: 'Mid-range', icon: '💳', desc: 'Comfortable hotels, mix of dining'       },
  { value: 'Luxury',    icon: '✨', desc: 'Resorts, fine dining, private transfers' },
]

const CLIMATES: { value: Climate; icon: string; range: string }[] = [
  { value: 'Tropical',  icon: '☀️',  range: 'Above 28°C' },
  { value: 'Warm',      icon: '🌤️', range: '22–28°C'    },
  { value: 'Mild',      icon: '🍂', range: '15–22°C'    },
  { value: 'Cold/Snow', icon: '❄️',  range: 'Below 15°C' },
]

const GROUP_SIZES: { value: GroupSize; icon: string }[] = [
  { value: 'Solo',        icon: '🧍' },
  { value: 'Couple',      icon: '👫' },
  { value: 'Small Group', icon: '👨‍👩‍👧' },
  { value: 'Large Group', icon: '👥' },
]

const PACES: { value: Pace; icon: string; desc: string }[] = [
  { value: 'Relaxed',  icon: '☕', desc: '1–2 activities max, slow mornings' },
  { value: 'Balanced', icon: '🚶', desc: 'Good mix of touring and downtime' },
  { value: 'Packed',   icon: '🏃', desc: 'Action-packed, see as much as possible' },
]

const REGIONS = [
  { value: 'africa',        label: 'Africa',        icon: '🌍' },
  { value: 'asia',          label: 'Asia',          icon: '🌏' },
  { value: 'europe',        label: 'Europe',        icon: '🇪🇺' },
  { value: 'middle_east',   label: 'Middle East',   icon: '🕌' },
  { value: 'north_america', label: 'North America', icon: '🏔️' },
  { value: 'oceania',       label: 'Oceania',       icon: '🏝️' },
  { value: 'south_america', label: 'South America', icon: '🏜️' },
]

// ── Step indicator ───────────────────────────────────────────
const STEPS = ['Travel Style', 'Region', 'Budget', 'Climate', 'Pace', 'Group & Dates']

// ── Page ─────────────────────────────────────────────────────
export default function QuizPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [prefs, setPrefs] = useState<Preferences>({
    styles:          [],
    regions:         REGIONS.map(r => r.value), // Default to All
    budget:          '',
    climate:         '',
    pace:            '',
    groupSize:       '',
    travelDateStart: '',
    travelDateEnd:   '',
  })

  // ── Helpers ─────────────────────────────────────────────────
  const toggleStyle = (s: StyleOption) =>
    setPrefs(p => ({
      ...p,
      styles: p.styles.includes(s)
        ? p.styles.filter(x => x !== s)
        : [...p.styles, s],
    }))

  const toggleRegion = (r: string) =>
    setPrefs(p => ({
      ...p,
      regions: p.regions.includes(r)
        ? p.regions.filter(x => x !== r)
        : [...p.regions, r],
    }))

  const toggleAllRegions = () =>
    setPrefs(p => ({
      ...p,
      regions: p.regions.length === REGIONS.length ? [] : REGIONS.map(r => r.value),
    }))

  const canAdvance = () => {
    if (step === 0) return prefs.styles.length > 0
    if (step === 1) return prefs.regions.length > 0
    if (step === 2) return prefs.budget !== ''
    if (step === 3) return prefs.climate !== ''
    if (step === 4) return prefs.pace !== ''
    if (step === 5) return (
      prefs.groupSize !== '' &&
      prefs.travelDateStart !== '' &&
      prefs.travelDateEnd !== '' &&
      prefs.travelDateEnd > prefs.travelDateStart
    )
    return false
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/recommendation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ preferences: prefs }),
      })
      if (!res.ok) throw new Error('Recommendation request failed')
      const data = await res.json()

      // Store results in sessionStorage so the destinations page can read them
      sessionStorage.setItem('quiz_results',  JSON.stringify(data.destinations))
      sessionStorage.setItem('quiz_trip_meta', JSON.stringify(data.trip_meta))
      sessionStorage.setItem('quiz_prefs',     JSON.stringify(prefs))

      router.push('/destinations?from=quiz')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // today's date string for min attribute
  const today = new Date().toISOString().split('T')[0]

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-warmwhite flex flex-col">

      {/* Progress bar */}
      <div className="h-1 bg-border">
        <div
          className="h-full bg-amber transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-4 py-12">

        {/* Step labels */}
        <div className="flex gap-2 mb-10 flex-wrap justify-center">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`text-xs font-semibold font-body px-3 py-1 rounded-full transition-colors ${
                i === step
                  ? 'bg-charcoal text-warmwhite'
                  : i < step
                  ? 'bg-muted text-amber'
                  : 'bg-muted text-tertiary'
              }`}
            >
              {i < step ? '✓ ' : ''}{label}
            </span>
          ))}
        </div>

        <div className="w-full max-w-2xl">

          {/* ── Step 0: Travel Style ── */}
          {step === 0 && (
            <div>
              <h1 className="text-3xl font-extrabold font-display text-charcoal mb-2">
                What kind of traveller are you?
              </h1>
              <p className="text-sm font-body text-secondary mb-8">
                Select all styles that excite you — the more you pick, the better your matches.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {STYLES.map(s => {
                  const selected = prefs.styles.includes(s.value)
                  return (
                    <button
                      key={s.value}
                      onClick={() => toggleStyle(s.value)}
                      className={`flex flex-col gap-1 p-4 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-amber bg-amber/10 shadow-sm'
                          : 'border-border bg-white hover:border-amber/50'
                      }`}
                    >
                      <span className="text-2xl">{s.icon}</span>
                      <span className="text-sm font-semibold font-body text-charcoal">{s.value}</span>
                      <span className="text-xs font-body text-secondary">{s.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 1: Region ── */}
          {step === 1 && (
            <div>
              <h1 className="text-3xl font-extrabold font-display text-charcoal mb-2">
                Where do you want to go?
              </h1>
              <p className="text-sm font-body text-secondary mb-6">
                Limit your search to specific continents or explore the world.
              </p>
              
              <button
                onClick={toggleAllRegions}
                className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl border border-border bg-white hover:border-amber/50 transition-all w-full sm:w-max group"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  prefs.regions.length === REGIONS.length ? 'bg-amber border-amber' : 'border-border group-hover:border-amber/50'
                }`}>
                  {prefs.regions.length === REGIONS.length && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-sm font-bold font-body text-charcoal">
                  {prefs.regions.length === REGIONS.length ? 'Deselect All' : '(Select All)'}
                </span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {REGIONS.map(r => {
                  const selected = prefs.regions.includes(r.value)
                  return (
                    <button
                      key={r.value}
                      onClick={() => toggleRegion(r.value)}
                      className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-amber bg-amber/10 shadow-sm'
                          : 'border-border bg-white hover:border-amber/50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selected ? 'bg-amber border-amber' : 'border-border'
                      }`}>
                        {selected && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className="text-xl">{r.icon}</span>
                      <span className="text-sm font-semibold font-body text-charcoal">{r.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 2: Budget ── */}
          {step === 2 && (
            <div>
              <h1 className="text-3xl font-extrabold font-display text-charcoal mb-2">
                What&apos;s your budget style?
              </h1>
              <p className="text-sm font-body text-secondary mb-8">
                This helps us recommend destinations that match your spending comfort.
              </p>
              <div className="flex flex-col gap-4">
                {BUDGETS.map(b => {
                  const selected = prefs.budget === b.value
                  return (
                    <button
                      key={b.value}
                      onClick={() => setPrefs(p => ({ ...p, budget: b.value }))}
                      className={`flex items-center gap-4 p-5 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-amber bg-amber/10 shadow-sm'
                          : 'border-border bg-white hover:border-amber/50'
                      }`}
                    >
                      <span className="text-3xl">{b.icon}</span>
                      <div>
                        <p className="text-base font-semibold font-body text-charcoal">{b.value}</p>
                        <p className="text-sm font-body text-secondary">{b.desc}</p>
                      </div>
                      {selected && <span className="ml-auto text-amber text-lg">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Climate ── */}
          {step === 3 && (
            <div>
              <h1 className="text-3xl font-extrabold font-display text-charcoal mb-2">
                What weather do you prefer?
              </h1>
              <p className="text-sm font-body text-secondary mb-8">
                We score destinations against actual monthly temperature data for your travel dates.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {CLIMATES.map(c => {
                  const selected = prefs.climate === c.value
                  return (
                    <button
                      key={c.value}
                      onClick={() => setPrefs(p => ({ ...p, climate: c.value }))}
                      className={`flex flex-col items-center gap-2 p-6 rounded-xl border transition-all ${
                        selected
                          ? 'border-amber bg-amber/10 shadow-sm'
                          : 'border-border bg-white hover:border-amber/50'
                      }`}
                    >
                      <span className="text-4xl">{c.icon}</span>
                      <span className="text-sm font-semibold font-body text-charcoal">{c.value}</span>
                      <span className="text-xs font-body text-secondary">{c.range}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 4: Pace ── */}
          {step === 4 && (
            <div>
              <h1 className="text-3xl font-extrabold font-display text-charcoal mb-2">
                What pace suits you?
              </h1>
              <p className="text-sm font-body text-secondary mb-8">
                This helps the AI plan realistic daily schedules for your itinerary.
              </p>
              <div className="flex flex-col gap-4">
                {PACES.map(p => {
                  const selected = prefs.pace === p.value
                  return (
                    <button
                      key={p.value}
                      onClick={() => setPrefs(prev => ({ ...prev, pace: p.value }))}
                      className={`flex items-center gap-4 p-5 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-amber bg-amber/10 shadow-sm'
                          : 'border-border bg-white hover:border-amber/50'
                      }`}
                    >
                      <span className="text-3xl">{p.icon}</span>
                      <div>
                        <p className="text-base font-semibold font-body text-charcoal">{p.value}</p>
                        <p className="text-sm font-body text-secondary">{p.desc}</p>
                      </div>
                      {selected && <span className="ml-auto text-amber text-lg">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 5: Group & Dates ── */}
          {step === 5 && (
            <div>
              <h1 className="text-3xl font-extrabold font-display text-charcoal mb-2">
                Who&apos;s going, and when?
              </h1>
              <p className="text-sm font-body text-secondary mb-8">
                Trip duration is calculated from your dates — we use it to fine-tune your matches.
              </p>

              {/* Group size */}
              <p className="text-sm font-semibold font-body text-charcoal mb-3">Group size</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {GROUP_SIZES.map(g => {
                  const selected = prefs.groupSize === g.value
                  return (
                    <button
                      key={g.value}
                      onClick={() => setPrefs(p => ({ ...p, groupSize: g.value }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        selected
                          ? 'border-amber bg-amber/10 shadow-sm'
                          : 'border-border bg-white hover:border-amber/50'
                      }`}
                    >
                      <span className="text-3xl">{g.icon}</span>
                      <span className="text-xs font-semibold font-body text-charcoal">{g.value}</span>
                    </button>
                  )
                })}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold font-body text-charcoal mb-2">
                    Departure date
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={prefs.travelDateStart}
                    onChange={e => setPrefs(p => ({ ...p, travelDateStart: e.target.value }))}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold font-body text-charcoal mb-2">
                    Return date
                  </label>
                  <input
                    type="date"
                    min={prefs.travelDateStart || today}
                    value={prefs.travelDateEnd}
                    onChange={e => setPrefs(p => ({ ...p, travelDateEnd: e.target.value }))}
                    className="input-base"
                  />
                </div>
              </div>

              {/* Duration preview */}
              {prefs.travelDateStart && prefs.travelDateEnd && prefs.travelDateEnd > prefs.travelDateStart && (
                <div className="mt-4 p-3 rounded-lg bg-muted flex items-center gap-2">
                  <span className="text-sm">🗓️</span>
                  <span className="text-sm font-body text-charcoal">
                    {Math.round(
                      (new Date(prefs.travelDateEnd).getTime() - new Date(prefs.travelDateStart).getTime())
                      / (1000 * 60 * 60 * 24)
                    ) + 1} day trip
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 text-sm font-body text-error">{error}</p>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-10">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-sm font-semibold font-body text-secondary hover:text-charcoal transition-colors"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance()}
                className="bg-charcoal text-warmwhite font-semibold font-body text-sm py-3 px-8 rounded-md hover:bg-amber transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canAdvance() || loading}
                className="bg-amber text-warmwhite font-semibold font-body text-sm py-3 px-8 rounded-md hover:bg-amberdark transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-warmwhite/40 border-t-warmwhite rounded-full animate-spin" />
                    Finding your matches…
                  </>
                ) : (
                  'Find My Destinations ✨'
                )}
              </button>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}
