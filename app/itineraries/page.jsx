'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// ── Sub-component for fetching images ────────────────────────
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

  if (loading) return <div className={`bg-muted animate-pulse ${className}`} />
  if (!src || failed) {
    const initial = city?.charAt(0).toUpperCase() || '?'
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-amber/30 to-charcoal/60 ${className}`}>
        <span className="text-4xl font-extrabold font-display text-warmwhite/70 select-none">{initial}</span>
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

// ── Icons ─────────────────────────────────────────────────────

const GroupIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const PaceIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)

const BudgetIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

// ── Helpers ──────────────────────────────────────────────────

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

export default function ItinerariesPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [itineraries, setItineraries] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch Ongoing Sessions
      const { data: sessionData } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          created_at,
          destination_id,
          planner_state,
          destinations ( city, country )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      // Fetch Exported Itineraries
      const { data: itinData, error: itinError } = await supabase
        .from('itineraries')
        .select(`*, destinations ( city, country )`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (itinError) {
        console.error('Error fetching itineraries:', itinError)
        setError(itinError.message)
      }

      // Fetch Marketplace Listings separately to avoid join errors
      const { data: listingsData } = await supabase
        .from('marketplace_listings')
        .select(`id, itinerary_id, status, marketplace_offers ( id )`)
        .eq('user_id', user.id)

      // Filter sessions to show only the MOST RECENT one per destination_id
      const uniqueSessions = []
      const seenCities = new Set()
      const sortedSessions = (sessionData || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      for (const s of sortedSessions) {
        if (!seenCities.has(s.destination_id)) {
          uniqueSessions.push(s)
          seenCities.add(s.destination_id)
        }
      }

      setSessions(uniqueSessions)
      
      // Merge listing status into itineraries
      const enrichedItineraries = (itinData || []).map(itin => {
        const listing = (listingsData || []).find(l => l.itinerary_id === itin.id)
        return {
          ...itin,
          marketplace_listings: listing ? [listing] : []
        }
      })
      setItineraries(enrichedItineraries)
      setLoading(false)
    }

    fetchData()
  }, [router])

  const handleDeleteSession = async (id) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return
    await supabase.from('itineraries').update({ session_id: null }).eq('session_id', id)
    await supabase.from('chat_messages').delete().eq('session_id', id)
    const { error } = await supabase.from('chat_sessions').delete().eq('id', id)
    if (!error) setSessions(prev => prev.filter(s => s.id !== id))
  }

  const handleDeleteItinerary = async (id) => {
    if (!confirm('Are you sure you want to delete this saved plan?')) return
    const { error } = await supabase.from('itineraries').delete().eq('id', id)
    if (!error) setItineraries(prev => prev.filter(i => i.id !== id))
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warmwhite flex flex-col pt-2 pb-24 px-2 sm:px-6">
      
      {/* ── THE ISLAND CONTAINER ── */}
      <section className="max-w-7xl mx-auto w-full bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden flex flex-col">
        
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
                Travel Plans
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display mb-1.5 tracking-tight">
                My Itineraries
              </h1>
              <p className="text-xs sm:text-sm font-body text-disabled max-w-2xl leading-relaxed">
                Manage your ongoing planning chats and your finalized, exported trips in one place.
              </p>
            </div>

            <Link
              href="/quiz"
              className="bg-white/90 backdrop-blur-md text-charcoal px-6 py-3 rounded-xl font-bold text-sm hover:scale-[1.02] hover:bg-white transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2 shrink-0 border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]"
            >
              <span>Plan New Trip</span>
              <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="px-4 sm:px-10 pt-4 sm:pt-6 pb-12 sm:pb-16 space-y-10">
          
          {/* Section 1: Ongoing Chats - Wrapped in a subtle Shelf */}
          <section className="bg-[#FDFCFB] p-6 sm:p-8 rounded-[24px] border border-border/40 shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-charcoal font-display">Ongoing Conversations</h2>
              <div className="flex-1 h-[1px] bg-border/60 ml-6 hidden sm:block" />
            </div>

            {sessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map(session => (
                  <div key={session.id} className="group relative flex flex-col sm:flex-row bg-white border border-border rounded-2xl overflow-hidden hover:border-amber hover:shadow-xl transition-all sm:h-44">
                    {/* Smaller but wider side image */}
                    <CityImage
                      city={session.destinations?.city}
                      country={session.destinations?.country}
                      className="w-full sm:w-1/3 min-w-[120px] h-32 sm:h-full shrink-0"
                    />

                    {/* Delete overlay */}
                    <button
                      onClick={(e) => { e.preventDefault(); handleDeleteSession(session.id); }}
                      className="absolute top-2 left-2 p-1.5 bg-black/40 hover:bg-black/70 text-warmwhite rounded-full backdrop-blur-md transition-all z-10 opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    <div className="flex-1 pt-4 pb-6 sm:pb-8 px-4 sm:px-6 flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-border/30">
                      <h3 className="text-lg font-extrabold font-display text-charcoal mb-0.5 group-hover:text-amber transition-colors">
                        {session.destinations?.city}
                      </h3>

                      {/* Rich Metadata Info */}
                      <div className="mb-3 space-y-1">
                        {session.planner_state?.travel_date_start ? (
                          <div className="text-[10px] font-bold text-amber flex items-center gap-1 uppercase">
                            <CalendarIcon />
                            {(() => {
                              const [y, m, d] = session.planner_state.travel_date_start.split('-').map(Number);
                              return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                            })()}
                            {session.planner_state.travel_date_end && ` - ${(() => {
                              const [y, m, d] = session.planner_state.travel_date_end.split('-').map(Number);
                              return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                            })()}`}
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-tertiary flex items-center gap-1 uppercase tracking-widest">
                            <CalendarIcon />
                            {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {session.planner_state?.budget_profile && (
                            <span className={`text-[9px] font-bold flex items-center gap-1 uppercase px-1.5 py-0.5 rounded border ${getBudgetStyle(session.planner_state.budget_profile)}`}>
                              <BudgetIcon /> {session.planner_state.budget_profile}
                            </span>
                          )}

                          {session.planner_state?.pace && (
                            <span 
                              className="text-[9px] font-bold text-secondary flex items-center gap-1 uppercase px-1.5 py-0.5 rounded border border-border/40 leading-none h-[20px]"
                              style={{ backgroundColor: '#F0EBE3' }}
                            >
                              <PaceIcon /> 
                              <span className="pt-[1px]">{session.planner_state.pace}</span>
                            </span>
                          )}

                          {session.planner_state?.group_size && (
                            <span 
                              className="text-[9px] font-bold text-secondary flex items-center gap-1 uppercase px-1.5 py-0.5 rounded border border-border/40 leading-none h-[20px]"
                              style={{ backgroundColor: '#F0EBE3' }}
                            >
                              <GroupIcon />
                              <span className="pt-[1px]">{session.planner_state.group_size}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/itinerary?city=${session.destination_id}&session=${session.id}`}
                        className="inline-flex items-center justify-center w-full bg-amber text-warmwhite text-[12px] font-semibold py-2.5 rounded-xl hover:bg-amberdark transition-all shadow-sm active:scale-[0.98] mt-2"
                      >
                        Resume Planning
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-muted/20 border border-dashed border-border rounded-2xl py-12 text-center text-disabled">
                <div className="text-3xl mb-3 opacity-30 text-charcoal">🧭</div>
                <p className="text-sm font-body">No active planning sessions found.</p>
                <Link href="/quiz" className="mt-4 inline-block text-amber text-xs font-bold uppercase hover:underline">Start Exploring →</Link>
              </div>
            )}
          </section>

          {/* Section 2: Exported Trips */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-charcoal font-display">Finalized Itineraries</h2>
              <div className="flex-1 h-[1px] bg-border ml-6 hidden sm:block" />
            </div>

            {itineraries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {itineraries.map(itin => {
                  const metadata = itin.trip_metadata || {}
                  const listing = itin.marketplace_listings?.[0]
                  const offerCount = listing?.marketplace_offers?.length || 0
                  const isListed = !!listing

                  return (
                    <div key={itin.id} className="group relative bg-white border border-border rounded-2xl overflow-hidden hover:border-amber hover:shadow-xl transition-all flex flex-col h-full ring-1 ring-black/[0.03]">
                      
                      {/* Top Image */}
                      <CityImage
                        city={itin.destinations?.city}
                        country={itin.destinations?.country}
                        className="w-full h-40 shrink-0"
                      />

                      {/* Delete overlay */}
                      <button
                        onClick={(e) => { e.preventDefault(); handleDeleteItinerary(itin.id); }}
                        className="absolute top-3 left-3 p-1.5 bg-black/40 hover:bg-black/70 text-warmwhite rounded-full backdrop-blur-md transition-all z-10 opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <div className="p-4 flex flex-col flex-1">
                        {/* Title and Dates Row */}
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-[17px] font-extrabold font-display text-charcoal truncate pr-2 group-hover:text-amber transition-colors">
                            {itin.title}
                          </h3>
                          {metadata.travel_date_start && (
                            <div className="text-[10px] font-extrabold text-amber whitespace-nowrap pt-1 uppercase tracking-tighter flex items-center gap-1">
                              <CalendarIcon />
                              {(() => {
                                const fmt = (date) => {
                                  const day = date.getDate();
                                  const month = date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
                                  const year = date.getFullYear();
                                  return `${day} ${month} ${year}`;
                                };
                                const [y, m, d] = metadata.travel_date_start.split('-').map(Number);
                                const start = new Date(y, m - 1, d);
                                const end = new Date(start);
                                end.setDate(end.getDate() + (metadata.trip_days || 5) - 1);
                                return `${fmt(start)} - ${fmt(end)}`;
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Location & Metadata Chips */}
                        <div className="flex items-center justify-between gap-x-3 mb-4">
                          <div className="text-[11px] text-charcoal/80 flex items-center gap-1 font-bold whitespace-nowrap">
                            <span>{itin.destinations?.country}</span>
                          </div>
                          
                          <div className="flex flex-wrap justify-end gap-2">
                            {metadata.group_size && (
                              <span className="text-[9px] font-bold text-secondary/70 flex items-center gap-1.5 uppercase bg-muted/70 px-2 py-1 rounded-md border border-border/40">
                                <GroupIcon /> {metadata.group_size}
                              </span>
                            )}
                            {metadata.pace && (
                              <span className="text-[9px] font-bold text-secondary/70 flex items-center gap-1.5 uppercase bg-muted/70 px-2 py-1 rounded-md border border-border/40">
                                <PaceIcon /> {metadata.pace}
                              </span>
                            )}
                            {metadata.budget && (
                              <span className={`text-[9px] font-bold flex items-center gap-1.5 uppercase px-2 py-1 rounded-md border ${getBudgetStyle(metadata.budget)}`}>
                                <BudgetIcon /> {metadata.budget}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-4">
                          {isListed ? (
                            <>
                              <div className="bg-[#FEF3C7] px-2.5 h-6 rounded-[4px] flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-extrabold text-[#D97706] uppercase tracking-wider leading-none">Listed: {offerCount} Offers</span>
                              </div>
                              <Link 
                                href="/marketplace/manage"
                                className="bg-[#C4874A] text-[#FAF9F7] text-[12px] font-semibold px-4 py-2 rounded-lg hover:bg-[#8B6A3E] transition-all shadow-sm active:scale-95 whitespace-nowrap"
                              >
                                Manage Offers
                              </Link>
                            </>
                          ) : (
                            <>
                              <div className="bg-[#F0EDE9] px-2.5 h-6 rounded-[4px] flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-extrabold text-[#888] uppercase tracking-wider leading-none">Draft</span>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Link 
                                  href={`/saved-itinerary/${itin.id}`}
                                  className="text-[#666] hover:text-[#1A1A1A] text-[12px] font-semibold px-3 py-2 rounded-lg border border-[#EBEBEB] hover:border-[#D0CCC7] transition-all whitespace-nowrap"
                                >
                                  View & Edit
                                </Link>
                                <Link 
                                  href={`/marketplace/new?itinerary=${itin.id}`}
                                  className="bg-[#C4874A] text-[#FAF9F7] text-[12px] font-semibold px-4 py-2 rounded-lg hover:bg-[#8B6A3E] transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                >
                                  Post to Marketplace
                                </Link>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/50 border-2 border-dashed border-border/40 rounded-3xl py-12 text-center text-tertiary text-sm">
                <div className="text-4xl mb-4 opacity-30 text-charcoal">📂</div>
                <p>No exported itineraries found yet.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}
