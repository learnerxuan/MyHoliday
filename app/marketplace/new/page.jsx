'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase/client'

// ── Shared UI Sub-components ──────────────────────────
function CityImage({ city, country, className = "" }) {
  const [src, setSrc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(`/api/city-image?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setSrc(d.imageUrl ?? null)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [city, country])

  if (loading) return <div className={`bg-gray-100 animate-pulse ${className}`} />
  if (!src || failed) {
    const initial = city?.charAt(0).toUpperCase() || '?'
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-amber-200 to-gray-800 ${className}`}>
        <span className="text-4xl font-extrabold font-display text-white/70 select-none">{initial}</span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={`${city}, ${country}`}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-500"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

const GroupIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
)
const PaceIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
)
const BudgetIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
)
const CalendarIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
)

const getBudgetStyle = (budget) => {
  if (!budget) return 'bg-muted text-secondary border-transparent';
  const b = budget.toLowerCase();
  if (b.includes('economy') || b.includes('budget')) 
    return 'bg-success-bg text-success border-success/10';
  if (b.includes('mid-range') || b.includes('balanced') || b.includes('midrange')) 
    return 'bg-warning-bg text-warning border-warning/10';
  if (b.includes('luxury')) 
    return 'bg-muted text-amberdark border-amberdark/10';
  return 'bg-muted text-secondary border-transparent';
}

function NewListingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedItineraryId = searchParams.get('itinerary_id')

  const [loading, setLoading] = useState(true)
  const [itineraries, setItineraries] = useState([])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [postStep, setPostStep] = useState(1)
  const [selectedItinId, setSelectedItinId] = useState(preselectedItineraryId || null)
  const [postBudget, setPostBudget] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session?.user) {
          router.push('/auth/login')
          return
        }
        
        const currentUser = session.user
        const role = currentUser.user_metadata?.role || 'traveller'
        if (role === 'guide') {
          router.push('/')
          return
        }

        const { data: plansData, error: plansError } = await supabase
          .from('itineraries')
          .select('id, title, content, created_at, trip_metadata, destination_id, destinations(city, country)')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })

        if (!plansError && plansData) {
          setItineraries(plansData)
        } else {
          setError('Failed to fetch your saved itineraries.')
        }
      } catch (err) {
        setError('An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      const selectedPlan = itineraries.find(p => p.id === selectedItinId)
      if (!selectedPlan) throw new Error('Invalid itinerary selected')

      const { data: { session } } = await supabase.auth.getSession()
      
      const { data: newListing, error: insertError } = await supabase
        .from('marketplace_listings')
        .insert({
          itinerary_id: selectedItinId,
          destination_id: selectedPlan.destination_id,
          desired_budget: Number(postBudget),
          status: 'open',
          user_id: session.user.id
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(insertError.message || 'Failed to create listing')
      }
      router.push(`/marketplace/${newListing.id}`)
    } catch (err) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  if (itineraries.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-secondary mb-6">You need to save an itinerary first.</p>
        <Button variant="primary" onClick={() => router.push('/itinerary')}>
          Create an Itinerary
        </Button>
      </div>
    )
  }

  const selectedPlan = itineraries.find(p => p.id === selectedItinId)

  let selectedDays = '?';
  if (selectedPlan) {
    const content = selectedPlan.content;
    if (Array.isArray(content)) {
      selectedDays = content.length;
    } else if (content && typeof content === 'object') {
      const keys = Object.keys(content);
      if (keys.some(k => k.toLowerCase().includes('day'))) {
        selectedDays = keys.length;
      }
    }
    if (selectedDays === '?') {
      const stringContent = typeof content === 'string' ? content : JSON.stringify(content || '');
      const daysMatch = stringContent.match(/day \d+/gi);
      if (daysMatch) selectedDays = new Set(daysMatch.map(d => d.toLowerCase())).size;
    }
  }

  return (
    <>
      {/* Page header (Dark Hero inside Island) */}
      <div 
        className="text-warmwhite relative overflow-hidden pt-8 sm:pt-10 px-4 sm:px-10 pb-4 sm:pb-6"
        style={{ background: '#0f0f0f' }}
      >
        {/* Ambient amber glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(196,135,74,0.22) 0%, transparent 70%),' +
              'radial-gradient(ellipse 40% 40% at 20% 80%, rgba(196,135,74,0.10) 0%, transparent 65%)',
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 text-amber text-xs font-semibold px-3 py-1 rounded-full border border-amber/20 mb-2 uppercase tracking-widest">
              Marketplace
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display mb-1.5 tracking-tight">
              Post a New Itinerary
            </h1>
            <p className="text-xs sm:text-sm font-body text-disabled max-w-2xl leading-relaxed">
              Select a finalized itinerary to list on the marketplace and receive offers from verified local tour guides.
            </p>
          </div>
          
          {/* Steps indicator */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "10px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
            <div 
              style={{ display: "flex", alignItems: "center", gap: 6, opacity: postStep >= 1 ? 1 : 0.5, cursor: "pointer", transition: "opacity 0.2s" }}
              onClick={() => setPostStep(1)}
            >
               <div style={{ width: 22, height: 22, borderRadius: "50%", background: postStep === 1 ? "#C4874A" : "transparent", border: postStep === 1 ? "none" : "1px solid #888", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: postStep === 1 ? "#fff" : "#888" }}>1</div>
               <span style={{ fontSize: 12, fontWeight: postStep === 1 ? 600 : 500, color: postStep === 1 ? "#FAF9F7" : "#888" }}>Choose Itinerary</span>
            </div>
            <span style={{ color: "#444", margin: "0 4px" }}>—</span>
            <div 
              style={{ display: "flex", alignItems: "center", gap: 6, opacity: postStep >= 2 ? 1 : 0.5, cursor: selectedItinId ? "pointer" : "not-allowed", transition: "opacity 0.2s" }}
              onClick={() => { if (selectedItinId) setPostStep(2) }}
            >
               <div style={{ width: 22, height: 22, borderRadius: "50%", background: postStep === 2 ? "#C4874A" : "transparent", border: postStep === 2 ? "none" : "1px solid #888", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: postStep === 2 ? "#fff" : "#888" }}>2</div>
               <span style={{ fontSize: 12, fontWeight: postStep === 2 ? 600 : 500, color: postStep === 2 ? "#FAF9F7" : "#888" }}>Set Budget</span>
            </div>
            <span style={{ color: "#444", margin: "0 4px" }}>—</span>
            <div 
              style={{ display: "flex", alignItems: "center", gap: 6, opacity: postStep === 3 ? 1 : 0.5, cursor: (selectedItinId && postBudget) ? "pointer" : "not-allowed", transition: "opacity 0.2s" }}
              onClick={() => { if (selectedItinId && postBudget) setPostStep(3) }}
            >
               <div style={{ width: 22, height: 22, borderRadius: "50%", background: postStep === 3 ? "#C4874A" : "transparent", border: postStep === 3 ? "none" : "1px solid #888", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: postStep === 3 ? "#fff" : "#888" }}>3</div>
               <span style={{ fontSize: 12, fontWeight: postStep === 3 ? 600 : 500, color: postStep === 3 ? "#FAF9F7" : "#888" }}>Review & Post</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-10 pt-4 sm:pt-6 pb-12 sm:pb-16 space-y-10">
        {error && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl text-center font-medium">{error}</div>}

        {/* Step 1: Select Itinerary */}
        {postStep === 1 && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-charcoal font-display">Available Itineraries</h2>
              <div className="flex-1 h-[1px] bg-border ml-6 hidden sm:block" />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 40 }}>
            {itineraries.map((itin, index) => {
              const isSelected = selectedItinId === itin.id;
              
              let days = '?';
              if (Array.isArray(itin.content)) {
                days = itin.content.length;
              } else if (itin.content && typeof itin.content === 'object') {
                const keys = Object.keys(itin.content);
                if (keys.some(k => k.toLowerCase().includes('day'))) {
                  days = keys.length;
                }
              }
              if (days === '?') {
                const stringContent = typeof itin.content === 'string' ? itin.content : JSON.stringify(itin.content || '');
                const daysMatch = stringContent.match(/day \d+/gi);
                if (daysMatch) days = new Set(daysMatch.map(d => d.toLowerCase())).size;
              }
              
              const city = itin.destinations?.city || 'Unknown';
              const country = itin.destinations?.country || 'Unknown';
              
              const dateObj = new Date(itin.created_at);
              const endDateObj = new Date(dateObj);
              endDateObj.setDate(endDateObj.getDate() + (parseInt(days) || 1));
              const startDateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
              const endDateStr = endDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
              const dateDisplay = `${startDateStr} - ${endDateStr}`;
              
              const metadata = itin.trip_metadata || {};
              const group = metadata.group_size || 'SOLO';
              const pace = metadata.pace || 'BALANCED';
              const budgetStyleClass = getBudgetStyle(metadata.budget || 'LUXURY');
              const budgetTxt = (metadata.budget || itin.destinations?.budget_level || 'LUXURY').toUpperCase();

              return (
                <div 
                  key={itin.id} 
                  onClick={() => setSelectedItinId(isSelected ? null : itin.id)}
                  className="group relative bg-white border border-border rounded-2xl overflow-hidden hover:border-amber hover:shadow-xl transition-all flex flex-col h-full ring-1 ring-black/[0.03]"
                  style={{ 
                    border: isSelected ? "2px solid #1A1A1A" : "1px solid #EBEBEB", 
                    cursor: "pointer", 
                    boxShadow: isSelected ? "0 8px 24px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {isSelected && (
                    <div style={{ position: "absolute", top: 12, right: 12, width: 26, height: 26, borderRadius: "50%", background: "#1A1A1A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  
                  {/* Top Image matches identical My Itineraries API fetching */}
                  <CityImage
                    city={city}
                    country={country}
                    className="w-full h-40 shrink-0"
                  />
                  
                  <div className="p-4 flex flex-col flex-1">
                    {/* Title and Dates Row */}
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-[17px] font-extrabold font-display text-charcoal truncate pr-2 group-hover:text-amber transition-colors">
                        {city} · {days} Days
                      </h3>
                      <div className="text-[10px] font-extrabold text-amber whitespace-nowrap pt-1 uppercase tracking-tighter flex items-center gap-1">
                        <CalendarIcon />
                        {dateDisplay}
                      </div>
                    </div>

                    {/* Location & Metadata Chips */}
                    <div className="flex items-center justify-between gap-x-3 mt-1">
                      <div className="text-[11px] text-charcoal/80 flex items-center gap-1 font-bold whitespace-nowrap">
                        <span>{country}</span>
                      </div>
                      
                      <div className="flex flex-wrap justify-end gap-2">
                        <span className="text-[9px] font-bold text-secondary/70 flex items-center gap-1.5 uppercase bg-muted/70 px-2 py-1 rounded-md border border-border/40">
                          <GroupIcon /> {group}
                        </span>
                        <span className="text-[9px] font-bold text-secondary/70 flex items-center gap-1.5 uppercase bg-muted/70 px-2 py-1 rounded-md border border-border/40">
                          <PaceIcon /> {pace}
                        </span>
                        <span className={`text-[9px] font-bold flex items-center gap-1.5 uppercase px-2 py-1 rounded-md border ${budgetStyleClass}`}>
                          <BudgetIcon /> {budgetTxt}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button 
              disabled={!selectedItinId}
              onClick={() => setPostStep(2)}
              variant="primary" 
              style={{ padding: "14px 32px", fontSize: 14, opacity: selectedItinId ? 1 : 0.5 }}
            >
              Proceed to Budgeting →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Budget */}
      {postStep === 2 && (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, padding: "40px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>💰</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", marginBottom: 8, fontFamily: "'Funnel Display', sans-serif" }}>Set a Desired Budget</h2>
            <p style={{ color: "#666", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>How much are you willing to pay a local tour guide to execute this itinerary? Guides will send you offers based on this amount. Negotations will be done through the chat.</p>
            
            <div style={{ position: "relative", maxWidth: 300, margin: "0 auto 32px" }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 20, fontWeight: 700, color: "#1A1A1A" }}>RM</span>
              <input 
                type="number" 
                value={postBudget}
                onChange={(e) => setPostBudget(e.target.value)}
                placeholder="2500" 
                style={{ width: "100%", padding: "16px 16px 16px 64px", fontSize: 24, fontWeight: 800, fontFamily: "'Funnel Display', sans-serif", border: "2px solid #EBEBEB", borderRadius: 12, outline: "none", color: "#1A1A1A", textAlign: "center" }} 
              />
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <Button onClick={() => setPostStep(1)} variant="secondary" style={{ padding: "14px 28px", fontSize: 14 }}>Back</Button>
              <Button onClick={() => setPostStep(3)} disabled={!postBudget} variant="primary" style={{ padding: "14px 28px", fontSize: 14, opacity: postBudget ? 1 : 0.5 }}>Review Details →</Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {postStep === 3 && (
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, padding: "40px" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", marginBottom: 24, fontFamily: "'Funnel Display', sans-serif" }}>Review & List</h2>
            
            <div style={{ background: "#F9F9F9", borderRadius: 12, padding: 24, marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #EBEBEB" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Selected Itinerary</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>{selectedPlan?.destinations?.city || 'City'}, {selectedPlan?.destinations?.country || 'Country'} · {selectedDays} Days</div>
                </div>
                <button onClick={() => setPostStep(1)} style={{ background: "none", border: "none", color: "#C4874A", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>Edit</button>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Desired Guide Budget</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", fontFamily: "'Funnel Display', sans-serif" }}>RM {postBudget}</div>
                </div>
                <button onClick={() => setPostStep(2)} style={{ background: "none", border: "none", color: "#C4874A", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>Edit</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, padding: 16, background: "#F0EBE3", borderRadius: 10, alignItems: "flex-start", marginBottom: 32 }}>
               <div style={{ fontSize: 18 }}>ℹ️</div>
               <div style={{ fontSize: 12, color: "#8B6A3E", lineHeight: 1.5 }}>By posting this listing, verified local guides in your destination will be able to review your itinerary and submit competing price proposals. You are not charged until you accept an offer.</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button onClick={() => setPostStep(2)} variant="secondary" style={{ padding: "14px 28px", fontSize: 14 }}>Back</Button>
              <Button 
                onClick={handleSubmit} 
                className="bg-[#C4874A] hover:bg-[#a6713e] text-white border-none" 
                style={{ padding: "14px 32px", fontSize: 14 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Spinner /> : 'Post to Marketplace'}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

export default function CreateListingPage() {
  return (
    <div className="min-h-screen bg-warmwhite flex flex-col pt-2 pb-24 px-2 sm:px-6">
      <section className="max-w-7xl mx-auto w-full bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden flex flex-col mt-4">
        <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>
          <NewListingContent />
        </Suspense>
      </section>
    </div>
  )
}