'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

// Handles both OAuth flows:
// - Implicit flow: #access_token=... in the URL hash (handled by browser client automatically)
// - PKCE flow:     ?code=... in the query string (also handled by browser client)
//
// The Supabase browser client detects both on mount and fires onAuthStateChange.

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const user = session.user
          const intent = searchParams.get('intent')
          const role = user.user_metadata?.role

          if (role === 'admin') {
            router.replace('/admin')
            return
          }

          if (intent === 'guide' || role === 'guide') {
            const { data: guide } = await supabase
              .from('tour_guides')
              .select('id, verification_status')
              .eq('user_id', user.id)
              .maybeSingle()

            if (!guide) {
              router.replace('/auth/onboarding/guide')
            } else {
              router.replace('/guide')
            }
          } else {
            const { data: traveller } = await supabase
              .from('traveller_profiles')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle()

            if (!traveller) {
              router.replace('/auth/onboarding/traveller')
            } else {
              router.replace('/')
            }
          }
          router.refresh()
        }

        if (event === 'SIGNED_OUT') {
          router.replace('/auth/login')
        }
      }
    )

    const fallback = setTimeout(() => {
      router.replace('/auth/login?error=auth_failed')
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallback)
    }
  }, [router])

  return (
    <div className="h-screen flex items-center justify-center bg-warmwhite">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-body text-secondary">Signing you in...</p>
      </div>
    </div>
  )
}

// Keep this wrapped so the auth callback can render consistently in App Router.
import { Suspense } from 'react'

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-warmwhite">
        <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
