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
  const cityCountry = country ? `${city}, ${country}` : city
  const queries = [
    `${cityCountry} famous landmarks travel destination`,
    `${cityCountry} skyline tourist attractions`,
    cityCountry,
    city,
  ]

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
            'X-Goog-FieldMask': 'places.photos.name,places.photos.widthPx,places.photos.heightPx',
          },
          body: JSON.stringify({
            textQuery,
            maxResultCount: 5,
          }),
          signal: AbortSignal.timeout(5000),
        }
      )

      if (!searchRes.ok) continue

      const searchData = await searchRes.json()

      // Find first result that has photos
      type PlacePhoto = {
        name: string
        widthPx?: number
        heightPx?: number
      }

      const photos: PlacePhoto[] = searchData?.places
        ?.flatMap((p: { photos?: PlacePhoto[] }) => p.photos ?? [])
        ?.filter((ph: PlacePhoto) => ph?.name) ?? []

      const photoName = photos
        .sort((a, b) => {
          const aLandscape = (a.widthPx ?? 0) >= (a.heightPx ?? 0) ? 1 : 0
          const bLandscape = (b.widthPx ?? 0) >= (b.heightPx ?? 0) ? 1 : 0
          const aArea = (a.widthPx ?? 0) * (a.heightPx ?? 0)
          const bArea = (b.widthPx ?? 0) * (b.heightPx ?? 0)
          return bLandscape - aLandscape || bArea - aArea
        })
        ?.find((ph) => ph.name)
        ?.name

      if (!photoName) continue

      // Step 2: Fetch the photo URI
      const photoUrl =
        `https://places.googleapis.com/v1/${photoName}/media` +
        `?maxWidthPx=1000&maxHeightPx=650&key=${GOOGLE_PLACES_KEY}&skipHttpRedirect=true`

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

  let imageUrl = await fetchWikipediaImage(city, country)
  const source = imageUrl ? 'wikipedia' : null

  if (!imageUrl) {
    imageUrl = await fetchGooglePlacesImage(city, country)
  }

  return Response.json(
    { imageUrl, source: imageUrl ? (source ?? 'google') : null },
    {
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    }
  )
}
