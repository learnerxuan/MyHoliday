import OpenAI from 'openai'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { buildSystemPrompt, buildItineraryContext } from '@/lib/ai/system-prompt'
import { TOOL_DEFINITIONS, getToolStatus, executeTool } from '@/lib/ai/tools/index'
import { checkGuardrails } from '@/lib/ai/guardrails'
import { enrichItineraryDays, enrichLooseItems } from '@/lib/ai/tools/enrich_itinerary_items'
import { sanitiseCoords as sharedSanitiseCoords } from '@/lib/ai/tools/sanitise-coords'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini'
const DEBUG_CHAT = process.env.DEBUG_CHAT === '1'

const encoder = new TextEncoder()

function createStreamSink(controller) {
  let closed = false
  return {
    send(obj) {
      if (closed) return
      try {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      } catch {
        closed = true
      }
    },
    close() {
      if (closed) return
      closed = true
      try { controller.close() } catch { /* already closed */ }
    },
    get isClosed() { return closed },
  }
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

// sanitiseCoords is a thin wrapper so callers can pass the current destination
// centre as bias context. Logic lives in lib/ai/tools/sanitise-coords.js and is
// shared with the client to keep both sides in lock-step.
function sanitiseCoords(item, context) {
  return sharedSanitiseCoords(item, context)
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

function isShortAffirmation(message) {
  const normalized = String(message || '').trim().toLowerCase()
  return [
    'yes',
    'y',
    'yeah',
    'yep',
    'sure',
    'ok',
    'okay',
    'go ahead',
    'please do',
    'do it',
    'sounds good',
  ].includes(normalized)
}

function expandImplicitReply(message, history = []) {
  if (!isShortAffirmation(message)) return message

  const lastAssistant = [...history].reverse().find((item) => item.role === 'assistant' && item.content)
  if (!lastAssistant?.content) return message

  return [
    `The user replied "${message}" to your immediately previous suggestion.`,
    'Treat that as approval and carry out the last concrete option you proposed.',
    'Do not repeat the same question.',
    `Previous assistant message: ${lastAssistant.content}`,
  ].join(' ')
}

function applyItineraryUpdates(prev, updates, coordsContext) {
  if (!updates?.length) return prev

  const next = { ...prev }
  for (const rawUpdate of updates) {
    const update = sanitiseCoords(rawUpdate, coordsContext)
    const key = `day${update.day}`
    if (!next[key]) next[key] = []

    if (update.action === 'add') {
      const exists = next[key].some((item) => item.name === update.name)
      if (!exists) next[key] = [...next[key], update]
      continue
    }

    if (update.action === 'remove') {
      next[key] = next[key].filter((item) => item.name !== update.name)
      continue
    }

    if (update.action === 'update') {
      const exists = next[key].some((item) => item.name === update.name)
      if (!exists) {
        next[key] = [...next[key], update]
        continue
      }

      next[key] = next[key].map((item) => {
        if (item.name !== update.name) return item
        const merged = { ...item, ...update }
        if (update.new_name) merged.name = update.new_name
        return merged
      })
    }
  }

  for (const key of Object.keys(next)) {
    if (Array.isArray(next[key]) && next[key].length === 0) {
      delete next[key]
    }
  }

  return next
}

function itineraryObjectToDays(itineraryObject = {}) {
  return Object.keys(itineraryObject)
    .sort((a, b) => parseInt(a.replace('day', ''), 10) - parseInt(b.replace('day', ''), 10))
    .map((key) => ({
      day: parseInt(key.replace('day', ''), 10),
      items: itineraryObject[key],
    }))
}

function itineraryDaysToObject(itineraryDays = []) {
  const result = {}
  for (const day of itineraryDays) {
    result[`day${day.day}`] = day.items ?? []
  }
  return result
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

  // Safety catch: skip pinning vague itinerary items rather than forcing them into the wrong type.
  const nameLower = item.name?.toLowerCase() || ''
  const genericKeywords = ['local', 'authentic', 'nearby', 'suggested', 'recommendation', 'lunch at a', 'dinner at a', 'breakfast at a', 'brunch at a']
  const logisticKeywords = ['arrival', 'departure', 'check-in', 'check-out']

  const isGeneric = genericKeywords.some(kw => nameLower.includes(kw))
  const isLogistics = logisticKeywords.some(kw => nameLower.includes(kw))

  if (isGeneric || isLogistics) {
    if (isLogistics) {
      item.type = 'note'
    }
    return
  }

  // If we reach here, it's a specific name. Attempt geocoding.
  const query = encodeURIComponent(`${item.name} ${city || ''}`)
  let url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=geometry&key=${process.env.GOOGLE_PLACES_API_KEY}`
  
  // C3: use a circle bias (10 km radius) rather than a point; point bias is so narrow
  // that Google sometimes returns empty or IP-skewed fallbacks for the same query.
  if (biasLat && biasLng) {
    url += `&locationbias=circle:10000@${biasLat},${biasLng}`
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
  let { message, sessionId, destinationId, userId, itinerary, quizContext, silentUserMessage = false } = await request.json()

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
      const sink = createStreamSink(controller)
      const send = (obj) => sink.send(obj)
      try {
        const supabase = await createSupabaseServerClient()

        const { data: destination, error: destError } = await supabase
          .from('destinations')
          .select('*')
          .eq('id', destinationId)
          .single()

        if (destError || !destination) {
          send({ type: 'error', message: 'Destination not found' })
          sink.close()
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
              // D3: another tab may have inserted the active session between our
              // SELECT and INSERT. The unique partial index makes that fail with
              // 23505; recover by re-reading the row instead of erroring out.
              const { data: raced } = await supabase
                .from('chat_sessions')
                .select('id, planner_state')
                .eq('user_id', userId)
                .eq('destination_id', destinationId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

              if (raced) {
                currentSessionId = raced.id
                currentPlannerState = normalisePlannerState(raced.planner_state, profile)
              } else {
                console.error('[chat] session insert failed and no active row found:', sessionError)
                send({ type: 'error', message: 'Failed to create session' })
                sink.close()
                return
              }
            } else {
              currentSessionId = newSession.id
              currentPlannerState = normalisePlannerState(newSession.planner_state, profile)
            }
          }

          send({ type: 'session', sessionId: currentSessionId })
        } else {
          const { data: sessionRow } = await supabase
            .from('chat_sessions')
            .select('planner_state')
            .eq('id', currentSessionId)
            .single()

          currentPlannerState = normalisePlannerState(sessionRow?.planner_state, profile)
        }

        // Quiz pre-fill MUST run for both new and reused sessions. Previously this lived inside
        // the new-session branch, so reusing an active session for a destination silently dropped
        // every quiz answer — the chatbot would then re-ask "How many days?" and ignore budget/pace.
        // Only fills fields that aren't already set on the session, so existing planner state wins.
        if (quizContext) {
          const tripDaysNum = Number(quizContext.trip_days)
          const groupSizeNum = Number(quizContext.group_size)
          const normalisedBudget = quizContext.budget ? String(quizContext.budget).toLowerCase() : null
          const fill = {}
          if (currentPlannerState.trip_days == null && Number.isFinite(tripDaysNum) && tripDaysNum > 0) {
            fill.trip_days = tripDaysNum
          }
          if ((currentPlannerState.budget_profile == null || currentPlannerState.budget_profile === 'unknown') && normalisedBudget) {
            fill.budget_profile = normalisedBudget
          }
          if (currentPlannerState.pace == null && quizContext.pace) fill.pace = quizContext.pace
          if (currentPlannerState.travel_date_start == null && quizContext.travel_date_start) fill.travel_date_start = quizContext.travel_date_start
          if (currentPlannerState.travel_date_end == null && quizContext.travel_date_end) fill.travel_date_end = quizContext.travel_date_end
          if (currentPlannerState.group_size == null && Number.isFinite(groupSizeNum) && groupSizeNum > 0) {
            fill.group_size = groupSizeNum
          }
          if ((!Array.isArray(currentPlannerState.preferred_styles) || currentPlannerState.preferred_styles.length === 0)
            && Array.isArray(quizContext.preferred_styles) && quizContext.preferred_styles.length) {
            fill.preferred_styles = quizContext.preferred_styles
          }
          if (Object.keys(fill).length) {
            currentPlannerState = deepMergePlannerState(currentPlannerState, fill)
          }
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

            send({
              type: 'result',
              sessionId: currentSessionId,
              data: initResponse,
            })
            return
          } else {
            // Quiz data exists — FAST TRACK: proceed to LLM loop with hidden instruction.
            // This mutated `message` is intentionally NOT saved to chat_messages (see isInit check below)
            // because it's an internal directive, not user-visible speech.
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

        const resolvedUserMessage = expandImplicitReply(message, dbHistory)

        const messages = [
          { role: 'system', content: fullSystemPrompt },
          ...dbHistory,
          { role: 'user', content: resolvedUserMessage },
        ]

        let finalContent = null
        let loopMessages = [...messages]
        const MAX_TOOL_ROUNDS = 5
        const collectedUpdates = [] // accumulate modify_itinerary tool call args
        let generatedItinerary = null // capture generate_itinerary payload
        const collectedOptions = []

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const response = await openai.chat.completions.create({
            model: CHAT_MODEL,
            messages: loopMessages,
            tools: TOOL_DEFINITIONS,
            tool_choice: 'auto',
            response_format: { type: 'json_object' },
          })

          if (DEBUG_CHAT) {
            console.log('[chat] round', round, 'finish_reason:', response.choices[0]?.finish_reason, 'usage:', response.usage)
          }

          const aiMsg = response.choices[0]?.message
          if (!aiMsg) break

          if (!aiMsg.tool_calls || aiMsg.tool_calls.length === 0) {
            finalContent = aiMsg.content
            break
          }

          // Coerce null content to empty string — OpenAI rejects assistant messages with null content
          // when there are also tool_calls, even though their own SDK returns null.
          loopMessages.push({ ...aiMsg, content: aiMsg.content ?? '' })

          for (const toolCall of aiMsg.tool_calls) {
            const toolName = toolCall.function.name
            const toolArgs = JSON.parse(toolCall.function.arguments)

            send({
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

            if (toolName === 'search_nearby_places' && toolResult?.results?.length) {
              collectedOptions.push(...toolResult.results)
            }

            loopMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            })
          }
        }

        // If the tool loop exhausted without a text reply, force one final completion
        // WITHOUT tools so the model must return the JSON envelope.
        if (!finalContent) {
          if (DEBUG_CHAT) console.log('[chat] tool loop exhausted — forcing final completion without tools')
          try {
            const forced = await openai.chat.completions.create({
              model: CHAT_MODEL,
              messages: [
                ...loopMessages,
                { role: 'user', content: 'Based on the tools you\'ve already called, produce your final JSON response now. Do not call any more tools.' },
              ],
              response_format: { type: 'json_object' },
            })
            finalContent = forced.choices[0]?.message?.content ?? null
          } catch (err) {
            console.error('[chat] forced final completion failed:', err)
          }
        }

        if (!finalContent) {
          send({ type: 'error', message: 'AI did not return a final response' })
          sink.close()
          return
        }

        let parsed
        parsed = extractJSON(finalContent)
        if (!parsed) {
          // Extraction failed — never fall back to raw finalContent (it's malformed JSON
          // and would dump garbage into the chat history).
          parsed = {
            message: 'Sorry, I had trouble formatting my response. Please try again.',
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
        parsed.options = [
          ...(parsed.options ?? []),
          ...collectedOptions,
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

        // Enrichment steps below are best-effort. If any external API (Google Places, OSRM)
        // fails, we log and fall back to the un-enriched itinerary so the user still sees a draft.
        try {
          await Promise.all(itemsToGeocode.map(item => geocodeItem(item, cityContext, destination.latitude, destination.longitude)))
        } catch (err) {
          console.error('[chat] geocoding failed, continuing with partial coords:', err)
        }

        if (parsed.itinerary_updates?.length) {
          try {
            parsed.itinerary_updates = await enrichLooseItems(parsed.itinerary_updates, {
              city: destination.city,
              country: destination.country,
              bias_lat: destination.latitude,
              bias_lng: destination.longitude,
            })
          } catch (err) {
            console.error('[chat] enrichLooseItems failed, using raw updates:', err)
          }
        }

        // D1: if the AI called both generate_itinerary AND modify_itinerary in the same turn,
        // apply the modify updates on top of the generated overwrite so no changes are silently dropped.
        const coordsContext = { bias_lat: destination.latitude, bias_lng: destination.longitude }
        if (parsed.overwrite_itinerary?.length && collectedUpdates.length) {
          const overwriteObj = itineraryDaysToObject(parsed.overwrite_itinerary)
          const mergedObj = applyItineraryUpdates(overwriteObj, collectedUpdates, coordsContext)
          parsed.overwrite_itinerary = itineraryObjectToDays(mergedObj)
        } else if (!parsed.overwrite_itinerary?.length && parsed.itinerary_updates?.length) {
          const mergedItinerary = applyItineraryUpdates(itinerary ?? {}, parsed.itinerary_updates, coordsContext)
          parsed.overwrite_itinerary = itineraryObjectToDays(mergedItinerary)
        }

        if (
          parsed.overwrite_itinerary?.length &&
          !isInit &&
          itinerary &&
          Object.keys(itinerary).length > parsed.overwrite_itinerary.length
        ) {
          parsed.overwrite_itinerary = itineraryObjectToDays({
            ...itinerary,
            ...itineraryDaysToObject(parsed.overwrite_itinerary),
          })
        }

        if (parsed.overwrite_itinerary?.length) {
          try {
            parsed.overwrite_itinerary = await enrichItineraryDays(parsed.overwrite_itinerary, {
              city: destination.city,
              country: destination.country,
              bias_lat: destination.latitude,
              bias_lng: destination.longitude,
            })
          } catch (err) {
            console.error('[chat] enrichItineraryDays failed, returning un-enriched days:', err)
          }
        }

        parsed.options = (parsed.options ?? []).map(normaliseOption)
        parsed.options = parsed.options.map(option => ({
          ...option,
          image_url: option.image_url ?? null,
          distance_label: option.distance_label ?? null,
          notes: option.notes ?? option.summary ?? null,
        }))
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
        if (!isInit && !silentUserMessage) {
          messagesToInsert.push({ session_id: currentSessionId, role: 'user', content: message })
        }
        messagesToInsert.push({
          session_id: currentSessionId,
          role: 'assistant',
          content: parsed.message || 'Sorry, something went wrong. Please try again.',
        })

        await supabase.from('chat_messages').insert(messagesToInsert)

        send({
          type: 'result',
          sessionId: currentSessionId,
          data: parsed,
        })
      } catch (err) {
        console.error('[chat] unexpected error:', err)
        send({ type: 'error', message: err.message ?? 'Unexpected error' })
      } finally {
        sink.close()
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
