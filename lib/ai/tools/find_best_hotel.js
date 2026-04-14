import { search_nearby_places } from './search_nearby_places'

function hotelScore(result) {
  const ratingScore = Number(result.rating ?? 0) * 30
  const reviewScore = Math.min(Math.log10((result.review_count ?? 0) + 1) * 18, 32)
  const distancePenalty = Math.min((Number(result.distance_m ?? 0) / 1000) * 8, 18)
  const priceBonus = result.price_level == null
    ? 0
    : result.price_level <= 2
      ? 8
      : result.price_level === 3
        ? 4
        : 0

  return ratingScore + reviewScore + priceBonus - distancePenalty
}

export async function find_best_hotel({
  lat,
  lng,
  radius_m,
  keyword,
  limit = 8,
}) {
  const result = await search_nearby_places({
    category: 'properties',
    lat,
    lng,
    radius_m,
    keyword,
    limit,
  })

  const ranked = [...(result.results ?? [])]
    .map((hotel) => ({
      ...hotel,
      score: Math.round(hotelScore(hotel) * 10) / 10,
    }))
    .sort((a, b) => b.score - a.score)

  return {
    anchor: result.anchor,
    best_hotel: ranked[0] ?? null,
    candidates: ranked,
  }
}
