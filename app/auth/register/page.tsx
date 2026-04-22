'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, signUpWithEmail } from '@/lib/supabase/auth'
import { supabase } from '@/lib/supabase/client'

type Role = 'traveller' | 'guide'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [role, setRole]         = useState<Role>('traveller')
  const [loading, setLoading]   = useState<'email' | 'google-traveller' | 'google-guide' | null>(null)
  const [error, setError]       = useState('')
  const [sent, setSent]         = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/')
        router.refresh()
      }
    })
  }, [router])

  async function handleEmailSignUp(e: React.FormEvent) {
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

    setLoading('email')
    const intent = role === 'guide' ? 'guide' : undefined
    const { data, error: err } = await signUpWithEmail(email, password, intent)

    if (err) {
      if (err.message.includes('already registered')) {
        setError('An account with this email already exists. Try signing in instead.')
      } else if (err.message.toLowerCase().includes('rate limit')) {
        setError('Too many attempts. Please wait a few minutes before trying again.')
      } else {
        setError(err.message)
      }
      setLoading(null)
      return
    }

    // Email confirmation disabled: Supabase returns a session immediately.
    if (data.session) {
      router.replace('/')
      router.refresh()
      return
    }

    // session is null + no error = email already registered (Supabase silent anti-enumeration)
    // OR email confirmation is still ON → show inbox screen
    // Check which case we're in by looking at the user's identity providers
    if (data.user?.identities?.length === 0) {
      // identities array is empty = email already registered
      setError('An account with this email already exists. Try signing in instead.')
      setLoading(null)
      return
    }

    // Email confirmation is ON → show "check your inbox" screen
    setSent(true)
  }

  async function handleGoogleSignUp(intent?: 'guide') {
    setLoading(intent === 'guide' ? 'google-guide' : 'google-traveller')
    await signInWithGoogle(intent)
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-warmwhite flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-border px-6 sm:px-8 py-10 text-center space-y-4">
          <div className="text-5xl">📬</div>
          <h2 className="text-2xl font-extrabold font-display text-charcoal">Check your inbox!</h2>
          <p className="text-sm font-body text-secondary leading-relaxed">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account and complete your profile setup.
          </p>
          <p className="text-xs font-body text-tertiary">
            Didn&apos;t receive it? Check your spam folder.
          </p>
          <Link
            href="/auth/login"
            className="inline-block mt-2 text-sm font-semibold font-body text-amber hover:text-amberdark transition-colors"
          >
            ← Back to Sign In
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pt-28 pb-12 px-4 flex flex-col items-center bg-warmwhite">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-charcoal tracking-tight">
            My<span className="text-amber">Holiday</span>
          </h1>
          <p className="mt-2 text-sm font-body text-secondary">
            Create your account to start planning
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-border px-6 sm:px-8 py-8 space-y-5">

          <div>
            <h2 className="text-2xl font-extrabold font-display text-charcoal">Create an account</h2>
            <p className="mt-1 text-sm font-body text-secondary">
              Join MyHoliday and discover your next adventure.
            </p>
          </div>

          {/* Role selector */}
          <div className="space-y-2">
            <p className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
              I am a
            </p>
            <div className="grid grid-cols-2 gap-3">
              <RoleCard
                active={role === 'traveller'}
                onClick={() => setRole('traveller')}
                emoji="🧳"
                label="Traveller"
                description="Explore destinations & plan trips"
              />
              <RoleCard
                active={role === 'guide'}
                onClick={() => setRole('guide')}
                emoji="🗺️"
                label="Tour Guide"
                description="Connect with travellers in my city"
              />
            </div>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
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

            <div className="space-y-1">
              <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
                Password{' '}
                <span className="text-tertiary font-normal normal-case">(min 8 characters)</span>
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Create a password"
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
                placeholder="Repeat your password"
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
              disabled={loading !== null}
              className="w-full py-2.5 px-5 rounded-xl bg-amber hover:bg-amberdark transition-colors text-sm font-semibold font-body text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading === 'email' && <Spinner />}
              {loading === 'email' ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <Divider />

          {/* Google sign-up buttons */}
          <div className="space-y-2">
            <button
              onClick={() => handleGoogleSignUp()}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-5 rounded-xl border border-border bg-white hover:bg-subtle transition-colors text-sm font-semibold font-body text-charcoal disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'google-traveller'
                ? <Spinner className="border-charcoal border-t-transparent" />
                : <GoogleIcon />}
              {loading === 'google-traveller' ? 'Redirecting…' : 'Sign up as Traveller with Google'}
            </button>

            <button
              onClick={() => handleGoogleSignUp('guide')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-5 rounded-xl border border-amber bg-amber hover:bg-amberdark transition-colors text-sm font-semibold font-body text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'google-guide'
                ? <Spinner />
                : <GoogleIcon className="text-white" />}
              {loading === 'google-guide' ? 'Redirecting…' : 'Sign up as Tour Guide with Google'}
            </button>
          </div>

          <p className="text-center text-sm font-body text-secondary pt-1">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-amber hover:text-amberdark font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs font-body text-tertiary">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  )
}

function RoleCard({
  active, onClick, emoji, label, description,
}: {
  active: boolean
  onClick: () => void
  emoji: string
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border-2 p-3 transition-all ${
        active ? 'border-amber bg-amber/5' : 'border-border hover:border-amber/50'
      }`}
    >
      <div className="text-xl mb-1">{emoji}</div>
      <p className={`text-xs font-semibold font-body ${active ? 'text-amber' : 'text-charcoal'}`}>
        {label}
      </p>
      <p className="text-xs font-body text-tertiary leading-snug mt-0.5">{description}</p>
    </button>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs font-body text-tertiary">or</span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}

function Spinner({ className = 'border-white border-t-transparent' }: { className?: string }) {
  return <span className={`h-4 w-4 border-2 rounded-full animate-spin shrink-0 ${className}`} />
}

function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 shrink-0 ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
