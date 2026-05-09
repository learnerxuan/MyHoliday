'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function GuideTabs() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-8 mb-8 border-b border-border/60">
      <TabLink href="/guide/itinerary" active={pathname?.startsWith('/guide/itinerary') || pathname === '/guide'}>
        Itinerary
      </TabLink>
      <TabLink href="/guide/chats" active={pathname?.startsWith('/guide/chats')}>
        Chats
      </TabLink>
      <TabLink href="/guide/bookings" active={pathname?.startsWith('/guide/bookings')}>
        Bookings
      </TabLink>
      <TabLink href="/guide/history" active={pathname?.startsWith('/guide/history')}>
        Schedule
      </TabLink>
    </div>
  )
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
        active 
          ? 'border-charcoal text-charcoal' 
          : 'border-transparent text-secondary hover:text-charcoal'
      }`}
    >
      {children}
    </Link>
  )
}
