import OpenAI from 'openai'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { buildSystemPrompt, buildItineraryContext } from '@/lib/ai/system-prompt'
import { TOOL_DEFINITIONS, getToolStatus, executeTool } from '@/lib/ai/tools/index'
import { checkGuardrails } from '@/lib/ai/guardrails'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

function normalisePlannerState(rawState, profile) {
  return deepMergePlannerState({
    mode: null,
    phase: 'intake',
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

function buildTripSummary({ tripDays, pace, mode, budgetProfile, day1StartTime }) {
  const modeLabel = mode === 'guided' ? 'Guided Planning' : 'Quick Draft'
  const budgetLabel = toTitleCase(budgetProfile ?? 'mid-range')
  const startLabel = formatTimeLabel(day1StartTime)
  return `Perfect. I've set this up as a ${tripDays}-day ${pace} trip in ${modeLabel} mode with a ${budgetLabel} budget, starting Day 1 at ${startLabel}.`
}

function parseHotelSelection(message) {
  const match = message.match(/(?:i(?:'|’)ll go with|i choose|i picked|i pick|selected|select)\s+(.+)/i)
  if (match?.[1]) return match[1].trim().replace(/[.!]+$/, '')
  return null
}

function getDay1StartBucket(time24) {
  if (!time24) return 'morning'
  const [hourText] = time24.split(':')
  const hour = Number(hourText)
  if (hour < 11) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function enrichHotelOption(option) {
  const price = option.price ?? option.price_estimate ?? 'Price not available'
  const ratingText = option.rating ? `${option.rating}/5 rating` : 'rating not available'
  const starsText = option.stars ? `${option.stars}-star feel` : 'stay profile not available'

  return {
    ...option,
    type: 'hotel',
    price,
    notes: option.notes ?? `${price}. ${ratingText}. ${starsText}.`,
  }
}

function enrichPlaceOption(option, type, fallbackNotes) {
  return {
    ...option,
    type,
    notes: option.notes ?? fallbackNotes,
  }
}

async function buildGuidedDayOneResponse(destination, plannerState, selectedHotelName, profile) {
  const startTime = plannerState.day1_start_time ?? '09:00'
  const startLabel = formatTimeLabel(startTime)
  const bucket = getDay1StartBucket(startTime)
  const commonPatch = {
    hotel_status: 'selected',
    selected_hotel_name: selectedHotelName,
    phase: 'day_planning',
    current_day: 1,
  }

  if (bucket === 'morning') {
    const attractionOptions = await executeTool('search_attractions', {
      city: destination.city,
      lat: destination.latitude,
      lng: destination.longitude,
      category: plannerState.pace === 'relaxed' ? 'nature' : 'landmark',
    })

    return {
      message: `Locked in ${selectedHotelName}. Since Day 1 starts at ${startLabel}, I'll begin with a morning activity and build the rest of the day around it. Pick the first stop you want.`,
      itinerary_updates: [],
      options: (attractionOptions ?? [])
        .slice(0, 5)
        .map((option) => enrichPlaceOption(option, 'attraction', 'Good first stop for the morning.')),
      planner_state_patch: {
        ...commonPatch,
        current_cluster: 'morning',
      },
      quick_replies: [],
    }
  }

  if (bucket === 'afternoon') {
    const attractionOptions = await executeTool('search_attractions', {
      city: destination.city,
      lat: destination.latitude,
      lng: destination.longitude,
      category: 'shopping',
    })

    return {
      message: `Locked in ${selectedHotelName}. Since Day 1 starts at ${startLabel}, I'll begin with an afternoon activity before we decide on dinner. Pick the first stop you want.`,
      itinerary_updates: [],
      options: (attractionOptions ?? [])
        .slice(0, 5)
        .map((option) => enrichPlaceOption(option, 'attraction', 'Good first stop for the afternoon.')),
      planner_state_patch: {
        ...commonPatch,
        current_cluster: 'afternoon',
      },
      quick_replies: [],
    }
  }

  const restaurantOptions = await executeTool('search_restaurants', {
    city: destination.city,
    lat: destination.latitude,
    lng: destination.longitude,
    budget_profile: plannerState.budget_profile,
    dietary: profile?.dietary_restrictions || undefined,
  })

  return {
    message: `Locked in ${selectedHotelName}. Since Day 1 starts at ${startLabel}, I'll begin with an evening dinner plan nearby. Pick the dinner option you want first.`,
    itinerary_updates: [],
    options: (restaurantOptions ?? [])
      .slice(0, 5)
      .map((option) => enrichPlaceOption(option, 'restaurant', 'Good first dinner option for Day 1.')),
    planner_state_patch: {
      ...commonPatch,
      current_cluster: 'evening',
    },
    quick_replies: [],
  }
}

function parseTripDays(message) {
  const directMatch = message.match(/\b(\d{1,2})\s*(day|days|night|nights)\b/i)
  if (directMatch) return Number(directMatch[1])

  const wordMap = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  }

  for (const [word, value] of Object.entries(wordMap)) {
    if (new RegExp(`\\b${word}\\s+(day|days|night|nights)\\b`, 'i').test(message)) {
      return value
    }
  }

  return null
}

function parsePace(message) {
  if (/\brelaxed\b/i.test(message)) return 'relaxed'
  if (/\bpacked\b/i.test(message)) return 'packed'
  if (/\bbalanced\b/i.test(message)) return 'balanced'
  return null
}

function parseMode(message) {
  if (/\bguided\s+planning\b|\bguided\b/i.test(message)) return 'guided'
  if (/\bquick\s+draft\b|\bdraft\b/i.test(message)) return 'quick_draft'
  return null
}

function parseBudgetProfile(message) {
  if (/\bluxury\b|\bpremium\b|\bhigh[- ]end\b/i.test(message)) return 'luxury'
  if (/\bbudget\b|\bcheap\b|\baffordable\b|\blow[- ]cost\b/i.test(message)) return 'budget'
  if (/\bmid[- ]range\b|\bmoderate\b|\bbalanced budget\b/i.test(message)) return 'mid-range'
  return null
}

function parseDay1StartTime(message) {
  const twelveHourMatch = message.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i)
  if (twelveHourMatch) {
    let hour = Number(twelveHourMatch[1])
    const minute = twelveHourMatch[2] ?? '00'
    const period = twelveHourMatch[3].toLowerCase()

    if (period === 'pm' && hour !== 12) hour += 12
    if (period === 'am' && hour === 12) hour = 0

    return `${String(hour).padStart(2, '0')}:${minute}`
  }

  const twentyFourHourMatch = message.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
  if (twentyFourHourMatch) {
    return `${twentyFourHourMatch[1].padStart(2, '0')}:${twentyFourHourMatch[2]}`
  }

  return null
}

function formatTimeLabel(time24) {
  if (!time24) return null
  const [hourText, minute] = time24.split(':')
  let hour = Number(hourText)
  const period = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${minute} ${period}`
}

function parseHotelIntent(message) {
  if (/\b(i already have|i've booked|i have a hotel|already booked)\b/i.test(message)) {
    return 'has_hotel'
  }

  if (
    /\b(suggest|recommend|show me|find me)\b.*\b(hotel|hotels)\b/i.test(message) ||
    /\b(plan for me|you decide|surprise me|no idea|no ideas|anything works)\b/i.test(message)
  ) {
    return 'needs_suggestions'
  }

  return null
}

function parseMustDoResponse(message) {
  if (/\b(no preferences|no preference|none|nothing specific|anything is fine|surprise me)\b/i.test(message)) {
    return []
  }
  return null
}

function buildInitMessage(destination, profile, known = null) {
  const dietary = profile?.dietary_restrictions || 'none'
  const accessibility = profile?.accessibility_needs ? 'yes' : 'none'
  const city = destination.city

  const lines = [`${city} is a great pick for a well-planned getaway.`]

  if (dietary !== 'none') {
    lines.push(`I'll keep your ${dietary} preferences in mind throughout.`)
  } else if (accessibility !== 'none') {
    lines.push("I'll keep accessibility in mind as I build the plan.")
  }

  if (known?.knownDays && known?.knownBudget) {
    // Both values are known from the quiz — confirm them and ask pace next
    lines.push(
      ``,
      `I can see you're planning **${known.knownDays} days** with a **${known.knownBudget}** budget — I'll work from those.`,
      ``,
      `What pace suits you: relaxed, balanced, or packed?`
    )
  } else {
    lines.push('', 'How many days is the trip?')
  }

  return lines.join('\n')
}

async function buildIntakeResponse(message, currentPlannerState, destination) {
  const parsedTripDays = parseTripDays(message)
  const parsedPace = parsePace(message)
  const parsedMode = parseMode(message)
  const parsedBudgetProfile = parseBudgetProfile(message)
  const parsedDay1StartTime = parseDay1StartTime(message)
  const hotelIntent = parseHotelIntent(message)
  const mustDoResponse = parseMustDoResponse(message)

  let selectedHotelName = currentPlannerState.selected_hotel_name
  if (
    currentPlannerState.hotel_status === 'user_has_hotel' &&
    !selectedHotelName &&
    !hotelIntent &&
    !parsedTripDays &&
    !parsedPace &&
    !parsedMode &&
    !parsedBudgetProfile &&
    !parsedDay1StartTime
  ) {
    selectedHotelName = message.trim()
  }

  const tripDays = parsedTripDays ?? currentPlannerState.trip_days
  const pace = parsedPace ?? currentPlannerState.pace
  const mode = parsedMode ?? currentPlannerState.mode
  const budgetProfile = parsedBudgetProfile
    ?? (currentPlannerState.budget_profile && currentPlannerState.budget_profile !== 'unknown'
      ? currentPlannerState.budget_profile
      : null)
    ?? destination.budget_level
  const day1StartTime = parsedDay1StartTime ?? currentPlannerState.day1_start_time ?? null

  const plannerStatePatch = {
    trip_days: tripDays ?? currentPlannerState.trip_days ?? null,
    pace: pace ?? currentPlannerState.pace ?? null,
    mode: mode ?? currentPlannerState.mode ?? null,
    budget_profile: budgetProfile ?? currentPlannerState.budget_profile ?? 'unknown',
    day1_start_time: day1StartTime,
    arrival_time_hint: day1StartTime ? formatTimeLabel(day1StartTime) : currentPlannerState.arrival_time_hint,
    hotel_status: hotelIntent === 'has_hotel' ? 'user_has_hotel' : currentPlannerState.hotel_status,
    selected_hotel_name: selectedHotelName,
    needs: {
      ...currentPlannerState.needs,
      must_do: mustDoResponse ?? currentPlannerState.needs?.must_do ?? [],
    },
    phase: 'intake',
  }

  if (!tripDays) {
    return {
      message: 'How many days is the trip?',
      itinerary_updates: [],
      options: [],
      planner_state_patch: plannerStatePatch,
      quick_replies: [],
    }
  }

  if (!pace) {
    return {
      message: 'What pace do you want: relaxed, balanced, or packed?',
      itinerary_updates: [],
      options: [],
      planner_state_patch: plannerStatePatch,
      quick_replies: [quickReply('Relaxed'), quickReply('Balanced'), quickReply('Packed')],
    }
  }

  if (!mode) {
    return {
      message: 'Which planning mode do you want: Quick Draft or Guided Planning?',
      itinerary_updates: [],
      options: [],
      planner_state_patch: plannerStatePatch,
      quick_replies: [quickReply('Quick Draft'), quickReply('Guided Planning')],
    }
  }

  if (!budgetProfile || budgetProfile === 'unknown') {
    return {
      message: 'What overall budget do you want: budget, mid-range, or luxury?',
      itinerary_updates: [],
      options: [],
      planner_state_patch: plannerStatePatch,
      quick_replies: [quickReply('Budget'), quickReply('Mid-range'), quickReply('Luxury')],
    }
  }

  if (!day1StartTime) {
    return {
      message: 'What time would you like to start Day 1?',
      itinerary_updates: [],
      options: [],
      planner_state_patch: plannerStatePatch,
      quick_replies: [
        quickReply('8:00 AM'),
        quickReply('10:00 AM'),
        quickReply('12:00 PM'),
        quickReply('3:00 PM'),
        quickReply('6:00 PM'),
      ],
    }
  }

  const summary = buildTripSummary({
    tripDays,
    pace,
    mode,
    budgetProfile,
    day1StartTime,
  })

  if (hotelIntent === 'needs_suggestions') {
    const hotelOptions = await executeTool('search_hotels', {
      city: destination.city,
      lat: destination.latitude,
      lng: destination.longitude,
      budget_tier: budgetProfile,
    })

    return {
      message: "I'll start with hotel options that fit the overall trip budget so we can anchor the rest of the plan.",
      itinerary_updates: [],
      options: (hotelOptions ?? []).slice(0, 5).map(enrichHotelOption),
      planner_state_patch: {
        ...plannerStatePatch,
        hotel_status: 'needs_suggestions',
        phase: 'anchor_selection',
      },
      quick_replies: [],
    }
  }

  if (hotelIntent === 'has_hotel') {
    return {
      message: 'What is the name of your hotel?',
      itinerary_updates: [],
      options: [],
      planner_state_patch: {
        ...plannerStatePatch,
        hotel_status: 'user_has_hotel',
      },
      quick_replies: [],
    }
  }

  if (!currentPlannerState.hotel_status || currentPlannerState.hotel_status === 'unknown') {
    return {
      message: `${summary} Do you already have a hotel, or would you like me to suggest some options?`,
      itinerary_updates: [],
      options: [],
      planner_state_patch: plannerStatePatch,
      quick_replies: [
        quickReply('Suggest hotels'),
        quickReply('I already have a hotel'),
      ],
    }
  }

  if (plannerStatePatch.hotel_status === 'user_has_hotel' && !selectedHotelName) {
    return {
      message: 'What is the name of your hotel?',
      itinerary_updates: [],
      options: [],
      planner_state_patch: plannerStatePatch,
      quick_replies: [],
    }
  }

  if ((plannerStatePatch.needs?.must_do?.length ?? 0) === 0 && mustDoResponse == null) {
    return {
      message: 'Any must-do places, food priorities, or hard constraints I should build around?',
      itinerary_updates: [],
      options: [],
      planner_state_patch: plannerStatePatch,
      quick_replies: [quickReply('No preferences')],
    }
  }

  return {
    message: `${summary} I have the key details, so I'm ready to start planning.`,
    itinerary_updates: [],
    options: [],
    planner_state_patch: {
      ...plannerStatePatch,
      phase: 'drafting',
    },
    quick_replies: [],
  }
}

export async function POST(request) {
  const { message, sessionId, destinationId, userId, itinerary, quizContext } = await request.json()

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

          // Pre-fill plannerState from quiz answers before sending the session ID.
          // deepMergePlannerState is sufficient — currentPlannerState is already fully normalised.
          if (quizContext) {
            const normalisedBudget = quizContext.budget
              ? quizContext.budget.toLowerCase()   // "Mid-range" → "mid-range"
              : null
            currentPlannerState = deepMergePlannerState(currentPlannerState, {
              trip_days:         quizContext.trip_days         ?? null,
              budget_profile:    normalisedBudget              ?? currentPlannerState.budget_profile,
              travel_date_start: quizContext.travel_date_start ?? null,
              travel_date_end:   quizContext.travel_date_end   ?? null,
              group_size:        quizContext.group_size        ?? null,
              preferred_styles:  quizContext.preferred_styles  ?? [],
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
          const knownDays   = currentPlannerState.trip_days ?? null
          const knownBudget = currentPlannerState.budget_profile !== 'unknown'
                                ? currentPlannerState.budget_profile
                                : null

          // known is non-null only when both values came from quiz context
          const known = (knownDays && knownBudget)
            ? { knownDays, knownBudget: knownBudget.charAt(0).toUpperCase() + knownBudget.slice(1) }
            : null

          const initResponse = {
            message: buildInitMessage(destination, profile, known),
            itinerary_updates: [],
            options: [],
            planner_state_patch: { phase: 'intake' },
            // If days are already known, skip to pace chips; otherwise show day-count chips
            quick_replies: known
              ? [quickReply('Relaxed'), quickReply('Balanced'), quickReply('Packed')]
              : [quickReply('3 days'), quickReply('5 days'), quickReply('7 days')],
          }
          // Note: nextPlannerState merges currentPlannerState (which already has quiz values
          // applied above) with initResponse.planner_state_patch — so quiz values are persisted
          // to Supabase correctly without any extra DB call.

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
        }

        if (currentPlannerState?.phase === 'intake') {
          const intakeResponse = await buildIntakeResponse(message, currentPlannerState, destination)
          const nextPlannerState = normalisePlannerState(
            deepMergePlannerState(currentPlannerState, intakeResponse.planner_state_patch),
            profile
          )

          await supabase
            .from('chat_sessions')
            .update({ planner_state: nextPlannerState })
            .eq('id', currentSessionId)

          await supabase.from('chat_messages').insert([
            { session_id: currentSessionId, role: 'user', content: message },
            { session_id: currentSessionId, role: 'assistant', content: intakeResponse.message },
          ])

          send(controller, {
            type: 'result',
            sessionId: currentSessionId,
            data: intakeResponse,
          })
          return
        }

        const selectedHotelName = parseHotelSelection(message)
          ?? (
            currentPlannerState?.hotel_status === 'user_has_hotel'
            && currentPlannerState?.selected_hotel_name == null
            && currentPlannerState?.phase !== 'intake'
              ? message.trim()
              : null
          )

        if (
          selectedHotelName
          && (currentPlannerState?.phase === 'anchor_selection' || currentPlannerState?.hotel_status === 'user_has_hotel')
        ) {
          const hotelResponse = currentPlannerState?.mode === 'guided'
            ? await buildGuidedDayOneResponse(destination, currentPlannerState, selectedHotelName, profile)
            : {
                message: `Locked in ${selectedHotelName}. I'll use it as the base and build your first full draft from ${formatTimeLabel(currentPlannerState?.day1_start_time ?? '09:00')}.`,
                itinerary_updates: [],
                options: [],
                planner_state_patch: {
                  hotel_status: 'selected',
                  selected_hotel_name: selectedHotelName,
                  phase: 'drafting',
                },
                quick_replies: [],
              }

          const nextPlannerState = normalisePlannerState(
            deepMergePlannerState(currentPlannerState, hotelResponse.planner_state_patch),
            profile
          )

          await supabase
            .from('chat_sessions')
            .update({ planner_state: nextPlannerState })
            .eq('id', currentSessionId)

          await supabase.from('chat_messages').insert([
            { session_id: currentSessionId, role: 'user', content: message },
            { session_id: currentSessionId, role: 'assistant', content: hotelResponse.message },
          ])

          send(controller, {
            type: 'result',
            sessionId: currentSessionId,
            data: hotelResponse,
          })
          return
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

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
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
        try {
          parsed = JSON.parse(finalContent)
        } catch {
          parsed = {
            message: finalContent,
            itinerary_updates: [],
            options: [],
            planner_state_patch: {},
            quick_replies: [],
          }
        }

        parsed.itinerary_updates = parsed.itinerary_updates ?? []
        parsed.options = parsed.options ?? []
        parsed.planner_state_patch = extractPlannerStatePatch(parsed.planner_state_patch)
        parsed.quick_replies = extractQuickReplies(parsed.quick_replies)

        const nextPlannerState = normalisePlannerState(
          deepMergePlannerState(currentPlannerState, parsed.planner_state_patch),
          profile
        )

        await supabase
          .from('chat_sessions')
          .update({ planner_state: nextPlannerState })
          .eq('id', currentSessionId)

        await supabase.from('chat_messages').insert([
          { session_id: currentSessionId, role: 'user', content: message },
          { session_id: currentSessionId, role: 'assistant', content: parsed.message ?? finalContent },
        ])

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
