// City image API — Google Places (New) with Wikipedia fallback
//
// Priority:
//   1. Google Places API (New) if GOOGLE_PLACES_API_KEY is set
//   2. Wikipedia REST API (free, no key)
//
// Usage: GET /api/city-image?city=Milan&country=Italy
// Returns: { imageUrl: string | null, source: 'google' | 'wikipedia' | null }

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY

// ── Google Places (New) ──────────────────────────────────────
async function fetchGooglePlacesImage(city: string, country: string): Promise<string | null> {
  if (!GOOGLE_PLACES_KEY) return null

  // Try "City, Country" first, then just "City" — some cities are not found with country appended
  const queries = [`${city}, ${country}`, city]

  for (const textQuery of queries) {
    try {
      // Step 1: Text Search to find the place and get photo resource names
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
            textQuery,
            maxResultCount: 3,
          }),
          signal: AbortSignal.timeout(5000),
        }
      )

      if (!searchRes.ok) continue

      const searchData = await searchRes.json()

      // Find first result that has photos
      const photoName: string | undefined = searchData?.places
        ?.flatMap((p: { photos?: { name: string }[] }) => p.photos ?? [])
        ?.find((ph: { name: string }) => ph?.name)
        ?.name

      if (!photoName) continue

      // Step 2: Fetch the photo URI
      const photoUrl =
        `https://places.googleapis.com/v1/${photoName}/media` +
        `?maxWidthPx=1200&key=${GOOGLE_PLACES_KEY}&skipHttpRedirect=true`

      const photoRes = await fetch(photoUrl, { signal: AbortSignal.timeout(5000) })
      if (!photoRes.ok) continue

      const photoData = await photoRes.json()
      const uri = (photoData?.photoUri as string) ?? null
      if (uri) return uri

    } catch {
      // try next query
    }
  }

  return null
}

// ── Wikipedia fallback ───────────────────────────────────────
async function fetchWikipediaImage(city: string, country: string): Promise<string | null> {
  for (const q of [`${city}, ${country}`, city]) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
        {
          headers: { 'User-Agent': 'MyHoliday/1.0 (Capstone)' },
          signal: AbortSignal.timeout(3000),
        }
      )
      if (!res.ok) continue
      const data = await res.json()
      const url: string | null = data?.originalimage?.source ?? data?.thumbnail?.source ?? null
      if (url) return url
    } catch {
      // try next
    }
  }
  return null
}

// ── Handler ──────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city    = searchParams.get('city')    ?? ''
  const country = searchParams.get('country') ?? ''

  if (!city) {
    return Response.json({ imageUrl: null, source: null }, { status: 400 })
  }

  // Try Google first, then Wikipedia
  let imageUrl = await fetchGooglePlacesImage(city, country)
  const source = imageUrl ? 'google' : null

  if (!imageUrl) {
    imageUrl = await fetchWikipediaImage(city, country)
  }

  return Response.json(
    { imageUrl, source: imageUrl ? (source ?? 'wikipedia') : null },
    {
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    }
  )
}
