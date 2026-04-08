
import { get_weather } from './get_weather'
import { estimate_budget } from './estimate_budget'
import { check_transport } from './check_transport'

// The modify_itinerary tool is handled inline in route.js (no external file needed)
async function modify_itinerary({ updates }) {
  // Returns a confirmation — the actual state update happens on the frontend
  const added = updates.filter(u => u.action === 'add').length
  const removed = updates.filter(u => u.action === 'remove').length
  const updated = updates.filter(u => u.action === 'update').length
  return { success: true, applied: updates.length, added, removed, updated }
}

// The generate_itinerary tool is also handled inline in route.js
async function generate_itinerary({ itinerary_days }) {
  const totalDays = itinerary_days.length
  const totalItems = itinerary_days.reduce((acc, day) => acc + day.items.length, 0)
  return { success: true, generated_days: totalDays, total_items: totalItems }
}

// ── OpenAI tool definitions ──────────────────────────────────

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
          month: { type: 'string', description: 'Month in lowercase e.g. january, march' },
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
          days: { type: 'number', description: 'Number of trip days' },
          guests: { type: 'number', description: 'Number of travellers' },
          budget_profile: { type: 'string', enum: ['budget', 'mid-range', 'luxury'], description: 'Overall trip budget profile used to tune meal and activity estimates' },
          meal_budget_per_day: { type: 'string', description: 'Meal budget per person per day e.g. "RM 80"' },
          activities_budget: { type: 'string', description: 'Total activities budget for the trip e.g. "RM 400"' },
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
          to_lat: { type: 'number', description: 'End latitude' },
          to_lng: { type: 'number', description: 'End longitude' },
          mode: { type: 'string', enum: ['walking', 'driving', 'transit'], description: 'Travel mode' },
        },
        required: ['from_lat', 'from_lng', 'to_lat', 'to_lng'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_itinerary',
      description: 'Generate the full multi-day trip itinerary. Call this ONLY when drafting the entire schedule from scratch.',
      parameters: {
        type: 'object',
        properties: {
          itinerary_days: {
            type: 'array',
            description: 'List of days in the itinerary',
            items: {
              type: 'object',
              properties: {
                day: { type: 'integer', description: 'Day number (1, 2, 3...)' },
                items: {
                  type: 'array',
                  description: 'List of places/activities for this day',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Place name or activity title' },
                      type: { type: 'string', enum: ['attraction', 'restaurant', 'transport', 'note'], description: 'Type of place' },
                      requires_ticket: { type: 'boolean', description: 'True if this attraction requires purchasing a ticket or paying an entry fee' },
                      time: { type: 'string', description: 'Time or period (e.g. \'10:00 AM - 12:00 PM\', \'Morning\', \'Afternoon\') (REQUIRED)' },
                      notes: { type: 'string', description: 'One sentence description' },
                      lat: { type: 'number', description: 'Latitude (omit if unknown)' },
                      lng: { type: 'number', description: 'Longitude (omit if unknown)' },
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
      description: 'Add, remove, or update individual items on the itinerary panel. Call this whenever the user wants to tweak the existing schedule.',
      parameters: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            description: 'List of itinerary changes to apply',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['add', 'remove', 'update'], description: 'What to do' },
                day: { type: 'integer', description: 'Day number (1, 2, 3...)' },
                name: { type: 'string', description: 'Place name. For remove/update, must match the exact name in the current itinerary.' },
                type: { type: 'string', enum: ['attraction', 'restaurant', 'transport', 'note'], description: 'Type of place (only for add/update)' },
                requires_ticket: { type: 'boolean', description: 'True if this attraction requires purchasing a ticket or paying an entry fee (only for add/update)' },
                time: { type: 'string', description: 'Time or period (only for add/update)' },
                notes: { type: 'string', description: 'One sentence description (only for add/update)' },
                lat: { type: 'number', description: 'Latitude (only for add/update, omit if unknown)' },
                lng: { type: 'number', description: 'Longitude (only for add/update, omit if unknown)' },
                status: { type: 'string', enum: ['suggested', 'confirmed'], description: 'Status (default: suggested)' },
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

// ── Status messages shown in chat during tool execution ──────

const TOOL_STATUS = {
  get_weather: (args) => `🌤 Checking weather in ${args.city} for ${args.month}...`,
  estimate_budget: () => `💰 Calculating trip budget...`,
  check_transport: (args) => `🚌 Checking ${args.mode || 'transport'} route...`,
  generate_itinerary: (args) => `✨ Generating full ${args.itinerary_days?.length || 'multi-day'} itinerary...`,
  modify_itinerary: (args) => `📋 Updating itinerary (${args.updates?.length ?? 0} change${args.updates?.length !== 1 ? 's' : ''})...`,
}

// ── Tool executor ────────────────────────────────────────────

const TOOL_FN = {
  get_weather,
  estimate_budget,
  check_transport,
  generate_itinerary,
  modify_itinerary,
}

export function getToolStatus(name, args) {
  return TOOL_STATUS[name]?.(args) ?? `⚙ Running ${name}...`
}

export async function executeTool(name, args) {
  const fn = TOOL_FN[name]
  if (!fn) throw new Error(`Unknown tool: ${name}`)
  return fn(args)
}
