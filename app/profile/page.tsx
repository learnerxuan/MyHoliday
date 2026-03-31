'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NATIONALITIES = [
  'Malaysian', 'Indonesian', 'Singaporean', 'Thai', 'Filipino',
  'Vietnamese', 'Chinese', 'Japanese', 'Korean', 'Indian',
  'Australian', 'British', 'American', 'Other',
]
const LANGUAGES = ['English', 'Malay', 'Mandarin', 'Tamil', 'Other']
const DIETS = ['None', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free']

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Traveller form state
  const [tForm, setTForm] = useState({
    full_name: '', age: '', nationality: '',
    dietary_restrictions: 'None',
    accessibility_needs: false,
    preferred_language: 'English',
  })

  // Guide state (read-only + doc upload)
  const [guide, setGuide] = useState<any>(null)
  const [newDoc, setNewDoc] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      setUser(user)
      const r = user.user_metadata?.role ?? ''
      setRole(r)

      if (r === 'traveller') {
        const { data } = await supabase
          .from('traveller_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        if (data) {
          setTForm({
            full_name: data.full_name ?? '',
            age: data.age?.toString() ?? '',
            nationality: data.nationality ?? '',
            dietary_restrictions: data.dietary_restrictions ?? 'None',
            accessibility_needs: data.accessibility_needs ?? false,
            preferred_language: data.preferred_language ?? 'English',
          })
        }
      }

      if (r === 'guide') {
        const { data } = await supabase
          .from('tour_guides')
          .select('*, destinations(city, country)')
          .eq('user_id', user.id)
          .maybeSingle()
        if (data) setGuide(data)
      }
    }
    load()
  }, [router])

  async function saveTraveller(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')
    setSaved(false)

    const { error: err } = await supabase
      .from('traveller_profiles')
      .update({
        full_name: tForm.full_name,
        age: tForm.age ? parseInt(tForm.age) : null,
        nationality: tForm.nationality,
        dietary_restrictions: tForm.dietary_restrictions,
        accessibility_needs: tForm.accessibility_needs,
        preferred_language: tForm.preferred_language,
      })
      .eq('user_id', user.id)

    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function replaceDocument() {
    if (!user || !newDoc || !guide) return
    setUploadingDoc(true)
    setError('')

    const fileExt = newDoc.name.split('.').pop()
    const filePath = `${user.id}/document.${fileExt}`

    const { error: uploadErr } = await supabase.storage
      .from('guide-documents')
      .upload(filePath, newDoc, { upsert: true })

    if (uploadErr) { setError(uploadErr.message); setUploadingDoc(false); return }

    const { data: urlData } = supabase.storage
      .from('guide-documents')
      .getPublicUrl(filePath)

    const { error: updateErr } = await supabase
      .from('tour_guides')
      .update({ document_url: urlData.publicUrl })
      .eq('user_id', user.id)

    setUploadingDoc(false)
    if (updateErr) { setError(updateErr.message); return }
    setGuide((g: any) => ({ ...g, document_url: urlData.publicUrl }))
    setNewDoc(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!user) return null

  const avatarUrl = user.user_metadata?.avatar_url

  return (
    <main className="min-h-screen bg-warmwhite py-8 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="Profile photo"
              className="h-16 w-16 rounded-full object-cover border-2 border-border"
            />
          )}
          <div>
            <h1 className="text-3xl font-extrabold font-display text-charcoal">
              My Profile
            </h1>
            <p className="text-sm font-body text-secondary capitalize">{role}</p>
          </div>
        </div>

        {/* ── TRAVELLER VIEW ── */}
        {role === 'traveller' && (
          <form onSubmit={saveTraveller} className="bg-white rounded-2xl shadow-md border border-border px-4 sm:px-8 py-6 sm:py-8 space-y-5">

            <h2 className="text-lg font-extrabold font-display text-charcoal">Personal Details</h2>

            <Field label="Full Name">
              <input type="text" required value={tForm.full_name}
                onChange={e => setTForm(f => ({ ...f, full_name: e.target.value }))}
                className="input-base" />
            </Field>

            <Field label="Age (optional)">
              <input type="number" min={10} max={120} value={tForm.age}
                onChange={e => setTForm(f => ({ ...f, age: e.target.value }))}
                className="input-base" />
            </Field>

            <Field label="Nationality">
              <select required value={tForm.nationality}
                onChange={e => setTForm(f => ({ ...f, nationality: e.target.value }))}
                className="input-base bg-white">
                <option value="" disabled>Select nationality</option>
                {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
              </select>
            </Field>

            <Field label="Dietary Restrictions">
              <select value={tForm.dietary_restrictions}
                onChange={e => setTForm(f => ({ ...f, dietary_restrictions: e.target.value }))}
                className="input-base bg-white">
                {DIETS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>

            <Field label="Preferred Language">
              <select value={tForm.preferred_language}
                onChange={e => setTForm(f => ({ ...f, preferred_language: e.target.value }))}
                className="input-base bg-white">
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={tForm.accessibility_needs}
                onChange={e => setTForm(f => ({ ...f, accessibility_needs: e.target.checked }))}
                className="h-4 w-4 accent-amber" />
              <span className="text-sm font-body text-charcoal">I have accessibility needs</span>
            </label>

            {error && <p className="text-sm font-body text-error bg-error-bg rounded-xl px-4 py-3">{error}</p>}
            {saved && <p className="text-sm font-body text-green-700 bg-green-50 rounded-xl px-4 py-3">Changes saved!</p>}

            <button type="submit" disabled={saving}
              className="w-full py-2.5 px-5 rounded-xl bg-amber hover:bg-amberdark transition-colors text-sm font-semibold font-body text-white disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        )}

        {/* ── GUIDE VIEW ── */}
        {role === 'guide' && guide && (
          <div className="bg-white rounded-2xl shadow-md border border-border px-4 sm:px-8 py-6 sm:py-8 space-y-5">

            <h2 className="text-lg font-extrabold font-display text-charcoal">Guide Profile</h2>

            <InfoRow label="Full Name" value={guide.full_name} />
            <InfoRow
              label="Assigned City"
              value={guide.destinations ? `${guide.destinations.city}, ${guide.destinations.country}` : '—'}
            />

            <div className="space-y-1">
              <p className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">Verification Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[guide.verification_status] ?? ''}`}>
                {guide.verification_status}
              </span>
            </div>

            {/* Document replacement */}
            <div className="space-y-2">
              <p className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">Replace Document</p>
              <div className="border-2 border-dashed border-border rounded-xl p-5 text-center hover:border-amber transition-colors">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" id="doc-replace" className="hidden"
                  onChange={e => setNewDoc(e.target.files?.[0] ?? null)} />
                <label htmlFor="doc-replace" className="cursor-pointer">
                  {newDoc
                    ? <p className="text-sm font-body text-charcoal">📄 {newDoc.name}</p>
                    : <p className="text-sm font-semibold font-body text-amber">Click to upload new document</p>}
                </label>
              </div>
              {newDoc && (
                <button onClick={replaceDocument} disabled={uploadingDoc}
                  className="w-full py-2.5 px-5 rounded-xl bg-amber hover:bg-amberdark transition-colors text-sm font-semibold font-body text-white disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploadingDoc && <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {uploadingDoc ? 'Uploading…' : 'Upload & Replace'}
                </button>
              )}
            </div>

            {error && <p className="text-sm font-body text-error bg-error-bg rounded-xl px-4 py-3">{error}</p>}
            {saved && <p className="text-sm font-body text-green-700 bg-green-50 rounded-xl px-4 py-3">Document updated!</p>}
          </div>
        )}
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">{label}</p>
      <p className="text-sm font-body text-charcoal">{value}</p>
    </div>
  )
}
