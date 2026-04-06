import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const body = await request.json()
  
  const { data, error } = await supabase
    .from('marketplace_offers')
    .insert([{
      listing_id: body.listing_id,
      guide_id: body.guide_id,
      proposed_price: body.proposed_price,
      status: 'pending'
    }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
