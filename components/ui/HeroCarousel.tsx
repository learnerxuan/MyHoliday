'use client'

import { useState, useEffect } from 'react'

interface CarouselDestination {
  id: string
  city: string
  country: string
  imageUrl: string | null
}

const COUNTRY_ABBREVIATIONS: Record<string, string> = {
  'United Arab Emirates': 'UAE',
  'United States of America': 'USA',
  'United States': 'USA',
  'United Kingdom': 'UK',
}

function formatCountry(country: string) {
  return COUNTRY_ABBREVIATIONS[country] || country
}

export default function HeroCarousel({ destinations }: { destinations: CarouselDestination[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Use all destinations, we will render a placeholder if imageUrl is missing
  const validDestinations = destinations.length > 0 ? destinations : []
  
  useEffect(() => {
    if (validDestinations.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validDestinations.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [validDestinations.length, currentIndex])

  if (validDestinations.length === 0) {
    return (
      <div className="w-full h-[360px] md:h-[420px] bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
        <p className="text-white/50 font-body text-sm">Discovering destinations...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[360px] md:h-[420px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 group">
      {validDestinations.map((dest, index) => {
        const initial = dest.city.charAt(0).toUpperCase()
        return (
          <div
            key={dest.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            {dest.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dest.imageUrl}
                alt={`${dest.city}, ${dest.country}`}
                className="w-full h-full object-cover transition-transform duration-[10000ms] scale-100 group-hover:scale-105"
              />
            ) : (
               <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber/30 to-charcoal/60">
                 <span className="text-5xl font-extrabold font-display text-warmwhite/70">{initial}</span>
               </div>
            )}
            {/* Gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-black/40 to-transparent" />
            
            <div className="absolute bottom-8 left-8 right-8">
              <p className="text-amber text-xs font-semibold uppercase tracking-widest mb-2 drop-shadow-md">Recommended</p>
              <h3 className="text-3xl sm:text-4xl font-extrabold font-display text-white drop-shadow-md leading-none break-words">
                {dest.city}
              </h3>
              <p className="font-medium font-body text-white/80 text-xl sm:text-2xl drop-shadow-md mt-0.5">
                {formatCountry(dest.country)}
              </p>
            </div>
          </div>
        )
      })}

      {/* Navigation Arrows */}
      <button
        onClick={() => setCurrentIndex((prev) => (prev - 1 + validDestinations.length) % validDestinations.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/50 text-white backdrop-blur-[2px] transition-all opacity-0 group-hover:opacity-100"
        aria-label="Previous slide"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button
        onClick={() => setCurrentIndex((prev) => (prev + 1) % validDestinations.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/50 text-white backdrop-blur-[2px] transition-all opacity-0 group-hover:opacity-100"
        aria-label="Next slide"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 right-8 z-20 flex gap-2">
        {validDestinations.map((_, index) => (
          <button
            key={index}
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all ${index === currentIndex ? 'bg-amber w-6' : 'bg-white/40 w-3 hover:bg-white/70'}`}
          />
        ))}
      </div>
    </div>
  )
}
