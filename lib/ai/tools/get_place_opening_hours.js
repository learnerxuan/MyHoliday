import { fetchPlaceDetails, openingHoursSummary } from './place-utils'

export async function get_place_opening_hours({ place_id }) {
  if (!place_id) throw new Error('place_id is required')

  const details = await fetchPlaceDetails(place_id)
  const hours = openingHoursSummary(details.opening_hours)

  return {
    place_id,
    ...hours,
    source: 'google-places-details',
  }
}

