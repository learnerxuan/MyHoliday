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
const OFFER_ACCEPTED_TOKEN = '__OFFER_ACCEPTED__:'
const PAYMENT_ENABLED_TOKEN = '__PAYMENT_ENABLED__:'
const PAYMENT_COMPLETED_TOKEN = '__PAYMENT_COMPLETED__:'
const ITINERARY_UPDATED_TOKEN = '__ITINERARY_UPDATED__'
const OFFER_WITHDRAWN_TOKEN = '__OFFER_WITHDRAWN__'

const formatThreadPreview = (content?: string | null) => {
  if (!content) return ''
  if (content.startsWith(offerCardToken)) return `Offer submitted: ${formatMYR(content.split(':')[1])}`
  if (content.startsWith(OFFER_ACCEPTED_TOKEN)) return 'Traveller accepted this offer'
  if (content.startsWith(PAYMENT_ENABLED_TOKEN)) return `Payment of ${formatMYR(content.split(':')[1])} enabled`
  if (content.startsWith(PAYMENT_COMPLETED_TOKEN)) return `Payment of ${formatMYR(content.split(':')[1])} completed`
  if (content.startsWith(ITINERARY_UPDATED_TOKEN)) return 'Itinerary updated'
  if (content.startsWith(OFFER_WITHDRAWN_TOKEN)) return 'Offer withdrawn by tour guide'
  return content
}

export default function ChatsPage() {
  const searchParams = useSearchParams()
  const offerQuery = searchParams?.get('offer')

  const [loading, setLoading] = useState(true)
  const [guideUserId, setGuideUserId] = useState<string | null>(null)
  const [guideRecordId, setGuideRecordId] = useState<string | null>(null)
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
  // Payment state
  const [transaction, setTransaction] = useState<any | null>(null)
  const [isEnablingPayment, setIsEnablingPayment] = useState(false)

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

  const activeThreadHasAcceptanceMessage = useMemo(
    () => messages.some((message) => typeof message.content === 'string' && message.content.startsWith(OFFER_ACCEPTED_TOKEN)),
    [messages]
  )
  const activeThreadStatus = String(activeThread?.status || '').toLowerCase()
  const isActiveThreadRejected = activeThreadStatus === 'rejected'
  const isActiveThreadAccepted = Boolean(
    activeThreadStatus === 'accepted' ||
    activeThread?.has_acceptance_message ||
    activeThreadHasAcceptanceMessage
  )

  const isActiveOfferLocked = Boolean(
    activeThread && (
      isActiveThreadRejected ||
      isActiveThreadAccepted ||
      activeThread.payment_enabled ||
      activeThread.has_acceptance_message ||
      activeThreadHasAcceptanceMessage ||
      transaction
    )
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
    setGuideRecordId(guideData.id)

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
      const hasAcceptanceMessage = offerMessages.some(
        (message) => typeof message.content === 'string' && message.content.startsWith(OFFER_ACCEPTED_TOKEN)
      )
      return {
        offer_id: offer.id,
        listing_id: offer.listing_id,
        traveller_id: listingTravellerId,
        traveller_name: travellerMap[listingTravellerId] || listing?.traveller_name || 'Traveller',
        title: listing?.itinerary_title || `${listing?.city_name || 'Trip'} Request`,
        city_name: listing?.city_name || '',
        proposed_price: offer.proposed_price,
        status: offer.status,
        listing_status: listing?.status,
        payment_enabled: offer.payment_enabled || false,
        has_acceptance_message: hasAcceptanceMessage,
        payer_id: listingTravellerId,
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

  const fetchTransaction = async (offerId: string) => {
    try {
      const res = await fetch(`/api/marketplace/transactions?offer_id=${offerId}`)
      if (res.ok) {
        const txData = await res.json()
        setTransaction(txData)
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (isActiveOfferLocked && showEditPriceModal) {
      setShowEditPriceModal(false)
    }
  }, [isActiveOfferLocked, showEditPriceModal])

  const handleEnablePayment = async () => {
    if (!activeThread || !guideRecordId) return
    setIsEnablingPayment(true)
    try {
      const res = await fetch('/api/marketplace/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: activeThread.offer_id,
          payer_id: activeThread.payer_id,
          payee_id: guideRecordId,
          total_amount: activeThread.proposed_price
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to enable payment')
      }
      const txData = await res.json()
      setTransaction(txData)
      // Update thread locally
      setThreads(prev => prev.map(t =>
        t.offer_id === activeOfferId ? { ...t, payment_enabled: true } : t
      ))
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setIsEnablingPayment(false)
    }
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
      setTransaction(null)
      return
    }
    loadMessages(activeOfferId).catch((err) => setError(err.message || 'Failed to load messages.'))
    // Fetch transaction if the active thread's offer is accepted
    const thread = threads.find(t => t.offer_id === activeOfferId)
    const hasAccepted =
      thread?.status === 'accepted' ||
      thread?.has_acceptance_message
    if (hasAccepted) {
      fetchTransaction(activeOfferId)
    } else {
      setTransaction(null)
    }
  }, [activeOfferId, threads])

  useEffect(() => {
    if (!activeOfferId || !activeThreadHasAcceptanceMessage) return
    const timer = setTimeout(() => fetchTransaction(activeOfferId), 0)
    return () => clearTimeout(timer)
  }, [activeOfferId, activeThreadHasAcceptanceMessage])

  useEffect(() => {
    if (!threads.length) return

    const offerIds = new Set(threads.map((thread) => thread.offer_id))
    const channel = supabase.channel('guide_marketplace_thread_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketplace_messages' },
        (payload) => {
          const newMsg = payload.new as MarketplaceMessage
          if (!offerIds.has(newMsg.offer_id)) return

          if (newMsg.offer_id === activeOfferId) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }

          setThreads(prev => prev.map(t =>
            t.offer_id === newMsg.offer_id
              ? { ...t, last_message: newMsg.content, last_message_at: newMsg.created_at }
              : t
          ))

          if (newMsg.content?.startsWith(OFFER_ACCEPTED_TOKEN)) {
            const acceptedAmount = newMsg.content.split(':')[1]
            setThreads(prev => prev.map(t =>
              t.offer_id === newMsg.offer_id
                ? {
                    ...t,
                    status: 'accepted',
                    proposed_price: acceptedAmount ? Number(acceptedAmount) : t.proposed_price,
                    payment_enabled: false,
                    has_acceptance_message: true,
                    last_message: newMsg.content,
                    last_message_at: newMsg.created_at
                  }
                : t
            ))
            if (activeOfferId && newMsg.offer_id === activeOfferId) {
              fetchTransaction(activeOfferId)
            }
          }
          if (activeOfferId && newMsg.content?.startsWith(PAYMENT_COMPLETED_TOKEN) && newMsg.offer_id === activeOfferId) {
            fetchTransaction(activeOfferId)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'marketplace_offers' },
        (payload) => {
          const updatedOffer = payload.new as MarketplaceOffer
          if (!offerIds.has(updatedOffer.id)) return

          setThreads(prev => prev.map(t =>
            t.offer_id === updatedOffer.id
              ? {
                  ...t,
                  status: updatedOffer.status,
                  proposed_price: updatedOffer.proposed_price,
                  payment_enabled: updatedOffer.payment_enabled || false
                }
              : t
          ))

          if (activeOfferId && updatedOffer.id === activeOfferId && updatedOffer.status === 'accepted') {
            fetchTransaction(activeOfferId)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeOfferId, threads])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, activeOfferId])

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeOfferId || !guideUserId || isSending || isActiveThreadRejected) return
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
    if (!activeOfferId || !editedItinerary || !guideUserId) return
    setIsSavingItinerary(true)
    try {
      const res = await fetch(`/api/marketplace/offers/${activeOfferId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_itinerary: editedItinerary })
      })
      if (!res.ok) throw new Error('Failed to save itinerary edits.')

      const msgRes = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: activeOfferId,
          sender_id: guideUserId,
          sender_type: 'guide',
          content: ITINERARY_UPDATED_TOKEN
        })
      })

      if (!msgRes.ok) throw new Error('Itinerary was saved, but failed to notify the traveller.')

      const createdMessage = await msgRes.json()
      // Update local thread state so the edit persists across modal opens
      setThreads(prev => prev.map(t =>
        t.offer_id === activeOfferId
          ? {
              ...t,
              edited_itinerary: editedItinerary,
              last_message: createdMessage.content,
              last_message_at: createdMessage.created_at
            }
          : t
      ))
      setMessages(prev => {
        if (prev.some(message => message.id === createdMessage.id)) return prev
        return [...prev, createdMessage]
      })
      setItineraryEditMode(false)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setIsSavingItinerary(false)
    }
  }

  const handleUpdatePrice = async () => {
    if (isActiveOfferLocked) {
      setError('Accepted offers cannot be edited.')
      setShowEditPriceModal(false)
      return
    }

    const priceNum = parseFloat(editPrice)
    if (isNaN(priceNum) || priceNum <= 0) return

    setIsUpdatingPrice(true)
    setError('')

    try {
      const updateRes = await fetch(`/api/marketplace/offers/${activeOfferId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposed_price: priceNum })
      })

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update offer price')
      }

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
    <div className="w-full h-[calc(100vh-128px)] min-h-[620px] font-body flex flex-col">
        <button
          onClick={() => window.location.assign('/marketplace')}
          className="text-[12px] font-bold text-secondary uppercase tracking-widest hover:text-charcoal transition-colors flex items-center gap-2 px-1 mb-3 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[34%_minmax(0,1fr)] gap-5 flex-1 min-h-0">
          {/* Left Pane - Chats List */}
          <aside className="bg-white rounded-[20px] shadow-sm border border-border/50 overflow-hidden flex flex-col min-h-0">
            <div className="text-warmwhite relative overflow-hidden px-4 sm:px-5 py-4 bg-[#0f0f0f] shrink-0">
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(59,109,17,0.22) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(59,109,17,0.10) 0%, transparent 65%)' }} />
              <div className="relative">
                <div className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-[#EAF3DE]/20 text-[#EAF3DE] border border-[#EAF3DE]/30 mb-1.5">
                  Tour Guide
                </div>
                <h2 className="text-2xl sm:text-[28px] font-display font-extrabold text-white leading-tight">Chats</h2>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-border/60 bg-[#FBFBFB] shrink-0">
              <input
                type="text"
                placeholder="Search traveller chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[42px] rounded-lg border border-border/70 bg-white px-3 flex items-center text-[13px] text-charcoal focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber transition-all placeholder:text-secondary"
              />
            </div>
            <div className="divide-y divide-border/60 overflow-y-auto flex-1 min-h-0">
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
                    {formatThreadPreview(thread.last_message)}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          {/* Right Pane - Chat Window */}
          <div className="flex flex-col bg-[#FCFBF9] bg-white rounded-[20px] shadow-sm border border-border/50 overflow-hidden min-h-0">
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
                {!isActiveOfferLocked && (
                  <button
                    onClick={() => {
                      if (isActiveOfferLocked) return
                      setEditPrice(activeThread?.proposed_price?.toString() || '')
                      setShowEditPriceModal(true)
                    }}
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

            {isActiveThreadRejected && (
              <div className="mx-0 px-6 py-4 border-b border-red-200 bg-[#FEF2F2]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">×</span>
                  <div>
                    <p className="font-bold text-[#B91C1C] text-[14px]">Offer Rejected</p>
                    <p className="text-[#DC2626] text-[12px]">This traveller chose another offer. This chat is now read-only.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Banner — shown when offer is accepted */}
            {isActiveThreadAccepted && (
              <div className={`mx-0 px-6 py-4 border-b border-border/60 ${
                transaction?.status === 'completed'
                  ? 'bg-[#ECFDF5]'
                  : activeThread.payment_enabled
                    ? 'bg-[#FFFBEB]'
                    : 'bg-[#F0F9FF]'
              }`}>
                {transaction?.status === 'completed' ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="font-bold text-[#065F46] text-[14px]">Payment Received!</p>
                      <p className="text-[#047857] text-[12px]">The traveller has completed payment of {formatMYR(transaction.total_amount)}. Trip is confirmed.</p>
                    </div>
                  </div>
                ) : activeThread.payment_enabled ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏳</span>
                    <div>
                      <p className="font-bold text-[#92400E] text-[14px]">Awaiting Traveller Payment</p>
                      <p className="text-[#B45309] text-[12px]">Payment of {formatMYR(activeThread.proposed_price)} has been enabled. Waiting for the traveller to pay.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎉</span>
                      <div>
                        <p className="font-bold text-[#1E40AF] text-[14px]">Traveller Accepted Your Offer!</p>
                        <p className="text-[#1D4ED8] text-[12px]">Enable payment so the traveller can pay {formatMYR(activeThread.proposed_price)} to confirm the booking.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleEnablePayment}
                      disabled={isEnablingPayment}
                      className="shrink-0 px-5 py-2.5 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-[12px] font-bold rounded-xl shadow-sm transition-all disabled:opacity-60 flex items-center gap-2"
                    >
                      {isEnablingPayment ? (
                        <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Enabling...</>
                      ) : (
                        <>💳 Enable Payment</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            <main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 lg:p-8 space-y-6">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-secondary/60 mt-10">No messages yet.</p>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.sender_type === 'guide'
              const content = msg.content as string
              if (content?.startsWith(offerCardToken)) {
                const amount = content.split(':')[1]
                return (
                  <div key={msg.id || idx} className="flex justify-center">
                    <div className="bg-[#FFFDF5] border border-amber/20 px-4 py-2 rounded-xl text-[12px] text-amberdark font-medium">
                      Offer submitted: {formatMYR(amount)}
                    </div>
                  </div>
                )
              }
              if (content?.startsWith(OFFER_ACCEPTED_TOKEN)) {
                return (
                  <div key={msg.id || idx} className="flex justify-center">
                    <div className="bg-[#EFF6FF] border border-blue-200 px-4 py-2 rounded-xl text-[12px] text-blue-700 font-medium">🎉 Traveller accepted this offer</div>
                  </div>
                )
              }
              if (content?.startsWith(PAYMENT_ENABLED_TOKEN)) {
                const amount = content.split(':')[1]
                return (
                  <div key={msg.id || idx} className="flex justify-center">
                    <div className="bg-[#FFFBEB] border border-amber/30 px-4 py-2 rounded-xl text-[12px] text-amber-700 font-medium">💳 Payment of {formatMYR(amount)} enabled by guide</div>
                  </div>
                )
              }
              if (content?.startsWith(PAYMENT_COMPLETED_TOKEN)) {
                const amount = content.split(':')[1]
                return (
                  <div key={msg.id || idx} className="flex justify-center">
                    <div className="bg-[#ECFDF5] border border-green-200 px-4 py-2 rounded-xl text-[12px] text-green-700 font-medium">✅ Payment of {formatMYR(amount)} completed by traveller</div>
                  </div>
                )
              }
              if (content?.startsWith(ITINERARY_UPDATED_TOKEN)) {
                return (
                  <div key={msg.id || idx} className="flex justify-center">
                    <div className="bg-[#FFFDF5] border border-amber/20 px-4 py-2 rounded-xl text-[12px] text-amberdark font-medium">Itinerary updated</div>
                  </div>
                )
              }
              if (content?.startsWith(OFFER_WITHDRAWN_TOKEN)) {
                return (
                  <div key={msg.id || idx} className="flex justify-center">
                    <div className="bg-[#FEF2F2] border border-red-200 px-4 py-2 rounded-xl text-[12px] text-red-700 font-medium">Offer withdrawn by tour guide</div>
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
                    {content}
                  </div>
                </div>
              )
            })
          )}
            </main>

            <footer className="border-t border-border/70 bg-white p-4 shrink-0">
          <div className="relative">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              type="text"
              placeholder={isActiveThreadRejected ? 'This rejected offer chat is read-only.' : `Reply to ${activeThread?.traveller_name || 'traveller'}...`}
              disabled={isActiveThreadRejected}
              className="w-full bg-[#FAF9F7] border border-[#E5E0DA] rounded-xl pl-5 pr-14 py-3.5 text-[14px] text-charcoal focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/10 transition-all placeholder:text-secondary/60 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              onClick={sendMessage}
              disabled={isSending || !newMessage.trim() || !activeOfferId || isActiveThreadRejected}
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
        {showEditPriceModal && !isActiveOfferLocked && (
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
