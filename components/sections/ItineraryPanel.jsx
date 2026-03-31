'use client'

const TYPE_ICON = {
  hotel:      '🏨',
  restaurant: '🍽️',
  attraction: '🎯',
  transport:  '🚌',
  note:       '📝',
}

const TYPE_COLOUR = {
  hotel:      'border-l-amber',
  restaurant: 'border-l-red-400',
  attraction: 'border-l-blue-400',
  transport:  'border-l-gray-400',
  note:       'border-l-yellow-400',
}

// ── Time helpers ──────────────────────────────────────────────

// "14:30" → minutes from midnight (870)
function toMinutes(time) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h)) return null
  return h * 60 + (m || 0)
}

// "14:30" → "2:30 PM"
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

// Detect overlapping pairs — returns a Set of item indices that conflict
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
      // overlap: a starts before b ends AND a ends after b starts
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
  const days = Object.keys(itinerary).sort()
  const hasContent = days.some(d => itinerary[d]?.length > 0)

  return (
    <div className="flex flex-col h-full">

      {/* Day list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

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

        {days.map((dayKey) => {
          const rawItems = itinerary[dayKey] ?? []
          if (rawItems.length === 0) return null

          // Sort by start time; items without time go to the end
          const items = [...rawItems].sort((a, b) => {
            const am = toMinutes(a.time) ?? 9999
            const bm = toMinutes(b.time) ?? 9999
            return am - bm
          })

          const dayNum   = parseInt(dayKey.replace('day', ''), 10)
          const dayLabel = `Day ${dayNum}`
          const conflicts = findConflicts(items)

          return (
            <DayTimeline
              key={dayKey}
              label={dayLabel}
              items={items}
              conflictSet={conflicts}
            />
          )
        })}
      </div>

      {/* Legend + Export */}
      <div className="border-t border-border px-4 py-3 space-y-2">
        <div className="flex gap-4 text-xs text-tertiary flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            Confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-disabled inline-block" />
            Suggested
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            Time conflict
          </span>
        </div>
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

// ── DayTimeline ───────────────────────────────────────────────

function DayTimeline({ label, items, conflictSet }) {
  // Hours to show — find the range from items or default to 7am–10pm
  const startMins = items.reduce((min, item) => {
    const m = toMinutes(item.time)
    return m != null ? Math.min(min, m) : min
  }, 7 * 60)

  const endMins = items.reduce((max, item) => {
    const m = toMinutes(item.time_end ?? item.time)
    return m != null ? Math.max(max, m + 60) : max
  }, 22 * 60)

  // Round to nearest hour boundary
  const firstHour = Math.floor(Math.min(startMins, 7 * 60) / 60)
  const lastHour  = Math.ceil(Math.max(endMins, 22 * 60) / 60)

  // Items without time — show separately below timeline
  const untimedItems = items.filter(item => toMinutes(item.time) == null)

  return (
    <div>
      <h3 className="text-xs font-semibold font-body text-secondary uppercase tracking-wide mb-3 px-1">
        {label}
      </h3>

      {/* Timeline */}
      <div className="relative">
        {/* Hour grid lines */}
        {Array.from({ length: lastHour - firstHour + 1 }, (_, i) => {
          const hour = firstHour + i
          const label12 = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`
          return (
            <div key={hour} className="flex items-start gap-2 mb-0">
              <span className="text-xs text-tertiary font-body w-12 shrink-0 pt-1 text-right select-none">
                {label12}
              </span>
              <div className="flex-1 border-t border-dashed border-border pt-1 pb-3 relative min-h-[2rem]" />
            </div>
          )
        })}

        {/* Activity cards — absolutely positioned over the grid */}
        <div className="absolute top-0 left-14 right-0">
          {items.map((item, idx) => {
            const startM = toMinutes(item.time)
            if (startM == null) return null
            const endM   = toMinutes(item.time_end) ?? startM + 60
            const isConflict = conflictSet.has(idx)

            // Each hour row is ~2.5rem (40px). Offset = (startM - firstHour*60) / 60 * 40px
            const HOUR_PX = 40
            const top    = ((startM - firstHour * 60) / 60) * HOUR_PX
            const height = Math.max(((endM - startM) / 60) * HOUR_PX, 32)

            const confirmed = item.status === 'confirmed'
            const typeColour = TYPE_COLOUR[item.type] ?? 'border-l-gray-300'

            return (
              <div
                key={idx}
                className={`absolute left-0 right-1 rounded-lg border-l-4 px-2 py-1 text-xs shadow-sm
                  ${typeColour}
                  ${isConflict
                    ? 'bg-red-50 border border-red-300 border-l-red-500'
                    : confirmed
                      ? 'bg-success-bg border border-success/30'
                      : 'bg-white border border-border'
                  }`}
                style={{ top: `${top}px`, height: `${height}px`, overflow: 'hidden' }}
              >
                <div className="flex items-center gap-1 leading-tight">
                  <span className="text-sm">{TYPE_ICON[item.type] ?? '📌'}</span>
                  <span className={`font-semibold truncate ${isConflict ? 'text-red-700' : confirmed ? 'text-success' : 'text-charcoal'}`}>
                    {item.name}
                  </span>
                </div>
                {height > 38 && (
                  <p className="text-tertiary truncate mt-0.5 text-[10px]">
                    {formatTimeRange(item.time, item.time_end)}
                    {item.price ? ` · ${item.price}` : ''}
                    {isConflict ? ' ⚠ Conflict' : ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Untimed items (e.g. hotel, notes without specific time) */}
      {untimedItems.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-tertiary px-1">No specific time:</p>
          {untimedItems.map((item, i) => (
            <UntimedCard key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function UntimedCard({ item }) {
  const confirmed  = item.status === 'confirmed'
  const icon       = TYPE_ICON[item.type] ?? '📌'
  const typeColour = TYPE_COLOUR[item.type] ?? 'border-l-gray-300'

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl border-l-4 border border-border text-sm
      ${typeColour}
      ${confirmed ? 'bg-success-bg border-success/30' : 'bg-white'}`}
    >
      <span className="text-base">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold truncate text-xs ${confirmed ? 'text-success' : 'text-charcoal'}`}>
          {item.name}
        </p>
        {item.notes && (
          <p className="text-[10px] text-tertiary truncate">{item.notes}</p>
        )}
      </div>
      {item.price && (
        <span className="text-xs text-amber font-semibold shrink-0">{item.price}</span>
      )}
    </div>
  )
}
