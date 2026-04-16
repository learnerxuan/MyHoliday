import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    const city = searchParams.get('city')
    const biasLat = searchParams.get('lat')
    const biasLng = searchParams.get('lng')

    if (!name || !city) {
      return NextResponse.json({ error: 'Missing name or city' }, { status: 400 })
    }

    const query = encodeURIComponent(`${name} ${city}`)
    let url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=geometry&key=${process.env.GOOGLE_PLACES_API_KEY}`
    
    if (biasLat && biasLng) {
      url += `&locationbias=circle:10000@${biasLat},${biasLng}`
    }

    const res = await fetch(url)
    const data = await res.json()

    if (data.status === 'OK' && data.candidates?.[0]?.geometry?.location) {
      return NextResponse.json({
        lat: data.candidates[0].geometry.location.lat,
        lng: data.candidates[0].geometry.location.lng,
      })
    }

    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  } catch (err) {
    console.error('Geocoding API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
