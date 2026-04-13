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
    <div className="w-full bg-[#F5F2EE] min-h-screen pb-24 pt-8 sm:pt-12 px-4 sm:px-6 lg:px-8 font-body delay-100">

      {/* Progress Bar Container */}
      <div className="max-w-[800px] mx-auto mb-8">
        <div className="flex gap-2 sm:gap-3">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-full h-1.5 rounded-full transition-colors ${i <= step ? 'bg-[#C4874A]' : 'bg-[#E5E0DA]'}`} />
              {/* Show full list on Desktop */}
              <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-center hidden sm:block ${i <= step ? 'text-[#1A1A1A]' : 'text-secondary'}`}>
                 {i + 1}. {label}
              </span>
              {/* Show only active step on Mobile */}
              <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-center block sm:hidden ${i === step ? 'text-[#1A1A1A]' : 'hidden'}`}>
                 {i + 1}. {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[800px] mx-auto p-6 sm:p-10 lg:p-12 bg-white rounded-[24px] shadow-sm border border-border/50">

        {/* ── Step 0: Travel Style ── */}
        {step === 0 && (
          <div>
            <div className="text-center mb-10">
              <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] text-[#1A1A1A] mb-3">
                What kind of traveller are you?
              </h1>
              <p className="text-[#888] text-[15px] max-w-[500px] mx-auto">
                Select all travel styles that excite you — the more you pick, the better your matches.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {STYLES.map(s => {
                const selected = prefs.styles.includes(s.value)
                return (
                  <button
                    key={s.value}
                    onClick={() => toggleStyle(s.value)}
                    className={`relative p-6 rounded-[16px] text-left transition-all ${
                      selected
                        ? 'border-2 border-[#C4874A] bg-[#F0EBE3]'
                        : 'border-2 border-[#EBEBEB] bg-white hover:border-[#1A1A1A]/30'
                    }`}
                  >
                    {selected && <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#C4874A] text-white flex items-center justify-center text-[12px] font-bold shadow-sm">✓</div>}
                    <div className="text-[32px] sm:text-[36px] mb-4">{s.icon}</div>
                    <div className="text-[15px] sm:text-[16px] font-bold text-[#1A1A1A] mb-1.5">{s.value}</div>
                    <div className="text-[13px] text-[#666] leading-relaxed">{s.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 1: Region ── */}
        {step === 1 && (
          <div>
            <div className="text-center mb-10">
              <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] text-[#1A1A1A] mb-3">
                Where do you want to go?
              </h1>
              <p className="text-[#888] text-[15px] max-w-[500px] mx-auto">
                Limit your search to specific continents or explore the world.
              </p>
            </div>
            
            <button
              onClick={toggleAllRegions}
              className={`flex items-center gap-3 mb-6 px-5 py-4 rounded-[12px] border-2 transition-all w-full sm:w-max mx-auto group ${prefs.regions.length === REGIONS.length ? 'border-[#C4874A] bg-[#F0EBE3]' : 'border-[#EBEBEB] bg-white hover:border-[#1A1A1A]/30'}`}
            >
              <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-colors ${
                prefs.regions.length === REGIONS.length ? 'bg-[#C4874A] border-[#C4874A]' : 'border-[#E5E0DA]'
              }`}>
                {prefs.regions.length === REGIONS.length && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className="text-[14px] font-bold text-[#1A1A1A]">
                {prefs.regions.length === REGIONS.length ? 'Deselect All' : 'Select All Regions'}
              </span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {REGIONS.map(r => {
                const selected = prefs.regions.includes(r.value)
                return (
                  <button
                    key={r.value}
                    onClick={() => toggleRegion(r.value)}
                    className={`flex items-center gap-4 p-5 rounded-[16px] border-2 text-left transition-all relative ${
                      selected
                        ? 'border-[#C4874A] bg-[#F0EBE3]'
                        : 'border-[#EBEBEB] bg-white hover:border-[#1A1A1A]/30'
                    }`}
                  >
                    {selected && <div className="absolute top-1/2 -translate-y-1/2 right-5 w-5 h-5 rounded-[6px] bg-[#C4874A] text-white flex items-center justify-center text-[12px] font-bold">✓</div>}
                    <span className="text-[28px]">{r.icon}</span>
                    <span className="text-[15px] font-bold text-[#1A1A1A]">{r.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Budget ── */}
        {step === 2 && (
          <div>
            <div className="text-center mb-10">
              <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] text-[#1A1A1A] mb-3">
                What&apos;s your budget style?
              </h1>
              <p className="text-[#888] text-[15px] max-w-[500px] mx-auto">
                This helps us recommend destinations that match your spending comfort.
              </p>
            </div>

            <div className="flex flex-col gap-4 mb-8 max-w-[600px] mx-auto">
              {BUDGETS.map(b => {
                const selected = prefs.budget === b.value
                return (
                  <button
                    key={b.value}
                    onClick={() => setPrefs(p => ({ ...p, budget: b.value }))}
                    className={`flex items-center gap-5 p-5 sm:p-6 rounded-[16px] border-2 text-left transition-all relative ${
                      selected
                        ? 'border-[#C4874A] bg-[#F0EBE3]'
                        : 'border-[#EBEBEB] bg-white hover:border-[#1A1A1A]/30'
                    }`}
                  >
                    <span className="text-[32px]">{b.icon}</span>
                    <div className="pr-10">
                      <p className="text-[16px] font-bold text-[#1A1A1A] mb-1">{b.value}</p>
                      <p className="text-[13px] text-[#666] leading-relaxed">{b.desc}</p>
                    </div>
                    {selected && <div className="absolute top-1/2 -translate-y-1/2 right-6 w-6 h-6 rounded-full bg-[#C4874A] text-white flex items-center justify-center text-[12px] font-bold shadow-sm">✓</div>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: Climate ── */}
        {step === 3 && (
          <div>
            <div className="text-center mb-10">
              <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] text-[#1A1A1A] mb-3">
                What weather do you prefer?
              </h1>
              <p className="text-[#888] text-[15px] max-w-[500px] mx-auto">
                We score destinations against actual temperature data for your travel dates.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {CLIMATES.map(c => {
                const selected = prefs.climate === c.value
                return (
                  <button
                    key={c.value}
                    onClick={() => setPrefs(p => ({ ...p, climate: c.value }))}
                    className={`flex flex-col items-center gap-2 p-6 rounded-[16px] border-2 transition-all relative ${
                      selected
                        ? 'border-[#C4874A] bg-[#F0EBE3]'
                        : 'border-[#EBEBEB] bg-white hover:border-[#1A1A1A]/30'
                    }`}
                  >
                    {selected && <div className="absolute top-3 right-3 w-5 h-5 rounded-[6px] bg-[#C4874A] text-white flex items-center justify-center text-[10px] font-bold">✓</div>}
                    <span className="text-[40px] mb-2">{c.icon}</span>
                    <span className="text-[15px] font-bold text-[#1A1A1A] text-center">{c.value}</span>
                    <span className="text-[12px] text-[#666]">{c.range}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 4: Pace ── */}
        {step === 4 && (
          <div>
             <div className="text-center mb-10">
              <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] text-[#1A1A1A] mb-3">
                What pace suits you?
              </h1>
              <p className="text-[#888] text-[15px] max-w-[500px] mx-auto">
                This helps the AI plan realistic daily schedules for your itinerary.
              </p>
            </div>

            <div className="flex flex-col gap-4 mb-8 max-w-[600px] mx-auto">
              {PACES.map(p => {
                const selected = prefs.pace === p.value
                return (
                  <button
                    key={p.value}
                    onClick={() => setPrefs(prev => ({ ...prev, pace: p.value }))}
                    className={`flex items-center gap-5 p-5 sm:p-6 rounded-[16px] border-2 text-left transition-all relative ${
                      selected
                        ? 'border-[#C4874A] bg-[#F0EBE3]'
                        : 'border-[#EBEBEB] bg-white hover:border-[#1A1A1A]/30'
                    }`}
                  >
                    <span className="text-[32px]">{p.icon}</span>
                    <div className="pr-10">
                      <p className="text-[16px] font-bold text-[#1A1A1A] mb-1">{p.value}</p>
                      <p className="text-[13px] text-[#666] leading-relaxed">{p.desc}</p>
                    </div>
                    {selected && <div className="absolute top-1/2 -translate-y-1/2 right-6 w-6 h-6 rounded-full bg-[#C4874A] text-white flex items-center justify-center text-[12px] font-bold shadow-sm">✓</div>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 5: Group & Dates ── */}
        {step === 5 && (
          <div>
            <div className="text-center mb-10">
              <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] text-[#1A1A1A] mb-3">
                Who&apos;s going, and when?
              </h1>
              <p className="text-[#888] text-[15px] max-w-[500px] mx-auto">
                Trip duration is calculated from your dates — we use it to fine-tune your matches.
              </p>
            </div>

            <div className="max-w-[700px] mx-auto bg-[#FAF9F7] border border-[#E5E0DA] rounded-[24px] p-6 lg:p-8 mb-8">
              {/* Group size */}
              <div className="mb-8">
                 <div className="text-[12px] font-bold text-[#888] uppercase tracking-[1px] mb-4">Group Size</div>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                   {GROUP_SIZES.map(g => {
                     const selected = prefs.groupSize === g.value
                     return (
                       <button
                         key={g.value}
                         onClick={() => setPrefs(p => ({ ...p, groupSize: g.value }))}
                         className={`flex flex-col items-center justify-center py-4 px-2 rounded-[12px] border-2 transition-all relative ${
                           selected
                             ? 'border-[#C4874A] bg-[#F0EBE3]'
                             : 'border-[#EBEBEB] bg-white hover:border-[#1A1A1A]/20'
                         }`}
                       >
                         {selected && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#C4874A] text-white flex items-center justify-center text-[9px] font-bold">✓</div>}
                         <span className="text-[28px] mb-1.5">{g.icon}</span>
                         <span className="text-[12px] font-bold text-[#1A1A1A] text-center">{g.value}</span>
                       </button>
                     )
                   })}
                 </div>
              </div>

              {/* Dates */}
              <div>
                 <div className="text-[12px] font-bold text-[#888] uppercase tracking-[1px] mb-4">Travel Dates</div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   <div>
                     <label className="block text-[13px] font-bold text-[#1A1A1A] mb-2">Departure date</label>
                     <input
                       type="date"
                       min={today}
                       value={prefs.travelDateStart}
                       onChange={e => setPrefs(p => ({ ...p, travelDateStart: e.target.value }))}
                       className="w-full bg-white border-2 border-[#EBEBEB] hover:border-[#1A1A1A]/30 focus:border-[#C4874A] outline-none rounded-[12px] px-4 py-3 text-[14px] text-charcoal font-medium transition-colors"
                     />
                   </div>
                   <div>
                     <label className="block text-[13px] font-bold text-[#1A1A1A] mb-2">Return date</label>
                     <input
                       type="date"
                       min={prefs.travelDateStart || today}
                       value={prefs.travelDateEnd}
                       onChange={e => setPrefs(p => ({ ...p, travelDateEnd: e.target.value }))}
                       className="w-full bg-white border-2 border-[#EBEBEB] hover:border-[#1A1A1A]/30 focus:border-[#C4874A] outline-none rounded-[12px] px-4 py-3 text-[14px] text-charcoal font-medium transition-colors"
                     />
                   </div>
                 </div>

                 {/* Duration preview */}
                 {prefs.travelDateStart && prefs.travelDateEnd && prefs.travelDateEnd > prefs.travelDateStart && (
                   <div className="mt-5 p-4 rounded-[12px] bg-[#EAF3DE] border border-[#3B6D11]/20 flex items-center gap-3">
                     <span className="text-[18px]">🗓️</span>
                     <span className="text-[14px] font-bold text-[#3B6D11]">
                       Calculated duration: {Math.round(
                         (new Date(prefs.travelDateEnd).getTime() - new Date(prefs.travelDateStart).getTime())
                         / (1000 * 60 * 60 * 24)
                       ) + 1} days long.
                     </span>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 text-[14px] text-error text-center font-semibold bg-red-50 p-4 rounded-[12px]">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-8 mt-4 border-t border-[#EBEBEB]">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="text-[14px] font-bold text-[#888] hover:text-[#1A1A1A] bg-transparent border-none outline-none cursor-pointer px-0 py-2 transition-colors"
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
              className="bg-[#1A1A1A] text-white font-bold text-[14px] py-3.5 px-8 rounded-xl hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-none outline-none"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canAdvance() || loading}
              className="bg-[#1A1A1A] text-white font-bold text-[14px] py-3.5 px-8 rounded-xl hover:bg-[#C4874A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 border-none outline-none"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
  )
}
