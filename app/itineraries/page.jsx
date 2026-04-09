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

export default function ItinerariesPage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [itineraries, setItineraries] = useState([])

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
          destinations ( city, country )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      // Fetch Exported Itineraries
      const { data: itinData } = await supabase
        .from('itineraries')
        .select(`
          id,
          title,
          created_at,
          destination_id,
          destinations ( city, country )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

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
      setItineraries(itinData || [])
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
    <div className="w-full bg-warmwhite min-h-screen font-body">
      
      {/* ── Header Section ───────────────────────────────────── */}
      <section 
        className="text-warmwhite relative overflow-hidden pt-12 sm:pt-16 pb-8 sm:pb-10 px-4 sm:px-6"
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

        <div className="relative max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 text-amber text-xs font-semibold px-3 py-1 rounded-full border border-amber/20 mb-2 uppercase tracking-widest">
            Travel Plans
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-warmwhite font-display mb-2">
            My Itineraries
          </h1>
          <p className="text-sm font-body text-disabled">
            Manage your ongoing planning chats and your finalized, exported trips in one place.
          </p>
        </div>
      </section>

      {/* ── Content Grid ────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-20">
        
        {/* Section 1: Ongoing Chats */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-charcoal font-display">Ongoing Conversations</h2>
            <div className="flex-1 h-[1px] bg-border ml-6 hidden sm:block" />
          </div>

          {sessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sessions.map(session => (
                <div key={session.id} className="group relative flex bg-white border border-border rounded-2xl overflow-hidden hover:border-amber hover:shadow-xl transition-all h-36">
                  {/* Smaller but wider side image */}
                  <CityImage 
                    city={session.destinations?.city} 
                    country={session.destinations?.country} 
                    className="w-1/3 min-w-[120px] h-full" 
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

                  <div className="flex-1 p-4 flex flex-col justify-center">
                    <h3 className="text-lg font-extrabold font-display text-charcoal mb-0.5 group-hover:text-amber transition-colors">
                      {session.destinations?.city}
                    </h3>
                    <p className="text-xs text-tertiary mb-4">
                      {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>

                    <Link
                      href={`/itinerary?city=${session.destination_id}&session=${session.id}`}
                      className="inline-flex items-center justify-center w-full bg-amber text-charcoal text-xs font-bold py-2.5 rounded-xl hover:bg-amberdark transition-all shadow-sm active:scale-[0.98]"
                    >
                      Resume Planning
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/50 border-2 border-dashed border-border/40 rounded-3xl py-12 text-center">
              <div className="text-4xl mb-4 opacity-30">🧭</div>
              <p className="text-sm text-secondary font-body mb-6">No chats found for any city yet.</p>
              <Link href="/quiz" className="inline-block px-6 py-2.5 bg-amber text-charcoal text-sm font-bold rounded-xl hover:bg-amberdark transition-all shadow-sm">
                Plan a New City
              </Link>
            </div>
          )}
        </section>

        {/* Section 2: Exported Plans */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-charcoal font-display">Finalized Itineraries</h2>
            <div className="flex-1 h-[1px] bg-border ml-6 hidden sm:block" />
          </div>

          {itineraries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {itineraries.map(itin => (
                <div key={itin.id} className="group relative flex bg-white border border-border rounded-2xl overflow-hidden hover:border-success-bg transition-all hover:shadow-xl h-36">
                  <CityImage 
                    city={itin.destinations?.city} 
                    country={itin.destinations?.country} 
                    className="w-1/3 min-w-[120px] h-full" 
                  />
                  
                  <button
                    onClick={(e) => { e.preventDefault(); handleDeleteItinerary(itin.id); }}
                    className="absolute top-2 left-2 p-1.5 bg-black/40 hover:bg-black/70 text-warmwhite rounded-full backdrop-blur-md transition-all z-10 opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <div className="flex-1 p-4 flex flex-col justify-center">
                    <h3 className="text-lg font-extrabold font-display text-charcoal mb-0.5 truncate pr-4">
                      {itin.title}
                    </h3>
                    <p className="text-xs text-tertiary mb-4 flex items-center gap-1 opacity-70">
                      <span>📍</span> {itin.destinations?.city}
                    </p>

                    <div className="flex gap-2">
                      <Link
                        href={`/destinations/${itin.destination_id}`}
                        className="flex-1 flex items-center justify-center py-2 bg-warmwhite border border-border text-charcoal text-[10px] font-bold rounded-xl hover:bg-muted transition-all"
                      >
                        City Details
                      </Link>
                      <Link
                        href={`/saved-itinerary/${itin.id}`}
                        className="flex-1 flex items-center justify-center py-2 bg-amber text-charcoal text-[10px] font-extrabold rounded-xl hover:bg-amber/90 hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-[0.95] animation-pulse-subtle"
                      >
                        Open Draft
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/50 border-2 border-dashed border-border/40 rounded-3xl py-12 text-center text-tertiary text-sm">
              <div className="text-4xl mb-4 opacity-30">📂</div>
              <p>No exported itineraries found yet.</p>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
