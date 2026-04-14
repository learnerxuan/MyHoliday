// Proxy route for Google Places photos
// Keeps GOOGLE_PLACES_API_KEY server-side — never exposed to the browser
// Usage: /api/places-photo?ref=PHOTO_REFERENCE

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const ref = searchParams.get('ref')
  const maxWidth = searchParams.get('maxwidth') || '400'

  if (!ref) {
    return new Response('Missing ref', { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${encodeURIComponent(maxWidth)}&photo_reference=${ref}&key=${apiKey}`

  const res = await fetch(url)

  if (!res.ok) {
    return new Response('Photo not found', { status: 404 })
  }

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const buffer = await res.arrayBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400', // cache for 24h
    },
  })
}
