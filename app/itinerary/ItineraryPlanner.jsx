'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase/client'
import ChatWindow from '@/components/sections/ChatWindow'
import ItineraryPanel from '@/components/sections/ItineraryPanel'
import OptionsPanel from '@/components/sections/OptionsPanel'

const MapPanel = dynamic(() => import('@/components/sections/MapPanel'), { ssr: false })

const TABS = [
  { id: 'itinerary', label: '📋 Itinerary' },
  { id: 'map',       label: '🗺️ Map' },
  { id: 'options',   label: '🏨 Options' },
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
      next[key] = [...next[key], sanitised]
    } else if (update.action === 'remove') {
      next[key] = next[key].filter(i => i.name !== update.name)
    } else if (update.action === 'update') {
      next[key] = next[key].map(i =>
        i.name === update.name ? { ...i, ...sanitised } : i
      )
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
  const [pendingOptions,setPendingOptions]= useState([])
  const [selectedOptionNames, setSelectedOptionNames] = useState(new Set())
  const [isLoading,     setIsLoading]     = useState(false)
  const [toolStatus,    setToolStatus]    = useState(null)
  const [sessionId,     setSessionId]     = useState(null)
  const [pageReady,     setPageReady]     = useState(false)
  const [exportModal,   setExportModal]   = useState(false)
  const [exportTitle,   setExportTitle]   = useState('')
  const [exportSaving,  setExportSaving]  = useState(false)
  const [exportDone,    setExportDone]    = useState(false)
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

      const { data: session } = await supabase
        .from('chat_sessions')
        .select('id')
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
      // Read quiz answers from sessionStorage (only needed for this single __INIT__ call)
      // Both keys must exist; if either is missing, quizContext stays null (user arrived directly)
      let quizContext = null
      try {
        const rawPrefs = sessionStorage.getItem('quiz_prefs')
        const rawMeta  = sessionStorage.getItem('quiz_trip_meta')
        if (rawPrefs && rawMeta) {
          const prefs = JSON.parse(rawPrefs)
          const meta  = JSON.parse(rawMeta)
          quizContext = {
            trip_days:         meta.duration_days   ?? null,
            budget:            prefs.budget         ?? null,   // e.g. "Mid-range"
            travel_date_start: meta.date_start      ?? null,   // ISO string
            travel_date_end:   meta.date_end        ?? null,
            group_size:        prefs.groupSize      ?? null,   // e.g. "Couple"
            preferred_styles:  prefs.styles         ?? [],     // e.g. ["Culture", "Food & Cuisine"]
          }
        }
      } catch { /* sessionStorage unavailable or corrupted — fall back to null */ }

      setIsLoading(true)
      setToolStatus(null)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '__INIT__', sessionId, destinationId: cityId, userId, itinerary, quizContext }),
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
        const fallbackQuickReplies = quizContext?.trip_days
          ? [{ label: 'Relaxed', value: 'Relaxed' }, { label: 'Balanced', value: 'Balanced' }, { label: 'Packed', value: 'Packed' }]
          : [{ label: '3 days', value: '3 days' }, { label: '5 days', value: '5 days' }, { label: '7 days', value: '7 days' }]
        setMessages([{
          role: 'assistant',
          content: quizContext?.trip_days
            ? `${destination?.city ?? 'This destination'} is a great pick.\n\nI can see you're planning **${quizContext.trip_days} days** — what pace suits you: relaxed, balanced, or packed?`
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
  }, [pageReady, userId, destination])

  // ── Send message ────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    if (!text.trim() || isLoading) return

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsLoading(true)
    setToolStatus(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, destinationId: cityId, userId, itinerary }),
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
              const { message, itinerary_updates, options, quick_replies } = chunk.data

              setMessages(prev => [...prev, { role: 'assistant', content: message, quickReplies: quick_replies ?? [] }])
              if (itinerary_updates?.length) {
                setItinerary(prev => applyUpdates(prev, itinerary_updates))
              }
              if (options?.length) {
                setPendingOptions(options)
                setSelectedOptionNames(new Set())
                setActiveTab('options')
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

  // ── Select option from Options panel ───────────────────────
  function handleOptionSelect(option) {
    // Mark as selected but keep the full options list visible
    setSelectedOptionNames(prev => new Set([...prev, option.name]))
    setActiveTab('itinerary')
    handleSend(`I'll go with ${option.name}`)
  }

  // ── Done with current options batch ─────────────────────────
  function handleOptionsDone() {
    setPendingOptions([])
    setSelectedOptionNames(new Set())
  }

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
      <div className="h-full flex items-center justify-center bg-warmwhite">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-body text-secondary">Loading your planner...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-warmwhite overflow-hidden">

      {/* ── Header bar ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-3">
          <a
            href={`/destinations/${cityId}`}
            className="text-sm font-body text-secondary hover:text-charcoal transition-colors"
          >
            ← Back
          </a>
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
            onClick={handleSaveAndExit}
            className="text-xs font-semibold font-body px-3 py-1.5 rounded-md border border-border text-secondary hover:text-charcoal hover:border-charcoal transition-colors"
          >
            Save &amp; Exit
          </button>
        </div>
      </header>

      {/* ── Split pane ── */}
      <div className="flex flex-1 min-h-0">

        {/* Left — Chat (50%) */}
        <div className="w-1/2 border-r border-border flex flex-col min-h-0">
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
            {activeTab === 'options' && (
              <OptionsPanel
                options={pendingOptions}
                selectedNames={selectedOptionNames}
                onSelect={handleOptionSelect}
                onDone={handleOptionsDone}
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
