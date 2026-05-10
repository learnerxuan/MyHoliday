"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()

  if (pathname?.startsWith('/itinerary') || pathname?.startsWith('/saved-itinerary') || pathname === '/quiz') {
    return null
  }

  return (
    <footer className="bg-charcoal py-10 sm:py-16 px-5 sm:px-8 lg:px-12 border-t border-white/10 shrink-0 mt-auto">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-12">
          <div className="flex flex-col gap-3 sm:gap-4 max-w-md">
            <span className="text-white font-display font-extrabold text-xl sm:text-2xl tracking-tight">myholiday</span>
            <p className="text-[#A09D9A] text-sm font-body leading-relaxed">
              MyHoliday helps travellers find suitable destinations, build AI-assisted itineraries, and connect with local tour guides through one guided planning flow.
            </p>
            <p className="text-[#A09D9A]/70 text-xs font-body leading-relaxed">
              Academic prototype for AAPP011-4-2 Capstone Project. Payment workflows are simulated for assessment.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-14 md:gap-20 shrink-0">
            <div className="flex flex-col gap-3 sm:gap-4">
              <h4 className="text-amber font-bold text-[10px] uppercase tracking-widest font-body">Plan</h4>
              <Link href="/quiz" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Plan a Trip</Link>
              <Link href="/destinations" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Destinations</Link>
              <Link href="/itineraries" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Itineraries</Link>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4">
              <h4 className="text-amber font-bold text-[10px] uppercase tracking-widest font-body">Connect</h4>
              <Link href="/marketplace" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Marketplace</Link>
              <Link href="/auth/register" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Join as Guide</Link>
              <Link href="/history" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Booking History</Link>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4">
              <h4 className="text-amber font-bold text-[10px] uppercase tracking-widest font-body">Project</h4>
              <Link href="/about" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">About</Link>
              <Link href="/survey" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Survey</Link>
              <Link href="/auth/login" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Sign In</Link>
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 pt-6 border-t border-white/10">
          <p className="text-[#A09D9A]/60 text-xs font-body">
            © 2026 MyHoliday. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
