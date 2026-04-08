'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase/client'
import ChatWindow from '@/components/sections/ChatWindow'
import ItineraryPanel from '@/components/sections/ItineraryPanel'

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
        next[key] = next[key].map(i =>
          i.name === update.name ? { ...i, ...sanitised } : i
        )
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
  const [resetKey,      setResetKey]      = useState(0)
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
          }
          setTripContext(savedQuizContext)
        }
      } catch { /* ignore */ }

      const { data: session } = await supabase
        .from('chat_sessions')
        .select('id, planner_state')
        .eq('user_id', user.id)
        .eq('destination_id', cityId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (session) {
        setSessionId(session.id)
        const { data: history } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true })
        if (history?.length) {
          hasSessionHistory = true
          
          // Quick replies don't persist in DB. If the user refreshed on the very first 
          // assistant greeting, artificially restore the prompt chips so they aren't stuck.
          if (history.length === 1 && history[0].role === 'assistant') {
            const ps = session.planner_state || {}
            const knownDays = ps.trip_days || savedQuizContext?.trip_days
            history[0].quickReplies = knownDays 
              ? [{ label: 'Suggest full itineraries', value: 'Suggest full itineraries' }]
              : [{ label: '3 days', value: '3 days' }, { label: '5 days', value: '5 days' }, { label: '7 days', value: '7 days' }]
          }
          
          setMessages(history)
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

  // ── Persist itinerary to localStorage on every change ────────
  useEffect(() => {
    if (!userId || !cityId || Object.keys(itinerary).length === 0) return
    try {
      localStorage.setItem(`itinerary-${userId}-${cityId}`, JSON.stringify(itinerary))
    } catch { /* storage full or unavailable */ }
  }, [itinerary, userId, cityId])

  // ── Auto-send opening message on fresh session ───────────────
  useEffect(() => {
    if (!pageReady || initDone.current || messages.length > 0 || !userId || !destination) return
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
                const { message, itinerary_updates, options, quick_replies } = chunk.data
                setMessages([{ role: 'assistant', content: message, quickReplies: quick_replies ?? [] }])
                if (itinerary_updates?.length) setItinerary(prev => applyUpdates(prev, itinerary_updates))
                if (options?.length) { setPendingOptions(options); setSelectedOptionNames(new Set()); setActiveTab('options') }
              }
            } catch { /* skip malformed */ }
          }
        }
      } catch {
        const fallbackQuickReplies = tripContext?.trip_days
          ? [{ label: 'Suggest full itineraries', value: 'Suggest full itineraries' }]
          : [{ label: '3 days', value: '3 days' }, { label: '5 days', value: '5 days' }, { label: '7 days', value: '7 days' }]
        setMessages([{
          role: 'assistant',
          content: tripContext?.trip_days
            ? `${destination?.city ?? 'This destination'} is a great pick.\n\nWould you like me to instantly draft a full itinerary based on your preferences?`
            : `${destination?.city ?? 'This destination'} is a great pick.\n\nHow many days is the trip?`,
          quickReplies: fallbackQuickReplies,
        }])
      } finally {
        setIsLoading(false)
        setToolStatus(null)
      }
    }

    sendInit()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageReady, userId, destination, resetKey])

  // ── Local deletions ─────────────────────────────────────────
  const handleDeleteItem = useCallback((dayKey, itemName) => {
    setItinerary(prev => {
      const next = { ...prev }
      if (!next[dayKey]) return next
      next[dayKey] = next[dayKey].filter(i => i.name !== itemName)
      
      // If the day is now empty, delete the key entirely to clean up state
      if (next[dayKey].length === 0) {
        delete next[dayKey]
      }
      
      // Also notify chat api context immediately if we had an internal patch queue
      // For now, the next message sent will carry the updated itinerary anyway.
      return next
    })
  }, [])

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

  // ── Save & Exit ─────────────────────────────────────────────
  async function handleSaveAndExit() {
    if (sessionId) {
      await supabase
        .from('chat_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId)
    }
    // Clear persisted itinerary — session is done
    try { localStorage.removeItem(`itinerary-${userId}-${cityId}`) } catch { /* ignore */ }
    router.push(`/destinations/${cityId}`)
  }

  // ── Reset Chat ──────────────────────────────────────────────
  async function handleResetChat() {
    if (!confirm('Are you sure you want to start over? This will clear your current plan.')) return

    if (sessionId) {
      // Archive current session
      await supabase.from('chat_sessions').update({ status: 'archived' }).eq('id', sessionId)
    }

    setMessages([])
    setItinerary({})
    setSessionId(null)
    setActiveTab('itinerary')
    setActiveDay('all')
    try { localStorage.removeItem(`itinerary-${userId}-${cityId}`) } catch { /* ignore */ }

    // Re-trigger __INIT__ fetch
    initDone.current = false
    setResetKey(prev => prev + 1)
  }

  // ── Back Button ─────────────────────────────────────────────
  async function handleBack() {
    if (sessionId) {
      // Automatically archive session if they leave explicitly via Back button
      await supabase.from('chat_sessions').update({ status: 'archived' }).eq('id', sessionId)
    }
    try { localStorage.removeItem(`itinerary-${userId}-${cityId}`) } catch { /* ignore */ }
    router.push(`/destinations/${cityId}`)
  }

  // ── Export flow ─────────────────────────────────────────────
  function handleExport() {
    const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    const days  = Object.keys(itinerary).filter(k => itinerary[k]?.length).length
    setExportTitle(`${destination?.city} · ${days} Day${days !== 1 ? 's' : ''} · ${month}`)
    setExportModal(true)
  }

  async function confirmExport() {
    if (!userId || !cityId) return
    setExportSaving(true)
    const { error } = await supabase.from('itineraries').insert({
      user_id:        userId,
      destination_id: cityId,
      session_id:     sessionId,
      title:          exportTitle || `${destination?.city} Trip`,
      content:        itinerary,
    })
    setExportSaving(false)
    if (!error) {
      setExportModal(false)
      setExportDone(true)
      setTimeout(() => setExportDone(false), 4000)
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
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="text-sm font-body text-secondary hover:text-charcoal transition-colors"
          >
            ← Back
          </button>
          <span className="text-border">|</span>
          <h1 className="text-sm font-extrabold font-display truncate">
            Planning: {destination?.city}, {destination?.country}
          </h1>
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
          <button
            onClick={handleSaveAndExit}
            className="text-xs font-semibold font-body px-3 py-1.5 rounded-md bg-charcoal text-warmwhite hover:bg-amber transition-colors ml-2"
          >
            Save &amp; Exit
          </button>
        </div>
      </header>

      {/* ── Trip context bar (full-width) ── */}
      {tripContext && (
        <div className="px-5 py-2 border-b border-border/60 bg-white/70 backdrop-blur-sm shrink-0 flex items-center gap-5 text-xs font-body text-charcoal font-medium">
          {tripContext.travel_date_start && tripContext.travel_date_end && (
            <span className="flex items-center gap-1.5"><span className="opacity-70">🗓</span> {new Date(tripContext.travel_date_start).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - {new Date(tripContext.travel_date_end).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
          )}
          {tripContext.trip_days && (
            <span className="flex items-center gap-1.5"><span className="opacity-70">⏱</span> {tripContext.trip_days} Days</span>
          )}
          {tripContext.budget && (
            <span className="flex items-center gap-1.5"><span className="opacity-70">💰</span> {tripContext.budget}</span>
          )}
          {tripContext.pace && (
            <span className="flex items-center gap-1.5"><span className="opacity-70">🏃</span> {tripContext.pace}</span>
          )}
          {tripContext.group_size && (
            <span className="flex items-center gap-1.5"><span className="opacity-70">🙋</span> {tripContext.group_size}</span>
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
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-white shrink-0">
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
                city={destination?.city}
              />
            )}
            {activeTab === 'map' && (
              <MapPanel
                itinerary={itinerary}
                activeDay={activeDay}
                onDayChange={setActiveDay}
                cityLat={destination?.latitude}
                cityLng={destination?.longitude}
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

    </div>
  )
}
