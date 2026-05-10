"use client"

import { useEffect, useMemo, useState } from 'react'
import CountrySelect from '@/components/ui/CountrySelect'
import { supabase } from '@/lib/supabase/client'
import { ACCOMMODATION_TYPES, TRANSPORTATION_TYPES } from '@/lib/survey-options'

type Destination = {
  id: string
  city: string
  country: string
}

const initialForm = {
  destination: '',
  duration_days: '',
  traveler_age: '',
  traveler_gender: '',
  traveler_nationality: '',
  accommodation_type: '',
  accommodation_cost: '',
  transportation_type: '',
  transportation_cost: ''
}

export default function SurveyPage() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destinationQuery, setDestinationQuery] = useState('')
  const [showDestinations, setShowDestinations] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function loadDestinations() {
      const { data } = await supabase
        .from('destinations')
        .select('id, city, country')
        .order('city')

      if (data) setDestinations(data)
    }

    loadDestinations()
  }, [])

  const filteredDestinations = useMemo(() => {
    const query = destinationQuery.trim().toLowerCase()
    if (!query) return destinations
    return destinations.filter(destination =>
      `${destination.city} ${destination.country}`.toLowerCase().includes(query)
    )
  }, [destinationQuery, destinations])

  const updateField = (field: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
    setErrors(current => {
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    const duration = Number(form.duration_days)
    const age = Number(form.traveler_age)
    const accommodationCost = Number(form.accommodation_cost)
    const transportationCost = Number(form.transportation_cost)

    if (!form.destination) nextErrors.destination = 'Please select a destination from the list.'
    if (!Number.isInteger(duration) || duration < 1 || duration > 365) nextErrors.duration_days = 'Enter 1 to 365 days.'
    if (!Number.isInteger(age) || age < 1 || age > 120) nextErrors.traveler_age = 'Enter an age from 1 to 120.'
    if (!form.traveler_gender) nextErrors.traveler_gender = 'Select a gender.'
    if (!form.traveler_nationality) nextErrors.traveler_nationality = 'Select a nationality.'
    if (!form.accommodation_type) nextErrors.accommodation_type = 'Select an accommodation type.'
    if (!Number.isFinite(accommodationCost) || accommodationCost <= 0) nextErrors.accommodation_cost = 'Enter a cost greater than 0.'
    if (!form.transportation_type) nextErrors.transportation_type = 'Select a transportation type.'
    if (!Number.isFinite(transportationCost) || transportationCost <= 0) nextErrors.transportation_cost = 'Enter a cost greater than 0.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setSaving(true)
    setSubmitted(false)

    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          duration_days: Number(form.duration_days),
          traveler_age: Number(form.traveler_age),
          accommodation_cost: Number(form.accommodation_cost),
          transportation_cost: Number(form.transportation_cost)
        })
      })

      const result = await response.json()
      if (!response.ok) {
        setErrors(result.errors || { form: result.error || 'Failed to submit survey.' })
        return
      }

      setForm(initialForm)
      setDestinationQuery('')
      setSubmitted(true)
    } catch (error: any) {
      setErrors({ form: error?.message || 'Failed to submit survey.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-warmwhite flex flex-col -mt-7 md:-mt-6 p-4 sm:p-6 pb-20 font-body">
      <section className="max-w-7xl mx-auto w-full bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden flex flex-col">
        <div
          className="text-warmwhite relative overflow-hidden pt-8 sm:pt-10 px-4 sm:px-10 pb-8 sm:pb-10"
          style={{ background: '#0f0f0f' }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(196,135,74,0.22) 0%, transparent 70%),' +
                'radial-gradient(ellipse 40% 40% at 20% 80%, rgba(196,135,74,0.10) 0%, transparent 65%)',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/10 text-amber text-xs font-semibold px-3 py-1 rounded-full border border-amber/20 mb-3 uppercase tracking-widest">
                Travel Survey
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold font-display mb-4 text-warmwhite leading-tight">
                Share Your Trip Data
              </h1>
              <p className="text-sm sm:text-[15px] font-body text-warmwhite/80 leading-relaxed max-w-lg">
                Help improve MyHoliday destination insights by submitting one completed or planned trip profile.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 md:mt-0 max-w-sm w-full">
              {[
                ['01', 'Choose destination'],
                ['02', 'Add traveller details'],
                ['03', 'Share trip spending'],
                ['04', 'Improve insights']
              ].map(([step, label]) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
                  <div className="text-[10px] font-extrabold text-amber uppercase tracking-widest mb-2">{step}</div>
                  <div className="text-[12px] sm:text-[13px] text-warmwhite/90 font-medium leading-snug">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-10 pt-6 sm:pt-8 pb-12 sm:pb-16 bg-[#FAFAFA] flex-1 space-y-6 text-charcoal">
          {submitted && (
            <div className="rounded-2xl bg-success-bg text-success px-4 py-3 text-sm font-semibold border border-success/10">
              Thank you. Your survey response has been submitted.
            </div>
          )}
          {errors.form && (
            <div className="rounded-2xl bg-error-bg text-error px-4 py-3 text-sm font-semibold border border-error/10">
              {errors.form}
            </div>
          )}

          <section className="bg-[#FDFCFB] p-6 sm:p-8 rounded-[24px] border border-border/40 shadow-sm">
            <SectionHeading title="Trip Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Destination" error={errors.destination}>
                <div className="relative">
                  <input
                    type="text"
                    value={destinationQuery}
                    onFocus={() => setShowDestinations(true)}
                    onChange={event => {
                      setDestinationQuery(event.target.value)
                      updateField('destination', '')
                      setShowDestinations(true)
                    }}
                    placeholder="Search destination..."
                    className={`input-base bg-white h-[44px] ${form.destination ? 'border-green-500/60' : ''}`}
                  />
                  {form.destination && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      Selected
                    </span>
                  )}
                  {showDestinations && (
                    <>
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto overscroll-contain">
                        {filteredDestinations.length > 0 ? (
                          filteredDestinations.map(destination => (
                            <button
                              key={destination.id}
                              type="button"
                              onClick={() => {
                                updateField('destination', destination.city)
                                setDestinationQuery(`${destination.city}, ${destination.country}`)
                                setShowDestinations(false)
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-none"
                            >
                              <span className="block text-sm font-bold text-charcoal">{destination.city}</span>
                              <span className="block text-[11px] text-secondary">{destination.country}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-4 text-center text-xs text-tertiary font-body italic">
                            No matching destinations found.
                          </div>
                        )}
                      </div>
                      <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowDestinations(false)} />
                    </>
                  )}
                </div>
              </Field>

              <Field label="Duration (days)" error={errors.duration_days}>
                <input
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  value={form.duration_days}
                  onChange={event => updateField('duration_days', event.target.value)}
                  className="input-base bg-white h-[44px]"
                  placeholder="7"
                />
              </Field>
            </div>
          </section>

          <section className="bg-[#FDFCFB] p-6 sm:p-8 rounded-[24px] border border-border/40 shadow-sm">
            <SectionHeading title="Traveller Details" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="Age" error={errors.traveler_age}>
                <input
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  value={form.traveler_age}
                  onChange={event => updateField('traveler_age', event.target.value)}
                  className="input-base bg-white h-[44px]"
                  placeholder="28"
                />
              </Field>
              <Field label="Gender" error={errors.traveler_gender}>
                <select value={form.traveler_gender} onChange={event => updateField('traveler_gender', event.target.value)} className="input-base bg-white h-[44px]">
                  <option value="" disabled>Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </Field>
              <Field label="Nationality" error={errors.traveler_nationality}>
                <CountrySelect
                  value={form.traveler_nationality}
                  onChange={value => updateField('traveler_nationality', value)}
                  placeholder="Search nationality..."
                />
              </Field>
            </div>
          </section>

          <section className="bg-[#FDFCFB] p-6 sm:p-8 rounded-[24px] border border-border/40 shadow-sm">
            <SectionHeading title="Trip Spending" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Accommodation type" error={errors.accommodation_type}>
                <select value={form.accommodation_type} onChange={event => updateField('accommodation_type', event.target.value)} className="input-base bg-white h-[44px]">
                  <option value="" disabled>Select accommodation</option>
                  {ACCOMMODATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Accommodation cost (USD)" error={errors.accommodation_cost}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.accommodation_cost}
                  onChange={event => updateField('accommodation_cost', event.target.value)}
                  className="input-base bg-white h-[44px]"
                  placeholder="700"
                />
              </Field>
              <Field label="Transportation type" error={errors.transportation_type}>
                <select value={form.transportation_type} onChange={event => updateField('transportation_type', event.target.value)} className="input-base bg-white h-[44px]">
                  <option value="" disabled>Select transportation</option>
                  {TRANSPORTATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Transportation cost (USD)" error={errors.transportation_cost}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.transportation_cost}
                  onChange={event => updateField('transportation_cost', event.target.value)}
                  className="input-base bg-white h-[44px]"
                  placeholder="250"
                />
              </Field>
            </div>
          </section>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-[10px] bg-amber text-white text-[15px] font-bold tracking-wide hover:bg-amberdark transition-colors shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Submitting...' : 'Submit Survey'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-charcoal font-display">{title}</h2>
      <div className="flex-1 h-[1px] bg-border/60 ml-6 hidden sm:block" />
    </div>
  )
}

function Field({
  label,
  error,
  children
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider block">{label}</label>
      {children}
      {error && <p className="text-xs text-error font-semibold">{error}</p>}
    </div>
  )
}
