'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase/client'
import { sanitiseCoords as sharedSanitiseCoords } from '@/lib/ai/tools/sanitise-coords'
import ChatWindow from '@/components/sections/ChatWindow'
import ItineraryPanel from '@/components/sections/ItineraryPanel'

const MapPanel = dynamic(() => import('@/components/sections/MapPanel'), { ssr: false })

const TABS = [
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'map', label: 'Map' },
]

// C4: client uses the same heuristic as the server via the shared module.
const sanitiseCoords = sharedSanitiseCoords

function applyUpdates(prev, updates, coordsContext) {
  if (!updates?.length) return prev

  const next = { ...prev }
  for (const rawUpdate of updates) {
    const update = sanitiseCoords(rawUpdate, coordsContext)
    const key = `day${update.day}`
    if (!next[key]) next[key] = []

    if (update.action === 'add') {
      const exists = next[key].some(item => item.name === update.name)
      if (!exists) next[key] = [...next[key], update]
      continue
    }

    if (update.action === 'remove') {
      next[key] = next[key].filter(item => item.name !== update.name)
      continue
    }

    if (update.action === 'update') {
      const exists = next[key].some(item => item.name === update.name)
      if (!exists) {
        next[key] = [...next[key], update]
        continue
      }

      next[key] = next[key].map(item => {
        if (item.name !== update.name) return item
        const merged = { ...item, ...update }
        if (update.new_name) merged.name = update.new_name
        return merged
      })
    }
  }

  for (const key of Object.keys(next)) {
    if (Array.isArray(next[key]) && next[key].length === 0) {
      delete next[key]
    }
  }

  return next
}

function overwriteDaysIntoItinerary(prev, overwriteDays = []) {
  const next = { ...(prev ?? {}) }
  for (const day of overwriteDays) {
    next[`day${day.day}`] = day.items ?? []
  }
  return next
}

function toPositiveNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function buildTripContextFromQuiz(prefs, meta, profile) {
  return {
    trip_days: toPositiveNumber(meta?.duration_days),
    budget: prefs?.budget ?? null,
    travel_date_start: meta?.date_start ?? null,
    travel_date_end: meta?.date_end ?? null,
    group_size: toPositiveNumber(prefs?.groupSize),
    pace: prefs?.pace ?? null,
    preferred_styles: Array.isArray(prefs?.styles) ? prefs.styles : [],
    dietary: profile?.dietary_restrictions && profile.dietary_restrictions !== 'None'
      ? profile.dietary_restrictions
      : null,
  }
}

export default function ItineraryPlanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const cityId = searchParams.get('city')
  const sessionParam = searchParams.get('session')

  const [destination, setDestination] = useState(null)
  const [userId, setUserId] = useState(null)
  const [messages, setMessages] = useState([])
  const [itinerary, setItinerary] = useState({})
  const [activeTab, setActiveTab] = useState('itinerary')
  const [activeDay, setActiveDay] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [pageReady, setPageReady] = useState(false)
  const [tripContext, setTripContext] = useState(null)
  const [autoMessage, setAutoMessage] = useState(null)
  const [resetKey, setResetKey] = useState(0)
  const [exportModal, setExportModal] = useState(false)
  const [exportTitle, setExportTitle] = useState('')
  const [exportSaving, setExportSaving] = useState(false)
  const [addPlaceModal, setAddPlaceModal] = useState(null)
  const [selectedAddDay, setSelectedAddDay] = useState(1)
  const [addPlaceSubmitting, setAddPlaceSubmitting] = useState(false)
  const [focusedLocation, setFocusedLocation] = useState(null)
  const [nearbyCategory, setNearbyCategory] = useState(null)
  const [nearbyResults, setNearbyResults] = useState([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [mapSidebarOpen, setMapSidebarOpen] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const initDone = useRef(false)

  const syncTripContextFromSession = useCallback((plannerState) => {
    if (!plannerState) return
    setTripContext(prev => ({
      ...prev,
      trip_days: plannerState.trip_days ?? prev?.trip_days,
      budget: plannerState.budget_profile ?? prev?.budget,
      travel_date_start: plannerState.travel_date_start ?? prev?.travel_date_start,
      travel_date_end: plannerState.travel_date_end ?? prev?.travel_date_end,
      group_size: plannerState.group_size ?? prev?.group_size,
      pace: plannerState.pace ?? prev?.pace,
      preferred_styles: plannerState.preferred_styles ?? prev?.preferred_styles,
      dietary: plannerState.needs?.dietary ?? prev?.dietary,
    }))
  }, [])

  useEffect(() => {
    if (!cityId) {
      router.replace('/')
      return
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }

      setUserId(user.id)

      const { data: dest } = await supabase
        .from('destinations')
        .select('id, city, country, latitude, longitude')
        .eq('id', cityId)
        .single()

      if (!dest) {
        router.replace('/')
        return
      }

      setDestination(dest)

      const { data: profile } = await supabase
        .from('traveller_profiles')
        .select('dietary_restrictions, accessibility_needs')
        .eq('user_id', user.id)
        .maybeSingle()

      try {
        const rawPrefs = sessionStorage.getItem('quiz_prefs')
        const rawMeta = sessionStorage.getItem('quiz_trip_meta')
        if (rawPrefs && rawMeta) {
          setTripContext(buildTripContextFromQuiz(JSON.parse(rawPrefs), JSON.parse(rawMeta), profile))
        }
      } catch {
        // Ignore malformed browser storage.
      }

      let hasSessionHistory = false

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
        syncTripContextFromSession(session.planner_state)

        const { data: history } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true })

        if (history?.length) {
          hasSessionHistory = true
          if (history.length === 1 && history[0].role === 'assistant') {
            history[0].quickReplies = []
          }
          setMessages(history)
        }

        if (session.planner_state?.itinerary) {
          hasSessionHistory = true
          setItinerary(session.planner_state.itinerary)
        }
      }

      try {
        const lsKey = `itinerary-${user.id}-${cityId}`
        const saved = localStorage.getItem(lsKey)
        if (saved && !hasSessionHistory) {
          setItinerary(JSON.parse(saved))
        }
      } catch {
        // Ignore malformed local backup.
      }

      // B1: flag that history restoration is finished so sendInit can decide correctly.
      // Must be set AFTER setMessages/setItinerary so sendInit sees them on next render.
      setHistoryLoaded(true)
      setPageReady(true)
    }

    init()
  }, [cityId, router, sessionParam, syncTripContextFromSession])

  useEffect(() => {
    if (!userId || !cityId || !sessionId || Object.keys(itinerary).length === 0) return

    // B3: capture sessionId at timer creation so stale closures can't write to a new session.
    const savedSessionId = sessionId
    const savedUserId = userId
    const savedCityId = cityId

    const timer = setTimeout(async () => {
      const { data: current } = await supabase
        .from('chat_sessions')
        .select('planner_state')
        .eq('id', savedSessionId)
        .single()

      const nextState = { ...(current?.planner_state || {}), itinerary }
      await supabase
        .from('chat_sessions')
        .update({ planner_state: nextState })
        .eq('id', savedSessionId)

      try {
        localStorage.setItem(`itinerary-${savedUserId}-${savedCityId}`, JSON.stringify(itinerary))
      } catch {
        // Ignore storage failure.
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [cityId, itinerary, sessionId, userId])

  const applyServerResult = useCallback((data, replaceMessages = false) => {
    const { message, itinerary_updates, options, quick_replies, overwrite_itinerary: rawOverwrite } = data

    if (replaceMessages) {
      setMessages([{ role: 'assistant', content: message, quickReplies: quick_replies ?? [] }])
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: message, quickReplies: quick_replies ?? [] }])
    }

    // D2: filter out malformed days before writing to state. The server is supposed to
    // emit { day: <number>, items: <array> } per day, but a regression there shouldn't
    // wipe the user's itinerary — drop the bad entries and warn.
    let overwrite_itinerary = null
    if (Array.isArray(rawOverwrite)) {
      overwrite_itinerary = rawOverwrite.filter((day) => {
        const valid = day && Number.isFinite(Number(day.day)) && Array.isArray(day.items)
        if (!valid) {
          console.warn('[applyServerResult] dropping malformed overwrite_itinerary day', day)
        }
        return valid
      })
      if (overwrite_itinerary.length === 0) overwrite_itinerary = null
    } else if (rawOverwrite != null) {
      console.warn('[applyServerResult] overwrite_itinerary was not an array, ignoring', rawOverwrite)
    }

    if (overwrite_itinerary) {
      setItinerary((prev) => {
        if (replaceMessages || !prev || Object.keys(prev).length === 0) {
          const nextItinerary = {}
          overwrite_itinerary.forEach((day) => {
            nextItinerary[`day${day.day}`] = day.items
          })
          return nextItinerary
        }

        if (overwrite_itinerary.length >= Object.keys(prev).length) {
          const nextItinerary = {}
          overwrite_itinerary.forEach((day) => {
            nextItinerary[`day${day.day}`] = day.items
          })
          return nextItinerary
        }

        return overwriteDaysIntoItinerary(prev, overwrite_itinerary)
      })
    } else if (itinerary_updates?.length) {
      const coordsContext = destination
        ? { bias_lat: destination.latitude, bias_lng: destination.longitude }
        : undefined
      setItinerary(prev => applyUpdates(prev, itinerary_updates, coordsContext))
    }

    if (options?.length) {
      setNearbyCategory('suggested')
      setNearbyResults(options)
      setMapSidebarOpen(true)
      const firstMappable = options.find(option => option.lat && option.lng)
      setFocusedLocation(firstMappable ? {
        lat: firstMappable.lat,
        lng: firstMappable.lng,
        id: firstMappable.place_id || firstMappable.name,
      } : null)
      setActiveTab('map')
    }
  }, [destination])

  const streamChatRequest = useCallback(async ({ body, replaceMessages = false }) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.trim()) continue
        const chunk = JSON.parse(line)

        if (chunk.type === 'session') {
          setSessionId(chunk.sessionId)
          continue
        }

        if (chunk.type === 'status') {
          setToolStatus(chunk.message)
          continue
        }

        if (chunk.type === 'result') {
          setToolStatus(null)
          if (chunk.sessionId) setSessionId(chunk.sessionId)
          applyServerResult(chunk.data, replaceMessages)
          continue
        }

        if (chunk.type === 'error') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
          }])
        }
      }
    }
  }, [applyServerResult])

  useEffect(() => {
    // B1: only fire init AFTER history restoration has finished. If history already exists,
    // skip init entirely — the restored messages/itinerary are the source of truth.
    if (!pageReady || !historyLoaded || initDone.current || !userId || !destination) return
    if (messages.length > 0) {
      initDone.current = true
      return
    }
    initDone.current = true

    async function sendInit() {
      setIsLoading(true)
      setToolStatus(null)
      try {
        await streamChatRequest({
          body: {
            message: '__INIT__',
            sessionId,
            destinationId: cityId,
            userId,
            itinerary,
            quizContext: tripContext,
          },
          replaceMessages: true,
        })
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
  }, [pageReady, historyLoaded, userId, destination, resetKey])

  const handleUpdateItem = useCallback((updates) => {
    const coordsContext = destination
      ? { bias_lat: destination.latitude, bias_lng: destination.longitude }
      : undefined
    setItinerary(prev => applyUpdates(prev, updates, coordsContext))
  }, [destination])

  const handleDeleteItem = useCallback((dayKey, itemName) => {
    handleUpdateItem([{ action: 'remove', day: parseInt(dayKey.replace('day', ''), 10), name: itemName }])
  }, [handleUpdateItem])

  const resolveTargetDay = useCallback(() => {
    if (typeof activeDay === 'number') return activeDay
    const firstDay = Object.keys(itinerary)
      .sort((a, b) => parseInt(a.replace('day', ''), 10) - parseInt(b.replace('day', ''), 10))[0]
    return firstDay ? parseInt(firstDay.replace('day', ''), 10) : 1
  }, [activeDay, itinerary])

  const availableDays = useCallback(() => {
    const configuredDays = Number(tripContext?.trip_days ?? 0)
    if (configuredDays > 0) {
      return Array.from({ length: configuredDays }, (_, index) => index + 1)
    }

    const itineraryDays = Object.keys(itinerary)
      .map(key => parseInt(key.replace('day', ''), 10))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)

    return itineraryDays.length > 0 ? itineraryDays : [1]
  }, [itinerary, tripContext?.trip_days])

  const openAddPlaceModal = useCallback((option) => {
    setAddPlaceModal(option)
    setSelectedAddDay(resolveTargetDay())
  }, [resolveTargetDay])

  const handleOptionSelect = useCallback(async () => {
    if (!addPlaceModal || !sessionId || !destination || !userId || addPlaceSubmitting) return

    const option = addPlaceModal
    const targetDay = selectedAddDay
    const placeType = option.type === 'shopping' ? 'attraction' : option.type
    const instruction = [
      `Planner action: add this exact place to Day ${targetDay} and re-plan Day ${targetDay} around it.`,
      `Place name: ${option.name}.`,
      `Place type: ${placeType}.`,
      option.place_id ? `Place ID: ${option.place_id}.` : null,
      option.lat != null && option.lng != null ? `Coordinates: ${option.lat}, ${option.lng}.` : null,
      option.notes || option.summary ? `Known details: ${option.notes || option.summary}.` : null,
      'Requirements: keep the day as a full-day itinerary, use exact named attractions/restaurants/hotel, include specific meal stops when relevant, no airport items, and reorganize transport flow logically.',
      `Use itinerary tools to update the plan for Day ${targetDay}; do not just append a loose item.`,
    ].filter(Boolean).join(' ')

    setAddPlaceSubmitting(true)
    setIsLoading(true)
    setToolStatus(null)
    setAddPlaceModal(null)

    try {
      await streamChatRequest({
        body: {
          message: instruction,
          sessionId,
          destinationId: cityId,
          userId,
          itinerary,
          silentUserMessage: true,
        },
      })

      setFocusedLocation(option.lat && option.lng ? { lat: option.lat, lng: option.lng, id: option.id || option.name } : null)
      setActiveDay(targetDay)
      setActiveTab('itinerary')
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't re-plan that day. Please try again.",
      }])
    } finally {
      setAddPlaceSubmitting(false)
      setIsLoading(false)
      setToolStatus(null)
    }
  }, [addPlaceModal, addPlaceSubmitting, cityId, destination, itinerary, selectedAddDay, sessionId, streamChatRequest, userId])

  const fetchNearbyPlaces = useCallback(async (category) => {
    if (!destination) return

    const anchor = focusedLocation?.lat && focusedLocation?.lng
      ? focusedLocation
      : { lat: destination.latitude, lng: destination.longitude }

    if (!anchor?.lat || !anchor?.lng) return

    setNearbyLoading(true)
    try {
      const params = new URLSearchParams({
        category,
        lat: String(anchor.lat),
        lng: String(anchor.lng),
        limit: '8',
      })

      const res = await fetch(`/api/nearby-places?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load nearby places')

      setNearbyCategory(category)
      setNearbyResults(data.results ?? [])
      setMapSidebarOpen(true)
      setActiveTab('map')
    } catch (error) {
      console.error('Nearby search error:', error)
      setNearbyResults([])
      setNearbyCategory(category)
      setMapSidebarOpen(true)
    } finally {
      setNearbyLoading(false)
    }
  }, [destination, focusedLocation])

  const handleNearbyCategoryChange = useCallback((category) => {
    if (nearbyCategory === category && nearbyResults.length > 0) {
      setNearbyCategory(null)
      setNearbyResults([])
      return
    }
    fetchNearbyPlaces(category)
  }, [fetchNearbyPlaces, nearbyCategory, nearbyResults.length])

  const handleNearbySelect = useCallback((option) => {
    openAddPlaceModal(option)
  }, [openAddPlaceModal])

  const handleSend = useCallback(async (text) => {
    if (!text.trim() || isLoading) return

    const isFullGen = /suggest full itinerar/i.test(text) || /plan everything/i.test(text) || /give me a full draft/i.test(text)
    const itineraryToSend = isFullGen ? {} : itinerary

    if (isFullGen) {
      setItinerary({})
      try {
        localStorage.removeItem(`itinerary-${userId}-${cityId}`)
      } catch {
        // Ignore storage failure.
      }
    }

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsLoading(true)
    setToolStatus(null)

    try {
      await streamChatRequest({
        body: { message: text, sessionId, destinationId: cityId, userId, itinerary: itineraryToSend },
      })
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't connect. Please try again.",
      }])
    } finally {
      setIsLoading(false)
      setToolStatus(null)
    }
  }, [cityId, isLoading, itinerary, sessionId, streamChatRequest, userId])

  useEffect(() => {
    if (autoMessage && pageReady && !isLoading) {
      const message = autoMessage
      setAutoMessage(null)
      handleSend(message)
    }
  }, [autoMessage, handleSend, isLoading, pageReady])

  async function handleResetChat() {
    if (!confirm('Are you sure you want to start over? This will clear your current plan.')) return

    if (sessionId) {
      await supabase.from('itineraries').update({ session_id: null }).eq('session_id', sessionId)
      await supabase.from('chat_messages').delete().eq('session_id', sessionId)
      await supabase.from('chat_sessions').delete().eq('id', sessionId)
    }

    setMessages([])
    setItinerary({})
    setNearbyCategory(null)
    setNearbyResults([])
    setFocusedLocation(null)
    setMapSidebarOpen(false)
    setSessionId(null)
    setActiveTab('itinerary')
    setActiveDay('all')

    try {
      localStorage.removeItem(`itinerary-${userId}-${cityId}`)
    } catch {
      // Ignore storage failure.
    }

    initDone.current = false
    setHistoryLoaded(true)
    setResetKey(prev => prev + 1)
  }

  function handleExport() {
    const days = Object.keys(itinerary).filter(key => itinerary[key]?.length).length
    setExportTitle(`${destination?.city} · ${days} Day${days !== 1 ? 's' : ''}`)
    setExportModal(true)
  }

  async function confirmExport() {
    if (!userId || !cityId) return

    setExportSaving(true)
    const { data, error } = await supabase.from('itineraries').insert({
      user_id: userId,
      destination_id: cityId,
      session_id: sessionId,
      title: exportTitle || `${destination?.city} Trip`,
      content: itinerary,
      trip_metadata: tripContext,
    }).select()

    if (!error) {
      await supabase
        .from('chat_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId)
    }

    setExportSaving(false)
    if (!error && data?.[0]) {
      setExportModal(false)
      // E3: clear the title so the modal opens fresh next time the user exports.
      setExportTitle('')
      router.push(`/saved-itinerary/${data[0].id}`)
    }
  }

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
          <button
            onClick={handleResetChat}
            className="text-xs font-semibold font-body px-3 py-1.5 rounded-md border border-border text-secondary hover:text-charcoal hover:border-charcoal transition-colors"
          >
            Reset Chat
          </button>
        </div>
      </header>

      {tripContext && (
        <div className="pl-4 pr-5 py-1.5 border-b border-border/60 bg-white/70 backdrop-blur-sm shrink-0 flex items-center gap-6 text-xs font-body text-charcoal font-medium">
          {tripContext.travel_date_start && tripContext.travel_date_end && (
            <span className="flex items-center gap-2 px-3 py-0.5 bg-muted rounded-full shadow-sm">
              <span className="opacity-70 text-sm">📅</span> {tripContext.travel_date_start} - {tripContext.travel_date_end}
            </span>
          )}
          {tripContext.trip_days && (
            <span className="flex items-center gap-2 px-3 py-0.5 bg-muted rounded-full shadow-sm">
              <span className="opacity-70 text-sm">⏱</span> {tripContext.trip_days} Days
            </span>
          )}
          {tripContext.budget && (
            <span className="flex items-center gap-2 px-3 py-0.5 bg-muted rounded-full shadow-sm">
              <span className="opacity-70 text-sm">💰</span> {tripContext.budget}
            </span>
          )}
          {tripContext.pace && (
            <span className="flex items-center gap-2 px-3 py-0.5 bg-muted rounded-full shadow-sm">
              <span className="opacity-70 text-sm">🏃</span> {tripContext.pace}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-border flex flex-col min-h-0 bg-subtle/30">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            toolStatus={toolStatus}
            onSend={handleSend}
          />
        </div>

        <div className="w-1/2 flex flex-col min-h-0">
          <div className="flex items-center gap-1 pl-4 pr-4 py-2 border-b border-border bg-white shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 text-xs font-semibold font-body px-4 py-1.5 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-charcoal text-warmwhite'
                    : 'text-secondary hover:text-charcoal hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'itinerary' && (
              <ItineraryPanel
                itinerary={itinerary}
                onExport={handleExport}
                onDelete={handleDeleteItem}
                onUpdate={handleUpdateItem}
                city={destination?.city}
                cityContext={{ name: destination?.city, lat: destination?.latitude, lng: destination?.longitude }}
                tripContext={tripContext}
                onFocusLocation={setFocusedLocation}
                allowFullEdit
              />
            )}

            {activeTab === 'map' && (
              <MapPanel
                itinerary={itinerary}
                activeDay={activeDay}
                onDayChange={setActiveDay}
                cityLat={destination?.latitude}
                cityLng={destination?.longitude}
                focusedLocation={focusedLocation}
                nearbyCategory={nearbyCategory}
                nearbyResults={nearbyResults}
                nearbyLoading={nearbyLoading}
                sidebarOpen={mapSidebarOpen}
                onSidebarClose={() => setMapSidebarOpen(false)}
                onNearbyCategoryChange={handleNearbyCategoryChange}
                onNearbySelect={handleNearbySelect}
              />
            )}
          </div>
        </div>
      </div>

      {exportModal && (
        <div className="fixed inset-0 bg-charcoal/60 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-extrabold font-display mb-1">Save to My Plans</h2>
            <p className="text-sm font-body text-secondary mb-4">
              Give your plan a name. You can always come back and save again after more changes.
            </p>
            <input
              type="text"
              value={exportTitle}
              onChange={(event) => setExportTitle(event.target.value)}
              className="input-base mb-5"
              placeholder="e.g. Kyoto · 5 Days"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setExportModal(false); setExportTitle('') }}
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

      {addPlaceModal && (
        <div className="fixed inset-0 bg-charcoal/60 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-extrabold font-display mb-1">Add Place to a Day</h2>
            <p className="text-sm font-body text-secondary mb-4">
              Choose which day should be re-planned around <span className="font-semibold text-charcoal">{addPlaceModal.name}</span>.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-5">
              {availableDays().map((dayNumber) => (
                <button
                  key={dayNumber}
                  type="button"
                  onClick={() => setSelectedAddDay(dayNumber)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    selectedAddDay === dayNumber
                      ? 'bg-charcoal text-warmwhite border-charcoal'
                      : 'border-border text-secondary hover:text-charcoal hover:border-charcoal'
                  }`}
                >
                  Day {dayNumber}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !addPlaceSubmitting && setAddPlaceModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold font-body text-secondary hover:border-charcoal transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOptionSelect}
                disabled={addPlaceSubmitting}
                className="flex-1 py-2.5 rounded-lg bg-amber text-warmwhite text-sm font-semibold font-body hover:bg-amberdark transition-colors disabled:opacity-60"
              >
                {addPlaceSubmitting ? 'Re-planning...' : 'Re-plan Day'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
