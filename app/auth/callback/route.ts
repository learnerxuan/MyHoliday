import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect destination
  const next = searchParams.get('next') ?? '/'
  const intent = searchParams.get('intent')

  const supabase = await createSupabaseServerClient()
  let user = null

  let authErrorMsg = 'auth_failed'

  if (code) {
    const { error, data: { session } } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('exchangeCodeForSession error:', error)
      authErrorMsg = error.message
    }
    if (!error && session?.user) {
      user = session.user
    }
  } else {
    // If no code, check if there's already an active session (e.g. from client-side email login)
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      user = data.user
    }
  }

  if (user) {
    const role = user.user_metadata?.role

      if (role === 'admin') {
        return NextResponse.redirect(`${origin}/admin`)
      }

      if (intent === 'guide' || role === 'guide') {
        const { data: guide } = await supabase
          .from('tour_guides')
          .select('id, verification_status')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!guide) {
          return NextResponse.redirect(`${origin}/auth/onboarding/guide`)
        } else {
          return NextResponse.redirect(`${origin}/guide`)
        }
      } else {
        const { data: traveller } = await supabase
        .from('traveller_profiles')
        .select('id, is_active')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!traveller) {
        return NextResponse.redirect(`${origin}/auth/onboarding/traveller`)
      } else if (traveller.is_active === false) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/auth/login?error=Your account has been deactivated by an administrator.`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }  }
    }


  // If there's an error or no code, redirect to login with an error
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(authErrorMsg)}`)
}
