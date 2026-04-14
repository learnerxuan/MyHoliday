import { get_weather } from './get_weather'
import { estimate_budget } from './estimate_budget'
import { check_transport } from './check_transport'
import { search_nearby_places } from './search_nearby_places'
import { find_best_hotel } from './find_best_hotel'
import { get_place_details } from './get_place_details'
import { get_place_opening_hours } from './get_place_opening_hours'
import { get_activity_price } from './get_activity_price'

// The modify_itinerary tool is handled inline in route.js.
async function modify_itinerary({ updates }) {
  const added = updates.filter((update) => update.action === 'add').length
  const removed = updates.filter((update) => update.action === 'remove').length
  const updated = updates.filter((update) => update.action === 'update').length
  return { success: true, applied: updates.length, added, removed, updated }
}

// The generate_itinerary tool is also handled inline in route.js.
async function generate_itinerary({ itinerary_days }) {
  const totalDays = itinerary_days.length
  const totalItems = itinerary_days.reduce((acc, day) => acc + day.items.length, 0)
  return { success: true, generated_days: totalDays, total_items: totalItems }
}

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get weather information for a city in a specific month.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name' },
          month: { type: 'string', description: 'Month in lowercase, for example january or march.' },
          destination_id: { type: 'string', description: 'UUID of the destination from Supabase if available.' },
        },
        required: ['city', 'month'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimate_budget',
      description: 'Calculate a total trip budget estimate.',
      parameters: {
        type: 'object',
        properties: {
          hotel_price_per_night: { type: 'string', description: 'Hotel price such as RM 220/night or a number.' },
          days: { type: 'number', description: 'Number of trip days.' },
          guests: { type: 'number', description: 'Number of travellers.' },
          budget_profile: {
            type: 'string',
            enum: ['budget', 'mid-range', 'luxury'],
            description: 'Overall trip budget profile used to tune meal and activity estimates.',
          },
          meal_budget_per_day: { type: 'string', description: 'Meal budget per person per day such as RM 80.' },
          activities_budget: { type: 'string', description: 'Total activities budget for the trip.' },
        },
        required: ['hotel_price_per_night', 'days'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_nearby_places',
      description: 'Find nearby attractions, food, properties, shopping, or airports around a location.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['attractions', 'food', 'properties', 'shopping'],
            description: 'Nearby category to search for.',
          },
          lat: { type: 'number', description: 'Anchor latitude for the nearby search.' },
          lng: { type: 'number', description: 'Anchor longitude for the nearby search.' },
          radius_m: { type: 'number', description: 'Optional search radius in meters.' },
          keyword: { type: 'string', description: 'Optional keyword filter such as halal, museum, temple, or mall.' },
          open_now: { type: 'boolean', description: 'Whether to prefer places that are open now.' },
          price_level: { type: 'number', description: 'Optional max price level for food searches.' },
          limit: { type: 'number', description: 'Optional max number of results.' },
        },
        required: ['category', 'lat', 'lng'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_best_hotel',
      description: 'Rank nearby hotels and return the strongest stay option for an area.',
      parameters: {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Anchor latitude for the hotel search.' },
          lng: { type: 'number', description: 'Anchor longitude for the hotel search.' },
          radius_m: { type: 'number', description: 'Optional search radius in meters.' },
          keyword: { type: 'string', description: 'Optional hotel keyword such as boutique, family, luxury, or budget.' },
          limit: { type: 'number', description: 'Optional max number of hotel candidates.' },
        },
        required: ['lat', 'lng'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_place_details',
      description: 'Fetch richer details for a specific place, including summary, hours, rating, and photo.',
      parameters: {
        type: 'object',
        properties: {
          place_id: { type: 'string', description: 'Stable place identifier from a nearby search.' },
          category: { type: 'string', description: 'Optional category context such as attractions, food, or properties.' },
        },
        required: ['place_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_place_opening_hours',
      description: 'Get normalized opening-hour information for a place.',
      parameters: {
        type: 'object',
        properties: {
          place_id: { type: 'string', description: 'Stable place identifier.' },
        },
        required: ['place_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_activity_price',
      description: 'Get a verified or heuristic price summary for an activity, restaurant, or stay.',
      parameters: {
        type: 'object',
        properties: {
          place_id: { type: 'string', description: 'Stable place identifier when available.' },
          name: { type: 'string', description: 'Place or activity name.' },
          city: { type: 'string', description: 'City context for the place.' },
          type: { type: 'string', description: 'Category context such as attractions, food, or properties.' },
        },
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
          from_lat: { type: 'number', description: 'Start latitude.' },
          from_lng: { type: 'number', description: 'Start longitude.' },
          to_lat: { type: 'number', description: 'End latitude.' },
          to_lng: { type: 'number', description: 'End longitude.' },
          mode: { type: 'string', enum: ['walking', 'driving', 'transit'], description: 'Travel mode.' },
        },
        required: ['from_lat', 'from_lng', 'to_lat', 'to_lng'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_itinerary',
      description: 'Generate the full multi-day trip itinerary from scratch.',
      parameters: {
        type: 'object',
        properties: {
          itinerary_days: {
            type: 'array',
            description: 'List of itinerary days.',
            items: {
              type: 'object',
              properties: {
                day: { type: 'integer', description: 'Day number.' },
                items: {
                  type: 'array',
                  description: 'Activities for the day.',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Specific named venue or activity. Avoid generic placeholders such as local restaurant or nearby cafe.' },
                      type: {
                        type: 'string',
                        enum: ['attraction', 'restaurant', 'food_recommendation', 'transport', 'note', 'hotel'],
                        description: 'Activity type. Use restaurant and hotel only for exact named places.',
                      },
                      requires_ticket: { type: 'boolean', description: 'True if the item likely requires payment or a ticket.' },
                      price_estimate: { type: 'string', description: 'Estimated cost text.' },
                      time: { type: 'string', description: 'Specific start time such as 8:30 AM whenever possible.' },
                      notes: { type: 'string', description: 'Short explanation for why this exact place fits the plan.' },
                      lat: { type: 'number', description: 'Latitude if known.' },
                      lng: { type: 'number', description: 'Longitude if known.' },
                    },
                    required: ['name', 'type', 'time'],
                  },
                },
              },
              required: ['day', 'items'],
            },
          },
        },
        required: ['itinerary_days'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'modify_itinerary',
      description: 'Add, remove, or update individual itinerary items.',
      parameters: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            description: 'List of itinerary changes to apply.',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['add', 'remove', 'update'], description: 'What to do.' },
                day: { type: 'integer', description: 'Day number.' },
                name: { type: 'string', description: 'Current exact place name used to locate the item.' },
                type: {
                  type: 'string',
                  enum: ['attraction', 'restaurant', 'food_recommendation', 'transport', 'note', 'hotel'],
                  description: 'Type of place for add/update. Use restaurant and hotel only for exact named places.',
                },
                requires_ticket: { type: 'boolean', description: 'Whether the item likely requires payment.' },
                price_estimate: { type: 'string', description: 'Estimated cost text.' },
                time: { type: 'string', description: 'Specific start time such as 8:30 AM whenever possible.' },
                notes: { type: 'string', description: 'Short explanation for why this exact place fits the plan.' },
                new_name: { type: 'string', description: 'New exact place name when renaming an existing item.' },
                lat: { type: 'number', description: 'Latitude for add/update.' },
                lng: { type: 'number', description: 'Longitude for add/update.' },
                status: { type: 'string', enum: ['suggested', 'confirmed'], description: 'UI status.' },
              },
              required: ['action', 'day', 'name'],
            },
          },
        },
        required: ['updates'],
      },
    },
  },
]

const TOOL_STATUS = {
  get_weather: (args) => `Checking weather in ${args.city} for ${args.month}...`,
  estimate_budget: () => 'Calculating trip budget...',
  search_nearby_places: (args) => `Finding nearby ${args.category ?? 'places'}...`,
  find_best_hotel: () => 'Ranking nearby hotels...',
  get_place_details: () => 'Loading place details...',
  get_place_opening_hours: () => 'Checking opening hours...',
  get_activity_price: () => 'Looking up price info...',
  check_transport: (args) => `Checking ${args.mode || 'transport'} route...`,
  generate_itinerary: (args) => `Generating full ${args.itinerary_days?.length || 'multi-day'} itinerary...`,
  modify_itinerary: (args) => `Updating itinerary (${args.updates?.length ?? 0} change${args.updates?.length !== 1 ? 's' : ''})...`,
}

const TOOL_FN = {
  get_weather,
  estimate_budget,
  search_nearby_places,
  find_best_hotel,
  get_place_details,
  get_place_opening_hours,
  get_activity_price,
  check_transport,
  generate_itinerary,
  modify_itinerary,
}

export function getToolStatus(name, args) {
  return TOOL_STATUS[name]?.(args) ?? `Running ${name}...`
}

export async function executeTool(name, args) {
  const fn = TOOL_FN[name]
  if (!fn) throw new Error(`Unknown tool: ${name}`)
  return fn(args)
}
