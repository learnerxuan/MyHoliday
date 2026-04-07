import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const body = await request.json()
  
  const { data, error } = await supabase
    .from('marketplace_messages')
    .insert([{
      listing_id: body.listing_id,
      sender_id: body.sender_id,
      sender_type: body.sender_type,
      content: body.content
    }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
