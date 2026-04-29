import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(req: Request, context: any) {
  try {
    const body = await req.json()
    const params = context.params ? context.params : context
    // In some Next.js versions `params` is a Promise that must be awaited
    const resolvedParams = typeof params?.then === 'function' ? await params : params
    const id = resolvedParams?.id
    console.log('Admin traveller PATCH called. param id:', id, 'body:', body)
    if (!id || id === 'undefined') {
      return Response.json({ error: 'Missing profile identifier in URL' }, { status: 400 })
    }
    const supabase = await createSupabaseServerClient()

    // Ensure the caller is an admin before performing privileged update
    const { data: userData } = await supabase.auth.getUser()
    const callerRole = userData?.user?.user_metadata?.role
    if (callerRole !== 'admin') {
      console.error('Admin traveller PATCH forbidden: caller is not admin', { callerRole })
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // We rely on Row-Level Security (RLS) policy to allow admin users to UPDATE
    // traveller_profiles. The migration `20260421_add_admin_update_policy_traveller_profiles.sql`
    // creates a FOR UPDATE policy for admin users. Use the server client (session-bound)
    // so RLS rules are enforced correctly.

    // Only allow updating certain profile fields (include is_active for soft-delete)
    const allowed: any = {}
    if (body.full_name !== undefined) allowed.full_name = body.full_name
    if (body.nationality !== undefined) allowed.nationality = body.nationality
    if (body.dietary_restrictions !== undefined) allowed.dietary_restrictions = body.dietary_restrictions
    if (body.accessibility_needs !== undefined) allowed.accessibility_needs = body.accessibility_needs
    if (body.preferred_language !== undefined) allowed.preferred_language = body.preferred_language
    if (body.is_active !== undefined) allowed.is_active = Boolean(body.is_active)

    // Resolve provided identifier: it may be the profile `id` or the `user_id`.
    let targetProfileId = id

    try {
      // Try to find a profile with id = provided id
      const { data: foundById, error: findErr } = await supabase
        .from('traveller_profiles')
        .select('id, user_id')
        .eq('id', id)
        .maybeSingle()
      if (findErr) {
        // ignore — will try by user_id below
      } else if (!foundById) {
        // try treat the param as user_id
        const { data: foundByUser, error: findUserErr } = await supabase
          .from('traveller_profiles')
          .select('id, user_id')
          .eq('user_id', id)
          .maybeSingle()
        if (findUserErr) {
          throw findUserErr
        }
        if (foundByUser) targetProfileId = foundByUser.id
      } else {
        targetProfileId = foundById.id
      }
    } catch (resolveErr: any) {
      console.error('Failed to resolve profile id:', resolveErr)
      return Response.json({ error: resolveErr?.message || 'Failed to resolve profile' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('traveller_profiles')
      .update(allowed)
      .eq('id', targetProfileId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Supabase update error:', error)
      const status = /permission|forbidden/i.test(error.message || '') ? 403 : 400
      return Response.json({ error: error.message, details: error.details || null }, { status })
    }

    if (!data) {
      console.warn('Update returned no rows (profile not found or not permitted)', { targetProfileId, allowed })
      return Response.json({ error: 'Profile not found or not permitted' }, { status: 404 })
    }

    console.log('Profile updated by admin:', { id: targetProfileId, allowed, result: data })
    return Response.json({ profile: data })
  } catch (err: any) {
    console.error('Admin traveller PATCH error:', err)
    return Response.json({ error: err?.message || 'Failed to update profile' }, { status: 500 })
  }
}
