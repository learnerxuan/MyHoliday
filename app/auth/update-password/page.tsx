'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

// This page is reached when a user clicks the password-reset link in their email.
// Supabase sends the user here with a recovery token in the URL hash.
// The browser client fires onAuthStateChange with event 'PASSWORD_RECOVERY' on mount,
// which is our signal that the token is valid and we can allow the password update.

const RECOVERY_TIMEOUT_MS = 8000

function currentUrlLooksLikeRecovery() {
  if (typeof window === 'undefined') return false

  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''))

  return (
    url.searchParams.has('code') ||
    url.searchParams.get('type') === 'recovery' ||
    hash.get('type') === 'recovery' ||
    hash.has('access_token') ||
    hash.has('refresh_token')
  )
}

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)   // true once PASSWORD_RECOVERY fires
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    const hasRecoveryParams = currentUrlLooksLikeRecovery()

    const fallback = setTimeout(() => {
      if (!active) return
      setError('This reset link is invalid or expired. Please request a new link.')
      router.replace('/auth/reset-password')
    }, RECOVERY_TIMEOUT_MS)

    const markReady = () => {
      if (!active) return
      clearTimeout(fallback)
      setReady(true)
      setError('')
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        markReady()
      }

      // @supabase/ssr uses the PKCE flow, where the reset link can return with
      // a ?code=... URL and then become a normal signed-in recovery session.
      if (hasRecoveryParams && session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        markReady()
      }
    })

    async function verifyExistingRecoverySession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (hasRecoveryParams && session?.user) {
        markReady()
      }
    }

    verifyExistingRecoverySession()

    return () => {
      active = false
      subscription.unsubscribe()
      clearTimeout(fallback)
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    setSuccess(true)
    // Give the user a moment to read the success message, then redirect to login
    setTimeout(() => router.replace('/auth/login'), 2500)
  }

  // Waiting for the recovery token to be detected
  if (!ready && !success) {
    return (
      <main className="min-h-screen bg-warmwhite flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-body text-secondary">Verifying your reset link…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-warmwhite flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold font-display text-charcoal tracking-tight">
            My<span className="text-amber">Holiday</span>
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-border px-6 sm:px-8 py-8 space-y-5">

          {success ? (
            <div className="text-center space-y-4 py-2">
              <div className="text-5xl">✅</div>
              <h2 className="text-xl font-extrabold font-display text-charcoal">
                Password updated!
              </h2>
              <p className="text-sm font-body text-secondary">
                Your password has been changed. Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-extrabold font-display text-charcoal">
                  Set a new password
                </h2>
                <p className="mt-1 text-sm font-body text-secondary">
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
                    New Password{' '}
                    <span className="text-tertiary font-normal normal-case">(min 8 characters)</span>
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="New password"
                    className="input-base"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat new password"
                    className="input-base"
                  />
                </div>

                {error && (
                  <p className="text-sm font-body text-error bg-error-bg rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-5 rounded-xl bg-amber hover:bg-amberdark transition-colors text-sm font-semibold font-body text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && (
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
