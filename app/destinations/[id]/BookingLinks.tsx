'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface BookingLinksProps {
  city: string
}

export default function BookingLinks({ city }: BookingLinksProps) {
  // Base URLs
  const [hotelUrl, setHotelUrl] = useState(`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}`)
  const [flightUrl, setFlightUrl] = useState(`https://www.google.com/flights?q=flights+to+${encodeURIComponent(city)}`)
  
  const tripAdvisorUrl = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(city)}`
  const lonelyPlanetUrl = `https://www.lonelyplanet.com/search?q=${encodeURIComponent(city)}`

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('quiz_prefs')
      if (!raw) return

      const quiz = JSON.parse(raw)
      const start = quiz.travelDateStart
      const end = quiz.travelDateEnd
      const groupSize = quiz.groupSize

      // Default to 2 adults if not specified or unrecognized
      let adults = 2
      if (groupSize === 'Solo') adults = 1
      else if (groupSize === 'Couple') adults = 2
      else if (groupSize === 'Small Group') adults = 4
      else if (groupSize === 'Large Group') adults = 8

      // Build Booking.com URL
      if (start && end) {
        setHotelUrl(
          `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${start}&checkout=${end}&group_adults=${adults}&no_rooms=1&group_children=0`
        )

        // Google Flights has an incredibly smart natural language search parser
        // We can just append the dates and passenger count into the `q` query
        setFlightUrl(
          `https://www.google.com/travel/flights?q=flights+to+${encodeURIComponent(city)}+from+${start}+to+${end}+for+${adults}+adults`
        )
      }
    } catch {
      // Ignore parse errors
    }
  }, [city])

  return (
    <div className="flex flex-col gap-3">
      <a
        href={hotelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-amber transition-colors group"
      >
        <span className="text-2xl">🏨</span>
        <div>
          <p className="text-sm font-semibold font-body text-charcoal group-hover:text-amber transition-colors">
            Find Hotels
          </p>
          <p className="text-xs font-body text-secondary">Search on Booking.com</p>
        </div>
      </a>
      <a
        href={flightUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-amber transition-colors group"
      >
        <span className="text-2xl">✈️</span>
        <div>
          <p className="text-sm font-semibold font-body text-charcoal group-hover:text-amber transition-colors">
            Find Flights
          </p>
          <p className="text-xs font-body text-secondary">Search on Google Flights</p>
        </div>
      </a>
      <a
        href={tripAdvisorUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-amber transition-colors group"
      >
        <span className="text-2xl">🎯</span>
        <div>
          <p className="text-sm font-semibold font-body text-charcoal group-hover:text-amber transition-colors">
            Things To Do
          </p>
          <p className="text-xs font-body text-secondary">Browse on TripAdvisor</p>
        </div>
      </a>
      <a
        href={lonelyPlanetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-amber transition-colors group"
      >
        <span className="text-2xl">📖</span>
        <div>
          <p className="text-sm font-semibold font-body text-charcoal group-hover:text-amber transition-colors">
            Travel Guide
          </p>
          <p className="text-xs font-body text-secondary">Read on Lonely Planet</p>
        </div>
      </a>
    </div>
  )
}
