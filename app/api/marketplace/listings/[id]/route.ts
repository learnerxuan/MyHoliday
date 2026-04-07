import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*, destinations(city)')
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const formattedData = {
    ...data,
    city_name: data.destinations?.city || 'Unknown'
  }

  return NextResponse.json(formattedData)
}
