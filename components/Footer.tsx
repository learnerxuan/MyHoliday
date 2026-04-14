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
    <footer className="bg-[#1C1A1A] py-16 px-8 lg:px-12 border-t border-white/10 shrink-0 mt-auto">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between gap-12">
        
        <div className="flex flex-col gap-6 max-w-sm">
          <div className="flex items-center gap-2">
            <span className="text-white font-display font-extrabold text-2xl tracking-tight">myholiday</span>
          </div>
          <p className="text-[#A09D9A] text-sm font-body leading-relaxed">
            MyHoliday is a capstone project built to rethink travel planning through AI-powered preference matching and direct guide negotiations.
          </p>
          <p className="text-[#A09D9A]/60 text-xs font-body mt-4">
            © 2026 MyHoliday. All rights reserved.
          </p>
        </div>

        <div className="flex gap-16 md:gap-24">
          <div className="flex flex-col gap-4">
            <h4 className="text-[#d48c44] font-bold text-[10px] uppercase tracking-widest font-body">Explore</h4>
            <Link href="/destinations" className="text-[#A09D9A] hover:text-white transition-colors text-sm font-body">Destinations</Link>
            <Link href="/marketplace" className="text-[#A09D9A] hover:text-white transition-colors text-sm font-body">Marketplace</Link>
          </div>
          
          <div className="flex flex-col gap-4">
            <h4 className="text-[#d48c44] font-bold text-[10px] uppercase tracking-widest font-body">Account</h4>
            <Link href="/auth/login" className="text-[#A09D9A] hover:text-white transition-colors text-sm font-body">Sign In</Link>
            <Link href="/auth/register" className="text-[#A09D9A] hover:text-white transition-colors text-sm font-body">Register</Link>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-[#d48c44] font-bold text-[10px] uppercase tracking-widest font-body">System</h4>
            <Link href="/about" className="text-[#A09D9A] hover:text-white transition-colors text-sm font-body">About</Link>
            <Link href="/quiz" className="text-[#A09D9A] hover:text-white transition-colors text-sm font-body">Plan a Trip</Link>
          </div>
        </div>
        
      </div>
    </footer>
  )
}
