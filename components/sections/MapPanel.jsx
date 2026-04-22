'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import { useEffect, useState, useCallback, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Time slot options (matching ItineraryPanel) ───────────────
const TIME_LABELS = ['All Day', 'Morning', 'Noon', 'Afternoon', 'Evening', 'Night']

const TIME_SLOTS = [
  ...TIME_LABELS,
  '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM (Noon)', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
  '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
]

// ── Shared UI helper: Triple Dropdown Time Picker ────────────
function GridTimePicker({ value, onChange }) {
  const isLabel = TIME_LABELS.includes(value)
  
  let h = 9, m = 0, ap = 'AM'
  if (!isLabel && value) {
    const match = value.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (match) {
      h = parseInt(match[1], 10)
      m = parseInt(match[2], 10)
      ap = match[3].toUpperCase()
    }
  }

  const setNumeric = (newH, newM, newAp) => {
    const timeStr = `${newH}:${newM === 0 ? '00' : newM} ${newAp}`
    onChange(timeStr)
  }

  return (
    <div className="bg-muted/30 p-3 rounded-xl border border-border/50 select-none">
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TIME_LABELS.map(lbl => (
          <button 
            key={lbl} 
            type="button"
            onClick={() => onChange(lbl)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all 
              ${value === lbl 
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm' 
                : 'bg-white text-secondary border-border hover:border-violet-500/30'}`}
          >
            {lbl}
          </button>
        ))}
        {/* Toggle to Specific Time */}
        <button 
          type="button"
          onClick={() => setNumeric(h, m, ap)}
          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all 
            ${!isLabel 
              ? 'bg-violet-600 text-white border-violet-600 shadow-sm' 
              : 'bg-white text-secondary border-border hover:border-violet-500/30'}`}
        >
          Specific Time
        </button>
      </div>

      <div className={`flex gap-2 transition-opacity duration-200 ${isLabel ? 'opacity-40 cursor-not-allowed' : ''}`}>
        <select
          disabled={isLabel}
          value={h}
          onChange={e => setNumeric(parseInt(e.target.value, 10), m, ap)}
          className="flex-1 text-sm py-1.5 px-2 border border-border rounded-md bg-white focus:outline-none focus:border-violet-500 cursor-pointer disabled:cursor-not-allowed"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>

        <select
          disabled={isLabel}
          value={m}
          onChange={e => setNumeric(h, parseInt(e.target.value, 10), ap)}
          className="flex-1 text-sm py-1.5 px-2 border border-border rounded-md bg-white focus:outline-none focus:border-violet-500 cursor-pointer disabled:cursor-not-allowed"
        >
          {[0, 15, 30, 45].map(mm => (
            <option key={mm} value={mm}>{mm === 0 ? '00' : mm}</option>
          ))}
        </select>

        <select
          disabled={isLabel}
          value={ap}
          onChange={e => setNumeric(h, m, e.target.value)}
          className="flex-1 text-sm py-1.5 px-2 border border-border rounded-md bg-white focus:outline-none focus:border-violet-500 cursor-pointer disabled:cursor-not-allowed"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────

const PIN_BG = {
  hotel:      '#C4874A',
  restaurant: '#EF4444',
  attraction: '#3B82F6',
  transport:  '#6B7280',
}

const PIN_EMOJI = {
  hotel:      '🏨',
  restaurant: '🍽',
  attraction: '🎯',
  transport:  '🚌',
}

const LEGEND_DOT_CLASS = {
  hotel:      'bg-amber',
  restaurant: 'bg-red-500',
  attraction: 'bg-blue-500',
  transport:  'bg-gray-500',
}

// Nearby search category definitions
const NEARBY_CATEGORIES = [
  { key: 'restaurant', label: '🍽 Restaurants', type: 'restaurant' },
  { key: 'attraction', label: '🎯 Attractions', type: 'attraction' },
  { key: 'hotel',      label: '🏨 Hotels',      type: 'hotel' },
  { key: 'cafe',       label: '☕ Cafes',        type: 'cafe' },
  { key: 'shopping',   label: '🛍 Shopping',     type: 'shopping' },
]

// Activity type for the add form
const CATEGORY_TO_TYPE = {
  restaurant: 'restaurant',
  attraction: 'attraction',
  hotel:      'hotel',
  cafe:       'restaurant',
  shopping:   'attraction',
}

// ── Time sorting helper ───────────────────────────────────────────
function guessMinutes(timeStr) {
  if (!timeStr) return 9999
  const s = timeStr.toLowerCase()
  const timeMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10)
    const m = parseInt(timeMatch[2] || '0', 10)
    const ampm = timeMatch[3]
    if (ampm === 'pm' && h < 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    return h * 60 + m
  }
  let offset = 0
  if (s.includes('early')) offset = -60
  if (s.includes('late')) offset = 60
  if (s.includes('morning')) return 9 * 60 + offset
  if (s.includes('afternoon')) return 14 * 60 + offset
  if (s.includes('lunch') || s.includes('noon')) return 12 * 60 + offset
  if (s.includes('evening')) return 18 * 60 + offset
  if (s.includes('night') || s.includes('dinner')) return 20 * 60 + offset
  if (s.includes('all day') || s.includes('anytime')) return -1
  return 9999
}

function makeDivIcon(type, numberStr) {
  const bg = PIN_BG[type] ?? '#6B7280'
  return L.divIcon({
    html: `
      <div style="
        background:${bg};
        width:30px;height:30px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:13px;font-weight:bold;color:white;line-height:1;margin-top:1px;margin-right:1px;">${numberStr}</span>
      </div>`,
    className: '',
    iconSize:    [30, 30],
    iconAnchor:  [15, 30],
    popupAnchor: [0, -32],
  })
}

function makeNearbyPin() {
  return L.divIcon({
    html: `
      <div style="
        background:#8B5CF6;
        width:26px;height:26px;
        border-radius:50%;
        border:2px solid white;
        box-shadow:0 2px 8px rgba(139,92,246,0.5);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="font-size:12px;line-height:1;">✦</span>
      </div>`,
    className: '',
    iconSize:    [26, 26],
    iconAnchor:  [13, 13],
    popupAnchor: [0, -16],
  })
}

// ── Haversine distance (metres) ───────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Inner components ──────────────────────────────────────────

function MapUpdater({ focusedLocation }) {
  const map = useMap()
  useEffect(() => {
    if (focusedLocation?.lat && focusedLocation?.lng) {
      map.flyTo([focusedLocation.lat, focusedLocation.lng], 15, { animate: true, duration: 1.5 })
    }
  }, [focusedLocation, map])
  return null
}

function ItineraryMarker({ item, idx, city, cityContext }) {
  const [photoUrl, setPhotoUrl] = useState(item.imageUrl || item.photoUrl || null)

  useEffect(() => {
    if (photoUrl) return // Skip if already present
    
    // Only fetch for specific categories to save API quota
    const type = item.type?.toLowerCase() || ''
    if (type === 'restaurant' || type === 'attraction' || type === 'hotel' || item.name.toLowerCase().includes('hotel')) {
      const controller = new AbortController()
      fetch(`/api/place-image?name=${encodeURIComponent(item.name)}&city=${encodeURIComponent(cityContext?.name || city || '')}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          if (data.imageUrl) setPhotoUrl(data.imageUrl)
        })
        .catch(() => {})
      return () => controller.abort()
    }
  }, [item.name, city, cityContext, photoUrl, item.type])

  return (
    <Marker
      position={[item.lat, item.lng]}
      icon={makeDivIcon(item.type || 'attraction', String(idx + 1))}
    >
      <Popup>
        <div style={{ minWidth: 160 }}>
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={photoUrl} 
              alt={item.name} 
              style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} 
            />
          )}
          <p style={{ fontWeight: 700, marginBottom: 2, fontSize: 13, color: '#1A1A1A' }}>{item.name}</p>
          {item.time && (
            <p style={{ color: '#666', fontSize: 12, display: 'flex', alignItems: 'center', gap: '4px' }}>
              🕒 {item.time}
            </p>
          )}
          {item.notes && (
            <p style={{ color: '#888', fontSize: 11, marginTop: 4, lineHeight: 1.4, borderTop: '1px solid #EEE', paddingTop: 4 }}>
              {item.notes}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

  // ViewportCapture and handleBoundsChange removed to fix infinite render loops
  // We now use mapRef to get bounds dynamically on search.

// ── Main component ────────────────────────────────────────────

export default function MapPanel({
  itinerary = {},
  activeDay,
  onDayChange,
  cityLat,
  cityLng,
  hideDayTabs = false,
  focusedLocation,
  onAddToItinerary,
  cityContext,
}) {
  const dayKeys = Object.keys(itinerary)
    .filter(k => Array.isArray(itinerary[k]) && itinerary[k].length > 0)
    .sort((a, b) => parseInt(a.replace('day', ''), 10) - parseInt(b.replace('day', ''), 10))

  const getSortedItems = (k) =>
    [...(itinerary[k] ?? [])].sort((a, b) => guessMinutes(a.time) - guessMinutes(b.time))

  const visibleItems =
    activeDay === 'all'
      ? dayKeys.flatMap(k => getSortedItems(k))
      : getSortedItems(`day${activeDay}`)

  const routeWaypoints = visibleItems.filter(item => item.lat && item.lng && item.type !== 'transport')
  const pins           = visibleItems.filter(item => item.lat && item.lng)

  const centre =
    pins.length > 0
      ? [pins.reduce((s, p) => s + p.lat, 0) / pins.length, pins.reduce((s, p) => s + p.lng, 0) / pins.length]
      : cityLat && cityLng ? [cityLat, cityLng] : [20, 0]

  const zoom = pins.length > 0 ? 13 : cityLat ? 11 : 2

  // ── Map Reference & Nearby Search State ───────────────────
  const mapRef = useRef(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [nearbyPlaces, setNearbyPlaces]   = useState([])
  const [isSearching, setIsSearching]     = useState(false)
  const [showPanel, setShowPanel]         = useState(false)
  const [addingPlace, setAddingPlace]     = useState(null)
  const [selectedTime, setSelectedTime]   = useState('9:00 AM')
  const [addSuccess, setAddSuccess]       = useState(null)
  const addSuccessTimer = useRef(null)

  const isSpecificDay = activeDay !== 'all'

  // Reset nearby results when switching between days/all
  useEffect(() => {
    setNearbyPlaces([])
    setSelectedCategory(null)
    setShowPanel(false)
    setAddingPlace(null)
  }, [activeDay])

  // Fix map centering when sidebar appears/disappears
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize({ animate: true })
      }, 100)
    }
  }, [showPanel, nearbyPlaces.length])

  const handleCategorySearch = useCallback(async (catKey) => {
    const map = mapRef.current
    if (!map) return

    if (selectedCategory === catKey) {
      setSelectedCategory(null)
      setNearbyPlaces([])
      setShowPanel(false)
      return
    }

    setSelectedCategory(catKey)
    setIsSearching(true)
    setNearbyPlaces([])
    setShowPanel(false)

    try {
      const b  = map.getBounds()
      const c  = b.getCenter()
      const ne = b.getNorthEast()
      const radius = Math.round(Math.min(haversineDistance(c.lat, c.lng, ne.lat, ne.lng), 50000))
      
      const res = await fetch(`/api/nearby-places?lat=${c.lat}&lng=${c.lng}&radius=${radius}&type=${catKey}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const places = data.places ?? []
      setNearbyPlaces(places)
      setShowPanel(places.length > 0)
    } catch (e) {
      console.error('Nearby search failed:', e)
    } finally {
      setIsSearching(false)
    }
  }, [selectedCategory])

  const handleAddPlace = (place) => {
    setAddingPlace(place)
    setSelectedTime('9:00 AM')
  }

  const handleConfirmAdd = () => {
    if (!addingPlace || !onAddToItinerary || activeDay === 'all') return
    const dayNum = typeof activeDay === 'number' ? activeDay : parseInt(String(activeDay), 10)
    const catKey = selectedCategory ?? 'attraction'
    onAddToItinerary({
      name:     addingPlace.name,
      type:     CATEGORY_TO_TYPE[catKey] ?? 'attraction',
      time:     selectedTime,
      notes:    addingPlace.address,
      lat:      addingPlace.lat,
      lng:      addingPlace.lng,
      imageUrl: addingPlace.photoUrl // Pass the photo URL along!
    }, dayNum)

    if (addSuccessTimer.current) clearTimeout(addSuccessTimer.current)
    setAddSuccess(addingPlace.name)
    addSuccessTimer.current = setTimeout(() => setAddSuccess(null), 2500)
    setAddingPlace(null)
  }

  return (
    <div className="flex flex-col h-full relative">

      {/* Day filter bar */}
      {!hideDayTabs && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border overflow-x-auto flex-shrink-0">
          <button
            onClick={() => onDayChange('all')}
            className={`text-xs font-semibold font-body px-3 py-1 rounded-md whitespace-nowrap transition-colors
              ${activeDay === 'all' ? 'bg-charcoal text-warmwhite' : 'bg-muted text-secondary hover:bg-border'}`}
          >
            All
          </button>
          {dayKeys.map(key => {
            const num = parseInt(key.replace('day', ''), 10)
            return (
              <button
                key={key}
                onClick={() => onDayChange(num)}
                className={`text-xs font-semibold font-body px-3 py-1 rounded-md whitespace-nowrap transition-colors
                  ${activeDay === num ? 'bg-charcoal text-warmwhite' : 'bg-muted text-secondary hover:bg-border'}`}
              >
                Day {num}
              </button>
            )
          })}
        </div>
      )}

      {/* Category selector — only in a specific day view */}
      {isSpecificDay && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-white flex-shrink-0 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary mr-1 shrink-0">Discover:</span>
          {NEARBY_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => handleCategorySearch(cat.key)}
              disabled={isSearching}
              className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap transition-all border
                ${selectedCategory === cat.key
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white text-secondary border-border hover:border-violet-400 hover:text-violet-600'
                } disabled:opacity-50`}
            >
              {isSearching && selectedCategory === cat.key ? '⏳' : cat.label}
            </button>
          ))}
          {nearbyPlaces.length > 0 && (
            <button
              onClick={() => { setSelectedCategory(null); setNearbyPlaces([]); setShowPanel(false) }}
              className="ml-auto text-xs text-secondary hover:text-red-500 transition-colors shrink-0 px-2 py-1"
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Map + sidebar layout */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">

        {/* Results sidebar */}
        {showPanel && nearbyPlaces.length > 0 && (
          <div className="w-64 shrink-0 border-r border-border bg-white flex flex-col min-h-0 shadow-lg z-10">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
              <p className="text-xs font-bold text-charcoal">{nearbyPlaces.length} nearby found</p>
              <span className="text-[10px] text-secondary font-body">Day {activeDay}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {nearbyPlaces.map((place, idx) => (
                <div
                  key={place.placeId ?? idx}
                  onClick={() => {
                    const map = mapRef.current
                    if (!map) return
                    
                    // Fly to location
                    map.flyTo([place.lat, place.lng], 16, { animate: true, duration: 1.5 })

                    // Find and open the popup for this specific marker
                    map.eachLayer((layer) => {
                      if (layer instanceof L.Marker) {
                        const pos = layer.getLatLng()
                        if (pos.lat === place.lat && pos.lng === place.lng) {
                          layer.openPopup()
                        }
                      }
                    })
                  }}
                  className="flex gap-2.5 px-3 py-2.5 border-b border-border/60 hover:bg-muted transition-colors cursor-pointer group"
                >
                  <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted border border-border/60">
                    {place.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">
                        {PIN_EMOJI[CATEGORY_TO_TYPE[selectedCategory ?? '']] ?? '📍'}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-bold text-charcoal leading-tight line-clamp-2 hover:text-violet-600 transition-colors decoration-dotted hover:underline"
                    >
                      {place.name}
                    </a>
                    {place.rating && (
                      <p className="text-[10px] text-amber font-semibold">★ {place.rating}</p>
                    )}
                    <button
                      onClick={() => handleAddPlace(place)}
                      className="mt-1 text-[10px] font-bold bg-violet-600 text-white px-2 py-0.5 rounded-full hover:bg-violet-700 transition-colors w-max"
                    >
                      + Add to Day {activeDay}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map area */}
        <div className="flex-1 relative min-h-0">
          <div className="absolute inset-0">
            <MapContainer
              ref={mapRef}
              key={`map-${activeDay}-${cityLat ?? 'nocity'}`}
              center={centre}
              zoom={zoom}
              style={{ width: '100%', height: '100%' }}
              zoomControl
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />

              <MapUpdater focusedLocation={focusedLocation} />

              {/* Itinerary pins */}
              {pins.map((item, idx) => (
                <ItineraryMarker 
                  key={`itin-${idx}-${item.name}`} 
                  item={item} 
                  idx={idx} 
                  city={cityContext?.name || ''} 
                  cityContext={cityContext} 
                />
              ))}

              {/* Nearby result pins */}
              {nearbyPlaces.map((place, idx) => (
                <Marker
                  key={`nearby-${place.placeId ?? idx}`}
                  position={[place.lat, place.lng]}
                  icon={makeNearbyPin()}
                >
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      {place.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={place.photoUrl} alt={place.name} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />
                      )}
                      <p style={{ fontWeight: 700, marginBottom: 2, fontSize: 13 }}>{place.name}</p>
                      {place.rating && (
                        <p style={{ color: '#C4874A', fontSize: 11, fontWeight: 600 }}>★ {place.rating}</p>
                      )}
                      {place.address && (
                        <p style={{ color: '#888', fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{place.address}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {routeWaypoints.length >= 2 && (
                <Polyline
                  positions={routeWaypoints.map(w => [w.lat, w.lng])}
                  pathOptions={{ color: '#C4874A', weight: 3, opacity: 0.7, dashArray: '8, 6' }}
                />
              )}
            </MapContainer>

            {/* Overlay hint when no pins yet */}
            {pins.length === 0 && nearbyPlaces.length === 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-border rounded-full px-4 py-1.5 shadow-sm pointer-events-none">
                <p className="text-xs font-body text-secondary whitespace-nowrap">📍 Pins will appear as the AI adds places</p>
              </div>
            )}

            {/* Search loading overlay */}
            {isSearching && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-violet-200 rounded-full px-4 py-1.5 shadow-md flex items-center gap-2 z-[1000]">
                <div className="w-3 h-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-violet-700">Searching nearby...</p>
              </div>
            )}

            {/* Add success toast */}
            {addSuccess && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold rounded-full px-4 py-1.5 shadow-md z-[1000] flex items-center gap-1.5">
                <span>✓</span> {addSuccess} added to Day {activeDay}!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 border-t border-border flex-shrink-0 flex-wrap bg-white">
        {Object.keys(PIN_EMOJI).map(type => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-secondary font-body capitalize">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${LEGEND_DOT_CLASS[type]}`} />
            {type}
          </span>
        ))}
        {nearbyPlaces.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-violet-600 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-violet-500" />
            Nearby results
          </span>
        )}
      </div>

      {/* Add to Itinerary Modal — contained within the MapPanel */}
      {addingPlace && (
        <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px] flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {addingPlace.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={addingPlace.photoUrl} alt={addingPlace.name} className="w-full h-36 object-cover" />
            )}
            <div className="p-5">
              <h3 className="font-bold text-base text-charcoal mb-0.5">{addingPlace.name}</h3>
              {addingPlace.address && (
                <p className="text-xs text-secondary font-body mb-4 line-clamp-2">{addingPlace.address}</p>
              )}
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary block mb-2">
                Scheduled Time
              </label>
              <GridTimePicker 
                value={selectedTime} 
                onChange={setSelectedTime} 
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setAddingPlace(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-secondary hover:border-charcoal transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAdd}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm"
                >
                  Confirm Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
