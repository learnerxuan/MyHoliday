'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Destination = { id: string; city: string; country: string }

export default function GuideOnboarding() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    city_id: '',
    document: null as File | null,
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      // Skip if guide profile already exists
      const { data: existing } = await supabase
        .from('tour_guides')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) { router.replace('/guide/marketplace'); return }

      setUser(user)
      setForm(f => ({ ...f, full_name: user.user_metadata?.full_name ?? '' }))

      // Fetch cities from destinations table
      const { data: cities } = await supabase
        .from('destinations')
        .select('id, city, country')
        .order('city')

      if (cities) setDestinations(cities)
    }

    init()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !form.document) {
      setError('Please upload your guide licence or ID document.')
      return
    }
    setSaving(true)
    setError('')

    try {
      // 1. Upload document to Supabase Storage
      const fileExt = form.document.name.split('.').pop()
      const filePath = `${user.id}/document.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('guide-documents')
        .upload(filePath, form.document, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('guide-documents')
        .getPublicUrl(filePath)

      // 2. Insert tour_guides row
      const { error: insertError } = await supabase
        .from('tour_guides')
        .insert({
          user_id: user.id,
          full_name: form.full_name,
          city_id: form.city_id || null,
          document_url: publicUrlData.publicUrl,
          verification_status: 'pending',
        })

      if (insertError) throw insertError

      // 3. Set role in user metadata
      await supabase.auth.updateUser({ data: { role: 'guide' } })

      setDone(true)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  if (!user) return null

  // Success screen
  if (done) {
    return (
      <main className="min-h-screen bg-warmwhite flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-extrabold font-display text-charcoal">
            Application Submitted!
          </h1>
          <p className="text-sm font-body text-secondary leading-relaxed">
            Your guide account is <strong>pending admin approval</strong>.
            We'll review your documents and notify you once verified.
            This usually takes 1–2 business days.
          </p>
          <button
            onClick={() => router.replace('/')}
            className="py-2.5 px-5 rounded-xl bg-amber hover:bg-amberdark transition-colors text-sm font-semibold font-body text-white"
          >
            Back to Home
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-warmwhite flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold font-display text-charcoal">
            Become a <span className="text-amber">Tour Guide</span>
          </h1>
          <p className="mt-2 text-sm font-body text-secondary">
            Complete your profile to connect with travellers in your city.
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

          {/* City selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
              Your City
            </label>
            <select
              required
              value={form.city_id}
              onChange={e => setForm(f => ({ ...f, city_id: e.target.value }))}
              className="w-full py-2.5 px-3.5 rounded-xl border border-border text-sm font-body text-charcoal focus:outline-none focus:border-amber transition-colors bg-white"
            >
              <option value="" disabled>Select the city you guide in</option>
              {destinations.map(d => (
                <option key={d.id} value={d.id}>
                  {d.city}, {d.country}
                </option>
              ))}
            </select>
          </div>

          {/* Document upload */}
          <div className="space-y-1">
            <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
              Guide Licence / ID Document
            </label>
            <div className="border-2 border-dashed border-border rounded-xl p-5 text-center hover:border-amber transition-colors">
              <input
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png"
                id="doc-upload"
                className="hidden"
                onChange={e => setForm(f => ({ ...f, document: e.target.files?.[0] ?? null }))}
              />
              <label htmlFor="doc-upload" className="cursor-pointer">
                {form.document ? (
                  <p className="text-sm font-body text-charcoal">
                    📄 {form.document.name}
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-semibold font-body text-amber">
                      Click to upload
                    </p>
                    <p className="text-xs font-body text-tertiary mt-1">
                      PDF, JPG, or PNG — max 10MB
                    </p>
                  </>
                )}
              </label>
            </div>
            <p className="text-xs font-body text-tertiary">
              Upload your official guide licence or government-issued ID for verification.
            </p>
          </div>

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
            {saving ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </main>
  )
}
