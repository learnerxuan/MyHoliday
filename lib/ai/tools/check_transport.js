const MODE_PROFILE = {
  walking: 'foot',
  driving: 'driving',
  transit: 'driving',
}

function stripHtml(value = '') {
  return value.replace(/<[^>]+>/g, '').trim()
}

async function googleDirections({ from_lat, from_lng, to_lat, to_lng, mode }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
  url.searchParams.set('origin', `${from_lat},${from_lng}`)
  url.searchParams.set('destination', `${to_lat},${to_lng}`)
  url.searchParams.set('mode', mode === 'transit' ? 'transit' : mode)
  url.searchParams.set('units', 'metric')
  url.searchParams.set('language', 'en')
  url.searchParams.set('key', apiKey)

  if (mode === 'transit') {
    url.searchParams.set('departure_time', 'now')
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Google Directions error: ${res.status}`)
  }

  const data = await res.json()
  if (data.status !== 'OK' || !data.routes?.length) {
    return null
  }

  const leg = data.routes[0]?.legs?.[0]
  if (!leg) return null

  const distanceMeters = Number(leg.distance?.value ?? 0)
  const durationSeconds = Number(leg.duration?.value ?? 0)
  const steps = (leg.steps ?? [])
    .slice(0, 5)
    .map((step) => stripHtml(step.html_instructions || step.maneuver || ''))
    .filter(Boolean)

  return {
    distance_km: Math.round((distanceMeters / 1000) * 10) / 10,
    duration_min: Math.round(durationSeconds / 60),
    mode,
    steps,
    note: 'Route calculated with Google Maps directions.',
  }
}

async function osrmDirections({ from_lat, from_lng, to_lat, to_lng, mode }) {
  const profile = MODE_PROFILE[mode] ?? 'driving'
  const url = `https://router.project-osrm.org/route/v1/${profile}/${from_lng},${from_lat};${to_lng},${to_lat}?overview=false&steps=true`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`OSRM error: ${res.status}`)
  }

  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.length) {
    return null
  }

  const route = data.routes[0]
  const steps = (route.legs?.[0]?.steps ?? [])
    .slice(0, 5)
    .map((step) => step.maneuver?.instruction ?? step.name)
    .filter(Boolean)

  return {
    distance_km: Math.round((route.distance / 1000) * 10) / 10,
    duration_min: Math.round(route.duration / 60),
    mode,
    steps,
    note: mode === 'transit' ? 'Transit routing is approximate (driving route used as estimate).' : null,
  }
}

export async function check_transport({ from_lat, from_lng, to_lat, to_lng, mode = 'driving' }) {
  try {
    const googleResult = await googleDirections({ from_lat, from_lng, to_lat, to_lng, mode })
    if (googleResult) return googleResult
  } catch (error) {
    console.error('Google Directions fallback to OSRM:', error)
  }

  const fallback = await osrmDirections({ from_lat, from_lng, to_lat, to_lng, mode })
  if (fallback) return fallback

  return {
    distance_km: null,
    duration_min: null,
    mode,
    steps: [],
    note: 'Route not found.',
  }
}
