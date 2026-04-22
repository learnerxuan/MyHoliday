// Place image API — Google Places (New)
//
// Priority:
//   1. Google Places API (New) if GOOGLE_PLACES_API_KEY is set
//
// Usage: GET /api/place-image?name=Eiffel%20Tower&city=Paris
// Returns: { imageUrl: string | null, source: 'google' | null }

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY

async function fetchGooglePlacesImage(name: string, city: string): Promise<string | null> {
  if (!GOOGLE_PLACES_KEY) return null

  const query = city ? `${name}, ${city}` : name

  try {
    const searchRes = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type':     'application/json',
          'X-Goog-Api-Key':   GOOGLE_PLACES_KEY,
          'X-Goog-FieldMask': 'places.photos',
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 3,
        }),
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!searchRes.ok) return null

    const searchData = await searchRes.json()

    // Find first result that has photos
    const photoName: string | undefined = searchData?.places
      ?.flatMap((p: { photos?: { name: string }[] }) => p.photos ?? [])
      ?.find((ph: { name: string }) => ph?.name)
      ?.name

    if (!photoName) return null

    // Fetch the photo URI. Use skipHttpRedirect=true to get the direct image URL.
    const photoUrl =
      `https://places.googleapis.com/v1/${photoName}/media` +
      `?maxWidthPx=800&maxHeightPx=600&key=${GOOGLE_PLACES_KEY}&skipHttpRedirect=true`

    const photoRes = await fetch(photoUrl, { signal: AbortSignal.timeout(5000) })
    if (!photoRes.ok) return null

    const photoData = await photoRes.json()
    const uri = (photoData?.photoUri as string) ?? null
    if (uri) return uri

  } catch (error) {
    console.error('Error fetching place image:', error)
  }

  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name') ?? ''
  const city = searchParams.get('city') ?? ''

  if (!name) {
    return Response.json({ imageUrl: null, source: null }, { status: 400 })
  }

  const imageUrl = await fetchGooglePlacesImage(name, city)

  return Response.json(
    { imageUrl, source: imageUrl ? 'google' : null },
    {
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    }
  )
}
