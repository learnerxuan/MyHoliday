import { buildPlacePhotoUrl, fetchPlaceDetails } from './place-utils'

export async function get_place_photo({ place_id, photo_reference, fallback_query = null }) {
  let resolvedRef = photo_reference ?? null

  if (!resolvedRef && place_id) {
    try {
      const details = await fetchPlaceDetails(place_id)
      resolvedRef = details.photos?.[0]?.photo_reference ?? null
    } catch {
      resolvedRef = null
    }
  }

  return {
    image_url: buildPlacePhotoUrl(resolvedRef),
    source: resolvedRef ? 'google-places-photo' : null,
    attribution: null,
    is_fallback: !resolvedRef && Boolean(fallback_query),
    fallback_query,
  }
}

