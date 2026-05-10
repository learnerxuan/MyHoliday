UPDATE public.historical_trips
SET traveler_nationality = CASE traveler_nationality
  WHEN 'American' THEN 'United States'
  WHEN 'USA' THEN 'United States'
  WHEN 'Australian' THEN 'Australia'
  WHEN 'Brazilian' THEN 'Brazil'
  WHEN 'British' THEN 'United Kingdom'
  WHEN 'UK' THEN 'United Kingdom'
  WHEN 'Cambodia' THEN 'Cambodia'
  WHEN 'Canadian' THEN 'Canada'
  WHEN 'Chinese' THEN 'China'
  WHEN 'Dutch' THEN 'Netherlands'
  WHEN 'Emirati' THEN 'United Arab Emirates'
  WHEN 'French' THEN 'France'
  WHEN 'German' THEN 'Germany'
  WHEN 'Greece' THEN 'Greece'
  WHEN 'Hong Kong' THEN 'Hong Kong'
  WHEN 'Indian' THEN 'India'
  WHEN 'Indonesian' THEN 'Indonesia'
  WHEN 'Italian' THEN 'Italy'
  WHEN 'Japanese' THEN 'Japan'
  WHEN 'Korean' THEN 'South Korea'
  WHEN 'Mexican' THEN 'Mexico'
  WHEN 'Moroccan' THEN 'Morocco'
  WHEN 'New Zealander' THEN 'New Zealand'
  WHEN 'Scottish' THEN 'United Kingdom'
  WHEN 'South African' THEN 'South Africa'
  WHEN 'South Korean' THEN 'South Korea'
  WHEN 'Spanish' THEN 'Spain'
  WHEN 'Taiwanese' THEN 'Taiwan'
  WHEN 'Vietnamese' THEN 'Vietnam'
  ELSE traveler_nationality
END
WHERE traveler_nationality IS NOT NULL;

UPDATE public.traveller_profiles
SET nationality = CASE nationality
  WHEN 'Malaysian' THEN 'Malaysia'
  WHEN 'Japanese' THEN 'Japan'
  WHEN 'American' THEN 'United States'
  WHEN 'Korean' THEN 'South Korea'
  ELSE nationality
END
WHERE nationality IS NOT NULL;

UPDATE public.historical_trips
SET transportation_type = CASE transportation_type
  WHEN 'Plane' THEN 'Flight'
  WHEN 'Airplane' THEN 'Flight'
  ELSE transportation_type
END
WHERE transportation_type IS NOT NULL;
