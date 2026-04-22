'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, signInWithEmail } from '@/lib/supabase/auth'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState<'email' | 'google' | null>(null)
  const [error, setError]       = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/')
        router.refresh()
      }
    })
  }, [router])

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading('email')
    setError('')

    const { error: err } = await signInWithEmail(email, password)
    if (err) {
      if (err.message.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.')
      } else if (err.message.includes('Email not confirmed')) {
        setError('Please confirm your email address first — check your inbox.')
      } else {
        setError(err.message)
      }
      setLoading(null)
      return
    }

    router.replace('/')
    router.refresh()
  }

  async function handleGoogleSignIn() {
    setLoading('google')
    await signInWithGoogle()
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
            Your AI-powered travel companion
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-border px-6 sm:px-8 py-8 space-y-5">

          <div>
            <h2 className="text-2xl font-extrabold font-display text-charcoal">Welcome back</h2>
            <p className="mt-1 text-sm font-body text-secondary">
              Sign in to continue planning your perfect trip.
            </p>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold font-body text-charcoal uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/auth/reset-password"
                  className="text-xs font-body text-amber hover:text-amberdark transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
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
              {loading === 'email' ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <Divider />

          <button
            onClick={handleGoogleSignIn}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-5 rounded-xl border border-border bg-white hover:bg-subtle transition-colors text-sm font-semibold font-body text-charcoal disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'google'
              ? <Spinner className="border-charcoal border-t-transparent" />
              : <GoogleIcon />}
            {loading === 'google' ? 'Redirecting…' : 'Sign in with Google'}
          </button>

          <p className="text-center text-sm font-body text-secondary pt-1">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-amber hover:text-amberdark font-semibold transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs font-body text-tertiary">
          By signing in you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
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
