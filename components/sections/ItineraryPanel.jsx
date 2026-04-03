'use client'

import { useState, useEffect } from 'react'

const TYPE_ICON = {
  hotel:      '🏨',
  restaurant: '🍽️',
  attraction: '🎯',
  transport:  '🚌',
  note:       '📝',
}

const TYPE_BORDER = {
  hotel:      'border-l-amber',
  restaurant: 'border-l-red-400',
  attraction: 'border-l-blue-400',
  transport:  'border-l-gray-400',
  note:       'border-l-yellow-400',
}

// ── Time helpers ──────────────────────────────────────────────

function toMinutes(time) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h)) return null
  return h * 60 + (m || 0)
}

function to12h(time24) {
  if (!time24) return null
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${period}`
}

function formatTimeRange(time, time_end) {
  const start = to12h(time)
  if (!start) return null
  const end = to12h(time_end)
  return end ? `${start} – ${end}` : start
}

function findConflicts(items) {
  const conflicts = new Set()
  for (let i = 0; i < items.length; i++) {
    const a = items[i]
    const aStart = toMinutes(a.time)
    const aEnd   = toMinutes(a.time_end)
    if (aStart == null) continue
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j]
      const bStart = toMinutes(b.time)
      const bEnd   = toMinutes(b.time_end)
      if (bStart == null) continue
      const aE = aEnd ?? aStart + 60
      const bE = bEnd ?? bStart + 60
      if (aStart < bE && aE > bStart) {
        conflicts.add(i)
        conflicts.add(j)
      }
    }
  }
  return conflicts
}

// ── Main export ───────────────────────────────────────────────

export default function ItineraryPanel({ itinerary = {}, onExport }) {
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
  const items = [...rawItems].sort((a, b) => (toMinutes(a.time) ?? 9999) - (toMinutes(b.time) ?? 9999))
  const conflicts = findConflicts(items)

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
                <ActivityCard item={item} isConflict={conflicts.has(idx)} />
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

function ActivityCard({ item, isConflict }) {
  const timeLabel   = formatTimeRange(item.time, item.time_end)
  const icon        = TYPE_ICON[item.type]  ?? '📌'
  const borderColor = TYPE_BORDER[item.type] ?? 'border-l-gray-300'
  const confirmed   = item.status === 'confirmed'

  // Prefer Google Maps place link (accurate) over raw coordinates
  const isGoogleMapsUrl = item.booking_url?.includes('google.com/maps') || item.booking_url?.includes('maps.google.com')
  const mapUrl = isGoogleMapsUrl
    ? item.booking_url
    : (item.lat && item.lng ? `https://maps.google.com/?q=${item.lat},${item.lng}` : null)
  // Only show a separate Book button when booking_url is NOT a Google Maps link
  const bookUrl = (!isGoogleMapsUrl && item.booking_url) ? item.booking_url : null

  return (
    <div
      className={`rounded-xl border border-border border-l-4 px-3 py-2.5 bg-white shadow-sm
        ${borderColor}
        ${isConflict ? 'bg-red-50 border-red-200' : confirmed ? 'bg-success-bg border-success/20' : ''}`}
    >
      {/* Time range + confirmed badge */}
      <div className="flex items-center justify-between mb-1">
        {timeLabel ? (
          <span className={`text-[11px] font-semibold font-body px-2 py-0.5 rounded-full
            ${isConflict ? 'bg-red-100 text-red-600' : 'bg-muted text-secondary'}`}>
            {timeLabel}
            {isConflict && ' ⚠'}
          </span>
        ) : (
          <span className="text-[11px] text-tertiary font-body">No time set</span>
        )}
        {confirmed && !isConflict && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
            Confirmed
          </span>
        )}
      </div>

      {/* Icon + name */}
      <div className="flex items-start gap-2">
        <span className="text-base leading-snug">{icon}</span>
        <p className={`font-semibold text-sm leading-snug ${isConflict ? 'text-red-700' : 'text-charcoal'}`}>
          {item.name}
        </p>
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
            Maps ↗
          </a>
        )}
        {bookUrl && (
          <a
            href={bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-amber hover:text-amberdark transition-colors"
          >
            Book ↗
          </a>
        )}
      </div>
    </div>
  )
}
