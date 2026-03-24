'use client'

import { useState, useEffect, useCallback } from 'react'
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

// ── Itinerary state helpers ───────────────────────────────────

function applyUpdates(prev, updates) {
  if (!updates?.length) return prev
  const next = { ...prev }
  for (const update of updates) {
    const key = `day${update.day}`
    if (!next[key]) next[key] = []

    if (update.action === 'add') {
      next[key] = [...next[key], update]
    } else if (update.action === 'remove') {
      next[key] = next[key].filter(i => i.name !== update.name)
    } else if (update.action === 'update') {
      next[key] = next[key].map(i =>
        i.name === update.name ? { ...i, ...update } : i
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

  // ── Init: auth + destination + existing session ─────────────
  useEffect(() => {
    if (!cityId) { router.replace('/'); return }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      setUserId(user.id)

      const { data: dest } = await supabase
        .from('destinations')
        .select('id, city, country')
        .eq('id', cityId)
        .single()

      if (!dest) { router.replace('/'); return }
      setDestination(dest)

      // Resume existing active session if found
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
        if (history?.length) setMessages(history)
      }

      setPageReady(true)
    }

    init()
  }, [cityId, router])

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
        body: JSON.stringify({ message: text, sessionId, destinationId: cityId, userId }),
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
              const { message, itinerary_updates, options } = chunk.data

              setMessages(prev => [...prev, { role: 'assistant', content: message }])
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
          } catch (_) { /* skip malformed line */ }
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
  }, [isLoading, sessionId, cityId, userId])

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
