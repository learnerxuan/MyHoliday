'use client'

const TYPE_ICON = {
  hotel:      '🏨',
  restaurant: '🍽',
  attraction: '🎯',
  transport:  '🚌',
  note:       '📝',
}

// Converts "14:00" → "2:00 PM"
function to12h(time24) {
  if (!time24) return null
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${period}`
}

// Returns "9:00 AM" or "9:00 AM – 1:00 PM" if time_end is present
function formatTimeRange(time, time_end) {
  const start = to12h(time)
  if (!start) return null
  const end = to12h(time_end)
  return end ? `${start} – ${end}` : start
}

export default function ItineraryPanel({ itinerary = {}, onExport }) {
  const days = Object.keys(itinerary).sort()
  const hasContent = days.some(d => itinerary[d]?.length > 0)

  return (
    <div className="flex flex-col h-full">

      {/* ── Day list ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {!hasContent && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-3">
            <span className="text-4xl">🗺</span>
            <p className="text-sm font-body text-secondary">
              Your itinerary will appear here as you chat.
            </p>
            <p className="text-xs text-tertiary">
              Start by telling the AI how many days you're travelling.
            </p>
          </div>
        )}

        {days.map((dayKey) => {
          const items = itinerary[dayKey] ?? []
          if (items.length === 0) return null
          const dayLabel = dayKey.replace('day', 'Day ')
          return <DaySection key={dayKey} label={dayLabel} items={items} />
        })}
      </div>

      {/* ── Legend + Export ──────────────────────────────────── */}
      <div className="border-t border-border px-4 py-3 space-y-2">
        <div className="flex gap-4 text-xs text-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            Confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-disabled inline-block" />
            Suggested — tell the AI to confirm
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

// ── Sub-components ───────────────────────────────────────────

function DaySection({ label, items }) {
  return (
    <div>
      <h3 className="text-xs font-semibold font-body text-secondary uppercase tracking-wide mb-2 px-1">
        {label}
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <ItineraryItem key={i} item={item} />
        ))}
      </div>
    </div>
  )
}

function ItineraryItem({ item }) {
  const confirmed = item.status === 'confirmed'
  const icon      = TYPE_ICON[item.type] ?? '📌'
  const timeLabel = formatTimeRange(item.time, item.time_end)

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors
      ${confirmed ? 'border-success bg-success-bg' : 'border-border bg-white'}`}
    >
      {/* Icon */}
      <span className="text-lg leading-none mt-0.5 shrink-0">{icon}</span>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold font-body leading-snug
            ${confirmed ? 'text-success' : 'text-charcoal'}`}
          >
            {item.name}
          </p>
          {timeLabel && (
            <span className="text-xs text-tertiary shrink-0 mt-0.5 whitespace-nowrap">
              {timeLabel}
            </span>
          )}
        </div>

        {item.price && (
          <p className="text-xs text-secondary mt-0.5">{item.price}</p>
        )}
        {item.notes && (
          <p className="text-xs text-tertiary mt-0.5 truncate">{item.notes}</p>
        )}
      </div>

      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0
        ${confirmed ? 'bg-success' : 'bg-disabled'}`}
      />
    </div>
  )
}
