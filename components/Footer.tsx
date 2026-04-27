"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()
  
  // Hide the footer on immersive full-screen views
  if (pathname?.startsWith('/itinerary') || pathname?.startsWith('/saved-itinerary') || pathname === '/quiz') {
    return null
  }

  return (
    <footer className="bg-[#1C1A1A] py-10 sm:py-16 px-5 sm:px-8 lg:px-12 border-t border-white/10 shrink-0 mt-auto">
      <div className="max-w-[1200px] mx-auto">

        {/* Main content: brand + links */}
        <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-12">
          
          {/* Brand block */}
          <div className="flex flex-col gap-3 sm:gap-4 max-w-sm">
            <span className="text-white font-display font-extrabold text-xl sm:text-2xl tracking-tight">myholiday</span>
            <p className="text-[#A09D9A] text-sm font-body leading-relaxed">
              MyHoliday is a capstone project built to rethink travel planning through AI-powered preference matching and direct guide negotiations.
            </p>
          </div>

          {/* Navigation links — 3 columns, compacted on mobile */}
          <div className="grid grid-cols-3 gap-6 sm:gap-16 md:gap-24 shrink-0">
            <div className="flex flex-col gap-3 sm:gap-4">
              <h4 className="text-[#d48c44] font-bold text-[10px] uppercase tracking-widest font-body">Explore</h4>
              <Link href="/destinations" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Destinations</Link>
              <Link href="/marketplace" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Marketplace</Link>
            </div>
            
            <div className="flex flex-col gap-3 sm:gap-4">
              <h4 className="text-[#d48c44] font-bold text-[10px] uppercase tracking-widest font-body">Account</h4>
              <Link href="/auth/login" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Sign In</Link>
              <Link href="/auth/register" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Register</Link>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4">
              <h4 className="text-[#d48c44] font-bold text-[10px] uppercase tracking-widest font-body">System</h4>
              <Link href="/about" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">About</Link>
              <Link href="/quiz" className="text-[#A09D9A] hover:text-white transition-colors text-xs sm:text-sm font-body">Plan a Trip</Link>
            </div>
          </div>
          
        </div>

        {/* Bottom copyright strip */}
        <div className="mt-8 sm:mt-12 pt-6 border-t border-white/10">
          <p className="text-[#A09D9A]/60 text-xs font-body text-center sm:text-left">
            © 2026 MyHoliday. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  )
}
