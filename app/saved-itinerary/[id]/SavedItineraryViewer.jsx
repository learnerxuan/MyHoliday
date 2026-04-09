'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase/client'
import ItineraryPanel from '@/components/sections/ItineraryPanel'

const MapPanel = dynamic(() => import('@/components/sections/MapPanel'), { ssr: false })

const TABS = [
  { id: 'itinerary', label: '📋 Itinerary' },
  { id: 'map', label: '🗺️ Map' },
]

export default function SavedItineraryViewer() {
  const params = useParams()
  const router = useRouter()
  const id = params.id

  const [itinerary, setItinerary] = useState({})
  const [destination, setDestination] = useState(null)
  const [tripMetadata, setTripMetadata] = useState(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('itinerary')
  const [activeDay, setActiveDay] = useState('all')
  const [focusedLocation, setFocusedLocation] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveDone, setSaveDone] = useState(false)

  useEffect(() => {
    async function fetchItinerary() {
      if (!id) return

      const { data, error } = await supabase
        .from('itineraries')
        .select('*, destinations(*)')
        .eq('id', id)
        .single()

      if (error || !data) {
        console.error('Error fetching itinerary:', error)
        router.replace('/itineraries')
        return
      }

      setItinerary(data.content || {})
      setDestination(data.destinations)
      setTripMetadata(data.trip_metadata || null)
      setTitle(data.title || '')
      setLoading(false)
    }

    fetchItinerary()
  }, [id, router])

  // Coordinate sanitiser (mirrored from planner)
  function sanitiseCoords(item) {
    let { lat, lng } = item
    if (lat == null || lng == null) return item
    lat = Number(lat)
    lng = Number(lng)
    if (lat === 0 && lng === 0) return { ...item, lat: null, lng: null }
    if (Math.abs(lat) > 90) { ;[lat, lng] = [lng, lat] }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) { return { ...item, lat: null, lng: null } }
    return { ...item, lat, lng }
  }

  // State update logic (mirrored from planner)
  function applyUpdates(prev, updates) {
    if (!updates?.length) return prev
    const next = { ...prev }
    for (const update of updates) {
      const key = `day${update.day}`
      if (!next[key]) next[key] = []
      const sanitised = sanitiseCoords(update)

      if (update.action === 'add') {
        const exists = next[key].some(i => i.name === update.name)
        if (!exists) next[key] = [...next[key], sanitised]
      } else if (update.action === 'remove') {
        next[key] = next[key].filter(i => i.name !== update.name)
      } else if (update.action === 'update') {
        const exists = next[key].some(i => i.name === update.name)
        if (exists) {
          next[key] = next[key].map(i => {
            if (i.name === update.name) {
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
    for (const key of Object.keys(next)) {
      if (Array.isArray(next[key]) && next[key].length === 0) delete next[key]
    }
    return next
  }

  const handleUpdateItem = useCallback((updates) => {
    setItinerary(prev => applyUpdates(prev, updates))
  }, [])

  const handleDeleteItem = useCallback((dayKey, itemName) => {
    handleUpdateItem([{ action: 'remove', day: parseInt(dayKey.replace('day', '')), name: itemName }])
  }, [handleUpdateItem])

  const handleSaveToDB = async () => {
    setIsSaving(true)
    const { error } = await supabase
      .from('itineraries')
      .update({ content: itinerary })
      .eq('id', id)

    setIsSaving(false)
    if (!error) {
      setSaveDone(true)
      setTimeout(() => setSaveDone(false), 3000)
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-warmwhite min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-body text-secondary">Loading your trip...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col bg-warmwhite overflow-hidden" style={{ height: 'calc(100dvh - 96px)' }}>

      {/* Header */}
      <header className="flex items-center justify-between pl-4 pr-6 py-4 border-b border-border bg-white shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/itineraries')}
            className="p-2 hover:bg-black/5 rounded-full transition-colors text-charcoal/60 hover:text-charcoal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-charcoal tracking-tight font-display">
              Saved Itinerary: <span className="text-amber">{title || destination?.city}</span>
            </h1>
            <p className="text-[10px] text-tertiary font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber shadow-[0_0_8px_rgba(196,135,74,0.4)]" />
              View & Manage Plan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {saveDone && <span className="text-xs font-bold text-success bg-success-bg px-3 py-1.5 rounded-full animate-in fade-in duration-300">✓ Changes Saved</span>}
          <button
            onClick={handleSaveToDB}
            disabled={isSaving}
            className="bg-charcoal text-warmwhite px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Updates'}
          </button>
        </div>
      </header>

      {/* Trip context bar (Ported from planner) */}
      {tripMetadata && (
        <div className="pl-4 pr-6 py-1.5 border-b border-border/60 bg-white/70 backdrop-blur-sm shrink-0 flex items-center gap-6 text-xs font-body text-charcoal font-medium z-10">
          {tripMetadata.travel_date_start && tripMetadata.travel_date_end && (
            <span className="flex items-center gap-2 px-3 py-0.5 bg-muted rounded-full shadow-sm"><span className="opacity-70 text-sm">🗓</span> {new Date(tripMetadata.travel_date_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(tripMetadata.travel_date_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          )}
          {tripMetadata.trip_days && (
            <span className="flex items-center gap-2 px-3 py-0.5 bg-muted rounded-full shadow-sm"><span className="opacity-70 text-sm">⏱</span> {tripMetadata.trip_days} Days</span>
          )}
          {tripMetadata.budget && (
            <span className="flex items-center gap-2 px-3 py-0.5 bg-muted rounded-full shadow-sm"><span className="opacity-70 text-sm">💰</span> {tripMetadata.budget}</span>
          )}
          {tripMetadata.pace && (
            <span className="flex items-center gap-2 px-3 py-0.5 bg-muted rounded-full shadow-sm"><span className="opacity-70 text-sm">🏃</span> {tripMetadata.pace}</span>
          )}
          {tripMetadata.group_size && (
            <span className="flex items-center gap-2 px-3 py-0.5 bg-muted rounded-full shadow-sm"><span className="opacity-70 text-sm">🙋</span> {tripMetadata.group_size}</span>
          )}
          {tripMetadata.dietary && (
            <span className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-0.5 rounded-full font-bold shadow-sm">🍽 {tripMetadata.dietary}</span>
          )}
        </div>
      )}

      {/* Unified Day Bar (Master Navigation) */}
      <div className="flex items-center gap-1.5 pl-4 pr-6 py-2 border-b border-border bg-white shrink-0 z-10 overflow-x-auto">
        <button
          onClick={() => setActiveDay('all')}
          className={`text-xs font-bold font-display px-4 py-1.5 rounded-xl transition-all
            ${activeDay === 'all'
              ? 'bg-amber text-charcoal shadow-sm'
              : 'text-secondary hover:text-charcoal hover:bg-muted'}`}
        >
          All Days
        </button>
        {Object.keys(itinerary).sort().map(dayKey => {
          const num = parseInt(dayKey.replace('day', ''), 10)
          return (
            <button
              key={dayKey}
              onClick={() => setActiveDay(num)}
              className={`text-xs font-bold font-display px-4 py-1.5 rounded-xl transition-all
                ${activeDay === num
                  ? 'bg-amber text-charcoal shadow-sm'
                  : 'text-secondary hover:text-charcoal hover:bg-muted'}`}
            >
              Day {num}
            </button>
          )
        })}
      </div>

      {/* Main content grid (Split View) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Itinerary (520px) */}
        <div className="w-[520px] border-r border-border bg-white flex flex-col shrink-0 min-h-0">
          <div className="flex-1 overflow-hidden">
            <ItineraryPanel
              itinerary={itinerary}
              onExport={() => { }}
              onDelete={handleDeleteItem}
              onUpdate={handleUpdateItem}
              selectedDay={activeDay}
              city={destination?.city}
              tripContext={tripMetadata}
              hideExport={true}
              hideDayTabs={true}
              onFocusLocation={setFocusedLocation}
            />
          </div>
        </div>

        {/* Main - Map */}
        <div className="flex-1 bg-muted/10 relative">
          <MapPanel
            itinerary={itinerary}
            activeDay={activeDay}
            onDayChange={setActiveDay}
            cityLat={destination?.latitude}
            cityLng={destination?.longitude}
            hideDayTabs={true}
            focusedLocation={focusedLocation}
          />
        </div>
      </div>
    </div>
  )
}
