import OpenAI from 'openai'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { buildSystemPrompt, buildItineraryContext } from '@/lib/ai/system-prompt'
import { TOOL_DEFINITIONS, getToolStatus, executeTool } from '@/lib/ai/tools/index'
import { checkGuardrails } from '@/lib/ai/guardrails'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini'

const encoder = new TextEncoder()

function send(controller, obj) {
  controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function deepMergePlannerState(base, patch) {
  if (!isPlainObject(base)) return isPlainObject(patch) ? patch : {}
  if (!isPlainObject(patch)) return base

  const merged = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      merged[key] = deepMergePlannerState(base[key], value)
    } else {
      merged[key] = value
    }
  }
  return merged
}

const PHASE_COERCE = {
  intake: 'setup',
  anchor_selection: 'planning',
  drafting: 'planning',
  day_planning: 'planning',
  review: 'planning',
  complete: 'planning',
}

function normalisePlannerState(rawState, profile) {
  const merged = deepMergePlannerState({
    mode: null,
    phase: 'setup',
    trip_days: null,
    pace: null,
    budget_profile: 'unknown',
    day1_start_time: null,
    arrival_time_hint: null,
    hotel_status: 'unknown',
    selected_hotel_name: null,
    draft_generated: false,
    current_day: 1,
    current_cluster: 'none',
    // ── Quiz context fields ────────────────────────────────────
    travel_date_start: null,
    travel_date_end: null,
    group_size: null,
    preferred_styles: [],
    // ─────────────────────────────────────────────────────────
    needs: {
      must_do: [],
      must_avoid: [],
      dietary: profile?.dietary_restrictions || 'none',
      accessibility: profile?.accessibility_needs ? 'yes' : 'none',
    },
  }, rawState)

  // Coerce stale phase values from old sessions; 'setup' and 'planning' pass through as-is
  merged.phase = PHASE_COERCE[merged.phase] ?? merged.phase
  return merged
}

function extractPlannerStatePatch(value) {
  return isPlainObject(value) ? value : {}
}

function extractQuickReplies(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => isPlainObject(item) && typeof item.label === 'string' && typeof item.value === 'string')
    .map((item) => ({ label: item.label, value: item.value }))
}

function quickReply(label, value = label) {
  return { label, value }
}

function toTitleCase(value) {
  if (!value) return ''
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normaliseOption(opt) {
  // Resolve price first so the notes fallback can reference it
  const resolvedPrice = opt.price ?? opt.price_estimate ?? 'Price not available'
  return {
    ...opt,
    type: opt.type ?? 'attraction',
    price: resolvedPrice,
    notes: opt.notes ?? ([resolvedPrice, opt.rating ? `${opt.rating}/5` : null].filter(Boolean).join(' · ') || ''),
  }
}

function formatTimeLabel(time24) {
  if (!time24) return null
  const [hourText, minute] = time24.split(':')
  let hour = Number(hourText)
  const period = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${minute} ${period}`
}

function buildInitMessage(destination, profile, known = null) {
  const city = destination.city
  const lines = [`${city} is a great pick for a well-planned getaway.`]
  if (!known?.knownDays) {
    lines.push('', 'How many days is the trip?')
  }
  return lines.join('\n')
}

async function geocodeItem(item, city, biasLat = null, biasLng = null) {
  // Only attempt geocode if it doesn't have coordinates already
  if (item.lat && item.lng) return

  // Safety Catch: If the AI mis-tagged a generic item, or the name is vague, skip pinning and coerce to generic types.
  const nameLower = item.name?.toLowerCase() || ''
  const genericKeywords = ['local', 'authentic', 'nearby', 'suggested', 'recommendation', 'lunch at a', 'dinner at a', 'breakfast at a', 'brunch at a']
  const logisticKeywords = ['arrival', 'departure', 'check-in', 'check-out']

  const isGeneric = genericKeywords.some(kw => nameLower.includes(kw))
  const isLogistics = logisticKeywords.some(kw => nameLower.includes(kw))

  if (isGeneric || isLogistics) {
    if (isLogistics) {
      item.type = 'note'
    } else {
      if (item.type === 'restaurant') item.type = 'food_recommendation'
      if (item.type === 'attraction') item.type = 'note'
      return
    }
  }

  // If we reach here, it's a specific name. Attempt geocoding.
  const query = encodeURIComponent(`${item.name} ${city || ''}`)
  let url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=geometry&key=${process.env.GOOGLE_PLACES_API_KEY}`
  
  // Add location bias if coordinates are available to prevent global/IP-based skew (the "Malaysia" fix)
  if (biasLat && biasLng) {
    url += `&locationbias=point:${biasLat},${biasLng}`
  }

  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.status === 'OK' && data.candidates?.[0]?.geometry?.location) {
      item.lat = data.candidates[0].geometry.location.lat
      item.lng = data.candidates[0].geometry.location.lng

      // Upgrade the type if we found a real location. 
      // If the AI forgot to send 'type', or sent a generic one, promote it.
      if (!item.type || item.type === 'food_recommendation') {
        item.type = 'restaurant'
      } else if (item.type === 'note') {
        item.type = 'attraction'
      }
    }
  } catch (err) {
    console.error('Geocoding error for', item.name, err)
  }
}

// Robust JSON extractor: handles markdown code fences and doubled-JSON output
function extractJSON(raw) {
  if (!raw) return null
  // Strip markdown code fences (AI sometimes wraps JSON in ```json ... ```)
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  // Fast path: try the whole string
  try { return JSON.parse(stripped) } catch { /* continue */ }
  // Slow path: find and parse just the first complete JSON object
  // (handles cases where the AI outputs two JSON blobs back-to-back)
  const start = stripped.indexOf('{')
  if (start === -1) return null
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < stripped.length; i++) {
    const c = stripped[i]
    if (esc) { esc = false; continue }
    if (c === '\\' && inStr) { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === '{') depth++
    if (c === '}') {
      depth--
      if (depth === 0) {
        try { return JSON.parse(stripped.slice(start, i + 1)) } catch { return null }
      }
    }
  }
  return null
}

export async function POST(request) {
  let { message, sessionId, destinationId, userId, itinerary, quizContext } = await request.json()

  if (!message || !destinationId || !userId) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const isInit = message === '__INIT__'
  const guard = isInit ? { blocked: false } : checkGuardrails(message)
  if (guard.blocked) {
    const body = JSON.stringify({
      type: 'result',
      data: {
        message: guard.reply,
        itinerary_updates: [],
        options: [],
        planner_state_patch: {},
        quick_replies: [],
      },
    }) + '\n'

    return new Response(body, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
      },
    })
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY is not set' }, { status: 500 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = await createSupabaseServerClient()

        const { data: destination, error: destError } = await supabase
          .from('destinations')
          .select('*')
          .eq('id', destinationId)
          .single()

        if (destError || !destination) {
          send(controller, { type: 'error', message: 'Destination not found' })
          controller.close()
          return
        }

        const { data: profile } = await supabase
          .from('traveller_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

        let currentSessionId = sessionId
        let currentPlannerState = null

        if (!currentSessionId) {
          // [Singleton Enforcement] Check for existing active session first
          const { data: existing } = await supabase
            .from('chat_sessions')
            .select('id, planner_state')
            .eq('user_id', userId)
            .eq('destination_id', destinationId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (existing) {
            currentSessionId = existing.id
            currentPlannerState = normalisePlannerState(existing.planner_state, profile)
          } else {
            const { data: newSession, error: sessionError } = await supabase
              .from('chat_sessions')
              .insert({
                user_id: userId,
                destination_id: destinationId,
                status: 'active',
                planner_state: {},
              })
              .select('id, planner_state')
              .single()

            if (sessionError) {
              send(controller, { type: 'error', message: 'Failed to create session' })
              controller.close()
              return
            }

            currentSessionId = newSession.id
            currentPlannerState = normalisePlannerState(newSession.planner_state, profile)
          }

          // Pre-fill plannerState from quiz answers before sending the session ID.
          // deepMergePlannerState is sufficient — currentPlannerState is already fully normalised.
          if (quizContext) {
            const normalisedBudget = quizContext.budget
              ? quizContext.budget.toLowerCase()   // "Mid-range" → "mid-range"
              : null
            currentPlannerState = deepMergePlannerState(currentPlannerState, {
              trip_days: quizContext.trip_days ?? null,
              budget_profile: normalisedBudget ?? currentPlannerState.budget_profile,
              pace: quizContext.pace ?? null,
              travel_date_start: quizContext.travel_date_start ?? null,
              travel_date_end: quizContext.travel_date_end ?? null,
              group_size: quizContext.group_size ?? null,
              preferred_styles: quizContext.preferred_styles ?? [],
            })
          }

          send(controller, { type: 'session', sessionId: currentSessionId })
        } else {
          const { data: sessionRow } = await supabase
            .from('chat_sessions')
            .select('planner_state')
            .eq('id', currentSessionId)
            .single()

          currentPlannerState = normalisePlannerState(sessionRow?.planner_state, profile)
        }

        const { data: history } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('session_id', currentSessionId)
          .order('created_at', { ascending: true })

        const dbHistory = (history ?? []).map((item) => ({
          role: item.role,
          content: item.content,
        }))

        if (isInit) {
          // Determine which values are already known from the quiz
          const knownDays = currentPlannerState.trip_days ?? null
          const knownBudget = currentPlannerState.budget_profile !== 'unknown'
            ? currentPlannerState.budget_profile
            : null

          // known is non-null only when both values came from quiz context
          const known = (knownDays && knownBudget)
            ? { knownDays, knownBudget: knownBudget.charAt(0).toUpperCase() + knownBudget.slice(1) }
            : null

          if (!known) {
            // No quiz data — return static greeting asking for days
            const initResponse = {
              message: buildInitMessage(destination, profile, null),
              itinerary_updates: [],
              options: [],
              planner_state_patch: { phase: 'setup' },
              quick_replies: [],
            }

            const nextPlannerState = normalisePlannerState(
              deepMergePlannerState(currentPlannerState, initResponse.planner_state_patch),
              profile
            )

            await supabase
              .from('chat_sessions')
              .update({ planner_state: nextPlannerState })
              .eq('id', currentSessionId)

            await supabase.from('chat_messages').insert([
              { session_id: currentSessionId, role: 'assistant', content: initResponse.message },
            ])

            send(controller, {
              type: 'result',
              sessionId: currentSessionId,
              data: initResponse,
            })
            return
          } else {
            // Quiz data exists — FAST TRACK: proceed to LLM loop with hidden instruction
            message = `Initialize: Start by greeting me with: "${destination.city} is a great pick for a well-planned getaway." and then immediately call your generate_itinerary tool to start the plan for ${known.knownDays} days at a ${known.knownBudget} budget. Once the itinerary is generated, provide a brief, friendly summary of what you've planned in your final response.`
            currentPlannerState.phase = 'planning'
            currentPlannerState.mode = 'quick_draft'
          }
        }

        const systemPrompt = buildSystemPrompt(destination, profile, currentPlannerState)
        const itineraryContext = buildItineraryContext(itinerary)
        const fullSystemPrompt = itineraryContext
          ? `${systemPrompt}\n${itineraryContext}`
          : systemPrompt

        const messages = [
          { role: 'system', content: fullSystemPrompt },
          ...dbHistory,
          { role: 'user', content: message },
        ]

        let finalContent = null
        let loopMessages = [...messages]
        const MAX_TOOL_ROUNDS = 5
        const collectedUpdates = [] // accumulate modify_itinerary tool call args
        let generatedItinerary = null // capture generate_itinerary payload

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const response = await openai.chat.completions.create({
            model: CHAT_MODEL,
            messages: loopMessages,
            tools: TOOL_DEFINITIONS,
            tool_choice: 'auto',
            response_format: { type: 'json_object' },
          })

          const aiMsg = response.choices[0]?.message
          if (!aiMsg) break

          if (!aiMsg.tool_calls || aiMsg.tool_calls.length === 0) {
            finalContent = aiMsg.content
            break
          }

          loopMessages.push(aiMsg)

          for (const toolCall of aiMsg.tool_calls) {
            const toolName = toolCall.function.name
            const toolArgs = JSON.parse(toolCall.function.arguments)

            send(controller, {
              type: 'status',
              message: getToolStatus(toolName, toolArgs),
            })

            // Collect itinerary updates from the tool call args directly
            if (toolName === 'modify_itinerary' && toolArgs.updates?.length) {
              collectedUpdates.push(...toolArgs.updates)
            }
            // Capture full itinerary generation
            if (toolName === 'generate_itinerary' && toolArgs.itinerary_days?.length) {
              generatedItinerary = toolArgs.itinerary_days
            }

            let toolResult
            try {
              toolResult = await executeTool(toolName, toolArgs)
            } catch (err) {
              toolResult = { error: err.message }
            }

            loopMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            })
          }
        }

        if (!finalContent) {
          send(controller, { type: 'error', message: 'AI did not return a final response' })
          controller.close()
          return
        }

        let parsed
        parsed = extractJSON(finalContent)
        if (!parsed) {
          // If content looks like raw JSON that failed to parse, show a friendly error
          // rather than dumping raw JSON into the chat
          const looksLikeJSON = typeof finalContent === 'string' && finalContent.trim().startsWith('{')
          parsed = {
            message: looksLikeJSON
              ? 'Sorry, I had trouble formatting my response. Please try again.'
              : (finalContent ?? 'Sorry, something went wrong. Please try again.'),
            itinerary_updates: [],
            options: [],
            planner_state_patch: {},
            quick_replies: [],
          }
        }

        parsed.itinerary_updates = [
          ...(parsed.itinerary_updates ?? []),
          ...collectedUpdates,
        ]

        // If the AI generated a full itinerary, attach it so frontend can overwrite state
        if (generatedItinerary) {
          parsed.overwrite_itinerary = generatedItinerary
        }

        // --- Geocoding coordinates dynamically ---
        // Use the destination from DB (already fetched above) as the authoritative city context.
        // This ensures "Little India" geocodes as "Little India Singapore" not a random city.
        const cityContext = destination?.city && destination?.country
          ? `${destination.city}, ${destination.country}`
          : destination?.city || ''
        const itemsToGeocode = []

        if (parsed.itinerary_updates) {
          itemsToGeocode.push(...parsed.itinerary_updates.filter(u => u.action === 'add' || u.action === 'update'))
        }
        if (parsed.overwrite_itinerary) {
          for (const day of parsed.overwrite_itinerary) {
            if (day.items) itemsToGeocode.push(...day.items)
          }
        }

        await Promise.all(itemsToGeocode.map(item => geocodeItem(item, cityContext, destination.latitude, destination.longitude)))
        // -----------------------------------------
        parsed.options = (parsed.options ?? []).map(normaliseOption)
        parsed.planner_state_patch = extractPlannerStatePatch(parsed.planner_state_patch)
        parsed.quick_replies = extractQuickReplies(parsed.quick_replies)
          .filter(qr => {
            const l = qr.label?.toLowerCase() || ''
            const v = qr.value?.toLowerCase() || ''
            return !l.includes('full itinerary') && !v.includes('full itinerary')
          })

        const nextPlannerState = normalisePlannerState(
          deepMergePlannerState(currentPlannerState, parsed.planner_state_patch),
          profile
        )

        await supabase
          .from('chat_sessions')
          .update({ planner_state: nextPlannerState })
          .eq('id', currentSessionId)

        const messagesToInsert = []
        if (!isInit) {
          messagesToInsert.push({ session_id: currentSessionId, role: 'user', content: message })
        }
        messagesToInsert.push({ session_id: currentSessionId, role: 'assistant', content: parsed.message ?? finalContent })

        await supabase.from('chat_messages').insert(messagesToInsert)

        send(controller, {
          type: 'result',
          sessionId: currentSessionId,
          data: parsed,
        })
      } catch (err) {
        send(controller, { type: 'error', message: err.message ?? 'Unexpected error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  })
}
