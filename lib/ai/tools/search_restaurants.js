export async function search_restaurants({ city, lat, lng, cuisine, price_range, dietary }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const radius = 3000

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', radius)
  url.searchParams.set('type', 'restaurant')
  url.searchParams.set('key', apiKey)

  // Use dietary or cuisine as keyword to filter results
  if (dietary) url.searchParams.set('keyword', dietary)
  else if (cuisine) url.searchParams.set('keyword', cuisine)

  if (price_range) url.searchParams.set('maxprice', price_range)

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${data.status}`)
  }

  return (data.results ?? [])
    .slice(0, 6)
    .map(place => ({
      name: place.name,
      cuisine: cuisine ?? dietary ?? 'Local cuisine',
      price_level: place.price_level ?? null,
      rating: place.rating ?? null,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      image_url: place.photos?.[0]?.photo_reference
        ? `/api/places-photo?ref=${place.photos[0].photo_reference}`
        : null,
      maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    }))
}
