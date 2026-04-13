'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Google OAuth ─────────────────────────────────────────────

export async function signInWithGoogle(intent?: 'guide') {
  const redirectTo = intent
    ? `${window.location.origin}/auth/callback?intent=guide`
    : `${window.location.origin}/auth/callback`

  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
}

// ── Email / Password ──────────────────────────────────────────

/**
 * Register a new user with email + password.
 * Supabase sends a confirmation email; user must click it before signing in.
 * Intent is forwarded via emailRedirectTo so the callback page knows
 * which onboarding flow to start (same mechanism as OAuth).
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  intent?: 'guide'
) {
  const redirectTo = intent
    ? `${window.location.origin}/auth/callback?intent=guide`
    : `${window.location.origin}/auth/callback`

  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  })
}

/**
 * Sign in a returning email/password user.
 */
export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * Send a password reset email.
 * User is directed to /auth/update-password after clicking the link.
 */
export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/update-password`,
  })
}

// ── Sign Out ──────────────────────────────────────────────────

export async function signOut() {
  await supabase.auth.signOut()
  window.location.href = '/'
}
