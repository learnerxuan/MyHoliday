import {
  buildPlaceSummary,
  buildPlacePhotoUrl,
  classifyPlaceTypeFromGoogle,
  deriveActivityPrice,
  fetchPlaceDetails,
  normalisePlaceCategory,
  openingHoursSummary,
} from './place-utils'

export async function get_place_details({ place_id, category = 'attractions' }) {
  if (!place_id) throw new Error('place_id is required')

  const normalizedCategory = normalisePlaceCategory(category)
  const details = await fetchPlaceDetails(place_id)
  const hours = openingHoursSummary(details.opening_hours)
  const pricing = deriveActivityPrice({
    priceLevel: details.price_level ?? null,
    name: details.name,
    types: details.types ?? [],
    category: normalizedCategory,
  })

  return {
    place_id: details.place_id,
    name: details.name,
    description: buildPlaceSummary(details, normalizedCategory),
    editorial_summary: details.editorial_summary?.overview ?? null,
    address: details.formatted_address ?? null,
    lat: details.geometry?.location?.lat ?? null,
    lng: details.geometry?.location?.lng ?? null,
    rating: details.rating ?? null,
    review_count: details.user_ratings_total ?? null,
    price_level: details.price_level ?? null,
    price_estimate: pricing.price_text,
    price_confidence: pricing.confidence,
    opening_hours: hours,
    image_url: buildPlacePhotoUrl(details.photos?.[0]?.photo_reference ?? null),
    website: details.website ?? null,
    google_map_url: details.url ?? null,
    phone: details.formatted_phone_number ?? null,
    business_status: details.business_status ?? null,
    types: details.types ?? [],
    inferred_type: classifyPlaceTypeFromGoogle(details.types ?? [], normalizedCategory === 'food' ? 'restaurant' : normalizedCategory === 'properties' ? 'hotel' : 'attraction'),
    source: 'google-places-details',
  }
}
