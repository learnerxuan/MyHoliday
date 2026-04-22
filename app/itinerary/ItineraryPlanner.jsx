'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase/client'
import ChatWindow from '@/components/sections/ChatWindow'
import ItineraryPanel from '@/components/sections/ItineraryPanel'
import QuickIntakeModal from '@/components/sections/QuickIntakeModal'

const MapPanel = dynamic(() => import('@/components/sections/MapPanel'), { ssr: false })

const TABS = [
  { id: 'itinerary', label: '📋 Itinerary' },
  { id: 'map',       label: '🗺️ Map' },
]

// ── Coordinate sanitiser ──────────────────────────────────────
// Swaps lat/lng if they are obviously reversed, drops (0,0) and out-of-range values
function sanitiseCoords(item) {
  let { lat, lng } = item
  if (lat == null || lng == null) return item

  lat = Number(lat)
  lng = Number(lng)

  // (0, 0) is the middle of the ocean — the AI put placeholders; drop them
  if (lat === 0 && lng === 0) return { ...item, lat: null, lng: null }

  // If lat > 90 or lat < -90 it must actually be a longitude — swap
  if (Math.abs(lat) > 90) {
    ;[lat, lng] = [lng, lat]
  }

  // Final sanity: lat in [-90,90] lng in [-180,180]
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ...item, lat: null, lng: null }
  }

  return { ...item, lat, lng }
}

// ── Icons ─────────────────────────────────────────────────────
const PaceIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)

const BudgetIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const GroupIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const getBudgetStyle = (budget) => {
  if (!budget) return 'bg-white text-secondary border-border/50';
  const b = budget.toLowerCase();
  if (b.includes('economy') || b.includes('budget')) 
    return 'bg-success-bg text-success border-success/10';
  if (b.includes('mid-range') || b.includes('balanced') || b.includes('midrange')) 
    return 'bg-warning-bg text-warning border-warning/10';
  if (b.includes('luxury')) 
    return 'bg-muted text-amberdark border-amberdark/10';
  return 'bg-white text-secondary border-border/50';
}

// ── Itinerary state helpers ───────────────────────────────────

function applyUpdates(prev, updates) {
  if (!updates?.length) return prev
  const next = { ...prev }
  for (const update of updates) {
    const key = `day${update.day}`
    if (!next[key]) next[key] = []
    const sanitised = sanitiseCoords(update)

    if (update.action === 'add') {
      const exists = next[key].some(i => i.name === update.name)
      if (!exists) {
        next[key] = [...next[key], sanitised]
      }
    } else if (update.action === 'remove') {
      next[key] = next[key].filter(i => i.name !== update.name)
    } else if (update.action === 'update') {
      const exists = next[key].some(i => i.name === update.name)
      if (exists) {
        next[key] = next[key].map(i => {
          if (i.name === update.name) {
            // Apply rename if new_name provided
            const merged = { ...i, ...sanitised }
            if (update.new_name) merged.name = update.new_name
            return merged
          }
          return i
        })
      } else {
        next[key] = [...next[key], sanitised]
      }
    }
  }
  // Remove day keys that ended up empty after remove actions
  for (const key of Object.keys(next)) {
    if (Array.isArray(next[key]) && next[key].length === 0) {
      delete next[key]
    }
  }
  return next
}

// ── Main component ────────────────────────────────────────────

export default function ItineraryPlanner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const cityId       = searchParams.get('city')
  const sessionParam = searchParams.get('session')

  // ── State ──────────────────────────────────────────────────
  const [destination,   setDestination]   = useState(null)
  const [userId,        setUserId]        = useState(null)
  const [messages,      setMessages]      = useState([])
  const [itinerary,     setItinerary]     = useState({})
  const [activeTab,     setActiveTab]     = useState('itinerary')
  const [activeDay,     setActiveDay]     = useState('all')
  const [isLoading,     setIsLoading]     = useState(false)
  const [toolStatus,    setToolStatus]    = useState(null)
  const [sessionId,     setSessionId]     = useState(null)
  const [pageReady,     setPageReady]     = useState(false)
  const [exportModal,   setExportModal]   = useState(false)
  const [exportTitle,   setExportTitle]   = useState('')
  const [exportSaving,  setExportSaving]  = useState(false)
  const [exportDone,    setExportDone]    = useState(false)
  const [tripContext,   setTripContext]   = useState(null)
  const [autoMessage,   setAutoMessage]   = useState(null)
  const [resetKey,      setResetKey]      = useState(0)
  const [showIntake,    setShowIntake]    = useState(false)
  const [intakeDone,    setIntakeDone]    = useState(false)
  const initDone = useRef(false)

  // ── Init: auth + destination + existing session ─────────────
  useEffect(() => {
    if (!cityId) { router.replace('/'); return }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      setUserId(user.id)

      const { data: dest } = await supabase
        .from('destinations')
        .select('id, city, country, latitude, longitude')
        .eq('id', cityId)
        .single()

      if (!dest) { router.replace('/'); return }
      setDestination(dest)

      // Resume existing active session if found
      let hasSessionHistory = false

      const { data: profile } = await supabase
        .from('traveller_profiles')
        .select('dietary_restrictions, accessibility_needs')
        .eq('user_id', user.id)
        .maybeSingle()

      let savedQuizContext = null
      try {
        const rawPrefs = sessionStorage.getItem('quiz_prefs')
        const rawMeta  = sessionStorage.getItem('quiz_trip_meta')
        if (rawPrefs && rawMeta) {
          const prefs = JSON.parse(rawPrefs)
          const meta  = JSON.parse(rawMeta)
          savedQuizContext = {
            trip_days:         meta.duration_days   ?? null,
            budget:            prefs.budget         ?? null,
            travel_date_start: meta.date_start      ?? null,
            travel_date_end:   meta.date_end        ?? null,
            group_size:        prefs.groupSize      ?? null,
            pace:              prefs.pace           ?? null,
            preferred_styles:  prefs.styles         ?? [],
            dietary:           profile?.dietary_restrictions && profile.dietary_restrictions !== 'None' ? profile.dietary_restrictions : null,
          }
          setTripContext(savedQuizContext)
        } else if (!sessionParam) {
          // No quiz data and not resuming a specific shared session -> show quick intake
          setShowIntake(true)
        }
      } catch { /* ignore */ }

      const sessionQuery = supabase
        .from('chat_sessions')
        .select('id, planner_state')
        .eq('user_id', user.id)
        .eq('destination_id', cityId)
        .eq('status', 'active')

      if (sessionParam) {
        sessionQuery.eq('id', sessionParam)
      } else {
        sessionQuery.order('created_at', { ascending: false }).limit(1)
      }

      const { data: session } = await sessionQuery.maybeSingle()

      if (session) {
        setSessionId(session.id)
        const { data: history } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true })
        if (history?.length) {
          hasSessionHistory = true
          
          // Quick replies don't persist in DB. Skip artificial restoration as requested.
          if (history.length === 1 && history[0].role === 'assistant') {
            history[0].quickReplies = []
          }
          
          setMessages(history)
        }

        // Restore itinerary from DB state if available
        if (session.planner_state?.itinerary) {
          setItinerary(session.planner_state.itinerary)
          // Mark as history so we don't clear it later by mistake
          hasSessionHistory = true
        }

        // ── SYNC: Authoritative session metadata ─────────────────
        // Prioritise database values over generic sessionStorage
        if (session.planner_state) {
          const s = session.planner_state
          setTripContext(prev => ({
            ...prev,
            trip_days:         s.trip_days         ?? prev?.trip_days,
            budget:            s.budget_profile    ?? prev?.budget,
            travel_date_start: s.travel_date_start ?? prev?.travel_date_start,
            travel_date_end:   s.travel_date_end   ?? prev?.travel_date_end,
            group_size:        s.group_size        ?? prev?.group_size,
            pace:              s.pace              ?? prev?.pace,
            preferred_styles:  s.preferred_styles  ?? prev?.preferred_styles,
            dietary:           s.needs?.dietary    ?? prev?.dietary,
          }))
        }
      }

      // Restore itinerary from localStorage (survives page refresh)
      // Key uses user.id + cityId — both are available synchronously here
      try {
        const lsKey = `itinerary-${user.id}-${cityId}`
        const saved = localStorage.getItem(lsKey)
        if (saved && hasSessionHistory) {
          setItinerary(JSON.parse(saved))
        } else if (saved) {
          localStorage.removeItem(lsKey)
          setItinerary({})
        }
      } catch { /* ignore parse errors */ }

      setPageReady(true)
    }

    init()
  }, [cityId, router])

  // ── Persist itinerary to database (Auto-Save) ────────────────
  useEffect(() => {
    if (!userId || !cityId || !sessionId || Object.keys(itinerary).length === 0) return

    const timer = setTimeout(async () => {
      // Fetch current session state to merge
      const { data: current } = await supabase
        .from('chat_sessions')
        .select('planner_state')
        .eq('id', sessionId)
        .single()
      
      const nextState = { ...(current?.planner_state || {}), itinerary }

      await supabase
        .from('chat_sessions')
        .update({ planner_state: nextState })
        .eq('id', sessionId)
      
      // Also backup to localStorage
      try { localStorage.setItem(`itinerary-${userId}-${cityId}`, JSON.stringify(itinerary)) } catch {}
    }, 2000)

    return () => clearTimeout(timer)
  }, [itinerary, userId, cityId, sessionId])

  // ── Auto-send opening message on fresh session ───────────────
  useEffect(() => {
    if (!pageReady || initDone.current || messages.length > 0 || !userId || !destination) return
    if (showIntake && !intakeDone) return // Wait for manual intake
    initDone.current = true

    // POST __INIT__ silently — no user bubble, no UI update before sending
    const sendInit = async () => {
      setIsLoading(true)
      setToolStatus(null)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '__INIT__', sessionId, destinationId: cityId, userId, itinerary, quizContext: tripContext }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer    = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const chunk = JSON.parse(line)
              if (chunk.type === 'session') setSessionId(chunk.sessionId)
              else if (chunk.type === 'status') setToolStatus(chunk.message)
              else if (chunk.type === 'result') {
                setToolStatus(null)
                if (chunk.sessionId) setSessionId(chunk.sessionId)
                const { message, itinerary_updates, options, quick_replies, overwrite_itinerary } = chunk.data
                
                setMessages([{ role: 'assistant', content: message, quickReplies: quick_replies ?? [] }])
                
                if (overwrite_itinerary) {
                  const newItin = {}
                  overwrite_itinerary.forEach(d => {
                    newItin[`day${d.day}`] = d.items
                  })
                  setItinerary(newItin)
                } else if (itinerary_updates?.length) {
                  setItinerary(prev => applyUpdates(prev, itinerary_updates))
                }

                if (options?.length) { setPendingOptions(options); setSelectedOptionNames(new Set()); setActiveTab('options') }
              }
            } catch { /* skip malformed */ }
          }
        }
      } catch {
        setMessages([{
          role: 'assistant',
          content: `${destination?.city ?? 'This destination'} is a great pick for a well-planned getaway.`,
          quickReplies: [],
        }])
      } finally {
        setIsLoading(false)
        setToolStatus(null)
      }
    }

    sendInit()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageReady, userId, destination, resetKey, intakeDone])

  // ── Local updates (`delete` / `update` from UI) ─────────────
  const handleUpdateItem = useCallback((updates) => {
    setItinerary(prev => applyUpdates(prev, updates))
  }, [])

  const handleDeleteItem = useCallback((dayKey, itemName) => {
    handleUpdateItem([{ action: 'remove', day: parseInt(dayKey.replace('day', '')), name: itemName }])
  }, [handleUpdateItem])

  const handleAddFromMap = useCallback((item, dayNum) => {
    handleUpdateItem([{ action: 'add', day: dayNum, ...item }])
  }, [handleUpdateItem])

  // ── Send message ────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    if (!text.trim() || isLoading) return

    // When asking for a full itinerary generation, clear the current itinerary state
    // so the AI sees a blank slate and generates ALL days from Day 1 instead of
    // skipping days that are already populated in the itinerary context.
    const isFullGen = /suggest full itinerar/i.test(text) || /plan everything/i.test(text) || /give me a full draft/i.test(text)
    const itineraryToSend = isFullGen ? {} : itinerary
    if (isFullGen) {
      setItinerary({})
      try { localStorage.removeItem(`itinerary-${userId}-${cityId}`) } catch { /* ignore */ }
    }

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsLoading(true)
    setToolStatus(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, destinationId: cityId, userId, itinerary: itineraryToSend }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const chunk = JSON.parse(line)

            if (chunk.type === 'session') {
              setSessionId(chunk.sessionId)

            } else if (chunk.type === 'status') {
              setToolStatus(chunk.message)

            } else if (chunk.type === 'result') {
              setToolStatus(null)
              if (chunk.sessionId) setSessionId(chunk.sessionId)
              const { message, itinerary_updates, options, quick_replies, overwrite_itinerary } = chunk.data

              setMessages(prev => [...prev, { role: 'assistant', content: message, quickReplies: quick_replies ?? [] }])
              
              if (overwrite_itinerary) {
                const newItin = {}
                overwrite_itinerary.forEach(d => {
                  newItin[`day${d.day}`] = d.items
                })
                setItinerary(newItin)
              } else if (itinerary_updates?.length) {
                setItinerary(prev => applyUpdates(prev, itinerary_updates))
              }

            } else if (chunk.type === 'error') {
              setToolStatus(null)
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, something went wrong. Please try again.',
              }])
            }
          } catch { /* skip malformed line */ }
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't connect. Please try again.",
      }])
    } finally {
      setIsLoading(false)
      setToolStatus(null)
    }
  }, [isLoading, sessionId, cityId, userId, itinerary])

  useEffect(() => {
    // Only fire once isLoading is clear so handleSend's guard doesn't block it
    if (autoMessage && pageReady && !isLoading) {
      const msg = autoMessage
      setAutoMessage(null)
      handleSend(msg)
    }
  }, [autoMessage, pageReady, isLoading, handleSend])
  // Note: handleSaveAndExit removed in favor of Auto-save. 
  // We now use direct router.push for navigation.

  // ── Reset Chat ──────────────────────────────────────────────
  async function handleResetChat() {
    if (!confirm('Are you sure you want to start over? This will clear your current plan.')) return

    if (sessionId) {
      // 1. Unlink any exported plans from this session to avoid foreign key constraints
      await supabase.from('itineraries').update({ session_id: null }).eq('session_id', sessionId)
      
      // 2. Hard Delete messages and session
      await supabase.from('chat_messages').delete().eq('session_id', sessionId)
      await supabase.from('chat_sessions').delete().eq('id', sessionId)
    }

    setMessages([])
    setItinerary({})
    setSessionId(null)
    setActiveTab('itinerary')
    setActiveDay('all')
    setIntakeDone(false)
    try { 
      localStorage.removeItem(`itinerary-${userId}-${cityId}`) 
    } catch { /* ignore */ }

    // Re-trigger __INIT__ fetch
    initDone.current = false
    setResetKey(prev => prev + 1)
  }

  // ── Intake logic ────────────────────────────────────────────
  const handleIntakeSubmit = async (data) => {
    setTripContext(data)
    setIntakeDone(true)
    setShowIntake(false)
  }



  // ── Export flow ─────────────────────────────────────────────
  function handleExport() {
    const days  = Object.keys(itinerary).filter(k => itinerary[k]?.length).length
    setExportTitle(`${destination?.city} · ${days} Day${days !== 1 ? 's' : ''}`)
    setExportModal(true)
  }

  async function confirmExport() {
    if (!userId || !cityId) return
    setExportSaving(true)
    // 1. Create the permanent itinerary record
    const { data, error } = await supabase.from('itineraries').insert({
      user_id:        userId,
      destination_id: cityId,
      session_id:     sessionId,
      title:          exportTitle || `${destination?.city} Trip`,
      content:        itinerary,
      trip_metadata:  tripContext,
    }).select()

    // 2. Mark session as finalized (using 'completed' to match DB constraint)
    if (!error) {
      await supabase
        .from('chat_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId)
    }

    setExportSaving(false)
    if (!error && data?.[0]) {
      setExportModal(false)
      router.push(`/saved-itinerary/${data[0].id}`)
    }
  }

  // ── Page loading ────────────────────────────────────────────
  if (!pageReady) {
    return (
      <div className="w-full flex items-center justify-center bg-warmwhite" style={{ height: 'calc(100dvh - 96px)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-body text-secondary">Loading your planner...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col bg-warmwhite overflow-hidden" style={{ height: 'calc(100dvh - 96px)' }}>

      {/* ── Header bar ── */}
      <header className="flex items-center justify-between pl-4 pr-5 py-3 border-b border-border bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-black/5 rounded-full transition-colors text-charcoal/60 hover:text-charcoal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-charcoal tracking-tight font-display">
                Planning: <span className="text-amber">{destination?.city || 'Your Trip'}</span>, {destination?.country}
              </h1>
              <p className="text-[10px] text-tertiary font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Planning Session
              </p>
            </div>
          </div>

        <div className="flex items-center gap-3 shrink-0">
          {exportDone && (
            <span className="text-xs font-semibold font-body text-success bg-success-bg px-3 py-1 rounded-full">
              ✓ Saved to My Plans
            </span>
          )}
          <button
            onClick={handleResetChat}
            className="text-xs font-semibold font-body px-3 py-1.5 rounded-md border border-border text-secondary hover:text-charcoal hover:border-charcoal transition-colors ml-2"
          >
            Reset Chat
          </button>
        </div>
      </header>

      {/* ── Trip context bar (full-width) ── */}
      {tripContext && (
        <div className="pl-4 pr-5 py-1.5 border-b border-border/40 bg-white shrink-0 flex items-center gap-4 text-xs font-body text-charcoal font-medium">
          {tripContext.travel_date_start && tripContext.travel_date_end && (
            <span 
              className="flex items-center gap-1.5 px-2 rounded border border-border/40 text-secondary text-[10px] font-bold uppercase leading-none h-[22px]"
              style={{ backgroundColor: '#F0EBE3' }}
            >
              <CalendarIcon />
              <span className="pt-[1px]">
                {(() => {
                  const [y, m, d] = tripContext.travel_date_start.split('-').map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
                })()} - {(() => {
                  const [y, m, d] = tripContext.travel_date_end.split('-').map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
                })()}
              </span>
            </span>
          )}
          {tripContext.trip_days && (
            <span 
              className="flex items-center gap-1.5 px-2 rounded border border-border/40 text-secondary text-[10px] font-bold uppercase leading-none h-[22px]"
              style={{ backgroundColor: '#F0EBE3' }}
            >
              <span className="pt-[1px]">{tripContext.trip_days} Days</span>
            </span>
          )}
          {tripContext.budget && (
            <span className={`flex items-center gap-1.5 px-2 rounded border text-[10px] font-bold uppercase leading-none h-[22px] ${getBudgetStyle(tripContext.budget)}`}>
              <BudgetIcon />
              <span className="pt-[1px]">{tripContext.budget}</span>
            </span>
          )}
          {tripContext.pace && (
            <span 
              className="flex items-center gap-1.5 px-2 rounded border border-border/40 text-secondary text-[10px] font-bold uppercase leading-none h-[22px]"
              style={{ backgroundColor: '#F0EBE3' }}
            >
              <PaceIcon />
              <span className="pt-[1px]">{tripContext.pace}</span>
            </span>
          )}
          {tripContext.group_size && (
            <span 
              className="flex items-center gap-1.5 px-2 rounded border border-border/40 text-secondary text-[10px] font-bold uppercase leading-none h-[22px]"
              style={{ backgroundColor: '#F0EBE3' }}
            >
              <GroupIcon />
              <span className="pt-[1px]">{tripContext.group_size}</span>
            </span>
          )}
        </div>
      )}

      {/* ── Split pane ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — Chat (50%) */}
        <div className="w-1/2 border-r border-border flex flex-col min-h-0 bg-subtle/30">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            toolStatus={toolStatus}
            onSend={handleSend}
          />
        </div>

        {/* Right — Tabs (50%) */}
        <div className="w-1/2 flex flex-col min-h-0">

          {/* Tab switcher */}
          <div className="flex items-center gap-1 pl-4 pr-4 py-2 border-b border-border bg-white shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 text-xs font-semibold font-body px-4 py-1.5 rounded-md transition-colors
                  ${activeTab === tab.id
                    ? 'bg-charcoal text-warmwhite'
                    : 'text-secondary hover:text-charcoal hover:bg-muted'}`}
              >
                {tab.label}
                {tab.id === 'options' && pendingOptions.length > 0 && (
                  <span className="bg-amber text-warmwhite text-xs rounded-full px-1.5 leading-4">
                    {pendingOptions.length - selectedOptionNames.size > 0
                      ? pendingOptions.length - selectedOptionNames.size
                      : '✓'}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'itinerary' && (
              <ItineraryPanel
                itinerary={itinerary}
                onExport={handleExport}
                onDelete={handleDeleteItem}
                onUpdate={handleUpdateItem}
                city={destination?.city}
                tripContext={tripContext}
                allowFullEdit={true}
                cityContext={{
                  name: destination?.city,
                  country: destination?.country,
                  lat: destination?.latitude,
                  lng: destination?.longitude
                }}
              />
            )}
            {activeTab === 'map' && (
              <MapPanel
                itinerary={itinerary}
                activeDay={activeDay}
                onDayChange={setActiveDay}
                cityLat={destination?.latitude}
                cityLng={destination?.longitude}
                onAddToItinerary={handleAddFromMap}
                cityContext={{
                  name: destination?.city,
                  country: destination?.country,
                  lat: destination?.latitude,
                  lng: destination?.longitude
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Export modal ── */}
      {exportModal && (
        <div className="fixed inset-0 bg-charcoal/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-extrabold font-display mb-1">Save to My Plans</h2>
            <p className="text-sm font-body text-secondary mb-4">
              Give your plan a name — you can always come back and save again after more changes.
            </p>
            <input
              type="text"
              value={exportTitle}
              onChange={e => setExportTitle(e.target.value)}
              className="input-base mb-5"
              placeholder="e.g. Kyoto · 5 Days · April 2026"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setExportModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold font-body text-secondary hover:border-charcoal transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmExport}
                disabled={exportSaving}
                className="flex-1 py-2.5 rounded-lg bg-amber text-warmwhite text-sm font-semibold font-body hover:bg-amberdark transition-colors disabled:opacity-60"
              >
                {exportSaving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showIntake && (
        <QuickIntakeModal 
          city={destination?.city} 
          onSubmit={handleIntakeSubmit} 
        />
      )}

    </div>
  )
}
