const PRICE_RANGES = {
  budget:    { label: 'RM 80-150/night',   levels: [0, 1] },
  'mid-range': { label: 'RM 150-350/night', levels: [2, 3] },
  luxury:    { label: 'RM 350+/night',     levels: [4] },
}

function getPriceEstimate(priceLevel, budgetTier) {
  if (priceLevel === undefined || priceLevel === null) {
    return PRICE_RANGES[budgetTier]?.label ?? 'Price not available'
  }
  if (priceLevel <= 1) return 'RM 80-150/night'
  if (priceLevel === 2) return 'RM 150-250/night'
  if (priceLevel === 3) return 'RM 250-400/night'
  return 'RM 400+/night'
}

export async function search_hotels({ city, lat, lng, budget_tier = 'mid-range' }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const radius = 5000

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', radius)
  url.searchParams.set('type', 'lodging')
  url.searchParams.set('key', apiKey)

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${data.status}`)
  }

  const allowedLevels = PRICE_RANGES[budget_tier]?.levels ?? [0, 1, 2, 3, 4]

  return (data.results ?? [])
    .filter(p => p.price_level === undefined || allowedLevels.includes(p.price_level))
    .slice(0, 5)
    .map(place => ({
      name: place.name,
      price_estimate: getPriceEstimate(place.price_level, budget_tier),
      rating: place.rating ?? null,
      stars: place.price_level != null ? place.price_level + 1 : null,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      image_url: place.photos?.[0]?.photo_reference
        ? `/api/places-photo?ref=${place.photos[0].photo_reference}`
        : null,
      booking_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    }))
}
