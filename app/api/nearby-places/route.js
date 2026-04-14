import { NextResponse } from 'next/server'
import { search_nearby_places } from '@/lib/ai/tools/search_nearby_places'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'attractions'
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    const radiusM = searchParams.get('radius_m')
    const keyword = searchParams.get('keyword') || undefined
    const openNow = searchParams.get('open_now') === 'true'
    const priceLevel = searchParams.get('price_level')
    const limit = searchParams.get('limit')

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: 'Valid lat and lng are required' }, { status: 400 })
    }

    const result = await search_nearby_places({
      category,
      lat,
      lng,
      radius_m: radiusM ? Number(radiusM) : undefined,
      keyword,
      open_now: openNow,
      price_level: priceLevel ? Number(priceLevel) : undefined,
      limit: limit ? Number(limit) : undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Nearby places API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search nearby places' },
      { status: 500 }
    )
  }
}
