'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'
import ItineraryTimeline from '@/components/ui/ItineraryTimeline'
import ItineraryPanel from '@/components/sections/ItineraryPanel'
import Avatar from '@/components/ui/Avatar'

type MarketplaceOffer = any
type ListingRecord = any
type MarketplaceMessage = any
type ChatThread = any

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
  const [searchQuery, setSearchQuery] = useState('')
  const [showItineraryModal, setShowItineraryModal] = useState(false)
  const [itineraryEditMode, setItineraryEditMode] = useState(false)
  const [viewingOriginal, setViewingOriginal] = useState(false)
  const [editedItinerary, setEditedItinerary] = useState<Record<string, any> | null>(null)
  const [isSavingItinerary, setIsSavingItinerary] = useState(false)
  const [showEditPriceModal, setShowEditPriceModal] = useState(false)
  const [editPrice, setEditPrice] = useState('')
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false)
  const [guideName, setGuideName] = useState<string>('Guide')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads
    const lowerQuery = searchQuery.toLowerCase()
    return threads.filter(
      (t) =>
        t.traveller_name.toLowerCase().includes(lowerQuery) ||
        t.title.toLowerCase().includes(lowerQuery)
    )
  }, [threads, searchQuery])

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
      .select('id, full_name')
      .eq('user_id', userData.user.id)
      .single()
    if (guideErr || !guideData?.id) throw new Error('Guide profile not found.')
    
    setGuideName(guideData.full_name || 'Guide')

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
        last_message_at: latestMessage?.created_at || offer.created_at,
        itinerary_content: listing?.itinerary_content,
        trip_metadata: listing?.trip_metadata,
        edited_itinerary: offer.edited_itinerary || null
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
    if (!activeOfferId) return

    const channel = supabase.channel(`guide_msgs_${activeOfferId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketplace_messages', filter: `offer_id=eq.${activeOfferId}` },
        (payload) => {
          const newMsg = payload.new as MarketplaceMessage
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          
          setThreads(prev => prev.map(t => 
            t.offer_id === activeOfferId 
              ? { ...t, last_message: newMsg.content, last_message_at: newMsg.created_at }
              : t
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
      setError((err as Error).message)
    } finally {
      setIsSending(false)
    }
  }

  const handleOpenItineraryModal = () => {
    // Initialise edit state with whatever is already saved (edited or original)
    const thread = threads.find(t => t.offer_id === activeOfferId)
    if (thread?.edited_itinerary) {
      setEditedItinerary(thread.edited_itinerary)
    } else {
      // Fall back to the original content so the guide can start editing from it
      setEditedItinerary(thread?.itinerary_content || null)
    }
    setItineraryEditMode(false)
    setViewingOriginal(false)
    setShowItineraryModal(true)
  }

  const handleSaveItineraryEdits = async () => {
    if (!activeOfferId || !editedItinerary) return
    setIsSavingItinerary(true)
    try {
      const res = await fetch(`/api/marketplace/offers/${activeOfferId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_itinerary: editedItinerary })
      })
      if (!res.ok) throw new Error('Failed to save itinerary edits.')
      // Update local thread state so the edit persists across modal opens
      setThreads(prev => prev.map(t =>
        t.offer_id === activeOfferId
          ? { ...t, edited_itinerary: editedItinerary }
          : t
      ))
      setItineraryEditMode(false)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setIsSavingItinerary(false)
    }
  }

  const handleUpdatePrice = async () => {
    const priceNum = parseFloat(editPrice)
    if (isNaN(priceNum) || priceNum <= 0) return

    setIsUpdatingPrice(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('marketplace_offers')
        .update({ proposed_price: priceNum })
        .eq('id', activeOfferId)

      if (updateError) throw updateError

      const msgRes = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: activeOfferId,
          sender_id: guideUserId,
          sender_type: 'guide',
          content: `${offerCardToken}${priceNum}`
        })
      })

      if (!msgRes.ok) throw new Error('Failed to update price message')

      setThreads(prev => prev.map(t => 
        t.offer_id === activeOfferId 
          ? { ...t, proposed_price: priceNum, last_message: `Offer: ${formatMYR(priceNum)}`, last_message_at: new Date().toISOString() }
          : t
      ))
      
      const newMsg = await msgRes.json()
      setMessages(prev => [...prev, newMsg])
      
      setShowEditPriceModal(false)
      setEditPrice('')
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setIsUpdatingPrice(false)
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

        <div className="grid grid-cols-1 lg:grid-cols-[35%_minmax(0,1fr)] gap-6 min-h-[640px]">
          {/* Left Pane - Chats List */}
          <aside className="bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden flex flex-col">
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
              <input
                type="text"
                placeholder="Search traveller chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[42px] rounded-lg border border-border/70 bg-white px-3 flex items-center text-[13px] text-charcoal focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber transition-all placeholder:text-secondary"
              />
            </div>
            <div className="divide-y divide-border/60 overflow-y-auto flex-1">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.offer_id}
                  onClick={() => setActiveOfferId(thread.offer_id)}
                  className={`w-full px-5 py-4 text-left hover:bg-[#FDFCFB] transition-colors ${
                    activeOfferId === thread.offer_id ? 'bg-[#FDFCFB] border-l-4 border-l-amber' : 'border-l-4 border-l-transparent'
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

          {/* Right Pane - Chat Window */}
          <div className="flex flex-col bg-[#FCFBF9] bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden">
            <header className="h-[80px] border-b border-border/70 px-8 py-5 bg-white flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold text-charcoal text-[14px]">{activeThread?.traveller_name || 'Traveller'}</p>
                <p className="text-[12px] text-secondary">{activeThread?.title}</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleOpenItineraryModal}
                  className="px-4 py-2 border border-[#E5E0DA] bg-white text-charcoal hover:bg-[#FAF9F7] text-[12px] font-bold rounded-lg shadow-sm transition-all"
                >
                  View Itinerary
                </button>
                {activeThread?.status !== 'accepted' && (
                  <button
                    onClick={() => { setEditPrice(activeThread?.proposed_price?.toString() || ''); setShowEditPriceModal(true) }}
                    className="px-4 py-2 border border-[#D48C44] bg-[#D48C44] text-white hover:bg-[#C27E3B] text-[12px] font-bold rounded-lg shadow-sm transition-all"
                  >
                    Edit Offer Price
                  </button>
                )}
                <div className="text-right border-l border-border/60 pl-4 hidden sm:block">
                  <p className="text-[11px] font-bold text-secondary uppercase tracking-widest">Offer</p>
                  <p className="text-[13px] font-extrabold text-amber">{formatMYR(activeThread?.proposed_price || 0)}</p>
                </div>
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
                  <Avatar 
                    name={isMine ? guideName : activeThread?.traveller_name || 'Traveller'} 
                    size="sm" 
                    url={undefined}
                  />
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

        {/* View / Edit Itinerary Modal */}
        {showItineraryModal && (
          <Modal 
            onClose={() => { setShowItineraryModal(false); setItineraryEditMode(false) }}
            title={itineraryEditMode ? 'Edit Itinerary for This Offer' : `${activeThread?.traveller_name || 'Traveller'}'s Itinerary`}
            maxWidth="max-w-5xl"
          >
            {activeThread ? (
              <div className="bg-[#FAF9F7] rounded-b-2xl overflow-hidden -m-6 flex flex-col">
                {/* Toolbar */}
                <div className="flex flex-col border-b border-border/60 bg-white">
                  <div className="flex items-center justify-between px-6 pt-0.5 pb-2">
                    <div className="flex items-center gap-3">
                      {activeThread.edited_itinerary && !itineraryEditMode && (
                        <div className="flex bg-muted p-1 rounded-lg">
                          <button
                            onClick={() => setViewingOriginal(false)}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${!viewingOriginal ? 'bg-white text-charcoal shadow-sm' : 'text-secondary hover:text-charcoal'}`}
                          >
                            Edited Plan
                          </button>
                          <button
                            onClick={() => setViewingOriginal(true)}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${viewingOriginal ? 'bg-white text-charcoal shadow-sm' : 'text-secondary hover:text-charcoal'}`}
                          >
                            Original Plan
                          </button>
                        </div>
                      )}
                      
                      {!activeThread.edited_itinerary && !itineraryEditMode && (
                        <div className="px-3 py-1 bg-muted rounded-lg text-[11px] font-bold text-secondary uppercase tracking-widest">
                          Original Plan
                        </div>
                      )}

                      {itineraryEditMode && (
                        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-[11px] font-bold px-3 py-1 rounded-full border border-green-200 uppercase tracking-widest">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Edit Mode Active
                        </span>
                      )}

                      {!itineraryEditMode && (
                        <div className="text-[11px] font-extrabold text-secondary tracking-widest uppercase border border-border px-3 py-1 rounded-lg bg-white shadow-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary/30"></span>
                          {Object.keys(viewingOriginal ? (activeThread.itinerary_content || {}) : (activeThread.edited_itinerary || activeThread.itinerary_content || {})).length} Days
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!itineraryEditMode ? (
                        <button
                          onClick={() => setItineraryEditMode(true)}
                          className="px-4 py-2 bg-amber text-white text-[12px] font-bold rounded-lg hover:bg-[#E08A1E] transition-all shadow-sm flex items-center gap-2"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Edit Itinerary
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setItineraryEditMode(false)}
                            className="px-4 py-2 border border-border text-secondary text-[12px] font-bold rounded-lg hover:bg-[#F5F5F5] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveItineraryEdits}
                            disabled={isSavingItinerary}
                            className="px-4 py-2 bg-charcoal text-white text-[12px] font-bold rounded-lg hover:bg-black transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                          >
                            {isSavingItinerary ? 'Saving...' : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Save Edits
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Banner */}
                  {!itineraryEditMode && (activeThread.edited_itinerary) && (
                    <div className={`px-6 py-1 border-t border-border/40 ${!viewingOriginal ? 'bg-amber/[0.03]' : 'bg-gray-50/50'}`}>
                      {!viewingOriginal ? (
                        <div className="flex items-center gap-2 text-[11px] text-amber font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
                          Viewing your customized offer plan
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[11px] text-secondary font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary/30" />
                          Viewing traveller&apos;s original plan
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {itineraryEditMode ? (
                    <div className="h-[60vh]">
                      <ItineraryPanel
                        itinerary={editedItinerary || {}}
                        onExport={() => {}}
                        tripContext={{}}
                        selectedDay={null}
                        onFocusLocation={() => {}}
                        onUpdate={(updates: any[]) => {
                          setEditedItinerary((prev: any) => {
                            const updated = { ...(prev || {}) }
                            updates.forEach((u: any) => {
                              const dayKey = `day${u.day}`
                              if (u.action === 'add') {
                                const { action, day, ...item } = u
                                updated[dayKey] = [...(updated[dayKey] || []), item]
                              } else if (u.action === 'update') {
                                updated[dayKey] = (updated[dayKey] || []).map((item: any) =>
                                  item.name === u.name
                                    ? { ...item, ...(u.new_name ? { ...u, name: u.new_name } : u) }
                                    : item
                                )
                              }
                            })
                            return updated
                          })
                        }}
                        onDelete={(dayKey: string, itemName: string) => {
                          setEditedItinerary((prev: any) => {
                            const updated = { ...(prev || {}) }
                            if (updated[dayKey]) {
                              updated[dayKey] = updated[dayKey].filter((i: any) => i.name !== itemName)
                            }
                            return updated
                          })
                        }}
                        city={activeThread.city_name}
                        allowFullEdit={true}
                        hideExport={true}
                      />
                    </div>
                  ) : (
                    <div className="pt-1.5 p-5 lg:pt-2 lg:p-6">
                      <ItineraryTimeline 
                        listing={{
                          itinerary_content: (viewingOriginal ? activeThread.itinerary_content : activeThread.edited_itinerary || activeThread.itinerary_content) || {},
                          trip_metadata: activeThread.trip_metadata || {},
                          city_name: activeThread.city_name,
                          traveller_name: activeThread.traveller_name
                        }} 
                        isEditable={false}
                        isGuideEdited={!viewingOriginal && Boolean(activeThread.edited_itinerary)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="p-8 text-center text-secondary">No itinerary available.</p>
            )}
          </Modal>
        )}

        {/* Edit Price Modal */}
        {showEditPriceModal && (
          <Modal 
            onClose={() => setShowEditPriceModal(false)}
            title="Edit Offer Price"
          >
            <div className="p-6">
              <label className="block text-sm font-bold text-charcoal mb-2">New Proposed Price (RM)</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="Enter new price"
                className="w-full px-4 py-3 rounded-xl border border-border/70 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber transition-all mb-4"
              />
              {error && <p className="text-error text-sm mb-4">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowEditPriceModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-secondary hover:bg-[#F5F5F5] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdatePrice}
                  disabled={isUpdatingPrice || !editPrice}
                  className="px-5 py-2.5 rounded-xl font-bold bg-amber text-white hover:bg-[#D48C44] transition-colors disabled:opacity-50"
                >
                  {isUpdatingPrice ? 'Updating...' : 'Save New Price'}
                </button>
              </div>
            </div>
          </Modal>
        )}

    </div>
  )
}
