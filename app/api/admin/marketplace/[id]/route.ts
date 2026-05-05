import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, context: any) {
  try {
    const params = context.params ? context.params : context
    const resolvedParams = typeof params?.then === 'function' ? await params : params
    const id = resolvedParams?.id

    const supabase = await createSupabaseServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const { data: listing, error } = await supabase
      .from('marketplace_listings')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Supabase update error:', error)
      throw error
    }

    if (!listing) {
      console.warn('Update returned no rows (RLS blocked or listing not found)', { id, status })
      return NextResponse.json({ error: 'Permission Denied: Admin user does not have an RLS policy to update marketplace_listings.' }, { status: 403 })
    }

    return NextResponse.json({ listing })
  } catch (error: any) {
    console.error('Error updating listing:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
