// Uses Google Places API — same key as hotels/restaurants
// type=tourist_attraction covers temples, museums, parks, landmarks etc.

const CATEGORY_KEYWORD = {
  museum:   'museum',
  temple:   'temple shrine',
  nature:   'nature park garden',
  shopping: 'shopping market',
  landmark: 'landmark monument',
  park:     'park',
  art:      'art gallery',
  food:     'food market street food',
}

export async function search_attractions({ city, lat, lng, category }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const radius = 8000

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', radius)
  url.searchParams.set('type', 'tourist_attraction')
  url.searchParams.set('key', apiKey)

  if (category) {
    url.searchParams.set('keyword', CATEGORY_KEYWORD[category] ?? category)
  }

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${data.status}`)
  }

  return (data.results ?? [])
    .slice(0, 6)
    .map(place => ({
      name: place.name,
      category: category ?? 'attraction',
      description: place.vicinity ?? null,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating ?? null,
      image_url: place.photos?.[0]?.photo_reference
        ? `/api/places-photo?ref=${place.photos[0].photo_reference}`
        : null,
      maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    }))
}
