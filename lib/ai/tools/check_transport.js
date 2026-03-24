// OSRM public routing API — completely free, no API key needed
// Docs: http://project-osrm.org/docs/v5.5.1/api/

const MODE_PROFILE = {
  walking: 'foot',
  driving: 'driving',
  transit: 'driving', // OSRM doesn't support transit — fall back to driving
}

export async function check_transport({ from_lat, from_lng, to_lat, to_lng, mode = 'driving' }) {
  const profile = MODE_PROFILE[mode] ?? 'driving'

  const url = `https://router.project-osrm.org/route/v1/${profile}/${from_lng},${from_lat};${to_lng},${to_lat}?overview=false&steps=true`

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`OSRM error: ${res.status}`)
  }

  const data = await res.json()

  if (data.code !== 'Ok' || !data.routes?.length) {
    return {
      distance_km: null,
      duration_min: null,
      mode,
      steps: [],
      note: 'Route not found.',
    }
  }

  const route = data.routes[0]
  const distanceKm = Math.round((route.distance / 1000) * 10) / 10
  const durationMin = Math.round(route.duration / 60)

  // Extract simplified step instructions
  const steps = (route.legs?.[0]?.steps ?? [])
    .slice(0, 5)
    .map(step => step.maneuver?.instruction ?? step.name)
    .filter(Boolean)

  return {
    distance_km: distanceKm,
    duration_min: durationMin,
    mode,
    steps,
    note: mode === 'transit' ? 'Transit routing is approximate (driving route used as estimate).' : null,
  }
}
