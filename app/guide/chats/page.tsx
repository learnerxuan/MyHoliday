'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'

type MarketplaceOffer = {
  id: string
  listing_id: string
  guide_id: string
  proposed_price: number
  status: string
  created_at: string
}

type ListingRecord = {
  id: string
  user_id: string
  itinerary_title?: string
  traveller_name?: string
  city_name?: string
}

type MarketplaceMessage = {
  id: string
  content: string
  sender_type: 'guide' | 'traveler'
  created_at: string
}

type ChatThread = {
  offer_id: string
  listing_id: string
  traveller_id: string
  traveller_name: string
  title: string
  city_name: string
  proposed_price: number
  status: string
  last_message: string
  last_message_at: string
}

const formatMYR = (amount: number | string) =>
  `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const offerCardToken = '__OFFER_PRICE__:'

export default function ChatsPage() {
  const searchParams = useSearchParams()
  const offerQuery = searchParams?.get('offer')

  const [loading, setLoading] = useState(true)
  const [guideUserId, setGuideUserId] = useState<string | null>(null)
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MarketplaceMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const activeThread = useMemo(
    () => threads.find((thread) => thread.offer_id === activeOfferId) || null,
    [threads, activeOfferId]
  )

  const loadThreads = async () => {
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) throw new Error('Not authenticated')

    const role = userData.user.user_metadata?.role || 'traveler'
    if (role !== 'guide') throw new Error('Only guides can access this page.')

    setGuideUserId(userData.user.id)

    const { data: guideData, error: guideErr } = await supabase
      .from('tour_guides')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()
    if (guideErr || !guideData?.id) throw new Error('Guide profile not found.')

    const offersRes = await fetch('/api/marketplace/offers?scope=mine')
    if (!offersRes.ok) throw new Error('Failed to load your offers.')
    const offers = (await offersRes.json()) as MarketplaceOffer[]

    if (!Array.isArray(offers) || offers.length === 0) {
      setThreads([])
      setActiveOfferId(null)
      return
    }

    const listingIds = Array.from(new Set(offers.map((o) => o.listing_id).filter(Boolean)))
    const listingMap: Record<string, ListingRecord> = {}
    const travellerMap: Record<string, string> = {}

    const listingResponses = await Promise.all(
      listingIds.map(async (listingId) => {
        const listingRes = await fetch(`/api/marketplace/listings/${listingId}`)
        if (!listingRes.ok) return null
        return (await listingRes.json()) as ListingRecord
      })
    )
    listingResponses.forEach((listing) => {
      if (listing?.id) listingMap[listing.id] = listing
    })

    const travellerIds = Array.from(new Set(Object.values(listingMap).map((listing) => listing.user_id).filter(Boolean)))
    if (travellerIds.length > 0) {
      const profilesRes = await fetch('/api/marketplace/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: travellerIds })
      })
      if (profilesRes.ok) {
        const travellers = (await profilesRes.json()) as Array<{ user_id: string; full_name: string }>
        travellers.forEach((traveller) => {
          travellerMap[traveller.user_id] = traveller.full_name
        })
      }
    }

    const messageResponses = await Promise.all(
      offers.map(async (offer) => {
        const msgRes = await fetch(`/api/marketplace/messages/${offer.id}`)
        if (!msgRes.ok) return { offerId: offer.id, messages: [] as MarketplaceMessage[] }
        return { offerId: offer.id, messages: (await msgRes.json()) as MarketplaceMessage[] }
      })
    )
    const messageMap: Record<string, MarketplaceMessage[]> = {}
    messageResponses.forEach(({ offerId, messages: offerMessages }) => {
      messageMap[offerId] = Array.isArray(offerMessages) ? offerMessages : []
    })

    const mappedThreads: ChatThread[] = offers.map((offer) => {
      const listing = listingMap[offer.listing_id] || null
      const listingTravellerId = listing?.user_id
      const offerMessages = messageMap[offer.id] || []
      const latestMessage = offerMessages[offerMessages.length - 1] || null
      return {
        offer_id: offer.id,
        listing_id: offer.listing_id,
        traveller_id: listingTravellerId,
        traveller_name: travellerMap[listingTravellerId] || listing?.traveller_name || 'Traveller',
        title: listing?.itinerary_title || `${listing?.city_name || 'Trip'} Request`,
        city_name: listing?.city_name || '',
        proposed_price: offer.proposed_price,
        status: offer.status,
        last_message: latestMessage?.content || `Offer: ${formatMYR(offer.proposed_price)}`,
        last_message_at: latestMessage?.created_at || offer.created_at
      }
    })

    mappedThreads.sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    )
    setThreads(mappedThreads)

    const initialOffer =
      (offerQuery && mappedThreads.find((thread) => thread.offer_id === offerQuery)?.offer_id) ||
      mappedThreads[0]?.offer_id ||
      null
    setActiveOfferId(initialOffer)
  }

  const loadMessages = async (offerId: string) => {
    const res = await fetch(`/api/marketplace/messages/${offerId}`)
    if (!res.ok) throw new Error('Failed to load messages.')
    const msgData = (await res.json()) as MarketplaceMessage[]
    setMessages(Array.isArray(msgData) ? msgData : [])
  }

  useEffect(() => {
    const init = async () => {
      try {
        await loadThreads()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load chats.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [offerQuery])

  useEffect(() => {
    if (!activeOfferId) {
      setMessages([])
      return
    }
    loadMessages(activeOfferId).catch((err) => setError(err.message || 'Failed to load messages.'))
  }, [activeOfferId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, activeOfferId])

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeOfferId || !guideUserId || isSending) return
    setIsSending(true)
    try {
      const res = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: activeOfferId,
          sender_id: guideUserId,
          sender_type: 'guide',
          content: newMessage.trim()
        })
      })
      if (!res.ok) throw new Error('Failed to send message.')
      const createdMessage = await res.json()
      setMessages((prev) => [...prev, createdMessage])
      setThreads((prev) =>
        prev.map((thread) =>
          thread.offer_id === activeOfferId
            ? { ...thread, last_message: createdMessage.content, last_message_at: createdMessage.created_at }
            : thread
        )
      )
      setNewMessage('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send message.'
      setError(message)
    } finally {
      setIsSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[360px] flex items-center justify-center bg-white rounded-3xl border border-border/60 shadow-sm">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-border/60 shadow-sm min-h-[280px] flex items-center justify-center text-error">
        {error}
      </div>
    )
  }

  if (!threads.length) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-border/60 shadow-sm min-h-[280px] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-charcoal mb-2">No chats yet</h2>
          <p className="text-secondary font-body">Submit an offer first to start a traveller chat thread.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full font-body">
        <button
          onClick={() => window.location.assign('/marketplace')}
          className="text-[12px] font-bold text-secondary uppercase tracking-widest hover:text-charcoal transition-colors flex items-center gap-2 px-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Marketplace
        </button>

        <section className="w-full bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] min-h-[640px]">
            <aside className="border-r border-border/70 bg-[#FBFBFB] flex flex-col">
              <div className="text-warmwhite relative overflow-hidden pt-8 sm:pt-10 px-4 sm:px-6 pb-7 sm:pb-8 bg-[#0f0f0f]">
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(59,109,17,0.22) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(59,109,17,0.10) 0%, transparent 65%)' }} />
                <div className="relative">
                  <div className="inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-[#EAF3DE]/20 text-[#EAF3DE] border border-[#EAF3DE]/30 mb-3">
                    Tour Guide
                  </div>
                  <h2 className="text-3xl sm:text-[40px] font-display font-extrabold text-white leading-tight">Chats</h2>
                </div>
              </div>

              <div className="px-6 py-5 border-b border-border/60 bg-[#FBFBFB]">
                <div className="h-[42px] rounded-lg border border-border/70 bg-white px-3 flex items-center text-[13px] text-secondary">
                  Search traveller chats...
                </div>
              </div>
              <div className="divide-y divide-border/60">
                {threads.map((thread) => (
                  <button
                    key={thread.offer_id}
                    onClick={() => setActiveOfferId(thread.offer_id)}
                    className={`w-full px-5 py-4 text-left hover:bg-white transition-colors ${
                      activeOfferId === thread.offer_id ? 'bg-white border-l-4 border-l-amber' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-[14px] font-bold text-charcoal">{thread.traveller_name}</p>
                      <p className="text-[11px] text-secondary">
                        {new Date(thread.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="text-[12px] font-semibold text-[#8A7A67] mb-1">{thread.title}</p>
                    <p className="text-[12px] text-secondary truncate">
                      {thread.last_message?.startsWith(offerCardToken)
                        ? `Offer submitted: ${formatMYR(thread.last_message.split(':')[1])}`
                        : thread.last_message}
                    </p>
                  </button>
                ))}
              </div>
            </aside>

            <div className="flex flex-col bg-[#FCFBF9]">
              <header className="h-[80px] border-b border-border/70 px-8 py-5 bg-white flex items-center justify-between">
                <div>
                  <p className="font-bold text-charcoal text-[14px]">{activeThread?.traveller_name || 'Traveller'}</p>
                  <p className="text-[12px] text-secondary">{activeThread?.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-secondary uppercase tracking-widest">Offer</p>
                  <p className="text-[13px] font-extrabold text-amber">{formatMYR(activeThread?.proposed_price || 0)}</p>
                </div>
              </header>

              <main ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-secondary/60 mt-10">No messages yet.</p>
            ) : (
              messages.map((msg, idx) => {
                const isMine = msg.sender_type === 'guide'
                const isOfferCard = typeof msg.content === 'string' && msg.content.startsWith(offerCardToken)
                if (isOfferCard) {
                  const amount = msg.content.split(':')[1]
                  return (
                    <div key={msg.id || idx} className="flex justify-center">
                      <div className="bg-[#FFFDF5] border border-amber/20 px-4 py-2 rounded-xl text-[12px] text-amberdark font-medium">
                        Offer submitted: {formatMYR(amount)}
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={msg.id || idx} className={`flex gap-3 max-w-[85%] ${isMine ? 'self-end ms-auto flex-row-reverse' : ''}`}>
                    <div
                      className={`${isMine ? 'bg-charcoal text-white rounded-tr-sm' : 'bg-white border border-[#E5E0DA] text-charcoal rounded-tl-sm'} rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed shadow-sm`}
                    >
                      {msg.content}
                    </div>
                  </div>
                )
              })
            )}
              </main>

              <footer className="border-t border-border/70 bg-white p-5">
            <div className="relative">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                type="text"
                placeholder={`Reply to ${activeThread?.traveller_name || 'traveller'}...`}
                className="w-full bg-[#FAF9F7] border border-[#E5E0DA] rounded-xl pl-5 pr-14 py-3.5 text-[14px] text-charcoal focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/10 transition-all placeholder:text-secondary/60"
              />
              <button
                onClick={sendMessage}
                disabled={isSending || !newMessage.trim() || !activeOfferId}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-charcoal hover:bg-black/5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSending ? <Spinner className="w-4 h-4 border-2" /> : <span className="text-[20px] leading-none mb-1">↗</span>}
              </button>
            </div>
              </footer>
            </div>
        </div>
        </section>
    </div>
  )
}
