import { getCategoryConfig, normalisePlaceCategory, normalizePlaceCard } from './place-utils'

export async function search_nearby_places({
  category,
  lat,
  lng,
  radius_m,
  keyword,
  open_now = false,
  price_level,
  limit = 6,
}) {
  if (lat == null || lng == null) {
    throw new Error('Latitude and longitude are required for nearby search')
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured')
  }

  const normalizedCategory = normalisePlaceCategory(category)
  const cfg = getCategoryConfig(normalizedCategory)
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', String(radius_m ?? cfg.radiusM))
  url.searchParams.set('type', cfg.placeType)
  url.searchParams.set('language', 'en')
  url.searchParams.set('key', apiKey)

  if (keyword) url.searchParams.set('keyword', keyword)
  if (open_now) url.searchParams.set('opennow', 'true')
  if (price_level != null && normalizedCategory === 'food') {
    url.searchParams.set('maxprice', String(price_level))
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Google Places error: ${res.status}`)
  }

  const data = await res.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${data.status}`)
  }

  const results = (data.results ?? [])
    .slice(0, limit)
    .map(place => normalizePlaceCard(place, {
      category: normalizedCategory,
      anchorLat: Number(lat),
      anchorLng: Number(lng),
    }))

  return {
    category: normalizedCategory,
    anchor: { lat: Number(lat), lng: Number(lng) },
    results,
  }
}
