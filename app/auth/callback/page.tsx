'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

// Handles both OAuth flows:
// - Implicit flow: #access_token=... in the URL hash (handled by browser client automatically)
// - PKCE flow:     ?code=... in the query string (also handled by browser client)
//
// The Supabase browser client detects both on mount and fires onAuthStateChange.

function CallbackHandler() {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          router.replace('/')
          router.refresh()
        }

        if (event === 'SIGNED_OUT') {
          router.replace('/auth/login')
        }
      }
    )

    // Safety fallback: if no auth event fires in 5s, redirect to login
    const fallback = setTimeout(() => {
      router.replace('/auth/login?error=auth_failed')
    }, 5000)

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
