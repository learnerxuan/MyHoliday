import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { destinationId } = await req.json()
    if (!destinationId) {
      return Response.json({ error: 'Missing destinationId' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    
    // Security Upgrade: use getUser() instead of getSession() for authenticating the identity
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ message: 'Anonymous interaction not tracked' }, { status: 200 })
    }

    const { error } = await supabase
      .from('user_interactions')
      .insert({
        user_id: user.id,
        destination_id: destinationId,
        type: 'click'
      })

    if (error) {
      console.error('Interaction storage error:', error)
      return Response.json({ success: false, error: error.message }, { status: 200 })
    }

    return Response.json({ success: true })

  } catch (error) {
    console.error('Interactions API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
