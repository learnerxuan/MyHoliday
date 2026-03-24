'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'

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

function makeDivIcon(type) {
  const bg    = PIN_BG[type]    ?? '#6B7280'
  const emoji = PIN_EMOJI[type] ?? '📍'
  return L.divIcon({
    html: `
      <div style="
        background:${bg};
        width:34px;height:34px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:15px;line-height:1">${emoji}</span>
      </div>`,
    className: '',
    iconSize:    [34, 34],
    iconAnchor:  [17, 34],
    popupAnchor: [0, -36],
  })
}

// ── Routing Machine (imperative, added directly to Leaflet map) ───────────

function RoutingMachine({ waypoints }) {
  const map        = useMap()
  const controlRef = useRef(null)

  useEffect(() => {
    if (!map) return

    // Remove previous control
    if (controlRef.current) {
      try { map.removeControl(controlRef.current) } catch (_) {}
      controlRef.current = null
    }

    if (waypoints.length < 2) return

    const control = L.Routing.control({
      waypoints: waypoints.map(w => L.latLng(w.lat, w.lng)),
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'driving',
      }),
      routeWhileDragging:  false,
      show:                false,   // hide turn-by-turn panel
      addWaypoints:        false,
      draggableWaypoints:  false,
      fitSelectedRoutes:   false,
      lineOptions: {
        styles: [{ color: '#C4874A', weight: 4, opacity: 0.75 }],
      },
      createMarker: () => null,     // we render our own markers
    })

    control.addTo(map)
    controlRef.current = control

    return () => {
      if (controlRef.current) {
        try { map.removeControl(controlRef.current) } catch (_) {}
        controlRef.current = null
      }
    }
  }, [map, waypoints])

  return null
}

// ── Main component ────────────────────────────────────────────

export default function MapPanel({ itinerary = {}, activeDay, onDayChange }) {
  const dayKeys = Object.keys(itinerary)
    .filter(k => Array.isArray(itinerary[k]) && itinerary[k].length > 0)
    .sort()

  // Items visible on the map
  const visibleItems =
    activeDay === 'all'
      ? dayKeys.flatMap(k => itinerary[k] ?? [])
      : (itinerary[`day${activeDay}`] ?? [])

  // Waypoints for the route (skip transport stops — they're mid-path)
  const routeWaypoints = visibleItems.filter(
    item => item.lat && item.lng && item.type !== 'transport'
  )

  // All pins (including transport)
  const pins = visibleItems.filter(item => item.lat && item.lng)

  // Map centre: average of pins, or a safe default
  const centre =
    pins.length > 0
      ? [
          pins.reduce((s, p) => s + p.lat, 0) / pins.length,
          pins.reduce((s, p) => s + p.lng, 0) / pins.length,
        ]
      : [35.0116, 135.7681] // Kyoto fallback

  return (
    <div className="flex flex-col h-full">

      {/* Day filter bar */}
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

      {/* Map area — outer div is the flex child; inner absolute div gives Leaflet a concrete pixel size */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
        {pins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <span className="text-4xl">🗺️</span>
            <p className="text-sm font-body text-secondary">
              Map pins will appear here as the AI adds places to your itinerary.
            </p>
          </div>
        ) : (
        <MapContainer
          key={`${activeDay}-${pins.length}`}
          center={centre}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
          zoomControl
        >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {pins.map((item, idx) => (
              <Marker
                key={idx}
                position={[item.lat, item.lng]}
                icon={makeDivIcon(item.type)}
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
              <RoutingMachine waypoints={routeWaypoints} />
            )}
          </MapContainer>
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
