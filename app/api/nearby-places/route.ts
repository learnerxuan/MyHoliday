// Nearby Places API — Google Places API (New) Nearby Search
//
// Usage: GET /api/nearby-places?lat=3.14&lng=101.68&radius=1500&type=restaurant
// Returns: { places: Array<{ name, lat, lng, address, photoUrl, placeId, rating }> }

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY

// Map UI category labels to Places API (New) primary type values
const TYPE_MAP: Record<string, string> = {
  restaurant:     'restaurant',
  attraction:     'tourist_attraction',
  hotel:          'lodging',
  cafe:           'cafe',
  shopping:       'shopping_mall',
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // metres
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function fetchPhotoUrl(photoName: string): Promise<string | null> {
  if (!GOOGLE_PLACES_KEY) return null
  try {
    const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&maxHeightPx=400&key=${GOOGLE_PLACES_KEY}&skipHttpRedirect=true`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const data = await res.json()
    return (data?.photoUri as string) ?? null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat    = parseFloat(searchParams.get('lat')    ?? '')
  const lng    = parseFloat(searchParams.get('lng')    ?? '')
  const radiusParam = parseFloat(searchParams.get('radius') ?? '1500')
  const type   = searchParams.get('type') ?? 'restaurant'

  if (isNaN(lat) || isNaN(lng)) {
    return Response.json({ error: 'Missing or invalid lat/lng' }, { status: 400 })
  }

  if (!GOOGLE_PLACES_KEY) {
    return Response.json({ error: 'Google Places API key not configured' }, { status: 503 })
  }

  const placeType = TYPE_MAP[type] ?? 'restaurant'
  // Cap radius between 200m and 50km
  const radius = Math.min(Math.max(radiusParam, 200), 50000)

  try {
    const searchRes = await fetch(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        method: 'POST',
        headers: {
          'Content-Type':     'application/json',
          'X-Goog-Api-Key':   GOOGLE_PLACES_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.rating,places.primaryType',
        },
        body: JSON.stringify({
          includedTypes: [placeType],
          maxResultCount: 12,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius,
            },
          },
        }),
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!searchRes.ok) {
      const errText = await searchRes.text()
      console.error('Nearby search error:', errText)
      return Response.json({ error: 'Places API error', details: errText }, { status: 502 })
    }

    const data = await searchRes.json()
    const rawPlaces = data?.places ?? []

    // Fetch photos in parallel (limit to first 8 for speed)
    const places = await Promise.all(
      rawPlaces.slice(0, 12).map(async (p: {
        id: string
        displayName: { text: string }
        formattedAddress?: string
        location: { latitude: number; longitude: number }
        photos?: { name: string }[]
        rating?: number
        primaryType?: string
      }) => {
        let photoUrl: string | null = null
        const firstPhoto = p.photos?.[0]?.name
        if (firstPhoto) {
          photoUrl = await fetchPhotoUrl(firstPhoto)
        }
        return {
          placeId:  p.id,
          name:     p.displayName?.text ?? 'Unknown',
          address:  p.formattedAddress ?? '',
          lat:      p.location.latitude,
          lng:      p.location.longitude,
          photoUrl,
          rating:   p.rating ?? null,
          type:     p.primaryType ?? type,
        }
      })
    )

    return Response.json(
      { places },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        },
      }
    )
  } catch (err) {
    console.error('Nearby places error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
