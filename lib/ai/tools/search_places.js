export async function search_places({ query, lat, lng }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', query);
  
  // Bias the results to the city's location if provided
  if (lat && lng) {
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', 15000); // 15km bias
  }
  
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${data.status}`);
  }

  const places = (data.results ?? []).slice(0, 8);

  return Promise.all(
    places.map(async (place) => {
      let opening_hours = null;
      try {
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        detailsUrl.searchParams.set('place_id', place.place_id);
        detailsUrl.searchParams.set('fields', 'opening_hours');
        detailsUrl.searchParams.set('key', apiKey);
        
        const detailsRes = await fetch(detailsUrl.toString());
        const detailsData = await detailsRes.json();
        opening_hours = detailsData.result?.opening_hours?.weekday_text || null;
      } catch (err) {
        console.error('Failed to fetch place details for opening hours:', err);
      }

      return {
        name: place.name,
        rating: place.rating ?? null,
        address: place.formatted_address ?? place.vicinity ?? null,
        price_level: place.price_level ?? null, // 0 = Free, 1 = Inexpensive, 2 = Moderate, 3 = Expensive, 4 = Very Expensive
        google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        types: place.types || [],
        opening_hours,
      };
    })
  );
}
