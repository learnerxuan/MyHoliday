import { check_transport } from './check_transport'
import { haversineDistanceMeters } from './place-utils'

function chooseMode(from, to, preferredMode = 'auto') {
  if (preferredMode && preferredMode !== 'auto') return preferredMode

  const distanceM = haversineDistanceMeters(from.lat, from.lng, to.lat, to.lng)
  if (distanceM != null && distanceM <= 1800) return 'walking'
  return 'driving'
}

export async function build_day_route({ items = [], preferred_mode = 'auto' }) {
  const routeItems = items.filter(item => item?.lat != null && item?.lng != null && item.type !== 'transport' && item.type !== 'note')
  if (routeItems.length < 2) {
    return {
      route_segments: [],
      total_distance_km: 0,
      total_duration_min: 0,
      warnings: [],
    }
  }

  const route_segments = []
  let totalDistanceKm = 0
  let totalDurationMin = 0

  for (let index = 1; index < routeItems.length; index += 1) {
    const from = routeItems[index - 1]
    const to = routeItems[index]
    const mode = chooseMode(from, to, preferred_mode)
    const segment = await check_transport({
      from_lat: from.lat,
      from_lng: from.lng,
      to_lat: to.lat,
      to_lng: to.lng,
      mode,
    })

    route_segments.push({
      from_name: from.name,
      to_name: to.name,
      distance_km: segment.distance_km,
      duration_min: segment.duration_min,
      mode: segment.mode,
      note: segment.note ?? null,
    })

    totalDistanceKm += Number(segment.distance_km ?? 0)
    totalDurationMin += Number(segment.duration_min ?? 0)
  }

  const warnings = []
  if (totalDurationMin >= 120) {
    warnings.push('This day has a heavy travel load between stops.')
  }
  if (route_segments.some(segment => Number(segment.distance_km ?? 0) >= 20)) {
    warnings.push('One or more jumps between activities are very long.')
  }

  return {
    route_segments,
    total_distance_km: Math.round(totalDistanceKm * 10) / 10,
    total_duration_min: Math.round(totalDurationMin),
    warnings,
  }
}
