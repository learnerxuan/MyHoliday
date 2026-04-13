'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useAppRouter as useRouter } from '@/components/providers/PageTransitionProvider'
import Spinner from '@/components/ui/Spinner'

function extractDay1Preview(content) {
  if (!content) return "No preview available.";
  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    // Expected formats based on AI generation
    if (Array.isArray(json)) {
      // old format array of days
      if (json[0] && Array.isArray(json[0].activities)) {
        return json[0].activities.map(a => a.description || a.activity || '').join(' • ').substring(0, 150) + '...';
      }
    } else if (json.days && json.days.length > 0) {
      const day1 = json.days[0];
      if (day1.activities && Array.isArray(day1.activities)) {
        return day1.activities.map(a => a.description || a.activity || a.title || '').join(' • ').substring(0, 150) + '...';
      }
      return day1.summary || day1.theme || "Day 1 preview not available.";
    }
  } catch (e) {
    // string fallback
    return typeof content === 'string' ? content.substring(0, 150) + '...' : "No preview available.";
  }
  return "No preview available.";
}

export default function ItinerariesPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [itineraries, setItineraries] = useState([])

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch Ongoing Sessions
      const { data: sessionData } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          created_at,
          destination_id,
          destinations ( city, country )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      // Fetch Exported Itineraries completely nested with marketplace and destinations
      const { data: itinData } = await supabase
        .from('itineraries')
        .select(`
          id,
          title,
          created_at,
          destination_id,
          content,
          session_id,
          destinations ( city, country, budget_level ),
          marketplace_listings ( id, status, marketplace_offers ( id ) )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Filter sessions to show only the MOST RECENT one per destination_id
      const uniqueSessions = []
      const seenCities = new Set()
      const sortedSessions = (sessionData || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      for (const s of sortedSessions) {
        if (!seenCities.has(s.destination_id)) {
          uniqueSessions.push(s)
          seenCities.add(s.destination_id)
        }
      }

      setSessions(uniqueSessions)
      setItineraries(itinData || [])
      setLoading(false)
    }

    fetchData()
  }, [router])

  const handleDeleteSession = async (id) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return
    await supabase.from('itineraries').update({ session_id: null }).eq('session_id', id)
    await supabase.from('chat_messages').delete().eq('session_id', id)
    const { error } = await supabase.from('chat_sessions').delete().eq('id', id)
    if (!error) setSessions(prev => prev.filter(s => s.id !== id))
  }

  const handleDeleteItinerary = async (id) => {
    if (!confirm('Are you sure you want to delete this saved plan?')) return
    const { error } = await supabase.from('itineraries').delete().eq('id', id)
    if (!error) setItineraries(prev => prev.filter(i => i.id !== id))
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner className="w-10 h-10 border-4" />
      </div>
    )
  }

  return (
    <div className="w-full bg-warmwhite min-h-screen font-body pb-24 pt-8 sm:pt-12 px-4 sm:px-6 lg:px-8">
      <section className="max-w-5xl mx-auto p-6 lg:p-12 bg-white rounded-[24px] shadow-sm border border-border/50">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#d48c44]/10 text-[#d48c44] px-3 py-1.5 text-[11px] font-bold rounded-md mb-2 uppercase tracking-[0.2em] leading-none">
              📁 My Plans
            </div>
            <h1 className="text-4xl sm:text-[44px] tracking-tight font-extrabold text-charcoal font-display">
              Your Saved Itineraries
            </h1>
            <p className="text-secondary text-[16px] leading-relaxed mt-4 max-w-lg">
              Manage your ongoing planning chats and your finalized, exported trips in one place.
            </p>
          </div>
          <button
            onClick={() => router.push('/destinations')}
            className="mt-6 md:mt-0 bg-[#1A1A1A] hover:bg-black text-white text-[15px] px-8 py-3.5 rounded-[10px] transition-colors font-bold tracking-wide shadow-lg shadow-black/10"
          >
            + Plan New Trip
          </button>
        </div>

        {/* ── CONTENT BODY ── */}
        <div className="space-y-20">

        {/* Exported / Finalized Plans */}
        {itineraries.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-charcoal font-display mb-8">Completed Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {itineraries.map(itin => {
                const city = itin.destinations?.city || 'Unknown'
                const country = itin.destinations?.country || ''
                const budget = itin.destinations?.budget_level || 'Mid-range'
                const listings = Array.isArray(itin.marketplace_listings) ? itin.marketplace_listings : (itin.marketplace_listings ? [itin.marketplace_listings] : [])
                const listing = listings.length > 0 ? listings[0] : null

                // Status Badge logic
                let badgeClass = "bg-[#F0EDE9] text-[#888]"
                let badgeLabel = "Draft / Not Listed"

                if (listing) {
                  if (listing.status === 'open') {
                    const offerCount = Array.isArray(listing.marketplace_offers) ? listing.marketplace_offers.length : 0
                    badgeClass = "bg-[#FEF3C7] text-[#D97706]"
                    badgeLabel = `Listed: ${offerCount} Offers`
                  } else if (listing.status === 'negotiating') {
                    badgeClass = "bg-[#EFF6FF] text-[#185FA5]"
                    badgeLabel = "In Negotiation"
                  } else if (listing.status === 'confirmed') {
                    badgeClass = "bg-[#ECFDF5] text-[#059669]"
                    badgeLabel = "Booking Confirmed"
                  }
                }

                // Budget Tag logic
                let budgetClass = "bg-[#F0EBE3] text-[#8B6A3E]"
                if (budget === 'Budget') budgetClass = "bg-[#FCE8E8] text-[#B91C1C]"
                if (budget === 'Luxury') budgetClass = "bg-charcoal text-white"

                return (
                  <div key={itin.id} className="relative group bg-white border border-border/80 rounded-[14px] p-6 flex flex-col hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">

                    {/* Delete hover button */}
                    <button
                      onClick={(e) => { e.preventDefault(); handleDeleteItinerary(itin.id); }}
                      className="absolute top-4 right-4 p-2 bg-white border border-border shadow-sm text-secondary rounded-full backdrop-blur-md transition-all z-10 opacity-0 group-hover:opacity-100 hover:text-error hover:border-error/30"
                      title="Delete Itinerary"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {/* Header */}
                    <div className="flex justify-between items-start mb-4 pr-10">
                      <div>
                        <div className="text-[20px] font-semibold text-charcoal mb-1.5 truncate max-w-[280px]">
                          {itin.title}
                        </div>
                        <div className="text-[13px] text-secondary flex items-center gap-2">
                          <span className="font-semibold text-[#666] truncate max-w-[150px]">{city}{country ? `, ${country}` : ''}</span> • {new Date(itin.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg shrink-0 ${budgetClass}`}>
                        {budget}
                      </div>
                    </div>

                    {/* Day 1 Preview Window */}
                    <div className="bg-[#FDFCFB] border border-[#F0EDE9] rounded-[10px] p-4 mb-5">
                      <div className="text-[11px] font-bold text-amber tracking-[0.5px] uppercase mb-2">Day 1 Preview</div>
                      <div className="text-[13px] text-[#555] leading-relaxed line-clamp-3">
                        {extractDay1Preview(itin.content)}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between mt-auto pt-5 border-t border-[#E5E0DA]">
                      <div className={`px-3 py-1.5 font-bold rounded-lg text-[12px] ${badgeClass}`}>
                        {badgeLabel}
                      </div>
                      <div className="flex gap-2">
                        {listing ? (
                          <>
                            <button
                              onClick={() => router.push(`/saved-itinerary/${itin.id}`)}
                              className="px-4 py-2 border border-[#D0CCC7] text-[#444] rounded-lg text-[13px] hover:bg-muted font-medium transition-colors"
                            >
                              View & Edit
                            </button>
                            <button
                              onClick={() => router.push(`/marketplace/${listing.id}`)}
                              className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-[13px] font-semibold hover:bg-black transition-colors"
                            >
                              Manage Offers
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => router.push(`/saved-itinerary/${itin.id}`)}
                              className="px-4 py-2 border border-[#D0CCC7] text-[#444] rounded-lg text-[13px] hover:bg-muted font-medium transition-colors"
                            >
                              View & Edit
                            </button>
                            <button
                              onClick={() => router.push(`/marketplace/new?itinerary_id=${itin.id}`)}
                              className="px-4 py-2 bg-amber text-white rounded-lg text-[13px] font-semibold hover:bg-amberdark transition-colors"
                            >
                              Post to Marketplace
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Ongoing Chats */}
        {sessions.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-charcoal font-display mb-8">Ongoing Conversations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sessions.map(session => {
                const city = session.destinations?.city || 'Unknown'
                const country = session.destinations?.country || ''
                return (
                  <div key={session.id} className="relative group bg-white border border-border/60 border-l-[4px] border-l-charcoal rounded-[12px] p-5 flex flex-col hover:shadow-lg transition-all">

                    <button
                      onClick={(e) => { e.preventDefault(); handleDeleteSession(session.id); }}
                      className="absolute top-4 right-4 p-1.5 text-[#AAA] hover:text-error transition-all z-10"
                      title="Delete Conversation"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div>
                        <div className="text-[17px] font-semibold text-charcoal mb-1">
                          Drafting: {city}
                        </div>
                        <div className="text-[12px] text-tertiary">
                          Last active: {new Date(session.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-2">
                      <button
                        onClick={() => router.push(`/itinerary?city=${session.destination_id}&session=${session.id}`)}
                        className="w-full px-4 py-2 bg-muted text-[#1A1A1A] rounded-lg text-[13px] font-bold hover:bg-[#E5E0DA] transition-colors"
                      >
                        Resume Chat
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Empty State */}
        {itineraries.length === 0 && sessions.length === 0 && (
          <div className="bg-white border-2 border-dashed border-border/60 rounded-[20px] py-20 text-center flex flex-col items-center">
            <div className="text-5xl mb-6 opacity-30">📂</div>
            <p className="text-[15px] font-medium text-secondary mb-6 max-w-sm">
              You haven't planned any trips yet. Discover a destination and start chatting with our AI to begin!
            </p>
            <button
              onClick={() => router.push('/destinations')}
              className="bg-amber text-white text-[14px] px-8 py-3 rounded-lg font-bold shadow-sm"
            >
              Browse Destinations
            </button>
          </div>
        )}

      </div>
      </section>
    </div>
  )
}
