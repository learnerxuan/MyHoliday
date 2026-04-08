'use client'

import { useState, useEffect } from 'react'

// ── Time slot options for the edit dropdown ───────────────────
const TIME_SLOTS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM (Noon)', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
  '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM',
]

const TYPE_ICON = {
  hotel: '🏨',
  restaurant: '🍽️',
  attraction: '🎯',
  transport: '🚌',
  note: '📝',
  food_recommendation: '🍜',
}

const TYPE_BORDER = {
  hotel: 'border-l-amber',
  restaurant: 'border-l-red-400',
  attraction: 'border-l-blue-400',
  transport: 'border-l-gray-400',
  note: 'border-l-yellow-400',
  food_recommendation: 'border-l-pink-400',
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
  if (s.includes('lunch') || s.includes('noon') || s.includes('midday')) return 12 * 60 + offset
  if (s.includes('evening')) return 18 * 60 + offset
  if (s.includes('night') || s.includes('dinner')) return 20 * 60 + offset
  
  return 9999
}

// ── Main export ───────────────────────────────────────────────

export default function ItineraryPanel({ itinerary = {}, onExport, onDelete, onUpdate, city, tripContext }) {
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
                  index={idx}
                  item={item}
                  isConflict={false}
                  onDelete={() => onDelete && onDelete(currentDayKey, item.name)}
                  onUpdate={(updates) => onUpdate && onUpdate([{ action: 'update', day: parseInt(currentDayKey.replace('day', ''), 10), name: item.name, ...updates }])}
                  city={city}
                  tripContext={tripContext}
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

function ActivityCard({ item, index, isConflict, onDelete, onUpdate, city, tripContext }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ 
    time: item.time || '', 
    notes: item.notes || '',
    price_estimate: item.price_estimate || ''
  })

  // Sync edit form if item changes from backend
  useEffect(() => {
    setEditForm({ time: item.time || '', notes: item.notes || '', price_estimate: item.price_estimate || '' })
  }, [item])

  const timeLabel = item.time
  const typeLabel = item.type === 'food_recommendation' 
    ? 'Food Recommendation' 
    : (item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : '')
  const icon = TYPE_ICON[item.type] ?? '📌'
  const borderColor = TYPE_BORDER[item.type] ?? 'border-l-gray-300'
  const confirmed = item.status === 'confirmed'

  // Links
  const query = encodeURIComponent(`${item.name} ${city || ''}`)
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`
  const canBeBooked = item.requires_ticket === true
  const bookUrl = canBeBooked ? `https://www.google.com/search?q=${encodeURIComponent(`${item.name} ${city || ''} tickets booking`)}` : null
  const isHotel = item.type === 'hotel' || item.name.toLowerCase().includes('hotel') || item.name.toLowerCase().includes('check-in')
  
  // Build Booking.com URL with dates pre-filled (format: YYYY-MM-DD → split into year/month/day params)
  // Booking.com uses: checkin_year=, checkin_month=, checkin_monthday=  (same pattern for checkout)
  function bookingDateParams(iso, prefix) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return ''
    return `&${prefix}_year=${y}&${prefix}_month=${parseInt(m, 10)}&${prefix}_monthday=${parseInt(d, 10)}`
  }
  const pax = tripContext?.group_size ? `&group_adults=${encodeURIComponent(tripContext.group_size)}` : ''
  const hotelUrl = isHotel
    ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city || item.name)}${bookingDateParams(tripContext?.travel_date_start, 'checkin')}${bookingDateParams(tripContext?.travel_date_end, 'checkout')}${pax}&no_rooms=1`
    : null

  function handleSave() {
    onUpdate && onUpdate(editForm)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className={`relative rounded-xl border border-border border-l-4 px-3 py-3 bg-white shadow-sm flex flex-col gap-3 ${borderColor}`}> 
        <div>
          <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Start Time</label>
          <select
            value={editForm.time}
            onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))}
            className="w-full text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none bg-white appearance-none cursor-pointer"
          >
            <option value="">— pick a time —</option>
            {TIME_SLOTS.map(slot => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Notes</label>
          <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="w-full text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none resize-none" rows={2} />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Price Estimate</label>
          <input type="text" value={editForm.price_estimate} onChange={e => setEditForm(f => ({ ...f, price_estimate: e.target.value }))} className="w-full text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none" placeholder="e.g. Free, $15" />
        </div>
        <div className="flex justify-end gap-2 mt-1">
          <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-muted rounded-md transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs font-semibold bg-amber text-white hover:bg-amberdark rounded-md transition-colors">Save</button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative rounded-xl border border-border border-l-4 px-3 py-2.5 bg-white shadow-sm hover:shadow-md transition-all group
        ${borderColor}
        ${isConflict ? 'bg-red-50 border-red-200' : confirmed ? 'bg-success-bg border-success/20' : ''}`}
    >
      {/* ── Actions (Hover) ── */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-full flex items-center shadow-sm border border-border/50">
        {onUpdate && (
          <button onClick={() => setIsEditing(true)} className="p-1.5 text-secondary hover:text-amber transition-colors" title="Edit item">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
        )}
        {onDelete && (
          <button onClick={(e) => { e.preventDefault(); onDelete() }} className="p-1.5 text-secondary hover:text-red-500 transition-colors" title="Remove item">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

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
      <div className="flex items-start gap-2 pr-12 mt-1">
        <span className="text-base leading-snug mt-0.5">{icon}</span>
        <div className="flex flex-col">
          <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noopener noreferrer" className={`font-bold text-sm leading-snug hover:underline ${isConflict ? 'text-red-700' : 'text-charcoal'}`}>
            {item.name}
          </a>
          {typeLabel && (
            <span className="inline-block px-1.5 py-0.5 mt-1 text-[9px] uppercase font-bold tracking-widest border border-border text-secondary rounded bg-white w-max">
              {typeLabel}
            </span>
          )}
          {item.notes && <p className="text-[11px] text-secondary font-body mt-1 leading-normal italic">{item.notes}</p>}
        </div>
      </div>

      {/* Footer: price + links */}
      <div className="flex items-center gap-3 mt-3 pl-6 flex-wrap">
        {item.price_estimate && (
          <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">{item.price_estimate}</span>
        )}
        
        {item.type !== 'food_recommendation' && (
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

        {hotelUrl && (
          <a
            href={hotelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-white bg-amber hover:bg-amberdark px-2 py-0.5 rounded transition-colors"
          >
            Book Hotel ↗
          </a>
        )}
      </div>
    </div>
  )
}
