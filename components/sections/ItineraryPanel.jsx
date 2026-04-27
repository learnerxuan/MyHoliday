'use client'

import { useState, useEffect } from 'react'

// ── Time slot options for the edit dropdown ───────────────────
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

const TYPE_ICON = {
  hotel: '🏨',
  restaurant: '🍽️',
  attraction: '🎯',
  transport: '✈️',
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
  const s = timeStr.toLowerCase().trim()

  // Strict matches for our 6 labels (Independent Values)
  if (s === 'all day')    return -10
  if (s === 'morning')    return 8 * 60     // 08:00
  if (s === 'noon')       return 12 * 60    // 12:00
  if (s === 'afternoon')  return 15 * 60    // 15:00
  if (s === 'evening')    return 18 * 60    // 18:00
  if (s === 'night')      return 21 * 60    // 21:00

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

  // Fallback keyword detection for loose strings from AI
  if (s.includes('morning'))   return 8 * 60
  if (s.includes('afternoon')) return 14 * 60
  if (s.includes('evening'))   return 18 * 60
  if (s.includes('night'))     return 20 * 60
  if (s.includes('all day'))   return -10

  return 9999
}

// ── Shared UI helper: Triple Dropdown Time Picker ────────────
function GridTimePicker({ value, onChange }) {
  const isLabel = TIME_LABELS.includes(value)
  
  // Default parsing for numeric time display
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
      {/* Category Labels Section */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TIME_LABELS.map(lbl => (
          <button 
            key={lbl} 
            type="button"
            onClick={() => onChange(lbl)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all 
              ${value === lbl 
                ? 'bg-charcoal text-white border-charcoal shadow-sm' 
                : 'bg-white text-secondary border-border hover:border-charcoal/30'}`}
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
              ? 'bg-amber text-white border-amber shadow-sm' 
              : 'bg-white text-secondary border-border hover:border-amber/30'}`}
        >
          Specific Time
        </button>
      </div>

      {/* Triple Dropdown Row (Specific Time) */}
      <div className={`flex gap-2 transition-opacity duration-200 ${isLabel ? 'opacity-40 cursor-not-allowed' : ''}`}>
        {/* Hour Selector */}
        <select
          disabled={isLabel}
          value={h}
          onChange={e => setNumeric(parseInt(e.target.value, 10), m, ap)}
          className="flex-1 text-sm py-1.5 px-2 border border-border rounded-md bg-white focus:outline-none focus:border-amber cursor-pointer disabled:cursor-not-allowed"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>

        {/* Minute Selector */}
        <select
          disabled={isLabel}
          value={m}
          onChange={e => setNumeric(h, parseInt(e.target.value, 10), ap)}
          className="flex-1 text-sm py-1.5 px-2 border border-border rounded-md bg-white focus:outline-none focus:border-amber cursor-pointer disabled:cursor-not-allowed"
        >
          {[0, 15, 30, 45].map(mm => (
            <option key={mm} value={mm}>{mm === 0 ? '00' : mm}</option>
          ))}
        </select>

        {/* AM/PM Selector */}
        <select
          disabled={isLabel}
          value={ap}
          onChange={e => setNumeric(h, m, e.target.value)}
          className="flex-1 text-sm py-1.5 px-2 border border-border rounded-md bg-white focus:outline-none focus:border-amber cursor-pointer disabled:cursor-not-allowed"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────

export default function ItineraryPanel({ itinerary = {}, onExport, onDelete, onUpdate, city, tripContext, hideExport = false, hideDayTabs = false, selectedDay, onFocusLocation, allowFullEdit = false, cityContext = null }) {
  const allDays = Object.keys(itinerary).sort((a, b) => {
    const numA = parseInt(a.replace('day', ''), 10);
    const numB = parseInt(b.replace('day', ''), 10);
    return numA - numB;
  })
  const daysWithContent = allDays.filter(d => itinerary[d]?.length > 0)
  const hasContent = daysWithContent.length > 0

  const [activeDay, setActiveDay] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Default to first day with content when itinerary first populates
  useEffect(() => {
    if (daysWithContent.length > 0 && (activeDay === null || !daysWithContent.includes(activeDay))) {
      setActiveDay(daysWithContent[0])
    }
  }, [daysWithContent.join(',')])

  // Sync selectedDay prop to string key if provided
  let effectiveDay = selectedDay
  if (typeof selectedDay === 'number') effectiveDay = `day${selectedDay}`

  const currentDayKey = effectiveDay ?? activeDay ?? daysWithContent[0] ?? null
  const rawItems = currentDayKey ? (itinerary[currentDayKey] ?? []) : []
  // Filter out AI-generated 'note' items if they aren't lunch breaks (lunch is ok)
  const filteredItems = rawItems
  const items = [...filteredItems].sort((a, b) => guessMinutes(a.time) - guessMinutes(b.time))

  return (
    <div className="flex flex-col h-full">

      {/* Day tabs */}
      {hasContent && !hideDayTabs && (
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
      <div className="flex-1 overflow-y-auto pl-4 pr-4 py-4">

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

        {hasContent && (selectedDay === 'all' ? (
          <div className="space-y-8">
            {daysWithContent.map(dayKey => (
              <div key={dayKey} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-charcoal text-warmwhite text-[10px] font-bold uppercase tracking-widest rounded-md">
                    Day {dayKey.replace('day', '')}
                  </span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
                <div className="space-y-1">
                  {[...(itinerary[dayKey] || [])].sort((a, b) => guessMinutes(a.time) - guessMinutes(b.time)).map((item, idx, arr) => (
                    <div key={idx}>
                      <ActivityCard
                        index={idx}
                        item={item}
                        isConflict={false}
                        onDelete={() => onDelete && onDelete(dayKey, item.name)}
                        onUpdate={(updates) => onUpdate && onUpdate([{ action: 'update', day: parseInt(dayKey.replace('day', ''), 10), name: item.name, ...updates }])}
                        city={city}
                        tripContext={tripContext}
                        onFocus={onFocusLocation ? () => item.lat && item.lng && onFocusLocation({ lat: item.lat, lng: item.lng, id: `${dayKey}-${idx}` }) : null}
                        allowFullEdit={allowFullEdit}
                        cityContext={cityContext}
                      />
                      {idx < arr.length - 1 && (
                        <div className="flex justify-center">
                          <div className="w-px h-2 bg-border" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : currentDayKey && (
          <div className="space-y-1">
            {/* Add Activity Button (Top) */}
            {allowFullEdit && currentDayKey && !showAddForm && (
              <div className="mb-4">
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="px-3 py-1.5 bg-muted/50 hover:bg-muted text-secondary hover:text-charcoal rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all border border-border/40 hover:border-border"
                >
                  <span className="text-sm leading-none">+</span> Add Activity
                </button>
              </div>
            )}

            {/* New Activity Form */}
            {showAddForm && (
              <div className="mb-6">
                <NewActivityCard 
                  day={parseInt(currentDayKey.replace('day', ''), 10)}
                  onSave={(update) => {
                    onUpdate && onUpdate([update])
                    setShowAddForm(false)
                  }}
                  onCancel={() => setShowAddForm(false)}
                  cityContext={cityContext}
                  city={city}
                />
              </div>
            )}

            {items.map((item, idx, arr) => (
              <div key={idx}>
                <ActivityCard
                  index={idx}
                  item={item}
                  isConflict={false}
                  onDelete={() => onDelete && onDelete(currentDayKey, item.name)}
                  onUpdate={(updates) => onUpdate && onUpdate([{ action: 'update', day: parseInt(currentDayKey.replace('day', ''), 10), name: item.name, ...updates }])}
                  city={city}
                  tripContext={tripContext}
                  onFocus={onFocusLocation ? () => item.lat && item.lng && onFocusLocation({ lat: item.lat, lng: item.lng, id: `${currentDayKey}-${idx}` }) : null}
                  allowFullEdit={allowFullEdit}
                  cityContext={cityContext}
                />
                {idx < items.length - 1 && (
                  <div className="flex justify-center">
                    <div className="w-px h-2 bg-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

      </div>

      {/* Export */}
      {!hideExport && (
        <div className="border-t border-border px-4 py-3">
          <button
            onClick={onExport}
            disabled={!hasContent}
            className="w-full bg-amber text-warmwhite text-sm font-semibold font-body py-2.5 rounded-lg hover:bg-amberdark transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save to My Trips
          </button>
        </div>
      )}

    </div>
  )
}

function ActivityCard({ item, index, isConflict, onDelete, onUpdate, city, tripContext, onFocus, allowFullEdit, cityContext }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: item.name || '',
    type: item.type || '',
    time: item.time || '',
    notes: item.notes || '',
    price_estimate: item.price_estimate || '',
    lat: item.lat || null,
    lng: item.lng || null,
    booking_url: item.booking_url || '',
    google_map_url: item.google_map_url || ''
  })
  const [isPinning, setIsPinning] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)

  // Sync edit form if item changes from backend
  useEffect(() => {
    setEditForm({ 
      name: item.name || '',
      type: item.type || '',
      time: item.time || '', 
      notes: item.notes || '', 
      price_estimate: item.price_estimate || '',
      lat: item.lat || null,
      lng: item.lng || null,
      booking_url: item.booking_url || '',
      google_map_url: item.google_map_url || ''
    })
  }, [item])

  async function handleRepin() {
    if (!editForm.name || !cityContext?.name) return
    setIsPinning(true)
    try {
      const res = await fetch(`/api/geocode?name=${encodeURIComponent(editForm.name)}&city=${encodeURIComponent(cityContext.name)}&lat=${cityContext.lat || ''}&lng=${cityContext.lng || ''}`)
      const data = await res.json()
      if (data.lat && data.lng) {
        setEditForm(f => ({ ...f, lat: data.lat, lng: data.lng }))
      } else {
        alert('Location not found. Try a more specific name.')
      }
    } catch {
      alert('Error searching for location.')
    } finally {
      setIsPinning(false)
    }
  }

  const timeLabel = item.time
  const isNote = item.type === 'note'
  const isHotel = (item.type === 'hotel' || item.name.toLowerCase().includes('hotel') || item.name.toLowerCase().includes('check in') || item.name.toLowerCase().includes('check-in')) && !isNote
  const isTransport = (item.type === 'transport' || item.name.toLowerCase().includes('arrival') || item.name.toLowerCase().includes('departure') || item.name.toLowerCase().includes('flight') || item.name.toLowerCase().includes('airport')) && !isNote

  const effectiveType = isHotel ? 'hotel' : isTransport ? 'transport' : (item.type || 'attraction')
  const icon = TYPE_ICON[effectiveType] ?? '📌'
  const borderColor = TYPE_BORDER[effectiveType] ?? 'border-l-gray-300'
  const typeLabel = isHotel ? 'Hotel' : isTransport ? 'Transport' : (item.type === 'food_recommendation' ? 'Food Recommendation' : (effectiveType.charAt(0).toUpperCase() + effectiveType.slice(1)))

  // Conditionally fetch photo
  useEffect(() => {
    if (effectiveType === 'restaurant' || effectiveType === 'attraction' || effectiveType === 'hotel') {
      const controller = new AbortController()
      fetch(`/api/place-image?name=${encodeURIComponent(item.name)}&city=${encodeURIComponent(cityContext?.name || city || '')}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          if (data.imageUrl) setPhotoUrl(data.imageUrl)
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Error fetching image:', err)
        })
      return () => controller.abort()
    } else {
      setPhotoUrl(null)
    }
  }, [item.name, cityContext?.name, city, effectiveType])

  const confirmed = item.status === 'confirmed'

  // Links
  const query = encodeURIComponent(`${item.name} ${city || ''}`)
  // Only show auto-map link if NOT a note or food recommendation
  const showAutoMap = !isNote && item.type !== 'food_recommendation'
  const mapUrl = item.google_map_url || (showAutoMap ? `https://www.google.com/maps/search/?api=1&query=${query}` : null)

  const canBeBooked = item.requires_ticket === true && !isNote
  const bookUrl = item.booking_url || (canBeBooked ? `https://www.google.com/search?q=${encodeURIComponent(`${item.name} ${city || ''} tickets booking`)}` : null)

  // Build Booking.com URL with dates pre-filled
  function bookingDateParams(iso, prefix) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return ''
    return `&${prefix}_year=${y}&${prefix}_month=${parseInt(m, 10)}&${prefix}_monthday=${parseInt(d, 10)}`
  }
  const pax = tripContext?.group_size ? `&group_adults=${encodeURIComponent(tripContext.group_size)}` : ''
  const hotelUrl = item.booking_url || (isHotel
    ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city || item.name)}${bookingDateParams(tripContext?.travel_date_start, 'checkin')}${bookingDateParams(tripContext?.travel_date_end, 'checkout')}${pax}&no_rooms=1`
    : null)

  async function handleSave() {
    setIsPinning(true)
    const updates = { ...editForm }
    
    // Check if we need to auto-pin (geocode)
    const nameChanged = updates.name !== item.name;
    const typeChangedToMapType = (item.type === 'note' || item.type === 'food_recommendation') && 
                                 (updates.type !== 'note' && updates.type !== 'food_recommendation');
    const missingCoords = !item.lat || !item.lng;
    const isMapType = updates.type !== 'note' && updates.type !== 'food_recommendation';

    // Auto-pinning logic (Saved view only)
    if (allowFullEdit && (nameChanged || typeChangedToMapType || (missingCoords && isMapType))) {
      try {
        const res = await fetch(`/api/geocode?name=${encodeURIComponent(updates.name)}&city=${encodeURIComponent(cityContext?.name || '')}&lat=${cityContext?.lat || ''}&lng=${cityContext?.lng || ''}`)
        const data = await res.json()
        if (data.lat && data.lng) {
          updates.lat = data.lat
          updates.lng = data.lng
        }
      } catch (err) {
        console.error('Auto-pinning failed:', err)
      }
    }

    // Prepare update payload - ensure original name is preserved for search, new name is passed as update
    const finalUpdate = { ...updates }
    if (updates.name !== item.name) {
      finalUpdate.new_name = updates.name // backend/state uses new_name to handle renaming
      finalUpdate.name = item.name // Keep original name to FIND the item in the array
    }

    onUpdate && onUpdate(finalUpdate)
    setIsPinning(false)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className={`relative rounded-xl border border-border border-l-4 px-3 py-3 bg-white shadow-sm flex flex-col gap-3 ${borderColor}`}>
        {allowFullEdit && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Activity Title</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="flex-1 text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none"
                  placeholder="e.g. Eiffel Tower"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Category</label>
              <select
                value={editForm.type}
                onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                className="w-full text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none bg-white appearance-none cursor-pointer"
              >
                {Object.keys(TYPE_ICON).map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-2 block">Scheduled Time</label>
              <GridTimePicker 
                value={editForm.time} 
                onChange={(t) => setEditForm(f => ({ ...f, time: t }))} 
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Booking Link (URL)</label>
              <input 
                type="text" 
                value={editForm.booking_url} 
                onChange={e => setEditForm(f => ({ ...f, booking_url: e.target.value }))}
                className="w-full text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none"
                placeholder="Paste reservation or ticket link..."
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Google Maps Link (URL)</label>
              <input 
                type="text" 
                value={editForm.google_map_url} 
                onChange={e => setEditForm(f => ({ ...f, google_map_url: e.target.value }))}
                className="w-full text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none"
                placeholder="Override default map link..."
              />
            </div>
          </div>
        )}

        {!allowFullEdit && (
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
        )}
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
      onClick={() => onFocus && onFocus()}
      className={`relative flex flex-col sm:flex-row overflow-hidden rounded-xl border border-border border-l-4 bg-white shadow-sm hover:shadow-md transition-all group
        ${borderColor}
        ${(onFocus && item.lat && item.lng) ? 'cursor-pointer hover:border-amber' : ''}
        ${isConflict ? 'bg-red-50 border-red-200' : confirmed ? 'bg-success-bg border-success/20' : ''}`}
    >
      {/* Action buttons — visible on mobile, hover on desktop */}
      <div className="absolute top-2 right-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-full flex items-center shadow-md border border-border/50 z-20">
        {onUpdate && (
          <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-2 text-secondary hover:text-amber transition-colors" title="Edit item">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
        )}
        {onDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-secondary hover:text-red-500 transition-colors" title="Remove item">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Photo Section — Responsive Order */}
      {photoUrl && !isEditing && (
        <div className="order-first sm:order-last shrink-0 w-full h-36 sm:h-auto sm:w-36 lg:w-48 relative border-b sm:border-b-0 sm:border-l border-border/50 bg-muted/20 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={photoUrl} 
            alt={item.name} 
            className="sm:absolute sm:inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 px-3 py-2.5 pb-3">
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

        <div className="flex items-start gap-2 flex-1 min-w-0 pr-2 mt-1">
          <span className="text-base leading-snug mt-0.5 shrink-0">{icon}</span>
          <div className="flex flex-col min-w-0 w-full">
            <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={`font-bold text-sm leading-snug hover:underline ${isConflict ? 'text-red-700' : 'text-charcoal'} truncate whitespace-normal`}>
              {item.name}
            </a>
            {typeLabel && (
              <span className="inline-block px-1.5 py-0.5 mt-1 text-[9px] uppercase font-bold tracking-widest border border-border text-secondary rounded bg-white w-max">
                {typeLabel}
              </span>
            )}
            {item.notes && <p className="text-[11px] text-secondary font-body mt-1 leading-normal italic line-clamp-3">{item.notes}</p>}

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {item.price_estimate && (
                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">{item.price_estimate}</span>
              )}

              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                >
                  Google Maps ↗
                </a>
              )}

              {bookUrl && (
                <a
                  href={bookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
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
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-bold text-white bg-amber hover:bg-amberdark px-2 py-0.5 rounded transition-colors"
                >
                  Book Hotel ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Item Creation (New activity) ─────────────────────────────

function NewActivityCard({ day, onSave, onCancel, city, cityContext }) {
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'attraction',
    time: '',
    notes: '',
    price_estimate: '',
    lat: null,
    lng: null,
    booking_url: '',
    google_map_url: ''
  })
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!editForm.name) return
    setIsSaving(true)
    const updates = { ...editForm }
    
    // Auto-pinning logic (non-note types)
    if (updates.type !== 'note' && updates.type !== 'food_recommendation') {
      try {
        const res = await fetch(`/api/geocode?name=${encodeURIComponent(updates.name)}&city=${encodeURIComponent(cityContext?.name || '')}&lat=${cityContext?.lat || ''}&lng=${cityContext?.lng || ''}`)
        const data = await res.json()
        if (data.lat && data.lng) {
          updates.lat = data.lat
          updates.lng = data.lng
        }
      } catch (err) {
        console.error('Auto-pinning failed:', err)
      }
    }

    onSave && onSave({ action: 'add', day, ...updates })
    setIsSaving(false)
  }

  const borderColor = TYPE_BORDER[editForm.type] ?? 'border-l-gray-300'

  return (
    <div className={`relative rounded-xl border border-border border-l-4 px-3 py-3 bg-white shadow-md flex flex-col gap-3 ${borderColor} ring-2 ring-amber/10 animate-in fade-in slide-in-from-top-2 duration-300`}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Activity Title</label>
          <input 
            type="text" 
            value={editForm.name} 
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            className="w-full text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none"
            placeholder="e.g. Grand Palace"
            autoFocus
          />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Category</label>
          <select
            value={editForm.type}
            onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
            className="w-full text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none bg-white appearance-none cursor-pointer"
          >
            {Object.keys(TYPE_ICON).map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-2 block">Scheduled Time</label>
          <GridTimePicker 
            value={editForm.time} 
            onChange={(t) => setEditForm(f => ({ ...f, time: t }))} 
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Booking Link (URL)</label>
          <input 
            type="text" 
            value={editForm.booking_url} 
            onChange={e => setEditForm(f => ({ ...f, booking_url: e.target.value }))}
            className="w-full text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none"
            placeholder="Paste reservation or ticket link..."
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Google Maps Link (URL)</label>
          <input 
            type="text" 
            value={editForm.google_map_url} 
            onChange={e => setEditForm(f => ({ ...f, google_map_url: e.target.value }))}
            className="w-full text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none"
            placeholder="Override default map link..."
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase font-bold text-secondary tracking-widest mb-1 block">Notes</label>
        <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="w-full text-sm py-1.5 px-2 border border-border rounded-md focus:border-amber focus:outline-none resize-none" rows={2} />
      </div>
      <div className="flex justify-end gap-2 mt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-muted rounded-md transition-colors">Cancel</button>
        <button 
          onClick={handleSave} 
          disabled={!editForm.name || isSaving}
          className="px-4 py-1.5 text-xs font-bold bg-amber text-white hover:bg-amberdark rounded-md transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Add to Day'}
        </button>
      </div>
    </div>
  )
}
