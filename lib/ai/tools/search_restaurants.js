function budgetToPriceRange(budgetProfile) {
  if (budgetProfile === 'budget') return 2
  if (budgetProfile === 'luxury') return 4
  return 3
}

export async function search_restaurants({ city, lat, lng, category, price_range, dietary, budget_profile }) {
  void city
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const radius = 3000

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', radius)
  url.searchParams.set('type', 'restaurant')
  url.searchParams.set('key', apiKey)

  // Use dietary or category as keyword to filter results
  if (dietary) url.searchParams.set('keyword', dietary)
  else if (category) url.searchParams.set('keyword', category)

  const resolvedPriceRange = price_range ?? budgetToPriceRange(budget_profile)
  if (resolvedPriceRange) url.searchParams.set('maxprice', resolvedPriceRange)

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${data.status}`)
  }

  return (data.results ?? [])
    .slice(0, 6)
    .map(place => ({
      name: place.name,
      cuisine: category ?? dietary ?? 'Local cuisine',
      price_level: place.price_level ?? null,
      price: place.price_level != null ? `Price level ${place.price_level}/4` : `Up to ${resolvedPriceRange ?? 4}/4`,
      rating: place.rating ?? null,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      image_url: place.photos?.[0]?.photo_reference
        ? `/api/places-photo?ref=${place.photos[0].photo_reference}`
        : null,
      booking_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      notes: place.vicinity ?? null,
    }))
}
