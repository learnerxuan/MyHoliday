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

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
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
  const [isEditing, setIsEditing] = useState(false)

  // Traveller form state
  const [tForm, setTForm] = useState({
    full_name: '', date_of_birth: '', nationality: '',
    dietary_restrictions: 'None',
    accessibility_needs: false,
    preferred_language: 'English',
  })
  const [tFormOg, setTFormOg] = useState(tForm)

  // Guide state (read-only + doc upload)
  const [guide, setGuide] = useState<any>(null)
  const [gForm, setGForm] = useState({ full_name: '', city_id: '' })
  const [gFormOg, setGFormOg] = useState({ full_name: '', city_id: '' })
  const [allDestinations, setAllDestinations] = useState<any[]>([])
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
          const oauthName = user.user_metadata?.full_name || user.user_metadata?.name || ''
          const loadedData = {
            full_name: data.full_name || oauthName,
            date_of_birth: data.date_of_birth ?? '',
            nationality: data.nationality ?? '',
            dietary_restrictions: data.dietary_restrictions ?? 'None',
            accessibility_needs: data.accessibility_needs ?? false,
            preferred_language: data.preferred_language ?? 'English',
          }
          setTForm(loadedData)
          setTFormOg(loadedData)
        }
      }

      if (r === 'guide') {
        const { data } = await supabase
          .from('tour_guides')
          .select('*, destinations(city, country)')
          .eq('user_id', user.id)
          .maybeSingle()
        if (data) {
          setGuide(data)
          const oauthName = user.user_metadata?.full_name || user.user_metadata?.name || ''
          const loadedGForm = { full_name: data.full_name || oauthName, city_id: data.city_id || '' }
          setGForm(loadedGForm)
          setGFormOg(loadedGForm)
        }
        
        const { data: dests } = await supabase.from('destinations').select('id, city, country').order('city')
        if (dests) setAllDestinations(dests)
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
      .upsert({
        user_id: user.id,
        full_name: tForm.full_name,
        date_of_birth: tForm.date_of_birth || null,
        nationality: tForm.nationality,
        dietary_restrictions: tForm.dietary_restrictions,
        accessibility_needs: tForm.accessibility_needs,
        preferred_language: tForm.preferred_language,
      }, { onConflict: 'user_id' })

    setSaving(false)
    if (err) { setError(err.message); return }
    setTFormOg(tForm)
    setSaved(true)
    setIsEditing(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function saveGuide(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')
    setSaved(false)

    const { error: err } = await supabase
      .from('tour_guides')
      .update({ full_name: gForm.full_name, city_id: gForm.city_id || null })
      .eq('user_id', user.id)

    setSaving(false)
    if (err) { setError(err.message); return }
    setGFormOg(gForm)
    
    // Update local guide display state
    const selectedDest = allDestinations.find(d => d.id === gForm.city_id)
    setGuide((g: any) => ({ 
      ...g, 
      full_name: gForm.full_name,
      city_id: gForm.city_id,
      destinations: selectedDest ? { city: selectedDest.city, country: selectedDest.country } : g.destinations
    }))
    setSaved(true)
    setIsEditing(false)
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
  const oauthName = user.user_metadata?.full_name || user.user_metadata?.name || ''

  return (
    <div className="min-h-screen bg-warmwhite flex flex-col pt-2 pb-24 px-2 sm:px-6 font-body">
      <section className="max-w-5xl mx-auto w-full p-6 lg:p-12 bg-white rounded-[24px] shadow-sm border border-border/50">
        
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 mb-10">
          <div className="flex shrink-0 w-24 h-24 rounded-full bg-gradient-to-br from-[#C4874A] to-[#8B6A3E] border-4 border-white shadow-[0_4px_10px_rgba(0,0,0,0.1)] overflow-hidden items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-bold font-display">{user?.email?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
             <div className="inline-flex items-center gap-2 bg-[#EAF3DE] text-[#3B6D11] text-[11px] font-bold px-3 py-1.5 rounded-md mb-2 uppercase tracking-[0.2em] leading-none">
               {role === 'guide' ? '💼 Verified Guide' : '🌎 Verified Traveller'}
             </div>
             <h1 className="font-display font-extrabold text-[32px] text-charcoal leading-none">
                {role === 'traveller' ? (tForm.full_name || oauthName || 'Traveller') : (guide?.full_name || oauthName || 'Tour Guide')}
             </h1>
             <p className="text-[13px] text-secondary mt-2 uppercase tracking-widest font-semibold">
                Joined: {new Date(user?.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
             </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto mt-4 sm:mt-0 flex-col sm:flex-row">
            {!isEditing ? (
              <button
                 onClick={() => setIsEditing(true)}
                 className="px-8 py-3.5 bg-[#1A1A1A] hover:bg-black text-white text-[14px] font-bold rounded-xl transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2"
              >
                 Edit Profile
              </button>
            ) : (
              <>
                <button
                   onClick={() => {
                     if (role === 'traveller') setTForm(tFormOg)
                     else setGForm(gFormOg)
                     setIsEditing(false)
                   }}
                   disabled={saving}
                   className="px-6 py-3.5 bg-white border border-[#E5E0DA] hover:bg-[#F0EDE9] text-charcoal text-[14px] font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                   Cancel
                </button>
                <button
                   onClick={(e) => role === 'traveller' ? saveTraveller(e) : saveGuide(e)}
                   disabled={saving || (role === 'traveller' ? JSON.stringify(tForm) === JSON.stringify(tFormOg) : JSON.stringify(gForm) === JSON.stringify(gFormOg))}
                   className="px-8 py-3.5 bg-[#1A1A1A] hover:bg-black text-white text-[14px] font-bold rounded-xl transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                   {saving && <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                   {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── ERROR & SUCCESS BANNER ── */}
        {error && <div className="mb-8 p-4 bg-error-bg border border-error/20 rounded-xl text-error text-sm font-medium">{error}</div>}
        {saved && <div className="mb-8 p-4 bg-[#ECFDF5] border border-[#059669]/20 rounded-xl text-[#059669] text-sm font-medium">{role === 'guide' ? 'Document updated successfully!' : 'Changes saved successfully!'}</div>}

        {/* ── TRAVELLER VIEW ── */}
        {role === 'traveller' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Card: Personal Info */}
            <div className="bg-[#FDFCFB] border border-border rounded-[16px] p-6 lg:p-8">
               <h2 className="text-[16px] font-bold text-charcoal mb-6 font-body">Personal Information</h2>
               
               <Field label="Full Name">
                 <input type="text" value={tForm.full_name} onChange={e => setTForm({...tForm, full_name: e.target.value})} className={`input-base bg-white ${!isEditing ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}`} placeholder="Enter your full name" disabled={!isEditing} />
               </Field>

               <Field label="Nationality">
                 <select value={tForm.nationality} onChange={e => setTForm({...tForm, nationality: e.target.value})} className={`input-base bg-white ${isEditing ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed pointer-events-none'}`} disabled={!isEditing}>
                    <option value="" disabled>Select nationality</option>
                    {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                 </select>
               </Field>

               <div className="grid grid-cols-2 gap-4">
                  <Field label="Date of Birth">
                    <input type="date" value={tForm.date_of_birth} onChange={e => setTForm({...tForm, date_of_birth: e.target.value})} className={`input-base bg-white h-[42px] ${!isEditing ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}`} disabled={!isEditing} />
                  </Field>
                  <Field label="Language">
                     <select value={tForm.preferred_language} onChange={e => setTForm({...tForm, preferred_language: e.target.value})} className={`input-base bg-white ${isEditing ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed pointer-events-none'}`} disabled={!isEditing}>
                        {LANGUAGES.map(n => <option key={n} value={n}>{n}</option>)}
                     </select>
                  </Field>
               </div>
            </div>

            {/* Right Side Stack */}
            <div className="flex flex-col gap-6">
              {/* Travel Preferences Card */}
              <div className="bg-[#FDFCFB] border border-border rounded-[16px] p-6 lg:p-8 flex flex-col">
                 <h2 className="text-[16px] font-bold text-charcoal mb-6 font-body">Personal Travel Needs</h2>
                 
                 <Field label="Dietary Restrictions">
                   <select value={tForm.dietary_restrictions} onChange={e => setTForm({...tForm, dietary_restrictions: e.target.value})} className={`input-base font-semibold ${tForm.dietary_restrictions !== 'None' ? 'bg-[#F0EBE3] !border-transparent text-[#8B6A3E]' : 'bg-white'} ${isEditing ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed pointer-events-none'}`} disabled={!isEditing}>
                      {DIETS.map(n => <option key={n} value={n}>{n}</option>)}
                   </select>
                 </Field>

                 <div className="space-y-1.5">
                    <label className="text-[11px] text-[#888] font-bold uppercase tracking-wider mb-1 block">Accessibility Needs</label>
                    <div className={`input-base bg-white flex items-center justify-between border border-[#E5E0DA] ${isEditing ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`} onClick={() => isEditing && setTForm({...tForm, accessibility_needs: !tForm.accessibility_needs})}>
                       <span className="text-charcoal font-medium text-[14px]">{tForm.accessibility_needs ? 'Yes, I require accommodations' : 'None required'}</span>
                       <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${tForm.accessibility_needs ? 'bg-[#C4874A] border-[#C4874A]' : 'bg-[#FAF9F7] border-[#D0CCC7]'}`}>
                         {tForm.accessibility_needs && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                       </div>
                    </div>
                 </div>
              </div>

            </div>
          </div>
        )}

        {/* ── GUIDE VIEW ── */}
        {role === 'guide' && guide && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Card: Guide Info */}
            <div className="bg-[#FDFCFB] border border-border rounded-[16px] p-6 lg:p-8">
              <h2 className="text-[16px] font-bold text-charcoal mb-6 font-body">Professional Information</h2>
              <div className="space-y-5">
                 <Field label="Full Name">
                   <input type="text" value={gForm.full_name} onChange={e => setGForm({...gForm, full_name: e.target.value})} className={`input-base bg-white ${!isEditing ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}`} placeholder="Enter your full name" disabled={!isEditing} />
                 </Field>
                 
                 {!isEditing ? (
                   <GuideField label="Assigned City" value={guide.destinations ? `${guide.destinations.city}, ${guide.destinations.country}` : '—'} />
                 ) : (
                   <Field label="Assigned City">
                     <select 
                       value={gForm.city_id} 
                       onChange={e => setGForm({...gForm, city_id: e.target.value})} 
                       className="input-base bg-white cursor-pointer w-full"
                     >
                       <option value="" disabled>Select your city</option>
                       {allDestinations.map(d => (
                         <option key={d.id} value={d.id}>{d.city}, {d.country}</option>
                       ))}
                     </select>
                   </Field>
                 )}
                 <div>
                    <label className="text-[11px] text-[#888] font-bold uppercase tracking-wider mb-1 block">Verification Status</label>
                    <span className={`inline-block px-3 py-1 rounded w-fit text-[12px] font-bold capitalize ${STATUS_STYLES[guide.verification_status] ?? ''}`}>
                       {guide.verification_status}
                    </span>
                 </div>
              </div>
            </div>

            {/* Right Card: Documentation */}
            <div className="bg-[#FDFCFB] border border-border rounded-[16px] p-6 lg:p-8 flex flex-col">
              <h2 className="text-[16px] font-bold text-charcoal mb-6 font-body">Documentation</h2>
              <div className="space-y-4 flex-1 flex flex-col">
                 <p className="text-[13px] text-secondary leading-relaxed">
                   Upload proof of your tour guide certification or local ID to manage your validation status.
                 </p>
                 <div className="flex-1 min-h-[160px] border-2 border-dashed border-[#D0CCC7] rounded-xl p-6 flex flex-col items-center justify-center hover:bg-white hover:border-[#C4874A] transition-all cursor-pointer relative group bg-[#FAF9F7]">
                   <input type="file" accept=".pdf,.jpg,.jpeg,.png" id="doc-replace" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[0px]" onChange={e => setNewDoc(e.target.files?.[0] ?? null)} />
                   {newDoc ? (
                     <div className="flex flex-col items-center pointer-events-none">
                        <span className="text-[24px] mb-2">📄</span>
                        <p className="text-[14px] font-bold text-charcoal text-center line-clamp-1 px-4">{newDoc.name}</p>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center pointer-events-none">
                        <span className="text-[24px] mb-2">📤</span>
                        <p className="text-[13px] font-bold text-[#C4874A]">Select a file to upload</p>
                        <p className="text-[11px] text-tertiary mt-1">.PDF, .JPG, .PNG</p>
                     </div>
                   )}
                 </div>
                 
                 {newDoc && (
                   <button onClick={replaceDocument} disabled={uploadingDoc}
                     className="w-full mt-4 py-3 px-5 rounded-xl bg-[#C4874A] hover:bg-[#8B6A3E] transition-colors text-[13px] font-semibold font-body text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                     {uploadingDoc && <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                     {uploadingDoc ? 'Uploading Document…' : 'Upload & Replace'}
                   </button>
                 )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 space-y-1.5 flex flex-col">
      <label className="text-[11px] text-[#888] font-bold uppercase tracking-wider block">{label}</label>
      {children}
    </div>
  )
}

function GuideField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-5 space-y-1.5 flex flex-col">
       <label className="text-[11px] text-[#888] font-bold uppercase tracking-wider block">{label}</label>
       <div className="input-base bg-white font-semibold text-charcoal opacity-90 cursor-not-allowed border border-[#E5E0DA]">
         {value}
       </div>
    </div>
  )
}
