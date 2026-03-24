'use client'

import { supabase } from '@/lib/supabase/client'

export async function signInWithGoogle(intent?: 'guide') {
  const redirectTo = intent
    ? `${window.location.origin}/auth/callback?intent=guide`
    : `${window.location.origin}/auth/callback`

  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
}

export async function signOut() {
  await supabase.auth.signOut()
  window.location.href = '/'
}
