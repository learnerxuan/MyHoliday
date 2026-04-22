'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'


const NATIONALITIES = [
  'Malaysian', 'Indonesian', 'Singaporean', 'Thai', 'Filipino',
  'Vietnamese', 'Chinese', 'Japanese', 'Korean', 'Indian',
  'Australian', 'British', 'American', 'Other',
]

const LANGUAGES = ['English', 'Malay', 'Mandarin', 'Tamil', 'Other']

const DIETS = ['None', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free']

export default function TravellerOnboarding() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    nationality: '',
    dietary_restrictions: 'None',
    accessibility_needs: false,
    preferred_language: 'English',
  })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth/login'); return }

      // Check if profile already exists — skip onboarding
      const { data } = await supabase
        .from('traveller_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) { router.replace('/'); return }

      setUser(user)
      setForm(f => ({
        ...f,
        full_name: user.user_metadata?.full_name ?? '',
      }))
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')

    try {
      const { error: insertError } = await supabase
        .from('traveller_profiles')
        .insert({
          user_id: user.id,
          full_name: form.full_name,
          date_of_birth: form.date_of_birth || null,
          nationality: form.nationality,
          dietary_restrictions: form.dietary_restrictions,
          accessibility_needs: form.accessibility_needs,
          preferred_language: form.preferred_language,
        })

      if (insertError) throw insertError

      await supabase.auth.updateUser({ data: { role: 'traveller' } })
      router.replace('/')
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-warmwhite flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold font-display text-charcoal">
            Welcome to <span className="text-amber">MyHoliday</span>
          </h1>
          <p className="mt-2 text-sm font-body text-secondary">
            Tell us a little about yourself so we can personalise your experience.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-md border border-border px-8 py-10 space-y-5"
        >
          {/* Full name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
              className="w-full py-2.5 px-3.5 rounded-xl border border-border text-sm font-body text-charcoal placeholder:text-tertiary focus:outline-none focus:border-amber transition-colors"
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
              Date of Birth <span className="text-tertiary font-normal normal-case">(optional)</span>
            </label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
              className="w-full py-2.5 px-3.5 rounded-xl border border-border text-sm font-body text-charcoal focus:outline-none focus:border-amber transition-colors"
            />
          </div>

          {/* Nationality */}
          <div className="space-y-1">
            <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
              Nationality
            </label>
            <select
              required
              value={form.nationality}
              onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
              className="w-full py-2.5 px-3.5 rounded-xl border border-border text-sm font-body text-charcoal focus:outline-none focus:border-amber transition-colors bg-white"
            >
              <option value="" disabled>Select nationality</option>
              {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>

          {/* Dietary restrictions */}
          <div className="space-y-1">
            <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
              Dietary Restrictions
            </label>
            <select
              value={form.dietary_restrictions}
              onChange={e => setForm(f => ({ ...f, dietary_restrictions: e.target.value }))}
              className="w-full py-2.5 px-3.5 rounded-xl border border-border text-sm font-body text-charcoal focus:outline-none focus:border-amber transition-colors bg-white"
            >
              {DIETS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Preferred language */}
          <div className="space-y-1">
            <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
              Preferred Language
            </label>
            <select
              value={form.preferred_language}
              onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))}
              className="w-full py-2.5 px-3.5 rounded-xl border border-border text-sm font-body text-charcoal focus:outline-none focus:border-amber transition-colors bg-white"
            >
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>

          {/* Accessibility needs */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.accessibility_needs}
              onChange={e => setForm(f => ({ ...f, accessibility_needs: e.target.checked }))}
              className="h-4 w-4 accent-amber"
            />
            <span className="text-sm font-body text-charcoal">
              I have accessibility needs
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-sm font-body text-error bg-error-bg rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 px-5 rounded-xl bg-amber hover:bg-amberdark active:bg-amberdark transition-colors text-sm font-semibold font-body text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving && <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Start Exploring →'}
          </button>
        </form>
      </div>
    </main>
  )
}
