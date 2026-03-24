import OpenAI from 'openai'
import { createSupabaseServerClient }         from '@/lib/supabase/server'
import { buildSystemPrompt }                  from '@/lib/ai/system-prompt'
import { TOOL_DEFINITIONS, getToolStatus, executeTool } from '@/lib/ai/tools/index'
import { checkGuardrails }                    from '@/lib/ai/guardrails'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const encoder = new TextEncoder()

// Sends a newline-delimited JSON chunk to the stream
function send(controller, obj) {
  controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
}

export async function POST(request) {
  const { message, sessionId, destinationId, userId } = await request.json()

  if (!message || !destinationId || !userId) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── Guardrail check (fast — no DB or AI call) ──────────────────
  const guard = checkGuardrails(message)
  if (guard.blocked) {
    // Return in the same NDJSON stream format the frontend expects
    const enc  = new TextEncoder()
    const body = JSON.stringify({
      type: 'result',
      data: { message: guard.reply, itinerary_updates: [], options: [] },
    }) + '\n'
    return new Response(body, {
      headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
    })
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY is not set' }, { status: 500 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = await createSupabaseServerClient()

        // ── 1. Fetch destination ─────────────────────────────
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

        // ── 2. Fetch traveller profile ───────────────────────
        const { data: profile } = await supabase
          .from('traveller_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()
        // profile may be null — AI will use destination defaults

        // ── 3. Resolve session ───────────────────────────────
        let currentSessionId = sessionId

        if (!currentSessionId) {
          // First message — create a new session
          const { data: newSession, error: sessionError } = await supabase
            .from('chat_sessions')
            .insert({ user_id: userId, destination_id: destinationId, status: 'active' })
            .select('id')
            .single()

          if (sessionError) {
            send(controller, { type: 'error', message: 'Failed to create session' })
            controller.close()
            return
          }

          currentSessionId = newSession.id
          // Tell the frontend the new session id so it can persist it in state
          send(controller, { type: 'session', sessionId: currentSessionId })
        }

        // ── 4. Fetch full message history from DB ────────────
        const { data: history } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('session_id', currentSessionId)
          .order('created_at', { ascending: true })

        const dbHistory = (history ?? []).map(m => ({
          role:    m.role,
          content: m.content,
        }))

        // ── 5. Build messages array for OpenAI ───────────────
        const systemPrompt = buildSystemPrompt(destination, profile)

        const messages = [
          { role: 'system', content: systemPrompt },
          ...dbHistory,
          { role: 'user',   content: message },
        ]

        // ── 6. OpenAI tool-calling loop ──────────────────────
        let finalContent = null
        let loopMessages = [...messages]
        const MAX_TOOL_ROUNDS = 5

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const response = await openai.chat.completions.create({
            model:           'gpt-4o-mini',
            messages:        loopMessages,
            tools:           TOOL_DEFINITIONS,
            tool_choice:     'auto',
            response_format: { type: 'json_object' },
          })

          const choice  = response.choices[0]
          const aiMsg   = choice.message

          // No tool calls — we have the final response
          if (!aiMsg.tool_calls || aiMsg.tool_calls.length === 0) {
            finalContent = aiMsg.content
            break
          }

          // Add the assistant message (with tool_calls) to the loop
          loopMessages.push(aiMsg)

          // Execute each tool call
          for (const toolCall of aiMsg.tool_calls) {
            const toolName = toolCall.function.name
            const toolArgs = JSON.parse(toolCall.function.arguments)

            // Stream status message to frontend
            send(controller, {
              type:    'status',
              message: getToolStatus(toolName, toolArgs),
            })

            let toolResult
            try {
              toolResult = await executeTool(toolName, toolArgs)
            } catch (err) {
              toolResult = { error: err.message }
            }

            // Add tool result to messages
            loopMessages.push({
              role:         'tool',
              tool_call_id: toolCall.id,
              content:      JSON.stringify(toolResult),
            })
          }
        }

        if (!finalContent) {
          send(controller, { type: 'error', message: 'AI did not return a final response' })
          controller.close()
          return
        }

        // ── 7. Parse AI response ─────────────────────────────
        let parsed
        try {
          parsed = JSON.parse(finalContent)
        } catch {
          // Fallback if AI returned plain text instead of JSON
          parsed = {
            message:           finalContent,
            itinerary_updates: [],
            options:           [],
          }
        }

        // Ensure required fields are always present
        parsed.itinerary_updates = parsed.itinerary_updates ?? []
        parsed.options           = parsed.options           ?? []

        // ── 8. Save user + assistant messages (atomic) ───────
        await supabase.from('chat_messages').insert([
          { session_id: currentSessionId, role: 'user',      content: message           },
          { session_id: currentSessionId, role: 'assistant', content: parsed.message ?? finalContent },
        ])

        // ── 9. Stream final result to frontend ───────────────
        send(controller, {
          type:      'result',
          sessionId: currentSessionId,
          data:      parsed,
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
      'Content-Type':  'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  })
}
