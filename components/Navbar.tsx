'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { signOut } from '@/lib/supabase/auth'

export default function Navbar() {
  const [user, setUser]       = useState<any>(null)
  const [role, setRole]       = useState<string>('')
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setRole(user?.user_metadata?.role ?? '')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setRole(session?.user?.user_metadata?.role ?? '')
    })

    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Close mobile menu on route change
  const close = () => setMenuOpen(false)

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-border'
          : 'bg-white border-b border-border'
      }`}
    >
      {/* ── Main bar ── */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0" onClick={close}>
          <Image
            src="/logo.png?v=2"
            alt="MyHoliday"
            width={140}
            height={40}
            className="h-8 sm:h-9 w-auto object-contain"
            priority
            unoptimized
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {role === 'admin'      && <NavLink href="/admin" onClick={close}>Admin Dashboard</NavLink>}
          {role === 'guide'      && <NavLink href="/guide/marketplace" onClick={close}>Marketplace</NavLink>}
          {(role === 'traveller' || !role) && <NavLink href="/quiz" onClick={close}>Plan a Trip</NavLink>}
          <NavLink href="/destinations" onClick={close}>Destinations</NavLink>
          <NavLink href="/guide/marketplace" onClick={close}>Guides</NavLink>

          <div className="ml-3 pl-3 border-l border-border flex items-center gap-2">
            {user ? (
              <>
                <NavLink href="/profile" onClick={close}>Profile</NavLink>
                <button
                  onClick={signOut}
                  className="text-sm font-semibold font-body text-error hover:text-red-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                onClick={close}
                className="text-sm font-semibold font-body bg-amber text-warmwhite px-4 py-2 rounded-lg hover:bg-amberdark transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile: hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-subtle transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile dropdown menu ── */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-white px-4 pb-4 space-y-1">
          {role === 'admin'      && <MobileNavLink href="/admin"              onClick={close}>Admin Dashboard</MobileNavLink>}
          {role === 'guide'      && <MobileNavLink href="/guide/marketplace"  onClick={close}>Marketplace</MobileNavLink>}
          {(role === 'traveller' || !role) && <MobileNavLink href="/quiz" onClick={close}>Plan a Trip ✨</MobileNavLink>}
          <MobileNavLink href="/destinations" onClick={close}>Destinations</MobileNavLink>
          <MobileNavLink href="/guide/marketplace" onClick={close}>Local Guides</MobileNavLink>

          <div className="pt-2 border-t border-border space-y-1">
            {user ? (
              <>
                <MobileNavLink href="/profile" onClick={close}>Profile</MobileNavLink>
                <button
                  onClick={() => { signOut(); close() }}
                  className="w-full text-left text-sm font-semibold font-body text-error px-3 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                onClick={close}
                className="block text-center text-sm font-semibold font-body bg-amber text-warmwhite px-4 py-2.5 rounded-lg hover:bg-amberdark transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

function NavLink({ href, onClick, children }: { href: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-sm font-semibold font-body text-secondary hover:text-charcoal transition-colors px-3 py-1.5 rounded-lg hover:bg-subtle"
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block text-sm font-semibold font-body text-secondary hover:text-charcoal transition-colors px-3 py-2.5 rounded-lg hover:bg-subtle"
    >
      {children}
    </Link>
  )
}
