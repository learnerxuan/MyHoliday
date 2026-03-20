'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase, signOut } from '@/lib/supabase/auth'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string>('')
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setRole(user?.user_metadata?.role ?? '')
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setRole(session?.user?.user_metadata?.role ?? '')
    })
    
    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav className="border-b border-border bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <Link href="/" className="text-xl font-extrabold font-display text-charcoal">
        My<span className="text-amber">Holiday</span>
      </Link>
      
      <div className="flex gap-6 items-center">
        {/* Navigation links based on role */}
        {role === 'admin' && (
          <Link href="/admin" className="text-sm font-semibold text-secondary hover:text-charcoal transition-colors">
            Admin Dashboard
          </Link>
        )}
        
        {role === 'guide' && (
          <Link href="/guide/marketplace" className="text-sm font-semibold text-secondary hover:text-charcoal transition-colors">
            Marketplace
          </Link>
        )}

        {role === 'traveller' && (
          <Link href="/planner" className="text-sm font-semibold text-secondary hover:text-charcoal transition-colors">
            Plan a Trip
          </Link>
        )}

        {user ? (
          <div className="flex items-center gap-4 border-l border-border pl-4">
            <Link href="/profile" className="text-sm font-semibold text-secondary hover:text-charcoal transition-colors">
              Profile
            </Link>
            <button 
              onClick={signOut}
              className="text-sm font-semibold text-error hover:text-red-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link href="/auth/login" className="text-sm font-semibold bg-amber text-white px-4 py-2 rounded-xl hover:bg-amberdark transition-colors">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}
