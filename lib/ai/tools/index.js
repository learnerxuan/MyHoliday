import { search_hotels }      from './search_hotels'
import { search_restaurants } from './search_restaurants'
import { search_attractions } from './search_attractions'
import { get_weather }        from './get_weather'
import { estimate_budget }    from './estimate_budget'
import { check_transport }    from './check_transport'

// ── OpenAI tool definitions ──────────────────────────────────

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'search_hotels',
      description: 'Search for hotels near a destination using Google Places. Call this when the user needs hotel options.',
      parameters: {
        type: 'object',
        properties: {
          city:        { type: 'string',  description: 'City name' },
          lat:         { type: 'number',  description: 'Latitude of the city centre' },
          lng:         { type: 'number',  description: 'Longitude of the city centre' },
          budget_tier: { type: 'string',  enum: ['budget', 'mid-range', 'luxury'], description: 'Hotel budget tier' },
        },
        required: ['city', 'lat', 'lng'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_restaurants',
      description: 'Search for restaurants near a location using Google Places. Call this when the user needs food options. Always pass dietary if known.',
      parameters: {
        type: 'object',
        properties: {
          city:        { type: 'string',  description: 'City name' },
          lat:         { type: 'number',  description: 'Latitude' },
          lng:         { type: 'number',  description: 'Longitude' },
          cuisine:     { type: 'string',  description: 'Cuisine type (e.g. japanese, italian)' },
          price_range: { type: 'number',  description: 'Google price level 1-4' },
          budget_profile: { type: 'string', enum: ['budget', 'mid-range', 'luxury'], description: 'Overall trip budget profile if no explicit price range is set' },
          dietary:     { type: 'string',  description: 'Dietary filter (e.g. halal, vegetarian, vegan)' },
        },
        required: ['city', 'lat', 'lng'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_attractions',
      description: 'Search for tourist attractions near a location using Google Places.',
      parameters: {
        type: 'object',
        properties: {
          city:     { type: 'string', description: 'City name' },
          lat:      { type: 'number', description: 'Latitude' },
          lng:      { type: 'number', description: 'Longitude' },
          category: { type: 'string', description: 'Category: museum, temple, nature, shopping, landmark, park, art, food' },
        },
        required: ['city', 'lat', 'lng'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get weather information for a city in a specific month.',
      parameters: {
        type: 'object',
        properties: {
          city:           { type: 'string', description: 'City name' },
          month:          { type: 'string', description: 'Month in lowercase e.g. january, march' },
          destination_id: { type: 'string', description: 'UUID of the destination from Supabase (pass if available)' },
        },
        required: ['city', 'month'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimate_budget',
      description: 'Calculate a total trip budget estimate. Call this when the user asks about costs or after confirming a hotel.',
      parameters: {
        type: 'object',
        properties: {
          hotel_price_per_night: { type: 'string', description: 'Hotel price e.g. "RM 220/night" or a number' },
          days:                  { type: 'number', description: 'Number of trip days' },
          guests:                { type: 'number', description: 'Number of travellers' },
          budget_profile:        { type: 'string', enum: ['budget', 'mid-range', 'luxury'], description: 'Overall trip budget profile used to tune meal and activity estimates' },
          meal_budget_per_day:   { type: 'string', description: 'Meal budget per person per day e.g. "RM 80"' },
          activities_budget:     { type: 'string', description: 'Total activities budget for the trip e.g. "RM 400"' },
        },
        required: ['hotel_price_per_night', 'days'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_transport',
      description: 'Get travel distance and duration between two locations using OSRM routing.',
      parameters: {
        type: 'object',
        properties: {
          from_lat: { type: 'number', description: 'Start latitude' },
          from_lng: { type: 'number', description: 'Start longitude' },
          to_lat:   { type: 'number', description: 'End latitude' },
          to_lng:   { type: 'number', description: 'End longitude' },
          mode:     { type: 'string', enum: ['walking', 'driving', 'transit'], description: 'Travel mode' },
        },
        required: ['from_lat', 'from_lng', 'to_lat', 'to_lng'],
      },
    },
  },
]

// ── Status messages shown in chat during tool execution ──────

const TOOL_STATUS = {
  search_hotels:      (args) => `🔍 Searching for hotels in ${args.city}...`,
  search_restaurants: (args) => `🍽 Finding ${args.dietary ? args.dietary + ' ' : ''}restaurants in ${args.city}...`,
  search_attractions: (args) => `🎯 Looking up ${args.category || 'attractions'} in ${args.city}...`,
  get_weather:        (args) => `🌤 Checking weather in ${args.city} for ${args.month}...`,
  estimate_budget:    ()     => `💰 Calculating trip budget...`,
  check_transport:    (args) => `🚌 Checking ${args.mode || 'transport'} route...`,
}

// ── Tool executor ────────────────────────────────────────────

const TOOL_FN = {
  search_hotels,
  search_restaurants,
  search_attractions,
  get_weather,
  estimate_budget,
  check_transport,
}

export function getToolStatus(name, args) {
  return TOOL_STATUS[name]?.(args) ?? `⚙ Running ${name}...`
}

export async function executeTool(name, args) {
  const fn = TOOL_FN[name]
  if (!fn) throw new Error(`Unknown tool: ${name}`)
  return fn(args)
}
