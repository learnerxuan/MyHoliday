import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { userIds } = await request.json()
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json([])
    }

    const { data, error } = await supabase
      .from('traveller_profiles')
      .select('user_id, full_name')
      .in('user_id', userIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
