'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const PIN_BG = {
  hotel: '#C4874A',
  restaurant: '#EF4444',
  attraction: '#3B82F6',
  transport: '#6B7280',
  shopping: '#EC4899',
}

const CATEGORY_BUTTONS = [
  { id: 'attractions', label: 'Attractions' },
  { id: 'properties', label: 'Properties' },
  { id: 'food', label: 'Food' },
  { id: 'shopping', label: 'Shopping' },
]

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
  if (s.includes('morning')) return 9 * 60
  if (s.includes('noon') || s.includes('lunch')) return 12 * 60
  if (s.includes('afternoon')) return 14 * 60
  if (s.includes('evening')) return 18 * 60
  if (s.includes('night') || s.includes('dinner')) return 20 * 60
  if (s.includes('all day') || s.includes('anytime')) return -1
  return 9999
}

function makeDivIcon(type, label) {
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
        <span style="transform:rotate(45deg);font-size:12px;font-weight:bold;color:white;line-height:1;">${label}</span>
      </div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -32],
  })
}

function nearbyIcon(type) {
  const bg = PIN_BG[type] ?? '#0EA5E9'
  return L.divIcon({
    html: `
      <div style="
        width:22px;height:22px;border-radius:50%;
        background:${bg};border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.25);
      "></div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

export default function MapPanel({
  itinerary = {},
  activeDay,
  onDayChange,
  cityLat,
  cityLng,
  focusedLocation,
  nearbyCategory,
  nearbyResults = [],
  nearbyLoading = false,
  sidebarOpen = false,
  onSidebarClose,
  onNearbyCategoryChange,
  onNearbySelect,
}) {
  const isSuggestedMode = nearbyCategory === 'suggested'
  const showSidebar = sidebarOpen && (nearbyCategory != null || nearbyResults.length > 0 || nearbyLoading)
  const dayKeys = Object.keys(itinerary)
    .filter(key => Array.isArray(itinerary[key]) && itinerary[key].length > 0)
    .sort((a, b) => parseInt(a.replace('day', ''), 10) - parseInt(b.replace('day', ''), 10))

  const getSortedItems = (key) => [...(itinerary[key] ?? [])].sort((a, b) => guessMinutes(a.time) - guessMinutes(b.time))

  const visibleItems = activeDay === 'all'
    ? dayKeys.flatMap(getSortedItems)
    : getSortedItems(`day${activeDay}`)

  const routeWaypoints = visibleItems.filter(item => item.lat && item.lng && item.type !== 'transport')
  const pins = visibleItems.filter(item => item.lat && item.lng)

  const center = pins.length > 0
    ? [
        pins.reduce((sum, pin) => sum + pin.lat, 0) / pins.length,
        pins.reduce((sum, pin) => sum + pin.lng, 0) / pins.length,
      ]
    : cityLat && cityLng
      ? [cityLat, cityLng]
      : [20, 0]

  const zoom = pins.length > 0 ? 13 : cityLat ? 11 : 2

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border overflow-x-auto flex-shrink-0 bg-white">
        <button
          onClick={() => onDayChange('all')}
          className={`text-xs font-semibold font-body px-3 py-1 rounded-md whitespace-nowrap transition-colors ${
            activeDay === 'all'
              ? 'bg-charcoal text-warmwhite'
              : 'bg-muted text-secondary hover:bg-border'
          }`}
        >
          All Days
        </button>

        {dayKeys.map((key) => {
          const num = parseInt(key.replace('day', ''), 10)
          return (
            <button
              key={key}
              onClick={() => onDayChange(num)}
              className={`text-xs font-semibold font-body px-3 py-1 rounded-md whitespace-nowrap transition-colors ${
                activeDay === num
                  ? 'bg-charcoal text-warmwhite'
                  : 'bg-muted text-secondary hover:bg-border'
              }`}
            >
              Day {num}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-white overflow-x-auto shrink-0">
        {CATEGORY_BUTTONS.map((category) => (
          <button
            key={category.id}
            onClick={() => onNearbyCategoryChange?.(category.id)}
            className={`text-xs font-semibold font-body px-3 py-1.5 rounded-lg whitespace-nowrap border transition-colors ${
              nearbyCategory === category.id
                ? 'bg-amber text-warmwhite border-amber'
                : 'bg-white text-secondary border-border hover:border-amber hover:text-amber'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 px-3 py-2 border-b border-border/70 bg-white shrink-0 text-xs text-secondary">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          Activities
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          Food
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-600" />
          Hotels
        </span>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0">
            <MapContainer
              key={`map-${activeDay}-${nearbyCategory || 'none'}-${cityLat ?? 'nocity'}`}
              center={center}
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
                  key={`${item.name}-${idx}`}
                  position={[item.lat, item.lng]}
                  icon={makeDivIcon(item.type, idx + 1)}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <p style={{ fontWeight: 600, marginBottom: 4 }}>{item.name}</p>
                      {item.time && <p style={{ color: '#666', fontSize: 12 }}>{item.time}</p>}
                      {item.price_estimate && (
                        <p style={{ color: '#C4874A', fontWeight: 600, fontSize: 12 }}>{item.price_estimate}</p>
                      )}
                      {item.route_from_previous?.duration_min && (
                        <p style={{ color: '#888', fontSize: 11 }}>
                          {item.route_from_previous.duration_min} min | {item.route_from_previous.distance_km} km from previous stop
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {nearbyResults.map((result) => (
                result.lat && result.lng ? (
                  <Marker
                    key={result.id}
                    position={[result.lat, result.lng]}
                    icon={nearbyIcon(result.type)}
                  >
                    <Popup>
                      <div style={{ minWidth: 200 }}>
                        <p style={{ fontWeight: 600, marginBottom: 4 }}>{result.name}</p>
                        {result.notes && <p style={{ color: '#666', fontSize: 12 }}>{result.notes}</p>}
                        {result.distance_label && (
                          <p style={{ color: '#888', fontSize: 11 }}>{result.distance_label} away</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              ))}

              {routeWaypoints.length >= 2 && (
                <Polyline
                  positions={routeWaypoints.map(waypoint => [waypoint.lat, waypoint.lng])}
                  pathOptions={{ color: '#C4874A', weight: 3, opacity: 0.7, dashArray: '8, 6' }}
                />
              )}
            </MapContainer>
          </div>
        </div>

        {showSidebar && (
        <div className="w-[320px] border-l border-border bg-white min-h-0 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  {isSuggestedMode ? 'AI-suggested places' : nearbyCategory ? `Nearby ${nearbyCategory}` : 'Nearby places'}
                </p>
                <p className="text-xs text-secondary">
                  {isSuggestedMode
                    ? 'These are concrete places surfaced by the planner for this trip.'
                    : nearbyCategory
                      ? 'Use these map-backed cards to add or replace places.'
                      : 'Choose a category above or ask the AI for nearby suggestions.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSidebarClose?.()}
                className="rounded-full border border-border px-2 py-1 text-xs font-semibold text-secondary hover:border-charcoal hover:text-charcoal"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {nearbyLoading && (
              <div className="text-sm text-secondary bg-muted rounded-lg p-3">
                Loading nearby places...
              </div>
            )}

            {!nearbyLoading && nearbyResults.length === 0 && (
              <div className="text-sm text-secondary bg-muted rounded-lg p-3">
                No nearby results yet. Choose a category above or ask the AI to suggest places.
              </div>
            )}

            {nearbyResults.map((result) => (
              <div key={result.id} className="rounded-xl border border-border overflow-hidden bg-white">
                <div className="relative h-36 bg-muted">
                  {result.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.image_url} alt={result.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      {result.type === 'restaurant' ? '🍽️' : result.type === 'hotel' ? '🏨' : result.type === 'shopping' ? '🛍️' : '🎯'}
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-charcoal leading-snug">{result.name}</h4>
                    {result.rating && (
                      <span className="text-xs font-semibold text-amber">{result.rating.toFixed(1)}</span>
                    )}
                  </div>

                  {result.price && (
                    <p className="text-xs font-semibold text-amber">{result.price}</p>
                  )}
                  {result.distance_label && (
                    <p className="text-xs text-secondary">{result.distance_label} from anchor</p>
                  )}
                  {result.notes && (
                    <p className="text-xs text-tertiary leading-snug">{result.notes}</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => onNearbySelect?.(result)}
                      className="flex-1 text-xs font-semibold font-body py-2 rounded-lg bg-amber text-warmwhite hover:bg-amberdark transition-colors"
                    >
                      Add to day
                    </button>
                    {result.booking_url && (
                      <a
                        href={result.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 border border-border rounded-lg text-xs font-semibold text-secondary hover:border-amber hover:text-amber transition-colors"
                      >
                        Open
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

function MapUpdater({ focusedLocation }) {
  const map = useMap()

  useEffect(() => {
    if (focusedLocation?.lat && focusedLocation?.lng) {
      map.flyTo([focusedLocation.lat, focusedLocation.lng], 15, { animate: true, duration: 1.5 })
    }
  }, [focusedLocation, map])

  return null
}
