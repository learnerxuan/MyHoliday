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

    const onScroll = () => {
      // Use relatively low threshold to quickly snap to the floating pill state length
      setScrolled(window.scrollY > 12)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    // Initial check
    onScroll()

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const close = () => setMenuOpen(false)

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 pointer-events-none transition-all duration-300">
        <div
          className={`mx-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-between border rounded-full ${
            scrolled
              ? 'mt-4 max-w-4xl bg-white/75 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.06)] border-black/5 px-4 py-2'
              : 'mt-0 w-full max-w-[1400px] px-6 md:px-12 py-5 bg-transparent border-transparent'
          }`}
        >
          {/* ── Logo ── */}
          <Link href="/" className="pointer-events-auto flex items-center shrink-0 pl-2" onClick={close}>
            <Image
              src="/logo.png?v=2"
              alt="MyHoliday"
              width={140}
              height={40}
              className={`object-contain transition-all duration-300 ${scrolled ? 'h-6' : 'h-8'}`}
              priority
              unoptimized
            />
          </Link>

          {/* ── Desktop Middle Nav ── */}
          <nav
            className={`hidden md:flex items-center pointer-events-auto transition-all duration-300 rounded-full ${
              scrolled ? 'gap-6 px-2 bg-transparent' : 'gap-6 bg-black/5 px-7 py-2.5'
            }`}
          >
            {role === 'admin' ? (
              <>
                <NavLink href="/admin">Dashboard</NavLink>
                <NavLink href="/admin/users">Users</NavLink>
                <NavLink href="/admin/tour-guides">Tour Guide</NavLink>
                <NavLink href="/admin/marketplace">Marketplace</NavLink>
                <NavLink href="/admin/reports">Reports</NavLink>
              </>
            ) : (
              <>
                {(role === 'traveller' || !role) && <NavLink href="/quiz">Plan a Trip</NavLink>}
                <NavLink href="/destinations">Destinations</NavLink>
                <NavLink href="/itineraries">Itineraries</NavLink>
                <NavLink href="/marketplace">Marketplace</NavLink>
                <NavLink href="/about">About</NavLink>
              </>
            )}
          </nav>

          {/* ── Desktop Right Auth ── */}
          <div
            className={`hidden md:flex items-center pointer-events-auto transition-all duration-300 rounded-full ${
              scrolled ? 'gap-4 pr-1 bg-transparent' : 'gap-4 bg-black/5 p-1.5 pl-6'
            }`}
          >
            {user ? (
              <>
                <NavLink href="/profile">Profile</NavLink>
                <button
                  onClick={signOut}
                  className={`text-sm font-semibold font-body text-error hover:text-red-700 transition-colors h-full ${
                    scrolled ? 'py-1.5 px-3 rounded-full hover:bg-red-50' : 'py-2 px-4 rounded-full bg-white shadow-sm hover:bg-red-50'
                  }`}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={close}
                  className="text-sm font-semibold font-body text-charcoal hover:text-amber transition-colors px-2"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  onClick={close}
                  className={`text-sm font-semibold font-body bg-amber text-warmwhite transition-colors tracking-wide shadow-sm flex items-center justify-center ${
                    scrolled ? 'px-4 py-2 rounded-full hover:bg-amberdark' : 'px-5 py-2 rounded-full hover:bg-amberdark'
                  }`}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile Hamburger ── */}
          <button
            className={`md:hidden pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
              scrolled ? 'hover:bg-black/5 border border-black/5' : 'bg-black/5 hover:bg-black/10'
            }`}
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

        {/* ── Mobile Dropdown ── */}
        <div
          className={`md:hidden pointer-events-auto transition-all duration-300 absolute left-4 right-4 top-full mt-2 bg-white/95 backdrop-blur-xl border border-black/10 rounded-2xl p-4 shadow-xl overflow-hidden origin-top ${
            menuOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
          }`}
        >
          <div className="flex flex-col space-y-1">
            {role === 'admin' ? (
              <>
                <MobileNavLink href="/admin" onClick={close}>Dashboard</MobileNavLink>
                <MobileNavLink href="/admin/users" onClick={close}>Users</MobileNavLink>
                <MobileNavLink href="/admin/tour-guides" onClick={close}>Tour Guide</MobileNavLink>
                <MobileNavLink href="/admin/marketplace" onClick={close}>Marketplace</MobileNavLink>
                <MobileNavLink href="/admin/reports" onClick={close}>Reports</MobileNavLink>
              </>
            ) : (
              <>
                {(role === 'traveller' || !role) && <MobileNavLink href="/quiz" onClick={close}>Plan a Trip ✨</MobileNavLink>}
                <MobileNavLink href="/destinations" onClick={close}>Destinations</MobileNavLink>
                <MobileNavLink href="/itineraries" onClick={close}>Itineraries</MobileNavLink>
                <MobileNavLink href="/marketplace" onClick={close}>Marketplace</MobileNavLink>
                <MobileNavLink href="/about" onClick={close}>About</MobileNavLink>
              </>
            )}

            <div className="pt-3 mt-2 border-t border-black/5 space-y-2">
              {user ? (
                <>
                  <MobileNavLink href="/profile" onClick={close}>Profile</MobileNavLink>
                  <button
                    onClick={() => { signOut(); close() }}
                    className="w-full text-left text-sm font-semibold font-body text-error px-4 py-3 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    href="/auth/login"
                    onClick={close}
                    className="flex items-center justify-center text-sm font-semibold font-body text-charcoal border border-black/10 bg-white px-4 py-3 rounded-xl hover:bg-black/5 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={close}
                    className="flex items-center justify-center text-sm font-semibold font-body bg-amber text-warmwhite px-4 py-3 rounded-xl hover:bg-amberdark transition-colors shadow-sm"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

function NavLink({ href, onClick, children }: { href: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-sm font-semibold font-body text-charcoal/70 hover:text-charcoal transition-colors tracking-wide"
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
      className="block text-base font-semibold font-body text-charcoal hover:text-amber transition-colors px-4 py-3 rounded-xl hover:bg-black/5"
    >
      {children}
    </Link>
  )
}
