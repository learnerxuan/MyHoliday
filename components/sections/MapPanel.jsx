'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Pin colours & labels ──────────────────────────────────────

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

  // Prioritise "All Day" or untimed activities at the very top
  if (s.includes('all day') || s.includes('anytime')) return -1

  return 9999
}

function makeDivIcon(type, numberStr) {
  const bg    = PIN_BG[type]    ?? '#6B7280'
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


// ── Main component ────────────────────────────────────────────

export default function MapPanel({ itinerary = {}, activeDay, onDayChange, cityLat, cityLng, hideDayTabs = false, focusedLocation }) {
  const dayKeys = Object.keys(itinerary)
    .filter(k => Array.isArray(itinerary[k]) && itinerary[k].length > 0)
    .sort((a, b) => {
      const numA = parseInt(a.replace('day', ''), 10);
      const numB = parseInt(b.replace('day', ''), 10);
      return numA - numB;
    })

  const getSortedItems = (k) => [...(itinerary[k] ?? [])].sort((a, b) => guessMinutes(a.time) - guessMinutes(b.time))

  // Items visible on the map (correctly sorted by time so routes don't zigzag chaotically)
  const visibleItems =
    activeDay === 'all'
      ? dayKeys.flatMap(k => getSortedItems(k))
      : getSortedItems(`day${activeDay}`)

  // Waypoints for the route (skip transport stops — they're mid-path)
  const routeWaypoints = visibleItems.filter(
    item => item.lat && item.lng && item.type !== 'transport'
  )

  // All pins (including transport)
  const pins = visibleItems.filter(item => item.lat && item.lng)

  // Map centre: average of pins → city fallback → world fallback
  const centre =
    pins.length > 0
      ? [
          pins.reduce((s, p) => s + p.lat, 0) / pins.length,
          pins.reduce((s, p) => s + p.lng, 0) / pins.length,
        ]
      : cityLat && cityLng
      ? [cityLat, cityLng]
      : [20, 0] // world overview fallback

  const zoom = pins.length > 0 ? 13 : cityLat ? 11 : 2

  return (
    <div className="flex flex-col h-full">

      {/* Day filter bar */}
      {!hideDayTabs && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border overflow-x-auto flex-shrink-0">
          <button
            onClick={() => onDayChange('all')}
            className={`text-xs font-semibold font-body px-3 py-1 rounded-md whitespace-nowrap transition-colors
              ${activeDay === 'all'
                ? 'bg-charcoal text-warmwhite'
                : 'bg-muted text-secondary hover:bg-border'}`}
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
                  ${activeDay === num
                    ? 'bg-charcoal text-warmwhite'
                    : 'bg-muted text-secondary hover:bg-border'}`}
              >
                Day {num}
              </button>
            )
          })}
        </div>
      )}

      {/* Map area */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <MapContainer
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

            {pins.map((item, idx) => (
              <Marker
                key={idx}
                position={[item.lat, item.lng]}
                icon={makeDivIcon(item.type, idx + 1)}
              >
                <Popup>
                  <div style={{ minWidth: 140 }}>
                    <p style={{ fontWeight: 600, marginBottom: 2 }}>{item.name}</p>
                    {item.time && (
                      <p style={{ color: '#666', fontSize: 12 }}>
                        {item.time}{item.time_end ? ` – ${item.time_end}` : ''}
                      </p>
                    )}
                    {(item.price ?? item.price_estimate) && (
                      <p style={{ color: '#C4874A', fontWeight: 600, fontSize: 12 }}>
                        {item.price ?? item.price_estimate}
                      </p>
                    )}
                    {item.notes && (
                      <p style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{item.notes}</p>
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
          {pins.length === 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-border rounded-full px-4 py-1.5 shadow-sm pointer-events-none">
              <p className="text-xs font-body text-secondary whitespace-nowrap">📍 Pins will appear as the AI adds places</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 border-t border-border flex-shrink-0 flex-wrap">
        {Object.keys(PIN_EMOJI).map(type => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-secondary font-body capitalize">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${LEGEND_DOT_CLASS[type]}`} />
            {type}
          </span>
        ))}
      </div>
    </div>
  )
}
function MapUpdater({ focusedLocation }) {
  const map = useMap()

  useEffect(() => {
    if (focusedLocation?.lat && focusedLocation?.lng) {
      map.flyTo([focusedLocation.lat, focusedLocation.lng], 15, {
        animate: true,
        duration: 1.5
      })
    }
  }, [focusedLocation, map])

  return null
}
