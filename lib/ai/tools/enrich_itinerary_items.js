import { build_day_route } from './build_day_route'
import { find_best_hotel } from './find_best_hotel'
import { get_activity_price } from './get_activity_price'
import { get_place_details } from './get_place_details'
import { get_place_photo } from './get_place_photo'
import { search_nearby_places } from './search_nearby_places'
import { classifyPlaceTypeFromGoogle, isGenericPlaceName, findPlaceByText } from './place-utils'

function buildCityQuery(city, country) {
  return [city, country].filter(Boolean).join(', ')
}

function shouldSkipLookup(item) {
  const lowered = item?.name?.toLowerCase?.() ?? ''
  if (item?.type === 'transport') return true
  if (lowered.includes('arrival') || lowered.includes('departure') || lowered.includes('check-in') || lowered.includes('check out')) return true
  return isGenericPlaceName(item?.name ?? '') && !item?.place_id
}

function inferCategory(item) {
  const lowered = item?.name?.toLowerCase?.() ?? ''
  if (item?.type === 'hotel' || lowered.includes('hotel')) return 'properties'
  if (item?.type === 'restaurant' || item?.type === 'food_recommendation' || /breakfast|lunch|dinner|brunch|cafe|restaurant/.test(lowered)) return 'food'
  if (lowered.includes('mall') || lowered.includes('shopping')) return 'shopping'
  return 'attractions'
}

function deriveKeyword(item) {
  const combined = `${item?.name ?? ''} ${item?.notes ?? ''}`.toLowerCase()
  const matches = [
    'breakfast',
    'brunch',
    'lunch',
    'dinner',
    'cafe',
    'coffee',
    'jordanian',
    'halal',
    'vegetarian',
    'museum',
    'viewpoint',
    'market',
    'boutique',
    'budget',
    'luxury',
    'family',
  ].filter((token) => combined.includes(token))

  return matches.slice(0, 2).join(' ') || undefined
}

function extractSpecificQuery(item) {
  const raw = String(item?.name ?? '')
    .replace(/^(breakfast|lunch|dinner|brunch)\s+at\s+/i, '')
    .replace(/^(visit|explore|discover|see|stroll through|walk through)\s+/i, '')
    .split(/\s+\bor\b\s+/i)[0]
    .split(/\s+\band\b\s+/i)[0]
    .trim()

  if (!raw || isGenericPlaceName(raw)) return null
  if (raw.split(/\s+/).length < 2) return null
  return raw
}

function pickAnchor(dayItems = [], index = 0, context = {}, category = 'attractions') {
  if (category === 'food') {
    const hotel = dayItems.find((candidate) => candidate?.type === 'hotel' && candidate?.lat != null && candidate?.lng != null)
    if (hotel) return { lat: hotel.lat, lng: hotel.lng }
  }

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = dayItems[cursor]
    if (candidate?.lat != null && candidate?.lng != null) return { lat: candidate.lat, lng: candidate.lng }
  }

  for (let cursor = index + 1; cursor < dayItems.length; cursor += 1) {
    const candidate = dayItems[cursor]
    if (candidate?.lat != null && candidate?.lng != null) return { lat: candidate.lat, lng: candidate.lng }
  }

  if (context.bias_lat != null && context.bias_lng != null) {
    return { lat: context.bias_lat, lng: context.bias_lng }
  }

  return null
}

function candidateScore(candidate) {
  const ratingScore = Number(candidate.rating ?? 0) * 30
  const reviewScore = Math.min(Math.log10((candidate.review_count ?? 0) + 1) * 16, 28)
  const distancePenalty = Math.min((Number(candidate.distance_m ?? 0) / 1000) * 8, 24)
  return ratingScore + reviewScore - distancePenalty
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

  if (value.includes('morning')) return 9 * 60
  if (value.includes('noon') || value.includes('lunch')) return 12 * 60
  if (value.includes('afternoon')) return 14 * 60
  if (value.includes('evening')) return 18 * 60
  if (value.includes('night') || value.includes('dinner')) return 20 * 60
  return 9999
}

function sortItemsByTime(items = []) {
  return [...items].sort((a, b) => guessMinutes(a.time) - guessMinutes(b.time))
}

function sameName(a, b) {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
}

function containsNonLatin(text = '') {
  return /[^\u0000-\u024f]/.test(text)
}

function isHotelItem(item) {
  const lowered = item?.name?.toLowerCase?.() ?? ''
  if (isGenericPlaceName(item?.name ?? '')) return false
  return item?.type === 'hotel' || /hotel|resort|inn|suite|hostel|villa/.test(lowered)
}

function isFoodItem(item) {
  const lowered = item?.name?.toLowerCase?.() ?? ''
  if (isGenericPlaceName(item?.name ?? '')) return false
  return item?.type === 'restaurant' || item?.type === 'food_recommendation' || /breakfast|brunch|lunch|dinner|cafe|restaurant|coffee/.test(lowered)
}

function isCoreActivityItem(item) {
  if (!item) return false
  if (isFoodItem(item) || isHotelItem(item) || isAirportLogisticsItem(item)) return false
  return item.type === 'attraction' || item.type === 'note' || item.lat != null || item.lng != null
}

function isAirportLogisticsItem(item) {
  const lowered = item?.name?.toLowerCase?.() ?? ''
  return item?.type === 'transport' || /airport|arrival|departure|flight/.test(lowered)
}

function firstTripAnchor(itineraryDays = [], context = {}) {
  for (const day of itineraryDays) {
    for (const item of day.items ?? []) {
      if (item?.lat != null && item?.lng != null && !isAirportLogisticsItem(item)) {
        return { lat: item.lat, lng: item.lng }
      }
    }
  }

  if (context.bias_lat != null && context.bias_lng != null) {
    return { lat: context.bias_lat, lng: context.bias_lng }
  }

  return null
}

function selectMealAnchor(items = [], context = {}, meal = 'lunch') {
  const sorted = sortItemsByTime(items)
  const mappable = sorted.filter((item) => item?.lat != null && item?.lng != null && !isAirportLogisticsItem(item))
  if (mappable.length === 0) {
    if (context.bias_lat != null && context.bias_lng != null) {
      return { lat: context.bias_lat, lng: context.bias_lng }
    }
    return null
  }

  const hotel = mappable.find(isHotelItem)
  if (meal === 'breakfast') return hotel ? { lat: hotel.lat, lng: hotel.lng } : { lat: mappable[0].lat, lng: mappable[0].lng }
  if (meal === 'dinner') {
    const last = hotel ?? mappable[mappable.length - 1]
    return { lat: last.lat, lng: last.lng }
  }

  const middle = mappable[Math.floor(mappable.length / 2)]
  return { lat: middle.lat, lng: middle.lng }
}

function hasFoodInWindow(items = [], startMin, endMin) {
  return items.some((item) => isFoodItem(item) && guessMinutes(item.time) >= startMin && guessMinutes(item.time) <= endMin)
}

function buildMealNotes(meal, candidate) {
  if (meal === 'breakfast') return `Planned breakfast stop at ${candidate.name} before the day's sightseeing starts.`
  if (meal === 'dinner') return `Planned dinner at ${candidate.name} to close out the day near your route.`
  return `Planned lunch stop at ${candidate.name} along today's route.`
}

function mealSlotForItem(item) {
  if (!isFoodItem(item)) return null
  const minutes = guessMinutes(item.time)
  if (minutes >= 5 * 60 && minutes <= 11 * 60) return 'breakfast'
  if (minutes >= 11 * 60 && minutes <= 15 * 60) return 'lunch'
  if (minutes >= 17 * 60 && minutes <= 22 * 60) return 'dinner'
  return 'other'
}

function targetMinutesForSlot(slot) {
  if (slot === 'breakfast') return 8 * 60 + 30
  if (slot === 'lunch') return 12 * 60 + 30
  if (slot === 'dinner') return 19 * 60
  return 14 * 60
}

function chooseCandidate(results = [], excludedNames = new Set()) {
  const unused = results.filter((candidate) => !excludedNames.has(String(candidate.name ?? '').trim().toLowerCase()))
  return (unused.length > 0 ? unused : results)[0] ?? null
}

function sanitizeMealSequence(items = []) {
  const grouped = new Map()

  for (const item of items) {
    const slot = mealSlotForItem(item)
    if (!slot || slot === 'other') continue
    if (!grouped.has(slot)) grouped.set(slot, [])
    grouped.get(slot).push(item)
  }

  const keepNames = new Set()
  for (const [slot, slotItems] of grouped.entries()) {
    const sorted = [...slotItems].sort((a, b) => {
      const aDelta = Math.abs(guessMinutes(a.time) - targetMinutesForSlot(slot))
      const bDelta = Math.abs(guessMinutes(b.time) - targetMinutesForSlot(slot))
      return aDelta - bDelta
    })
    if (sorted[0]?.name) keepNames.add(String(sorted[0].name).trim().toLowerCase())
  }

  return items.filter((item) => {
    const slot = mealSlotForItem(item)
    if (!slot || slot === 'other') return true
    return keepNames.has(String(item.name ?? '').trim().toLowerCase())
  })
}

async function addExactMealIfMissing(items = [], context = {}, meal = 'lunch', time = '12:30 PM', excludedNames = new Set()) {
  const sorted = sortItemsByTime(items)
  const bounds = meal === 'breakfast'
    ? [6 * 60, 11 * 60]
    : meal === 'dinner'
      ? [17 * 60, 22 * 60]
      : [11 * 60, 15 * 60]

  if (hasFoodInWindow(sorted, bounds[0], bounds[1])) return sorted

  const anchor = selectMealAnchor(sorted, context, meal)
  if (!anchor?.lat || !anchor?.lng) return sorted

  let nearby = await search_nearby_places({
    category: 'food',
    lat: anchor.lat,
    lng: anchor.lng,
    keyword: meal,
    limit: 6,
  })

  if (!(nearby.results ?? []).length) {
    nearby = await search_nearby_places({
      category: 'food',
      lat: anchor.lat,
      lng: anchor.lng,
      limit: 6,
    })
  }

  const existingNames = new Set(sorted.map((item) => String(item.name ?? '').trim().toLowerCase()))
  const bestMatch = chooseCandidate(
    [...(nearby.results ?? [])].sort((a, b) => candidateScore(b) - candidateScore(a)),
    new Set([...existingNames, ...excludedNames])
  )

  if (!bestMatch) return sorted

  excludedNames.add(String(bestMatch.name ?? '').trim().toLowerCase())

  return sortItemsByTime([
    ...sorted,
    {
      name: bestMatch.name,
      type: 'restaurant',
      time,
      notes: buildMealNotes(meal, bestMatch),
      place_id: bestMatch.place_id ?? null,
      lat: bestMatch.lat ?? null,
      lng: bestMatch.lng ?? null,
      image_url: bestMatch.image_url ?? null,
      rating: bestMatch.rating ?? null,
      price_estimate: bestMatch.price ?? null,
      google_map_url: bestMatch.booking_url ?? null,
    },
  ])
}

function selectAttractionAnchor(items = [], context = {}) {
  const hotel = items.find((item) => isHotelItem(item) && item.lat != null && item.lng != null)
  if (hotel) return { lat: hotel.lat, lng: hotel.lng }

  const firstMappable = items.find((item) => item?.lat != null && item?.lng != null && !isAirportLogisticsItem(item))
  if (firstMappable) return { lat: firstMappable.lat, lng: firstMappable.lng }

  if (context.bias_lat != null && context.bias_lng != null) {
    return { lat: context.bias_lat, lng: context.bias_lng }
  }

  return null
}

function attractionSeed(existingCount) {
  if (existingCount === 0) {
    return [
      { keyword: 'museum', time: '10:00 AM' },
      { keyword: 'landmark', time: '3:00 PM' },
    ]
  }

  if (existingCount === 1) {
    return [{ keyword: 'landmark', time: '3:00 PM' }]
  }

  return []
}

async function ensureMinimumActivities(items = [], context = {}, excludedNames = new Set()) {
  const sorted = sortItemsByTime(items)
  const coreActivities = sorted.filter(isCoreActivityItem)
  const neededSeeds = attractionSeed(coreActivities.length)
  if (neededSeeds.length === 0) return sorted

  const anchor = selectAttractionAnchor(sorted, context)
  if (!anchor?.lat || !anchor?.lng) return sorted

  let nextItems = [...sorted]

  for (const seed of neededSeeds) {
    const nearby = await search_nearby_places({
      category: 'attractions',
      lat: anchor.lat,
      lng: anchor.lng,
      keyword: seed.keyword,
      limit: 8,
    })

    const existingNames = new Set(nextItems.map((item) => String(item.name ?? '').trim().toLowerCase()))
    const candidate = chooseCandidate(
      [...(nearby.results ?? [])].sort((a, b) => candidateScore(b) - candidateScore(a)),
      new Set([...existingNames, ...excludedNames])
    )

    if (!candidate) continue

    excludedNames.add(String(candidate.name ?? '').trim().toLowerCase())
    nextItems.push({
      name: candidate.name,
      type: 'attraction',
      time: seed.time,
      notes: candidate.notes ?? `Planned stop at ${candidate.name}.`,
      place_id: candidate.place_id ?? null,
      lat: candidate.lat ?? null,
      lng: candidate.lng ?? null,
      image_url: candidate.image_url ?? null,
      rating: candidate.rating ?? null,
      price_estimate: candidate.price ?? null,
      google_map_url: candidate.booking_url ?? null,
    })
  }

  return sortItemsByTime(nextItems)
}

async function ensureBaseHotel(itineraryDays = [], context = {}) {
  const alreadyHasHotel = itineraryDays.some((day) => (day.items ?? []).some(isHotelItem))
  if (alreadyHasHotel || itineraryDays.length === 0) return itineraryDays

  const anchor = firstTripAnchor(itineraryDays, context)
  if (!anchor?.lat || !anchor?.lng) return itineraryDays

  const hotelResult = await find_best_hotel({
    lat: anchor.lat,
    lng: anchor.lng,
    limit: 8,
  })

  if (!hotelResult.best_hotel) return itineraryDays

  const [firstDay, ...rest] = itineraryDays
  const hotelItem = {
    name: hotelResult.best_hotel.name,
    type: 'hotel',
    time: '9:00 PM',
    notes: `Base hotel for the trip chosen near your planned sightseeing area.`,
    place_id: hotelResult.best_hotel.place_id ?? null,
    lat: hotelResult.best_hotel.lat ?? null,
    lng: hotelResult.best_hotel.lng ?? null,
    image_url: hotelResult.best_hotel.image_url ?? null,
    rating: hotelResult.best_hotel.rating ?? null,
    price_estimate: hotelResult.best_hotel.price ?? null,
    google_map_url: hotelResult.best_hotel.booking_url ?? null,
    booking_url: hotelResult.best_hotel.booking_url ?? null,
  }

  return [
    { ...firstDay, items: sortItemsByTime([...(firstDay.items ?? []), hotelItem]) },
    ...rest,
  ]
}

async function completeSparseDays(itineraryDays = [], context = {}) {
  const usedFoodNames = new Set()
  const usedAttractionNames = new Set()
  const withHotel = await ensureBaseHotel(
    itineraryDays.map((day) => ({
      ...day,
      items: (day.items ?? []).filter((item) => {
        if (isAirportLogisticsItem(item)) return false
        if (isGenericPlaceName(item?.name ?? '') && /(hotel|restaurant|cafe|breakfast|lunch|dinner)/i.test(item?.name ?? '')) {
          return false
        }
        return true
      }),
    })),
    context
  )

  const completedDays = []
  for (const day of withHotel) {
    let items = sortItemsByTime(day.items ?? [])
    items = await ensureMinimumActivities(items, context, usedAttractionNames)
    items = await addExactMealIfMissing(items, context, 'breakfast', '8:30 AM', usedFoodNames)
    items = await addExactMealIfMissing(items, context, 'lunch', '12:30 PM', usedFoodNames)
    items = await addExactMealIfMissing(items, context, 'dinner', '7:00 PM', usedFoodNames)
    items = sanitizeMealSequence(items)

    completedDays.push({
      ...day,
      items,
    })
  }

  return completedDays
}

function normaliseResolvedItem(item, candidate, category) {
  if (!candidate) return item

  const resolvedName = candidate.name ?? item.name
  const originalName = item.original_name ?? (
    !sameName(resolvedName, item.name) && containsNonLatin(item.name ?? '')
      ? item.name
      : null
  )

  return {
    ...item,
    name: resolvedName,
    original_name: originalName,
    type: classifyPlaceTypeFromGoogle(
      candidate.types ?? [],
      category === 'properties'
        ? 'hotel'
        : category === 'food'
          ? 'restaurant'
          : item.type === 'note'
            ? 'attraction'
            : (item.type || 'attraction')
    ),
    place_id: candidate.place_id ?? item.place_id ?? null,
    lat: candidate.lat ?? item.lat ?? null,
    lng: candidate.lng ?? item.lng ?? null,
    image_url: candidate.image_url ?? item.image_url ?? null,
    rating: candidate.rating ?? item.rating ?? null,
    google_map_url: candidate.booking_url ?? item.google_map_url ?? null,
    booking_url: category === 'properties'
      ? (candidate.booking_url ?? item.booking_url ?? null)
      : (item.booking_url ?? null),
    price_estimate: candidate.price ?? item.price_estimate ?? null,
    notes: item.notes ?? candidate.notes ?? null,
  }
}

async function resolveSpecificItem(item, context, dayItems = [], index = 0) {
  if (!item || item.type === 'transport') return item

  const cityQuery = buildCityQuery(context.city, context.country)
  const explicitQuery = extractSpecificQuery(item)

  if (explicitQuery) {
    const textMatch = await findPlaceByText({
      query: `${explicitQuery} ${cityQuery}`.trim(),
      biasLat: context.bias_lat ?? null,
      biasLng: context.bias_lng ?? null,
    })

    if (textMatch?.place_id) {
      return normaliseResolvedItem(item, {
        ...textMatch,
        lat: textMatch.geometry?.location?.lat ?? null,
        lng: textMatch.geometry?.location?.lng ?? null,
      }, inferCategory(item))
    }
  }

  if (!isGenericPlaceName(item?.name ?? '')) return item

  const category = inferCategory(item)
  const anchor = pickAnchor(dayItems, index, context, category)
  if (!anchor?.lat || !anchor?.lng) return item

  if (category === 'properties') {
    const hotelResult = await find_best_hotel({
      lat: anchor.lat,
      lng: anchor.lng,
      keyword: deriveKeyword(item),
      limit: 6,
    })

    return normaliseResolvedItem(item, hotelResult.best_hotel, category)
  }

  const nearby = await search_nearby_places({
    category,
    lat: anchor.lat,
    lng: anchor.lng,
    keyword: deriveKeyword(item),
    limit: 6,
  })

  const bestMatch = [...(nearby.results ?? [])]
    .sort((a, b) => candidateScore(b) - candidateScore(a))[0]

  return normaliseResolvedItem(item, bestMatch, category)
}

async function enrichSingleItem(item, context, dayItems = [], index = 0) {
  if (!item || item.type === 'transport') return item

  let resolvedItem
  try {
    resolvedItem = await resolveSpecificItem(item, context, dayItems, index)
  } catch (err) {
    console.error('[enrich] resolveSpecificItem failed for', item?.name, err?.message || err)
    return item
  }
  if (shouldSkipLookup(resolvedItem)) return resolvedItem

  const cityQuery = buildCityQuery(context.city, context.country)
  let textMatch = null
  if (resolvedItem.place_id) {
    textMatch = { place_id: resolvedItem.place_id, geometry: { location: { lat: resolvedItem.lat, lng: resolvedItem.lng } } }
  } else {
    try {
      textMatch = await findPlaceByText({
        query: `${resolvedItem.name} ${cityQuery}`.trim(),
        biasLat: context.bias_lat ?? null,
        biasLng: context.bias_lng ?? null,
      })
    } catch (err) {
      // Missing API key, quota errors, REQUEST_DENIED, etc. Fall through and return
      // the un-enriched item rather than letting one bad lookup kill the whole day.
      console.error('[enrich] findPlaceByText failed for', resolvedItem?.name, err?.message || err)
      textMatch = null
    }
  }

  if (!textMatch?.place_id) return resolvedItem

  let details = null
  try {
    details = await get_place_details({
      place_id: textMatch.place_id,
      category: resolvedItem.type === 'restaurant' ? 'food' : (resolvedItem.type === 'hotel' ? 'properties' : 'attractions'),
    })
  } catch {
    details = null
  }

  const photo = await get_place_photo({
    place_id: textMatch.place_id,
    fallback_query: `${resolvedItem.name} ${cityQuery}`.trim(),
  })

  const price = await get_activity_price({
    place_id: textMatch.place_id,
    name: resolvedItem.name,
    city: cityQuery,
    type: resolvedItem.type === 'restaurant' ? 'food' : (resolvedItem.type === 'hotel' ? 'properties' : 'attractions'),
  })

  return {
    ...resolvedItem,
    name: details?.name ?? resolvedItem.name,
    original_name: resolvedItem.original_name ?? (
      details?.name && !sameName(details.name, resolvedItem.name) && containsNonLatin(resolvedItem.name ?? '')
        ? resolvedItem.name
        : null
    ),
    place_id: textMatch.place_id,
    lat: resolvedItem.lat ?? textMatch.geometry?.location?.lat ?? details?.lat ?? null,
    lng: resolvedItem.lng ?? textMatch.geometry?.location?.lng ?? details?.lng ?? null,
    image_url: resolvedItem.image_url ?? photo.image_url ?? details?.image_url ?? null,
    type: details?.inferred_type ?? classifyPlaceTypeFromGoogle(details?.types ?? [], resolvedItem.type || 'attraction'),
    description: details?.editorial_summary ?? details?.description ?? resolvedItem.description ?? resolvedItem.notes ?? null,
    why_this_place: resolvedItem.why_this_place ?? details?.description ?? null,
    google_map_url: resolvedItem.google_map_url ?? details?.google_map_url ?? null,
    opening_hours: details?.opening_hours ?? resolvedItem.opening_hours ?? null,
    opening_hours_text: details?.opening_hours?.today_hours ?? resolvedItem.opening_hours_text ?? null,
    price_estimate: resolvedItem.price_estimate ?? price.price_text ?? details?.price_estimate ?? null,
    rating: resolvedItem.rating ?? details?.rating ?? null,
  }
}

export async function enrichLooseItems(items = [], context = {}) {
  // Promise.allSettled so one failed item never kills the whole day's enrichment.
  // The original Promise.all caused a missing GOOGLE_PLACES_API_KEY (or a single
  // REQUEST_DENIED) to wipe images, coords, and route segments for every item.
  const results = await Promise.allSettled(
    items.map((item, index) => enrichSingleItem(item, context, items, index))
  )
  return results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value
    console.error('[enrich] item enrichment rejected:', items[index]?.name, result.reason?.message || result.reason)
    return items[index]
  })
}

export async function enrichItineraryDays(itineraryDays = [], context = {}) {
  const completedDays = await completeSparseDays(itineraryDays, context)
  const enrichedDays = []

  for (const day of completedDays) {
    // C1: sort by time BEFORE enrichment/routing so stored route segments match the order
    // MapPanel displays (MapPanel also sorts by time). Keeps server/client in agreement.
    const sortedInput = sortItemsByTime(day.items ?? [])
    const enrichedItems = await enrichLooseItems(sortedInput, context)
    const route = await build_day_route({ items: enrichedItems })

    // C2: map segments to items via stable identity keys (place_id or name) rather than
    // positional index, so interleaved note/transport items can't cause an off-by-one.
    const mappable = enrichedItems.filter((item) =>
      item?.type !== 'transport' && item?.type !== 'note' && item?.lat != null && item?.lng != null
    )
    const itemKey = (item) => item?.place_id || item?.name || ''
    const segmentByItemKey = new Map()
    mappable.forEach((item, i) => {
      if (i === 0) return
      segmentByItemKey.set(itemKey(item), route.route_segments[i - 1] ?? null)
    })
    const itemsWithRoute = enrichedItems.map((item) => {
      const segment = segmentByItemKey.get(itemKey(item))
      if (!segment) return item
      return { ...item, route_from_previous: segment }
    })

    enrichedDays.push({
      ...day,
      items: itemsWithRoute,
      route_summary: {
        total_distance_km: route.total_distance_km,
        total_duration_min: route.total_duration_min,
        warnings: route.warnings,
      },
    })
  }

  return enrichedDays
}

export async function enrich_itinerary_items({
  itinerary_days = [],
  city = null,
  country = null,
  bias_lat = null,
  bias_lng = null,
}) {
  const enriched = await enrichItineraryDays(itinerary_days, {
    city,
    country,
    bias_lat,
    bias_lng,
  })

  return {
    itinerary_days: enriched,
  }
}
