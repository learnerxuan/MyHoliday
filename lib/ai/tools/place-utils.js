const CATEGORY_ALIASES = {
  attraction: 'attractions',
  attractions: 'attractions',
  food: 'food',
  restaurant: 'food',
  restaurants: 'food',
  property: 'properties',
  properties: 'properties',
  hotel: 'properties',
  hotels: 'properties',
  shopping: 'shopping',
  shop: 'shopping',
  airport: 'airports',
  airports: 'airports',
}

const CATEGORY_CONFIG = {
  attractions: {
    placeType: 'tourist_attraction',
    radiusM: 7000,
    resultType: 'attraction',
    emoji: '🎯',
  },
  food: {
    placeType: 'restaurant',
    radiusM: 3000,
    resultType: 'restaurant',
    emoji: '🍽️',
  },
  properties: {
    placeType: 'lodging',
    radiusM: 5000,
    resultType: 'hotel',
    emoji: '🏨',
  },
  shopping: {
    placeType: 'shopping_mall',
    radiusM: 5000,
    resultType: 'shopping',
    emoji: '🛍️',
  },
  airports: {
    placeType: 'airport',
    radiusM: 40000,
    resultType: 'transport',
    emoji: '✈️',
  },
}

export function normalisePlaceCategory(category) {
  const key = String(category || 'attractions').trim().toLowerCase()
  return CATEGORY_ALIASES[key] ?? 'attractions'
}

export function getCategoryConfig(category) {
  return CATEGORY_CONFIG[normalisePlaceCategory(category)]
}

export function buildPlacePhotoUrl(photoReference, maxWidth = 800) {
  if (!photoReference) return null
  return `/api/places-photo?ref=${encodeURIComponent(photoReference)}&maxwidth=${maxWidth}`
}

function getGooglePlacesKey() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured')
  }
  return apiKey
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Places request failed with ${res.status}`)
  }
  return res.json()
}

export async function findPlaceByText({ query, biasLat = null, biasLng = null }) {
  const apiKey = getGooglePlacesKey()
  const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json')
  url.searchParams.set('input', query)
  url.searchParams.set('inputtype', 'textquery')
  url.searchParams.set('language', 'en')
  url.searchParams.set('fields', [
    'place_id',
    'name',
    'formatted_address',
    'geometry',
    'photos',
    'types',
    'rating',
    'user_ratings_total',
    'price_level',
    'opening_hours',
  ].join(','))
  url.searchParams.set('key', apiKey)

  if (biasLat != null && biasLng != null) {
    url.searchParams.set('locationbias', `circle:10000@${biasLat},${biasLng}`)
  }

  const data = await fetchJson(url.toString())
  if (data.status !== 'OK' || !data.candidates?.[0]) {
    return null
  }
  return data.candidates[0]
}

export async function fetchPlaceDetails(placeId) {
  const apiKey = getGooglePlacesKey()
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('language', 'en')
  url.searchParams.set('fields', [
    'place_id',
    'name',
    'formatted_address',
    'geometry',
    'rating',
    'user_ratings_total',
    'price_level',
    'opening_hours',
    'photos',
    'website',
    'url',
    'formatted_phone_number',
    'business_status',
    'types',
    'editorial_summary',
    'vicinity',
  ].join(','))
  url.searchParams.set('key', apiKey)

  const data = await fetchJson(url.toString())
  if (data.status !== 'OK' || !data.result) {
    throw new Error(`Google Places details error: ${data.status}`)
  }
  return data.result
}

export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => typeof v !== 'number' || Number.isNaN(v))) return null
  const R = 6371e3
  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

export function distanceLabel(distanceM) {
  if (distanceM == null) return null
  if (distanceM < 1000) return `${distanceM} m`
  return `${(distanceM / 1000).toFixed(distanceM >= 10000 ? 0 : 1)} km`
}

export function priceLevelToText(priceLevel, category = 'generic') {
  if (priceLevel == null) {
    if (category === 'properties') return 'Price not verified'
    return null
  }

  if (category === 'properties') {
    if (priceLevel <= 1) return 'Budget stay'
    if (priceLevel === 2) return 'Mid-range stay'
    if (priceLevel === 3) return 'Upper mid-range stay'
    return 'Luxury stay'
  }

  if (priceLevel === 0) return 'Free or very cheap'
  if (priceLevel === 1) return 'Budget-friendly'
  if (priceLevel === 2) return 'Moderate'
  if (priceLevel === 3) return 'Premium'
  return 'Luxury pricing'
}

function guessAttractionPrice(name = '', types = []) {
  const joined = `${name} ${types.join(' ')}`.toLowerCase()
  if (/temple|shrine|park|garden|river|market|street/.test(joined)) {
    return {
      price_text: 'Usually free or low-cost entry',
      confidence: 'low',
    }
  }
  if (/museum|gallery|palace|tower|show|cabaret|aquarium|zoo|sky walk|observation/.test(joined)) {
    return {
      price_text: 'Likely paid entry ticket',
      confidence: 'low',
    }
  }
  return {
    price_text: 'Price not verified',
    confidence: 'low',
  }
}

export function deriveActivityPrice({ priceLevel = null, name = '', types = [], category = 'attractions' }) {
  if (priceLevel != null) {
    return {
      price_text: priceLevelToText(priceLevel, category),
      confidence: 'medium',
      source: 'places-price-level',
    }
  }

  if (category === 'food') {
    return {
      price_text: 'Price not verified',
      confidence: 'low',
      source: 'unavailable',
    }
  }

  const guess = guessAttractionPrice(name, types)
  return {
    ...guess,
    source: 'heuristic',
  }
}

export function openingHoursSummary(openingHours) {
  if (!openingHours) {
    return {
      open_now: null,
      today_hours: null,
      weekly_hours: [],
    }
  }

  const weekdayText = Array.isArray(openingHours.weekday_text)
    ? openingHours.weekday_text
    : []

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayName = dayNames[new Date().getDay()]
  const todayHours = weekdayText.find(line => line.startsWith(todayName)) ?? null

  return {
    open_now: typeof openingHours.open_now === 'boolean' ? openingHours.open_now : null,
    today_hours: todayHours,
    weekly_hours: weekdayText,
  }
}

export function buildPlaceSummary(place, category) {
  const address = place.vicinity || place.formatted_address || ''
  const types = Array.isArray(place.types) ? place.types : []

  if (place.editorial_summary?.overview) return place.editorial_summary.overview
  if (category === 'food') {
    return address
      ? `Popular food option near ${address}.`
      : 'Nearby food option with map-backed details.'
  }
  if (category === 'properties') {
    return address
      ? `Stay option around ${address}.`
      : 'Nearby stay option for anchoring the itinerary.'
  }
  if (category === 'shopping') {
    return address
      ? `Shopping spot near ${address}.`
      : 'Nearby shopping option.'
  }
  if (category === 'airports') {
    return address
      ? `Airport or transport anchor near ${address}.`
      : 'Relevant transport anchor.'
  }

  const descriptor = types
    .filter(Boolean)
    .slice(0, 2)
    .map(type => type.replace(/_/g, ' '))
    .join(', ')

  if (descriptor && address) {
    return `${descriptor} near ${address}.`
  }
  if (address) return `Popular stop near ${address}.`
  return 'Recommended stop with available map data.'
}

export function classifyPlaceTypeFromGoogle(types = [], fallbackType = 'attraction') {
  const normalized = Array.isArray(types) ? types.map((type) => String(type).toLowerCase()) : []

  if (normalized.some((type) => ['lodging', 'hotel', 'rv_park', 'campground'].includes(type))) {
    return 'hotel'
  }

  if (normalized.some((type) => ['restaurant', 'cafe', 'bakery', 'meal_takeaway', 'meal_delivery', 'bar'].includes(type))) {
    return 'restaurant'
  }

  if (normalized.some((type) => ['shopping_mall', 'department_store', 'store', 'supermarket'].includes(type))) {
    return 'shopping'
  }

  if (normalized.some((type) => [
    'tourist_attraction',
    'museum',
    'art_gallery',
    'spa',
    'park',
    'amusement_park',
    'campground',
    'church',
    'hindu_temple',
    'mosque',
    'synagogue',
    'place_of_worship',
    'stadium',
    'zoo',
    'aquarium',
    'point_of_interest',
    'establishment',
  ].includes(type))) {
    return 'attraction'
  }

  return fallbackType
}

export function normalizePlaceCard(place, { category, anchorLat = null, anchorLng = null } = {}) {
  const normalizedCategory = normalisePlaceCategory(category)
  const cfg = getCategoryConfig(normalizedCategory)
  const lat = place.geometry?.location?.lat ?? place.lat ?? null
  const lng = place.geometry?.location?.lng ?? place.lng ?? null
  const distanceM = (
    typeof anchorLat === 'number' &&
    typeof anchorLng === 'number' &&
    typeof lat === 'number' &&
    typeof lng === 'number'
  ) ? haversineDistanceMeters(anchorLat, anchorLng, lat, lng) : null

  return {
    id: place.place_id || `${cfg.resultType}-${place.name}-${lat}-${lng}`,
    place_id: place.place_id ?? null,
    name: place.name,
    type: cfg.resultType,
    category: normalizedCategory,
    lat,
    lng,
    short_address: place.vicinity || place.formatted_address || null,
    rating: place.rating ?? null,
    review_count: place.user_ratings_total ?? null,
    price_level: place.price_level ?? null,
    price: priceLevelToText(place.price_level, normalizedCategory),
    image_url: buildPlacePhotoUrl(place.photos?.[0]?.photo_reference ?? null),
    booking_url: place.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
      : null,
    notes: buildPlaceSummary(place, normalizedCategory),
    summary: buildPlaceSummary(place, normalizedCategory),
    distance_m: distanceM,
    distance_label: distanceLabel(distanceM),
    open_now: typeof place.opening_hours?.open_now === 'boolean' ? place.opening_hours.open_now : null,
    source: 'google-places',
  }
}

export function isGenericPlaceName(name = '') {
  const lowered = name.toLowerCase()
  return [
    'local ',
    'authentic ',
    'nearby ',
    'suggested ',
    'recommendation',
    'breakfast at',
    'lunch at',
    'dinner at',
    'brunch at',
  ].some(token => lowered.includes(token))
}
