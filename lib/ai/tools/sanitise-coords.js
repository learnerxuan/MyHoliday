// Shared coordinate sanitiser used by both the server (/api/chat) and the
// client (ItineraryPlanner). Keeping both sides on the exact same heuristic
// prevents rendered map markers from disagreeing with stored itinerary coords.

const MAX_DISTANCE_FROM_CITY_KM = 2000

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function sanitiseCoords(item, context = {}) {
  if (!item || typeof item !== 'object') return item
  let { lat, lng } = item
  if (lat == null || lng == null) return item

  lat = Number(lat)
  lng = Number(lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ...item, lat: null, lng: null }
  }

  if (lat === 0 && lng === 0) return { ...item, lat: null, lng: null }

  // C4: if we have a place_id, trust Google's returned geometry. Never swap.
  if (item.place_id) {
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return { ...item, lat: null, lng: null }
    }
    return { ...item, lat, lng }
  }

  // Out-of-range latitude triggers the classic lat/lng reversal fix.
  if (Math.abs(lat) > 90) [lat, lng] = [lng, lat]
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ...item, lat: null, lng: null }
  }

  // If destination centre is known, reject points impossibly far away — the AI
  // occasionally hallucinates coords that resolve to the wrong hemisphere even
  // when both values fall in the valid [0, 180] range.
  const { bias_lat, bias_lng } = context
  if (Number.isFinite(bias_lat) && Number.isFinite(bias_lng)) {
    const distanceKm = haversineKm(bias_lat, bias_lng, lat, lng)
    if (distanceKm > MAX_DISTANCE_FROM_CITY_KM) {
      // Try swapping once — sometimes the AI returns lng,lat without tripping
      // the |lat|>90 guard (e.g., both values in [0,180] in Asia/Oceania).
      const distanceSwapped = haversineKm(bias_lat, bias_lng, lng, lat)
      if (distanceSwapped < distanceKm && distanceSwapped <= MAX_DISTANCE_FROM_CITY_KM) {
        return { ...item, lat: lng, lng: lat }
      }
      return { ...item, lat: null, lng: null }
    }
  }

  return { ...item, lat, lng }
}
