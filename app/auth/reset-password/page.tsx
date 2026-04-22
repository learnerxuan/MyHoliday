'use client'

import { useState } from 'react'
import Link from 'next/link'
import { sendPasswordReset } from '@/lib/supabase/auth'

const RESET_COOLDOWN_SECONDS = 60
const resetCooldownKey = (email: string) => `myholiday:password-reset:${email.toLowerCase()}`

function getFriendlyResetError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes('rate limit') || lower.includes('too many') || lower.includes('429')) {
    return 'Too many reset emails were requested. Please wait a while before trying again.'
  }

  if (lower.includes('email address not authorized')) {
    return 'Supabase is using the default email sender, so this address is not allowed. Add a custom SMTP provider for real users.'
  }

  return message
}

export default function ResetPasswordPage() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    const key = resetCooldownKey(normalizedEmail)
    const lastSentAt = Number(window.localStorage.getItem(key) || 0)
    const secondsSinceLastSend = Math.floor((Date.now() - lastSentAt) / 1000)

    if (lastSentAt && secondsSinceLastSend < RESET_COOLDOWN_SECONDS) {
      setLoading(false)
      setError(`Please wait ${RESET_COOLDOWN_SECONDS - secondsSinceLastSend}s before requesting another reset email.`)
      return
    }

    const { error: err } = await sendPasswordReset(normalizedEmail)

    setLoading(false)
    if (err) {
      setError(getFriendlyResetError(err.message))
      return
    }

    window.localStorage.setItem(key, String(Date.now()))
    setEmail(normalizedEmail)
    setSent(true)
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

          {sent ? (
            /* Success state */
            <div className="text-center space-y-4 py-2">
              <div className="text-5xl">📬</div>
              <h2 className="text-xl font-extrabold font-display text-charcoal">
                Check your inbox
              </h2>
              <p className="text-sm font-body text-secondary leading-relaxed">
                If <strong>{email}</strong> is registered, you&apos;ll receive a
                password reset link shortly. Check your spam folder if it doesn&apos;t appear.
              </p>
              <Link
                href="/auth/login"
                className="inline-block mt-2 text-sm font-semibold font-body text-amber hover:text-amberdark transition-colors"
              >
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <div>
                <h2 className="text-2xl font-extrabold font-display text-charcoal">
                  Reset your password
                </h2>
                <p className="mt-1 text-sm font-body text-secondary">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
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
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <div className="text-center pt-1">
                <Link
                  href="/auth/login"
                  className="text-sm font-body text-tertiary hover:text-secondary transition-colors"
                >
                  ← Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
