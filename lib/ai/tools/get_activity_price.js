import { deriveActivityPrice, fetchPlaceDetails, normalisePlaceCategory } from './place-utils'

export async function get_activity_price({ place_id, name, city, type = 'attractions' }) {
  void city

  let details = null
  if (place_id) {
    try {
      details = await fetchPlaceDetails(place_id)
    } catch {
      details = null
    }
  }

  const pricing = deriveActivityPrice({
    priceLevel: details?.price_level ?? null,
    name: details?.name ?? name ?? '',
    types: details?.types ?? [],
    category: normalisePlaceCategory(type),
  })

  return {
    place_id: place_id ?? details?.place_id ?? null,
    price_text: pricing.price_text,
    price_min: null,
    price_max: null,
    currency: null,
    confidence: pricing.confidence,
    source: pricing.source,
  }
}

