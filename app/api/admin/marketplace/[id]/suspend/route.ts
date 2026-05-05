import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function PATCH(request, context) {
  try {
    const params = context.params ? context.params : context
    const resolvedParams = typeof params?.then === 'function' ? await params : params
    const listingId = resolvedParams?.id

    const supabase = await createSupabaseServerClient()

    // Ensure caller is an admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!listingId) {
      return Response.json({ error: 'Missing listing ID' }, { status: 400 })
    }

    const { is_suspended } = await request.json()
    console.log("DEBUG SUSPEND ROUTE:", { listingId, is_suspended, adminId: user.id })

    if (typeof is_suspended !== 'boolean') {
      return Response.json({ error: 'Invalid payload: is_suspended must be a boolean' }, { status: 400 })
    }

    // Use our new SECURITY DEFINER RPC function to bypass RLS
    // This allows the admin to update the listing without hitting policy conflicts.
    const { data: success, error: rpcError } = await supabase
      .rpc('admin_suspend_listing', {
        p_listing_id: listingId,
        p_is_suspended: is_suspended
      })

    if (rpcError) {
      console.error('Supabase RPC error:', rpcError)
      throw rpcError
    }

    if (!success) {
      console.warn('RPC Suspend failed. Listing ID not found in database.', { listingId, is_suspended })
      return Response.json({ error: 'Listing not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Suspend listing error:', err)
    return Response.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
