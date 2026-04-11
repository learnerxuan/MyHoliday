'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  const [isDirty, setIsDirty] = useState(false)
  const [isReverting, setIsReverting] = useState(false)
  const [revertError, setRevertError] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const itineraryRef = useRef(itinerary)
  const isDirtyRef = useRef(false)

  // Sync refs with state so they are available in effects/back button
  useEffect(() => {
    itineraryRef.current = itinerary
  }, [itinerary])

  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

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
      setSessionId(data.session_id)
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
    setItinerary(prev => {
      const updated = applyUpdates(prev, updates)
      setIsDirty(true)
      return updated
    })
  }, [])

  const handleDeleteItem = useCallback((dayKey, itemName) => {
    handleUpdateItem([{ action: 'remove', day: parseInt(dayKey.replace('day', '')), name: itemName }])
  }, [handleUpdateItem])

  const handleSaveToDB = async (customContent = null) => {
    const contentToSave = customContent || itineraryRef.current
    if (!contentToSave || Object.keys(contentToSave).length === 0) return

    setIsSaving(true)
    const { error } = await supabase
      .from('itineraries')
      .update({ content: contentToSave })
      .eq('id', id)

    setIsSaving(false)
    if (!error) {
      setIsDirty(false)
      setSaveDone(true)
      setTimeout(() => setSaveDone(false), 3000)
    }
    return !error
  }

  // Auto-save on navigate/leave
  useEffect(() => {
    const handleUnload = () => {
      if (isDirtyRef.current) {
        // We can't await here, but we can trigger the fetch
        // For standard unload, we use navigator.sendBeacon or a synchronous fetch
        // But for Next.js internal nav, this cleanup runs
        handleSaveToDB(itineraryRef.current)
      }
    }

    return () => handleUnload()
  }, [])

  const handleBack = async () => {
    if (isDirty) {
      await handleSaveToDB()
    }
    router.push('/itineraries')
  }

  const handleRevertToChat = async () => {
    if (!sessionId || !destination?.id) return
    setRevertError(null)
    setIsReverting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Check for conflicts: Any other ACTIVE session for this user/city?
      const { data: conflict } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('destination_id', destination.id)
        .eq('status', 'active')
        .neq('id', sessionId) // Other than THIS session
        .maybeSingle()

      if (conflict) {
        setRevertError('There is already an active chat session for this destination. Please complete or delete it before reverting this plan.')
        setIsReverting(false)
        return
      }

      // 2. Perform Revert: Re-activate session
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .update({ status: 'active' })
        .eq('id', sessionId)
      
      if (sessionError) throw sessionError

      // 3. Delete this saved itinerary record
      const { error: deleteError } = await supabase
        .from('itineraries')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError

      // 4. Redirect to Planner
      router.push(`/itinerary?city=${destination.id}&session=${sessionId}`)
    } catch (err) {
      console.error('Revert failed:', err)
      setRevertError('Failed to revert to chat. Please try again.')
      setIsReverting(false)
    }
  }

  const handleDownloadJSON = () => {
    const data = JSON.stringify({ 
      title, 
      destination: { city: destination?.city, country: destination?.country },
      itinerary, 
      trip_metadata: tripMetadata 
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TripTo_${destination?.city || 'MyTrip'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  }

  const handleDownloadPDF = () => {
    setShowDownloadMenu(false);
    
    // Sort days numerically
    const dayKeys = Object.keys(itinerary).sort((a, b) => {
      const numA = parseInt(a.replace('day', ''));
      const numB = parseInt(b.replace('day', ''));
      return numA - numB;
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the PDF.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title || 'Itinerary'}</title>
          <style>
            body { 
              font-family: Arial, Helvetica, sans-serif; 
              line-height: 1.3; 
              padding: 0; 
              color: black; 
              background: white;
              font-size: 10pt;
            }
            @page {
              margin: 1in;
              margin-top: 0.5in;
            }
            h1 { 
              font-size: 18pt; 
              margin-bottom: 8pt; 
              border-bottom: 1.5pt solid black;
              padding-bottom: 2pt;
              font-weight: bold;
            }
            .meta { 
              font-size: 9pt; 
              margin-bottom: 15pt; 
              font-style: italic;
            }
            .two-col {
              display: grid;
              grid-template-columns: 85pt 1fr;
              column-gap: 20pt;
              align-items: baseline;
            }
            .day-row {
              margin-top: 18pt;
              margin-bottom: 6pt;
              border-bottom: 0.5pt solid #eee;
              padding-bottom: 2pt;
            }
            .day-label {
              font-size: 11pt;
              font-weight: bold;
              text-decoration: underline;
            }
            .day-date {
              font-size: 11pt;
              font-weight: bold;
            }
            .item-row {
              margin-bottom: 8pt;
              page-break-inside: avoid;
            }
            .item-time {
              font-weight: bold;
              color: black;
            }
            .item-title {
              font-weight: bold;
              font-size: 10.5pt;
            }
            .item-category {
              font-size: 8.5pt;
              font-weight: normal;
              margin-left: 5pt;
              color: #444;
            }
            .item-desc {
              font-size: 9.5pt;
              margin-top: 1pt;
              white-space: pre-wrap;
            }
            .item-note {
              font-size: 9pt;
              margin-top: 2pt;
              font-style: italic;
              color: #333;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${title || (destination?.city + ' Trip')}</h1>
          <div class="meta">
            Location: ${destination?.city}, ${destination?.country}<br/>
            ${tripMetadata ? `
              Duration: ${tripMetadata.trip_days} Days / 
              Budget: ${tripMetadata.budget} / 
              Pace: ${tripMetadata.pace} / 
              Group Size: ${tripMetadata.group_size}<br/>
              ${tripMetadata.travel_date_start ? `
                Dates: ${new Date(tripMetadata.travel_date_start).toLocaleDateString(undefined, {month: 'long', day: 'numeric'})} - ${new Date(tripMetadata.travel_date_end).toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'})}
              ` : ''}
            ` : ''}
          </div>

          ${dayKeys.map(dayKey => {
            const dayNum = parseInt(dayKey.replace('day', ''));
            let dateStr = '';
            if (tripMetadata?.travel_date_start) {
              const d = new Date(tripMetadata.travel_date_start);
              d.setDate(d.getDate() + dayNum - 1);
              dateStr = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
            }
            return `
              <div class="two-col day-row">
                <span class="day-label">DAY ${dayNum}</span>
                <span class="day-date">${dateStr || ''}</span>
              </div>
              ${itinerary[dayKey].map(item => `
                <div class="two-col item-row">
                  <div class="item-time">
                    ${item.time || '--:--'}
                  </div>
                  <div>
                    <div class="item-title">
                      ${item.name}
                      ${item.category ? `<span class="item-category">(${item.category})</span>` : ''}
                    </div>
                    ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
                    ${item.notes ? `<div class="item-note">${item.notes}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            `;
          }).join('')}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      <header className="flex items-center justify-between pl-4 pr-6 py-4 border-b border-border bg-white shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
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

        <div className="flex items-center gap-3">
          {revertError && (
            <div className="bg-red-50 text-red-600 text-xs font-bold px-4 py-2 rounded-lg border border-red-100 animate-in fade-in slide-in-from-right-2 duration-300 max-w-sm">
              {revertError}
            </div>
          )}
          
          <button
            onClick={() => router.push(`/marketplace?itineraryId=${id}&city=${encodeURIComponent(destination?.city || '')}`)}
            className="text-xs font-bold text-amber hover:text-amberdark px-3 py-2 rounded-lg border border-amber/30 hover:border-amber bg-amber/5 transition-all flex items-center gap-2"
            title="Post this itinerary to the marketplace to find a local tour guide"
          >
            🔍 Find a Tour Guide
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <button
            onClick={handleRevertToChat}
            disabled={isReverting || !sessionId}
            className="text-xs font-bold text-secondary hover:text-charcoal px-3 py-2 rounded-lg border border-border hover:border-charcoal transition-all flex items-center gap-2 disabled:opacity-40"
            title="Move this plan back to AI Chat to continue dreaming"
          >
            {isReverting ? '...' : '↩ Go back to AI Chat'}
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="text-xs font-bold text-charcoal px-3 py-2 rounded-lg border border-border hover:border-charcoal transition-all flex items-center gap-2 bg-white"
            >
              📩 Download
            </button>
            {showDownloadMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowDownloadMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-border rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-muted text-charcoal flex items-center gap-2"
                  >
                    📃 Portable PDF
                  </button>
                  <button
                    onClick={handleDownloadJSON}
                    className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-muted text-charcoal flex items-center gap-2"
                  >
                    📦 Data Backup (JSON)
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {saveDone && <span className="text-xs font-bold text-success bg-success-bg px-3 py-1.5 rounded-full animate-in fade-in duration-300">✓ Changes Saved</span>}
          <button
            onClick={() => handleSaveToDB()}
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
              allowFullEdit={true}
              cityContext={{
                name: destination?.city,
                country: destination?.country,
                lat: destination?.latitude,
                lng: destination?.longitude
              }}
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
