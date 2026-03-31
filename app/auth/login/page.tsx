'use client'

import { useState } from 'react'
import { signInWithGoogle } from '@/lib/supabase/auth'

export default function LoginPage() {
  const [loading, setLoading] = useState<'traveller' | 'guide' | null>(null)

  async function handleTravellerSignIn() {
    setLoading('traveller')
    await signInWithGoogle()
  }

  async function handleGuideSignIn() {
    setLoading('guide')
    await signInWithGoogle('guide')
  }

  return (
    <main className="min-h-screen bg-warmwhite flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-charcoal tracking-tight">
            My<span className="text-amber">Holiday</span>
          </h1>
          <p className="mt-3 text-sm font-body text-secondary">
            Your AI-powered travel companion
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-border px-4 sm:px-8 py-8 sm:py-10 space-y-6">

          <div className="text-center">
            <h2 className="text-2xl font-extrabold font-display text-charcoal">
              Welcome back
            </h2>
            <p className="mt-1 text-sm font-body text-secondary">
              Sign in with your Google account to continue
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Traveller sign-in */}
          <div className="space-y-2">
            <p className="text-xs font-semibold font-body text-tertiary uppercase tracking-wider">
              For Travellers
            </p>
            <button
              onClick={handleTravellerSignIn}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-5 rounded-xl border border-border bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm font-semibold font-body text-charcoal disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'traveller' ? (
                <span className="h-5 w-5 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {loading === 'traveller' ? 'Redirecting…' : 'Sign in with Google'}
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Tour guide sign-in */}
          <div className="space-y-2">
            <p className="text-xs font-semibold font-body text-tertiary uppercase tracking-wider">
              For Tour Guides
            </p>
            <button
              onClick={handleGuideSignIn}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-5 rounded-xl border border-amber bg-amber hover:bg-amberdark active:bg-amberdark transition-colors text-sm font-semibold font-body text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'guide' ? (
                <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <GoogleIcon className="text-white" />
              )}
              {loading === 'guide' ? 'Redirecting…' : 'Register / Sign in as Tour Guide'}
            </button>
            <p className="text-xs font-body text-tertiary text-center">
              New guides will complete a short profile setup after signing in.
            </p>
          </div>

        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs font-body text-tertiary">
          By signing in you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  )
}

function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
