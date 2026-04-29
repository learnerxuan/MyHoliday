import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect destination
  const next = searchParams.get('next') ?? '/'
  const intent = searchParams.get('intent')

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error, data: { session } } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session?.user) {
      const user = session.user
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
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!traveller) {
          return NextResponse.redirect(`${origin}/auth/onboarding/traveller`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
      }
    }
  }

  // If there's an error or no code, redirect to login with an error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
