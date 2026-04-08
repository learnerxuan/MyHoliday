'use client'

import { useState, useEffect } from 'react'

const TYPE_ICON = {
  hotel: '🏨',
  restaurant: '🍽️',
  attraction: '🎯',
  transport: '🚌',
  note: '📝',
}

const TYPE_BORDER = {
  hotel: 'border-l-amber',
  restaurant: 'border-l-red-400',
  attraction: 'border-l-blue-400',
  transport: 'border-l-gray-400',
  note: 'border-l-yellow-400',
}

// ── Time sorting helper ──────────────────────────────────────────────

function guessMinutes(timeStr) {
  if (!timeStr) return 9999
  const s = timeStr.toLowerCase()
  
  // Try matching HH:MM AM/PM or H AM/PM
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

  // Keyword fallbacks
  if (s.includes('morning')) return 9 * 60 + offset
  if (s.includes('afternoon')) return 14 * 60 + offset
  if (s.includes('lunch') || s.includes('noon')) return 12 * 60 + offset
  if (s.includes('evening')) return 18 * 60 + offset
  if (s.includes('night') || s.includes('dinner')) return 20 * 60 + offset
  
  return 9999
}

// ── Main export ───────────────────────────────────────────────

export default function ItineraryPanel({ itinerary = {}, onExport, onDelete, city }) {
  const allDays = Object.keys(itinerary).sort()
  const daysWithContent = allDays.filter(d => itinerary[d]?.length > 0)
  const hasContent = daysWithContent.length > 0

  const [activeDay, setActiveDay] = useState(null)

  // Default to first day with content when itinerary first populates
  useEffect(() => {
    if (daysWithContent.length > 0 && (activeDay === null || !daysWithContent.includes(activeDay))) {
      setActiveDay(daysWithContent[0])
    }
  }, [daysWithContent.join(',')])

  const currentDayKey = activeDay ?? daysWithContent[0] ?? null
  const rawItems = currentDayKey ? (itinerary[currentDayKey] ?? []) : []
  // Filter out AI-generated 'note' items if they aren't lunch breaks (lunch is ok)
  const filteredItems = rawItems
  const items = [...filteredItems].sort((a, b) => guessMinutes(a.time) - guessMinutes(b.time))

  return (
    <div className="flex flex-col h-full">

      {/* Day tabs */}
      {hasContent && (
        <div className="flex overflow-x-auto gap-1 px-3 py-2 border-b border-border bg-white shrink-0 scrollbar-none">
          {daysWithContent.map(dayKey => {
            const dayNum = parseInt(dayKey.replace('day', ''), 10)
            const isActive = currentDayKey === dayKey
            return (
              <button
                key={dayKey}
                onClick={() => setActiveDay(dayKey)}
                className={`shrink-0 text-xs font-semibold font-body px-3 py-1.5 rounded-md transition-colors
                  ${isActive
                    ? 'bg-charcoal text-warmwhite'
                    : 'text-secondary hover:text-charcoal hover:bg-muted'}`}
              >
                Day {dayNum}
              </button>
            )
          })}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {!hasContent && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-3">
            <span className="text-4xl">🗺</span>
            <p className="text-sm font-body text-secondary">
              Your itinerary will appear here as you chat.
            </p>
            <p className="text-xs text-tertiary">
              Ask for a quick draft or guided planning and the timeline will build up here.
            </p>
          </div>
        )}

        {hasContent && currentDayKey && (
          <div className="space-y-1">
            {items.map((item, idx) => (
              <div key={idx}>
                <ActivityCard
                  item={item}
                  isConflict={false}
                  onDelete={() => onDelete && onDelete(currentDayKey, item.name)}
                  city={city}
                />
                {idx < items.length - 1 && (
                  <div className="flex justify-center">
                    <div className="w-px h-2 bg-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Export */}
      <div className="border-t border-border px-4 py-3">
        <button
          onClick={onExport}
          disabled={!hasContent}
          className="w-full bg-amber text-warmwhite text-sm font-semibold font-body py-2.5 rounded-lg hover:bg-amberdark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Export to My Plans
        </button>
      </div>

    </div>
  )
}

// ── Activity card ─────────────────────────────────────────────

function ActivityCard({ item, isConflict, onDelete, city }) {
  const timeLabel = item.time
  const icon = TYPE_ICON[item.type] ?? '📌'
  const borderColor = TYPE_BORDER[item.type] ?? 'border-l-gray-300'
  const confirmed = item.status === 'confirmed'

  // Generic Google maps link using place name instead of coordinates
  const query = encodeURIComponent(`${item.name} ${city || ''}`)
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`

  // Replace hallucinated AI ticket links with a reliable Google Search
  // We only form a search query if the AI explicitly flagged it as requiring a ticket
  const canBeBooked = item.requires_ticket === true
  const bookUrl = canBeBooked ? `https://www.google.com/search?q=${encodeURIComponent(`${item.name} ${city || ''} tickets booking`)}` : null

  return (
    <div
      className={`relative rounded-xl border border-border border-l-4 px-3 py-2.5 bg-white shadow-sm hover:shadow-md transition-shadow group
        ${borderColor}
        ${isConflict ? 'bg-red-50 border-red-200' : confirmed ? 'bg-success-bg border-success/20' : ''}`}
    >
      {/* ── Delete Button ── */}
      {onDelete && (
        <button
          onClick={(e) => { e.preventDefault(); onDelete() }}
          className="absolute top-2 right-2 text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-full w-6 h-6 flex items-center justify-center text-xs"
          title="Remove item"
        >
          ✕
        </button>
      )}

      {/* Time range + confirmed badge */}
      <div className="flex items-center justify-between mb-1 pr-6">
        {timeLabel ? (
          <span className="text-[11px] font-semibold font-body px-2 py-0.5 rounded-full bg-muted text-secondary">
            {timeLabel}
          </span>
        ) : (
          <span className="text-[11px] text-tertiary font-body">flexible time</span>
        )}
        {confirmed && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
            Confirmed
          </span>
        )}
      </div>

      {/* Icon + name */}
      <div className="flex items-start gap-2 pr-4">
        <span className="text-base leading-snug">{icon}</span>
        <a
          href={`https://www.google.com/search?q=${query}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-semibold text-sm leading-snug hover:underline ${isConflict ? 'text-red-700' : 'text-charcoal'}`}
        >
          {item.name}
        </a>
      </div>

      {/* Notes */}
      {item.notes && (
        <p className="text-xs text-secondary mt-1 leading-relaxed line-clamp-2 pl-6">
          {item.notes}
        </p>
      )}

      {/* Footer: price + links */}
      <div className="flex items-center gap-3 mt-2 pl-6 flex-wrap">
        {item.price && (
          <span className="text-xs font-semibold text-amber">{item.price}</span>
        )}
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors"
          >
            View on Map ↗
          </a>
        )}
        {bookUrl && (
          <a
            href={bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-amber hover:text-amberdark transition-colors"
          >
            Find Tickets ↗
          </a>
        )}
      </div>
    </div>
  )
}
