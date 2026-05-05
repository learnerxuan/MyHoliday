import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { offer_id, sender_id, sender_type, content } = body

  if (!offer_id || !sender_type || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const normalizedSenderType = sender_type === 'traveller' ? 'traveler' : sender_type
  if (!['traveler', 'guide'].includes(normalizedSenderType)) {
    return NextResponse.json({ error: 'Invalid sender_type' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('marketplace_messages')
    .insert([
      {
        offer_id,
        sender_id: sender_id || user.id,
        sender_type: normalizedSenderType,
        content
      }
    ])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}