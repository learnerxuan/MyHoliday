'use client'

import { useEffect, useRef, useState } from 'react'

const TIME_SLOTS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
  '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM',
]

const TYPE_META = {
  hotel: {
    label: 'Hotel',
    marker: 'H',
    border: 'border-l-amber',
    chip: 'bg-amber/10 text-amberdark border-amber/20',
    markerBg: 'bg-amber/15 text-amberdark',
  },
  restaurant: {
    label: 'Food',
    marker: 'F',
    border: 'border-l-red-400',
    chip: 'bg-red-50 text-red-600 border-red-100',
    markerBg: 'bg-red-50 text-red-600',
  },
  attraction: {
    label: 'Activity',
    marker: 'A',
    border: 'border-l-blue-400',
    chip: 'bg-blue-50 text-blue-700 border-blue-100',
    markerBg: 'bg-blue-50 text-blue-700',
  },
  transport: {
    label: 'Transport',
    marker: 'T',
    border: 'border-l-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
    markerBg: 'bg-slate-100 text-slate-600',
  },
  note: {
    label: 'Note',
    marker: 'N',
    border: 'border-l-yellow-400',
    chip: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    markerBg: 'bg-yellow-50 text-yellow-700',
  },
  food_recommendation: {
    label: 'Food',
    marker: 'F',
    border: 'border-l-red-400',
    chip: 'bg-red-50 text-red-600 border-red-100',
    markerBg: 'bg-red-50 text-red-600',
  },
}

function guessMinutes(timeStr) {
  if (!timeStr) return 9999
  const value = timeStr.toLowerCase()
  const match = value.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (match) {
    let hour = parseInt(match[1], 10)
    const minute = parseInt(match[2] || '0', 10)
    const suffix = match[3]

    if (suffix === 'pm' && hour < 12) hour += 12
    if (suffix === 'am' && hour === 12) hour = 0
    return hour * 60 + minute
  }

  if (value.includes('all day') || value.includes('anytime')) return -1
  if (value.includes('morning')) return 8 * 60
  if (value.includes('noon') || value.includes('lunch')) return 12 * 60
  if (value.includes('afternoon')) return 14 * 60
  if (value.includes('evening')) return 18 * 60
  if (value.includes('night') || value.includes('dinner')) return 20 * 60

  return 9999
}

function getDayNumber(dayKey) {
  return parseInt(dayKey.replace('day', ''), 10)
}

function sortItems(items = []) {
  return [...items].sort((a, b) => guessMinutes(a.time) - guessMinutes(b.time))
}

function resolveType(item) {
  if (!item) return 'attraction'

  const name = item.name?.toLowerCase?.() ?? ''
  if (item.type === 'hotel' || name.includes('hotel') || name.includes('check-in') || name.includes('check in')) {
    return 'hotel'
  }
  if (item.type === 'transport' || name.includes('airport') || name.includes('flight') || name.includes('departure') || name.includes('arrival')) {
    return 'transport'
  }

  return item.type || 'attraction'
}

function isGenericTitle(name = '') {
  const lowered = name.toLowerCase()
  return [
    'breakfast at',
    'lunch at',
    'dinner at',
    'brunch at',
    'local restaurant',
    'local cafe',
    'near hotel',
    'nearby restaurant',
    'breakfast near',
    'dinner near',
    'explore nearby',
    'relax at the hotel',
  ].some((token) => lowered.includes(token))
}

function shouldShowOriginalName(originalName, displayName) {
  if (!originalName) return false
  return originalName.trim().toLowerCase() !== String(displayName ?? '').trim().toLowerCase()
}

function routeModeLabel(mode) {
  if (mode === 'walking') return 'Walk'
  if (mode === 'driving') return 'Drive'
  if (mode === 'transit') return 'Transit'
  return 'Transfer'
}

function bookingDateParams(iso, prefix) {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return ''
  return `&${prefix}_year=${year}&${prefix}_month=${parseInt(month, 10)}&${prefix}_monthday=${parseInt(day, 10)}`
}

function buildEditForm(item, effectiveType) {
  return {
    name: item.name || '',
    type: item.type || effectiveType,
    time: item.time || '',
    notes: item.notes || '',
    price_estimate: item.price_estimate || '',
    booking_url: item.booking_url || '',
    google_map_url: item.google_map_url || '',
    lat: item.lat ?? null,
    lng: item.lng ?? null,
  }
}

export default function ItineraryPanel({
  itinerary = {},
  onExport,
  onDelete,
  onUpdate,
  city,
  tripContext,
  hideExport = false,
  hideDayTabs = false,
  selectedDay,
  onFocusLocation,
  allowFullEdit = false,
  cityContext = null,
}) {
  const allDays = Object.keys(itinerary).sort((a, b) => getDayNumber(a) - getDayNumber(b))
  const configuredDays = Number(tripContext?.trip_days ?? 0)
  const availableDayKeys = configuredDays > 0
    ? Array.from({ length: configuredDays }, (_, index) => `day${index + 1}`)
    : allDays
  const hasAnyItems = allDays.some((dayKey) => itinerary[dayKey]?.length > 0)

  const [activeDay, setActiveDay] = useState(null)
  const scrollRef = useRef(null)

  const effectiveDay = typeof selectedDay === 'number' ? `day${selectedDay}` : selectedDay
  const currentDayKey = effectiveDay ?? (activeDay && availableDayKeys.includes(activeDay) ? activeDay : availableDayKeys[0] ?? null)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    element.scrollTo({ top: 0, behavior: 'auto' })
  }, [currentDayKey, selectedDay])

  function renderDay(dayKey) {
    const dayNumber = getDayNumber(dayKey)
    const items = sortItems(itinerary[dayKey] ?? [])

    return (
      <div key={dayKey} className="space-y-3">
        {(selectedDay === 'all' || hideDayTabs) && (
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-charcoal text-warmwhite text-[10px] font-bold uppercase tracking-widest rounded-md">
              Day {dayNumber}
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
        )}

        <div className="space-y-0">
          {items.map((item, index) => (
            <div key={`${dayKey}-${index}`}>
              {index > 0 && (
                item.route_from_previous?.duration_min
                  ? <RouteSeparator segment={item.route_from_previous} />
                  : <div className="h-4" />
              )}

              <ActivityCard
                item={item}
                city={city}
                tripContext={tripContext}
                allowFullEdit={allowFullEdit}
                cityContext={cityContext}
                onFocus={onFocusLocation && item.lat && item.lng
                  ? () => onFocusLocation({ lat: item.lat, lng: item.lng, id: `${dayKey}-${index}` })
                  : null}
                onDelete={onDelete ? () => onDelete(dayKey, item.name) : null}
                onUpdate={onUpdate ? (updates) => onUpdate([{
                  action: 'update',
                  day: dayNumber,
                  name: item.name,
                  ...updates,
                }]) : null}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {availableDayKeys.length > 0 && !hideDayTabs && selectedDay !== 'all' && (
        <div className="flex overflow-x-auto gap-1 px-3 py-2 border-b border-border bg-white shrink-0 scrollbar-none">
          {availableDayKeys.map((dayKey) => {
            const isActive = currentDayKey === dayKey
            return (
              <button
                key={dayKey}
                onClick={() => setActiveDay(dayKey)}
                className={`shrink-0 text-xs font-semibold font-body px-3 py-1.5 rounded-md transition-colors ${
                  isActive ? 'bg-charcoal text-warmwhite' : 'text-secondary hover:text-charcoal hover:bg-muted'
                }`}
              >
                Day {getDayNumber(dayKey)}
              </button>
            )
          })}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {!hasAnyItems && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-lg font-semibold text-secondary">
              Plan
            </span>
            <p className="text-sm font-body text-secondary">
              Your itinerary will appear here as you chat with the planner.
            </p>
            <p className="text-xs text-tertiary">
              Ask the AI to build or revise the trip and it will update this timeline.
            </p>
          </div>
        )}

        {hasAnyItems && selectedDay === 'all' && (
          <div className="space-y-8">
            {availableDayKeys.map(renderDay)}
          </div>
        )}

        {selectedDay !== 'all' && currentDayKey && renderDay(currentDayKey)}
      </div>

      {!hideExport && (
        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onExport}
            disabled={!hasAnyItems}
            className="w-full bg-amber text-warmwhite text-sm font-semibold font-body py-2.5 rounded-lg hover:bg-amberdark transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export to My Plans
          </button>
        </div>
      )}
    </div>
  )
}

function RouteSeparator({ segment }) {
  const modeLabel = routeModeLabel(segment.mode)
  const distanceLabel = segment.distance_km ? `${segment.distance_km} km` : null
  const durationLabel = segment.duration_min ? `${segment.duration_min} min` : null
  const summary = [modeLabel, durationLabel, distanceLabel].filter(Boolean).join(' | ')

  return (
    <div className="py-2">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/70" />
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/70 px-3 py-1 text-[11px] font-semibold text-secondary">
          <span>{summary}</span>
        </div>
        <div className="h-px flex-1 bg-border/70" />
      </div>
      {segment.note && (
        <p className="mt-1 text-center text-[11px] text-tertiary">
          {segment.note}
        </p>
      )}
    </div>
  )
}

function ActivityCard({ item, onDelete, onUpdate, city, tripContext, onFocus, allowFullEdit, cityContext }) {
  const effectiveType = resolveType(item)
  const meta = TYPE_META[effectiveType] ?? TYPE_META.attraction
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState(() => buildEditForm(item, effectiveType))

  const isConfirmed = item.status === 'confirmed'
  const timeLabel = item.time || 'Flexible'
  const isGeneric = isGenericTitle(item.name)
  const query = encodeURIComponent(`${item.name} ${city || ''}`.trim())
  const mapUrl = !isGeneric && (item.google_map_url || (effectiveType !== 'note'
    ? `https://www.google.com/maps/search/?api=1&query=${query}`
    : null))
  const ticketUrl = !isGeneric && (item.booking_url || (item.requires_ticket
    ? `https://www.google.com/search?q=${encodeURIComponent(`${item.name} ${city || ''} tickets booking`)}`
    : null))

  const pax = tripContext?.group_size ? `&group_adults=${encodeURIComponent(tripContext.group_size)}` : ''
  const hotelUrl = !isGeneric && effectiveType === 'hotel'
    ? item.booking_url || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(item.name || city || '')}${bookingDateParams(tripContext?.travel_date_start, 'checkin')}${bookingDateParams(tripContext?.travel_date_end, 'checkout')}${pax}&no_rooms=1`
    : null

  const description = item.description && item.description !== item.notes ? item.description : null

  async function handleSave() {
    if (!onUpdate) return

    const updates = { ...editForm }
    const mapType = !['note', 'transport', 'food_recommendation'].includes(updates.type)
    const shouldGeocode = allowFullEdit && mapType && cityContext?.name && (
      updates.name !== item.name || item.lat == null || item.lng == null
    )

    setIsSaving(true)

    if (shouldGeocode) {
      try {
        const params = new URLSearchParams({
          name: updates.name,
          city: cityContext.name,
        })
        if (cityContext.lat != null) params.set('lat', String(cityContext.lat))
        if (cityContext.lng != null) params.set('lng', String(cityContext.lng))

        const res = await fetch(`/api/geocode?${params.toString()}`)
        const data = await res.json()
        if (data.lat != null && data.lng != null) {
          updates.lat = data.lat
          updates.lng = data.lng
        }
      } catch (error) {
        console.error('Auto-pinning failed:', error)
      }
    }

    const finalUpdate = updates.name !== item.name
      ? { ...updates, name: item.name, new_name: updates.name }
      : updates

    onUpdate(finalUpdate)
    setIsSaving(false)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className={`rounded-2xl border border-border border-l-4 bg-white px-4 py-4 shadow-sm ${meta.border}`}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-secondary">Place</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-amber focus:outline-none"
              placeholder="Specific venue name"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-secondary">Category</label>
            <select
              value={editForm.type}
              onChange={(event) => setEditForm((current) => ({ ...current, type: event.target.value }))}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-amber focus:outline-none"
            >
              {Object.keys(TYPE_META).map((type) => (
                <option key={type} value={type}>
                  {TYPE_META[type].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-secondary">Start time</label>
            <select
              value={editForm.time}
              onChange={(event) => setEditForm((current) => ({ ...current, time: event.target.value }))}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-amber focus:outline-none"
            >
              <option value="">Pick a time</option>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-secondary">Notes</label>
            <textarea
              rows={3}
              value={editForm.notes}
              onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
              className="w-full resize-none rounded-md border border-border px-3 py-2 text-sm focus:border-amber focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-secondary">Price</label>
            <input
              type="text"
              value={editForm.price_estimate}
              onChange={(event) => setEditForm((current) => ({ ...current, price_estimate: event.target.value }))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-amber focus:outline-none"
              placeholder="e.g. RM 45"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-secondary">Booking link</label>
            <input
              type="text"
              value={editForm.booking_url}
              onChange={(event) => setEditForm((current) => ({ ...current, booking_url: event.target.value }))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-amber focus:outline-none"
              placeholder="Optional URL"
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-secondary">Map link</label>
            <input
              type="text"
              value={editForm.google_map_url}
              onChange={(event) => setEditForm((current) => ({ ...current, google_map_url: event.target.value }))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-amber focus:outline-none"
              placeholder="Optional Google Maps URL"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-amber px-3 py-1.5 text-xs font-semibold text-warmwhite hover:bg-amberdark disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => onFocus?.()}
      className={`group relative rounded-2xl border border-border border-l-4 bg-white px-4 py-4 shadow-sm transition-all hover:shadow-md ${
        meta.border
      } ${
        onFocus && item.lat != null && item.lng != null ? 'cursor-pointer hover:border-amber' : ''
      } ${
        isConfirmed ? 'bg-success-bg border-success/20' : ''
      }`}
    >
      <div className="absolute right-3 top-3 flex rounded-full border border-border/60 bg-white/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        {onUpdate && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setEditForm(buildEditForm(item, effectiveType))
              setIsEditing(true)
            }}
            className="p-1.5 text-secondary transition-colors hover:text-amber"
            title="Edit item"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
            className="p-1.5 text-secondary transition-colors hover:text-red-500"
            title="Remove item"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 pr-14">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-secondary">
            {timeLabel}
          </span>
          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${meta.chip}`}>
            {meta.label}
          </span>
        </div>
        {isConfirmed && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-success">
            Confirmed
          </span>
        )}
      </div>

      {item.image_url && (
        <div className="mb-4 overflow-hidden rounded-xl border border-border/70 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt={item.name} className="h-44 w-full object-cover" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="block text-base font-bold leading-snug text-charcoal">
            {item.name}
          </h3>
          {shouldShowOriginalName(item.original_name, item.name) && (
            <p className="mt-1 text-sm font-medium leading-snug text-secondary">
              ({item.original_name})
            </p>
          )}

          {description && (
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              {description}
            </p>
          )}

          {item.notes && (
            <p className="mt-2 text-sm leading-relaxed text-tertiary">
              {item.notes}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.opening_hours_text && (
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {item.opening_hours_text}
              </span>
            )}
            {item.price_estimate && (
              <span className="rounded-full border border-green-100 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                {item.price_estimate}
              </span>
            )}
            {item.rating && (
              <span className="rounded-full border border-amber/20 bg-amber/10 px-2.5 py-1 text-xs font-semibold text-amberdark">
                Rated {item.rating}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800"
              >
                Open in Maps
              </a>
            )}

            {ticketUrl && effectiveType !== 'hotel' && (
              <a
                href={ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="text-xs font-semibold text-amber transition-colors hover:text-amberdark"
              >
                Find tickets
              </a>
            )}

            {hotelUrl && (
              <a
                href={hotelUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="rounded-full bg-amber px-3 py-1.5 text-xs font-semibold text-warmwhite transition-colors hover:bg-amberdark"
              >
                Book hotel
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
