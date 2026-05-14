'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import StatusBadge from '@/components/ui/StatusBadge'
import Badge from '@/components/ui/Badge'
import ItineraryTimeline from '@/components/ui/ItineraryTimeline'
import ItineraryPanel from '@/components/sections/ItineraryPanel'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Avatar from '@/components/ui/Avatar'
import ChatWindow from '@/components/sections/ChatWindow'
import MarketplaceChatPanel from '@/components/sections/MarketplaceChatPanel'

// Derive frontend display status
function getDisplayStatus(dbStatus, offerCount) {
  if (dbStatus === 'open' && offerCount === 0) return 'awaiting'
  if (dbStatus === 'open' && offerCount > 0) return 'has_offers'
  return dbStatus 
}

// Currency formatter
const formatMYR = (amount) => `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const CalendarIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const GroupIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const PaceIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)

const BudgetIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

const DietaryIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C7 6 5 9.5 5 13a7 7 0 0 0 14 0c0-3.5-2-7-7-11z" />
    <path d="M9 14c1.5 1 4.5 1 6 0" />
  </svg>
)

const AccessibilityIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="4" r="2" />
    <path d="M10 8h4" />
    <path d="M12 8v7" />
    <path d="M8 22l4-7 4 7" />
  </svg>
)

const getBudgetStyle = (budget) => {
  if (!budget) return 'bg-white text-secondary border-border/50'
  const b = budget.toLowerCase()
  if (b.includes('economy') || b.includes('budget')) {
    return 'bg-success-bg text-success border-success/10'
  }
  if (b.includes('mid-range') || b.includes('balanced') || b.includes('midrange')) {
    return 'bg-warning-bg text-warning border-warning/10'
  }
  if (b.includes('luxury')) {
    return 'bg-muted text-amberdark border-amberdark/10'
  }
  return 'bg-white text-secondary border-border/50'
}

const formatTripDateRange = (startDate, endDate, fallbackDays) => {
  if (startDate && endDate) {
    try {
      const formatDate = (value, includeYear = false) => {
        const [y, m, d] = String(value).split('-').map(Number)
        const date = new Date(y, m - 1, d)
        return date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          ...(includeYear ? { year: 'numeric' } : {})
        })
      }
      return `${formatDate(startDate)} - ${formatDate(endDate, true)}`
    } catch (e) {
      return `${fallbackDays} Days`
    }
  }
  return `${fallbackDays} Days`
}

const normaliseList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}

const OFFER_ACCEPTED_TOKEN = '__OFFER_ACCEPTED__:'
const PAYMENT_ENABLED_TOKEN = '__PAYMENT_ENABLED__:'
const PAYMENT_COMPLETED_TOKEN = '__PAYMENT_COMPLETED__:'

function ListingDetailContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const showSuccess = searchParams ? searchParams.get('success') === 'true' : false
  const listingId = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [listing, setListing] = useState(null)
  const [offers, setOffers] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')

  // Action states
  const [proposedPrice, setProposedPrice] = useState('')
  const [introMessage, setIntroMessage] = useState('')
  const [isEditingOffer, setIsEditingOffer] = useState(false)
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [isSendingMsg, setIsSendingMsg] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false)
  const [transaction, setTransaction] = useState(null)
  const [isPayingNow, setIsPayingNow] = useState(false)
  const [isEnablingPayment, setIsEnablingPayment] = useState(false)
  const [showItineraryModal, setShowItineraryModal] = useState(false)
  const [itineraryEditMode, setItineraryEditMode] = useState(false)
  const [viewingOriginal, setViewingOriginal] = useState(false)
  const [editedItinerary, setEditedItinerary] = useState(null)
  const [isSavingItinerary, setIsSavingItinerary] = useState(false)

  const refreshMarketplaceState = useCallback(async ({ keepLoading = false } = {}) => {
    if (!listingId) return
    if (!keepLoading) setLoading(true)
    try {
      const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser()
      if (sessionError || !currentUser) throw new Error('Not authenticated')

      let currentGuideId = null
      if (currentUser.user_metadata?.role === 'guide') {
        const { data: guideData } = await supabase
          .from('tour_guides')
          .select('id')
          .eq('user_id', currentUser.id)
          .single()
        currentGuideId = guideData?.id
      }

      setUser({
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.user_metadata?.role || 'traveler',
        guide_id: currentGuideId
      })

      const listingRes = await fetch(`/api/marketplace/listings/${listingId}`)
      const listingData = await listingRes.json()

      if (!listingRes.ok) {
        throw new Error(listingData.error || 'Failed to load listing')
      }

      if (currentUser.user_metadata?.role === 'guide' && listingData.is_suspended) {
        throw new Error('This listing is no longer available.')
      }

      setListing(listingData)

      const offersRes = await fetch(`/api/marketplace/offers/${listingId}`)
      if (offersRes.ok) {
        const offersData = (await offersRes.json()).filter(o => o.status !== 'withdrawn')
        setOffers(offersData)

        const transactionOffer = currentUser.user_metadata?.role === 'guide'
          ? offersData.find(o => o.guide_id === currentGuideId && (o.status === 'accepted' || o.payment_enabled))
          : offersData.find(o => o.status === 'accepted')
        if (transactionOffer) {
          const txRes = await fetch(`/api/marketplace/transactions?offer_id=${transactionOffer.id}`)
          if (txRes.ok) {
            const txData = await txRes.json()
            setTransaction(txData)
          }
        } else {
          setTransaction(null)
        }
      }

    } catch (err) {
      setError(err.message || 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [listingId])

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshMarketplaceState()
    }, 0)
    return () => clearTimeout(timer)
  }, [refreshMarketplaceState])

  useEffect(() => {
    if (!listingId || offers.length === 0) return

    const watchedOfferIds = new Set(offers.map(offer => offer.id))
    const shouldRefreshForToken = (content) => (
      typeof content === 'string' &&
      (
        content.startsWith(OFFER_ACCEPTED_TOKEN) ||
        content.startsWith(PAYMENT_ENABLED_TOKEN) ||
        content.startsWith(PAYMENT_COMPLETED_TOKEN)
      )
    )

    const channel = supabase
      .channel(`listing_detail_tokens_${listingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketplace_messages' },
        (payload) => {
          const newMessage = payload.new
          if (watchedOfferIds.has(newMessage?.offer_id) && shouldRefreshForToken(newMessage?.content)) {
            refreshMarketplaceState({ keepLoading: true })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [listingId, offers, refreshMarketplaceState])

  // --- TRAVELLER ACTIONS ---
  const handleAcceptClick = (offer) => {
    setSelectedOffer(offer)
    confirmAcceptOffer(offer)
  }

  const confirmAcceptOffer = async (offerToAccept = selectedOffer) => {
    if (!offerToAccept?.id) return
    setIsProcessingTransaction(true)
    try {
      const res = await fetch(`/api/marketplace/offers/${offerToAccept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to accept offer')
      }

      setShowAcceptModal(false)
      window.location.reload()
    } catch (err) {
      setError(err.message)
      setIsProcessingTransaction(false)
    }
  }

  const handleRejectOffer = async (offerId) => {
    try {
      await fetch(`/api/marketplace/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      })
      // Optimistic UI update
      setOffers(offers.map(o => o.id === offerId ? { ...o, status: 'rejected' } : o))
    } catch (err) {
      setError('Failed to reject offer.')
    }
  }

  const handleDeleteListing = async () => {
    try {
      setIsDeleting(true)

      const res = await fetch(`/api/marketplace/listings/${listingId}`, {
        method: 'DELETE'
      })

      let data = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to withdraw listing')
      }

      router.push('/marketplace')
    } catch (err) {
      setError(err.message || 'Failed to withdraw listing')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // --- GUIDE ACTIONS ---
  const handleSubmitOffer = async () => {
    if (!proposedPrice) return
    if (isEditingOffer && isGuideOfferLocked) {
      setError('Accepted offers cannot be edited.')
      return
    }
    setIsSubmittingOffer(true)
    try {
      const url = isEditingOffer ? `/api/marketplace/offers/${myGuideOffer.id}` : '/api/marketplace/offers'
      const method = isEditingOffer ? 'PATCH' : 'POST'
      
      const payload = isEditingOffer ? {
        proposed_price: parseFloat(proposedPrice),
        intro_message: introMessage
      } : {
        listing_id: listingId,
        guide_id: user.id,
        proposed_price: parseFloat(proposedPrice),
        intro_message: introMessage
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit offer')
      }
      const offerResponse = await res.json()
      const currentOfferId = isEditingOffer ? myGuideOffer.id : offerResponse.id
      const currentGuideId = isEditingOffer ? myGuideOffer.guide_id : offerResponse.guide_id

      const offerCardRes = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: currentOfferId,
          sender_id: user.id,
          sender_type: user.role,
          content: `__OFFER_PRICE__:${parseFloat(proposedPrice)}`
        })
      })
      if (!offerCardRes.ok) {
        const cardErr = await offerCardRes.json().catch(() => ({}))
        throw new Error(cardErr.error || 'Failed to write offer card to chat.')
      }

      if (!isEditingOffer && introMessage?.trim()) {
        const introRes = await fetch('/api/marketplace/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offer_id: currentOfferId,
            sender_id: user.id,
            sender_type: user.role,
            content: introMessage.trim()
          })
        })
        if (!introRes.ok) {
          const introErr = await introRes.json().catch(() => ({}))
          throw new Error(introErr.error || 'Failed to send intro message to chat.')
        }
      }

      setIsSubmittingOffer(false)
      window.location.reload()
    } catch (err) {
      setError(err.message || 'Failed to submit offer.')
      setIsSubmittingOffer(false)
    }
  }

  const handleEditOfferClick = () => {
    if (isGuideOfferLocked) {
      setError('Accepted offers cannot be edited.')
      return
    }
    setProposedPrice(myGuideOffer.proposed_price || '')
    setIntroMessage(myGuideOffer.intro_message || '')
    setIsEditingOffer(true)
  }

  const handleWithdrawOffer = async (offerId) => {
    if (isGuideOfferLocked) {
      setError('Accepted offers cannot be withdrawn.')
      return
    }

    try {
      const withdrawRes = await fetch(`/api/marketplace/offers/${offerId}`, {
        method: 'DELETE'
      })
      if (!withdrawRes.ok) {
        const data = await withdrawRes.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to withdraw offer.')
      }

      router.push('/marketplace')
    } catch (err) {
      setError(err.message || 'Failed to withdraw offer.')
    }
  }

  const handleOpenItineraryModal = () => {
    // Initialise edit state with whatever is already saved (edited or original)
    if (myGuideOffer?.edited_itinerary) {
      setEditedItinerary(myGuideOffer.edited_itinerary)
      setViewingOriginal(false)
    } else {
      // Fall back to the original content so the guide can start editing from it
      setEditedItinerary(listing?.itinerary_content || null)
      setViewingOriginal(true)
    }
    setItineraryEditMode(false)
    setShowItineraryModal(true)
  }

  const handleSaveItineraryEdits = async () => {
    if (!myGuideOffer?.id || !editedItinerary) return
    setIsSavingItinerary(true)
    try {
      const res = await fetch(`/api/marketplace/offers/${myGuideOffer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_itinerary: editedItinerary })
      })
      if (!res.ok) throw new Error('Failed to save itinerary edits.')
      
      // Post system message to chat
      try {
        await fetch('/api/marketplace/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offer_id: myGuideOffer.id,
            sender_id: user.id,
            sender_type: user.role,
            content: '__ITINERARY_UPDATED__'
          })
        })
      } catch (e) {
        console.error('Failed to post itinerary update message:', e)
      }

      // Update local state
      setOffers(prev => prev.map(o => 
        o.id === myGuideOffer.id ? { ...o, edited_itinerary: editedItinerary } : o
      ))
      setItineraryEditMode(false)
    } catch (err) {
      setError(err.message || 'Failed to save itinerary edits.')
    } finally {
      setIsSavingItinerary(false)
    }
  }

  const handleEnablePayment = async () => {
    if (!myGuideOffer?.id || !listing?.user_id || !user?.guide_id) return

    setIsEnablingPayment(true)
    setError('')
    try {
      const res = await fetch('/api/marketplace/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: myGuideOffer.id,
          payer_id: listing.user_id,
          payee_id: user.guide_id,
          total_amount: myGuideOffer.proposed_price
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to enable payment')
      }

      const txData = await res.json()
      setTransaction(txData)
      setOffers(prev => prev.map(offer =>
        offer.id === myGuideOffer.id ? { ...offer, payment_enabled: true } : offer
      ))
    } catch (err) {
      setError(err.message || 'Failed to enable payment')
    } finally {
      setIsEnablingPayment(false)
    }
  }

  // --- CHAT ACTIONS ---
  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return
    if (!user) return
    setIsSendingMsg(true)
    try {
      await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: myGuideOffer?.id,
          sender_id: user.id,
          sender_type: user.role, // 'traveler' or 'guide'
          content: chatMessage
        })
      })
      
      // If traveller sends first message, set status to negotiating
      if (user.role === 'traveler' && messages.length === 0) {
        await fetch(`/api/marketplace/listings/${listingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'negotiating' })
        })
      }

      setChatMessage('')
      // Ideally trigger realtime re-fetch here, simulating with reload for now
      window.location.reload() 
    } catch (err) {
      setError('Failed to send message.')
    } finally {
      setIsSendingMsg(false)
    }
  }

  useEffect(() => {
    const currentGuideOffer = offers.find(o => o.guide_id === user?.guide_id && o.status !== 'withdrawn')
    const currentGuideOfferStatus = String(currentGuideOffer?.status || '').toLowerCase()
    const locked = Boolean(
      currentGuideOffer && (
        currentGuideOfferStatus === 'accepted' ||
        currentGuideOffer.payment_enabled ||
        transaction
      )
    )

    if (locked && isEditingOffer) {
      const timer = setTimeout(() => setIsEditingOffer(false), 0)
      return () => clearTimeout(timer)
    }
  }, [offers, user?.guide_id, listing?.status, transaction, isEditingOffer])

  if (loading) return <div className="py-20 flex justify-center"><Spinner /></div>
  if (error && !listing) return <div className="py-20 text-center text-error">{error}</div>

  const displayStatus = listing.is_suspended ? 'suspended' : getDisplayStatus(listing.status, offers.length)
  const isTraveller =
    user?.role === 'traveler' || user?.role === 'traveller'

  const isGuide = user?.role === 'guide'

  const myGuideOffer = isTraveller ? null : offers.find(o => o.guide_id === user?.guide_id && o.status !== 'withdrawn')
  const myGuideOfferStatus = String(myGuideOffer?.status || '').toLowerCase()
  const isMyGuideOfferAccepted = myGuideOfferStatus === 'accepted'
  const isGuideOfferLocked = Boolean(
    myGuideOffer && (
      isMyGuideOfferAccepted ||
      myGuideOffer.payment_enabled ||
      transaction
    )
  )
  const acceptedOfferForTraveller = offers.find(o => o.status === 'accepted') || (listing?.status === 'confirmed' ? offers[0] : null)
  const displayedTravellerOffers = listing?.status === 'confirmed'
    ? (acceptedOfferForTraveller ? [acceptedOfferForTraveller] : [])
    : offers
  const isTravellerOfferLocked = (offer) => Boolean(
    offer && (
      offer.status === 'accepted' ||
      listing?.status === 'confirmed' ||
      offer.payment_enabled ||
      transaction
    )
  )
  const canGuideEnablePayment = Boolean(
    myGuideOffer &&
    isMyGuideOfferAccepted &&
    !myGuideOffer.payment_enabled &&
    !transaction
  )

  // Parse meta data
  const rawContent = listing?.itinerary_content
  let parsedMeta = {}
  try {
    parsedMeta = typeof rawContent === 'string' ? JSON.parse(rawContent) : (rawContent || {})
  } catch (e) {
    parsedMeta = {}
  }
  const tripMeta = listing?.trip_metadata || {}

  const days = parsedMeta.trip_days || tripMeta.trip_days || parsedMeta.duration_days || 5
  const groupSize = parsedMeta.group_size || tripMeta.group_size || parsedMeta.pax || tripMeta.pax || 1
  let pax = ''
  const gsStr = String(groupSize).toLowerCase()
  if (gsStr.includes('solo')) pax = '1 pax'
  else if (gsStr.includes('couple')) pax = '2 pax'
  else if (gsStr.includes('small group')) pax = 'Small Group'
  else if (gsStr.includes('large group')) pax = 'Large Group'
  else pax = `${groupSize} pax`

  const budgetType = parsedMeta.budget || tripMeta.budget || parsedMeta.budget_profile || tripMeta.budget_profile
  const pace = parsedMeta.pace || tripMeta.pace
  const dietaryRestrictions = listing?.traveller_dietary_restrictions && listing.traveller_dietary_restrictions !== 'None'
    ? listing.traveller_dietary_restrictions
    : null
  const accessibilityNeeds = Boolean(listing?.traveller_accessibility_needs)
  const preferenceTags = [
    ...normaliseList(parsedMeta.preferred_styles),
    ...normaliseList(tripMeta.preferred_styles),
    ...normaliseList(parsedMeta.styles),
    ...normaliseList(tripMeta.styles)
  ].filter((tag, index, all) => all.indexOf(tag) === index)

  const startDate = parsedMeta.start_date || tripMeta.travel_date_start || tripMeta.start_date || tripMeta.travel_dates?.start
  const endDate = parsedMeta.end_date || tripMeta.travel_date_end || tripMeta.end_date || tripMeta.travel_dates?.end
  const formattedDateRange = formatTripDateRange(startDate, endDate, days)

  const listingTitle = listing?.itinerary_title || `${listing?.city_name} Trip`
  const tripInfoChips = [
    {
      key: 'date',
      icon: <CalendarIcon />,
      value: formattedDateRange,
      className: 'bg-[#F0EBE3] text-secondary border-border/40'
    },
    budgetType && {
      key: 'budget',
      icon: <BudgetIcon />,
      value: budgetType,
      className: getBudgetStyle(budgetType)
    },
    pace && {
      key: 'pace',
      icon: <PaceIcon />,
      value: pace,
      className: 'bg-[#F0EBE3] text-secondary border-border/40'
    },
    groupSize && {
      key: 'group',
      icon: <GroupIcon />,
      value: groupSize,
      className: 'bg-[#F0EBE3] text-secondary border-border/40'
    },
    dietaryRestrictions && {
      key: 'dietary',
      icon: <DietaryIcon />,
      value: dietaryRestrictions,
      className: 'bg-[#FDF3E7] text-[#9A5B16] border-[#EBCB9F]'
    },
    accessibilityNeeds && {
      key: 'accessibility',
      icon: <AccessibilityIcon />,
      value: 'Accessibility',
      className: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
    }
  ].filter(Boolean)

  return (
    <div className={`bg-warmwhite flex flex-col font-body [&_button:not(:disabled)]:cursor-pointer [&_button:disabled]:cursor-not-allowed ${!isTraveller ? 'min-h-screen -mt-7 md:-mt-6 p-4 sm:p-6 pb-20' : 'min-h-[calc(100vh-64px)] -mt-7 md:-mt-6 p-4 sm:p-6 pb-20'}`}>
      <div className={`${!isTraveller ? 'max-w-7xl' : 'max-w-[1300px]'} mx-auto w-full flex flex-col ${!isTraveller ? '' : 'flex-1'}`}>
        {error && <div className="bg-error-bg text-error p-4 rounded-xl mb-6 shadow-sm border border-error/10 shrink-0">{error}</div>}

        {isTraveller ? (
          /* --- TRAVELLER VIEW --- */
          <div className="flex flex-col flex-1">
            {listing.is_suspended && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 sm:p-6 mb-8 flex items-start gap-4 shadow-sm">
                <div className="text-3xl mt-1">⚠️</div>
                <div>
                  <h3 className="text-error font-bold text-lg mb-1 tracking-tight">Listing Suspended</h3>
                  <p className="text-error/80 text-[14px] leading-relaxed">
                    This listing has been suspended by an administrator and is no longer visible to tour guides. Please contact support for more information.
                  </p>
                </div>
              </div>
            )}
            
            {showSuccess && (
              <div className="bg-[#EDFDF3] border border-[#BCE7D0] rounded-2xl p-5 sm:p-6 mb-8 flex items-start gap-4 shadow-sm">
                <div className="text-3xl mt-1">🎉</div>
                <div>
                  <h3 className="text-[#036A38] font-bold text-lg mb-1 tracking-tight">Success! Your itinerary is live on the marketplace.</h3>
                  <p className="text-[#13844D] text-[14px] leading-relaxed">
                    Verified local tour guides in {listing.city_name}{listing.country_name ? `, ${listing.country_name}` : ''} have been notified about your trip. You will receive competitive offers shortly.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white border border-border/80 rounded-[24px] p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="min-w-0">
                  <div className="bg-[#F0EBE3] px-3.5 py-1.5 text-[#7A7367] text-[11px] font-extrabold tracking-widest rounded-lg uppercase inline-flex mb-4">
                    {listing.city_name}{listing.country_name ? `, ${listing.country_name}` : ''}
                  </div>
                  <h1 className="text-[28px] sm:text-[36px] font-display font-extrabold text-charcoal leading-tight mb-5">
                    {listingTitle}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    {tripInfoChips.map(chip => (
                      <span
                        key={chip.key}
                        className={`flex items-center gap-1.5 px-2 rounded border text-[10px] font-bold uppercase leading-none h-[22px] whitespace-nowrap shrink-0 ${chip.className}`}
                      >
                        {chip.icon}
                        <span className="pt-[1px]">{chip.value}</span>
                      </span>
                    ))}
                    {preferenceTags.map(tag => (
                      <span
                        key={tag}
                        className="flex items-center px-2 rounded border border-[#EAE6DF] bg-[#FDFBF7] text-[#7A7367] text-[10px] font-bold uppercase leading-none h-[22px] whitespace-nowrap shrink-0"
                      >
                        <span className="pt-[1px]">{tag}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="lg:text-right shrink-0">
                  <p className="text-[#888] text-[10px] font-bold tracking-widest uppercase mb-1">TARGET GUIDE BUDGET</p>
                  <p className="text-[#D48C44] text-2xl sm:text-3xl font-display font-extrabold">{formatMYR(listing.desired_budget)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-border/80 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-6 overflow-hidden">
            {/* Status Header */}
            <div className="bg-[#0f0f0f] relative overflow-hidden p-6 sm:p-7 flex items-center justify-between shrink-0">
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px', }} />
              <h2 className="text-white font-display font-extrabold text-2xl sm:text-[26px] relative z-10 tracking-wide">Listing Status</h2>
              <div className={`relative z-10 px-4 py-1.5 rounded-lg border text-[12px] font-black tracking-widest uppercase ${displayStatus === 'suspended' ? 'border-red-400/40 bg-red-400/10 text-error shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-[#D48C44]/40 bg-[#D48C44]/10 text-[#D48C44] shadow-[0_0_15px_rgba(212,140,68,0.15)]'}`}>
                {displayStatus === 'suspended' ? 'SUSPENDED' : displayStatus === 'awaiting' ? 'AWAITING OFFERS' : displayStatus === 'has_offers' ? 'OFFERS RECEIVED' : displayStatus === 'negotiating' ? 'NEGOTIATING' : displayStatus}
              </div>
            </div>

            {/* Confirmed Panel for Traveller */}
            {listing.status === 'confirmed' && (() => {
              const acceptedOffer = acceptedOfferForTraveller
              const paymentEnabled = acceptedOffer?.payment_enabled
              const chatHref = acceptedOffer ? `/marketplace/${listing.id}/chat?guide=${acceptedOffer.guide_id}` : null
              const ChatButton = ({ className = '' }) => chatHref ? (
                <button
                  onClick={() => router.push(chatHref)}
                  className={`bg-charcoal hover:bg-black text-white font-bold rounded-xl transition-all ${className}`}
                >
                  Continue Chat with {acceptedOffer?.guide_name || 'Tour Guide'}
                </button>
              ) : null

              if (transaction?.status === 'completed') {
                return (
                  <div className="bg-[#ECFDF5] border-b border-green-200 p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">✅</div>
                      <div className="flex-1">
                        <h3 className="font-display font-extrabold text-[#065F46] text-xl mb-1">Payment Complete!</h3>
                        <p className="text-[#047857] text-sm mb-3">Your booking is fully confirmed. The tour guide will coordinate the trip details with you.</p>
                        <div className="bg-white/60 rounded-xl p-4 border border-green-200 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-secondary font-medium">Amount Paid</span>
                            <span className="font-bold text-charcoal">{formatMYR(transaction.total_amount)}</span>
                            <span className="text-secondary font-medium">Guide</span>
                            <span className="font-bold text-charcoal">{acceptedOffer?.guide_name || 'Tour Guide'}</span>
                          </div>
                        </div>
                        <ChatButton className="mt-4 px-5 py-3 text-[13px]" />
                      </div>
                    </div>
                  </div>
                )
              }

              if (paymentEnabled && transaction?.status === 'pending') {
                return (
                  <div className="bg-[#FFFBEB] border-b border-amber/30 p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">💳</div>
                      <div className="flex-1">
                        <h3 className="font-display font-extrabold text-charcoal text-xl mb-1">Complete Your Payment</h3>
                        <p className="text-secondary text-sm mb-4">Your tour guide has enabled payment. Complete your mock payment to confirm the booking.</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={async () => {
                              setIsPayingNow(true)
                              try {
                                const res = await fetch(`/api/marketplace/transactions/${transaction.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'completed' })
                                })
                                if (!res.ok) throw new Error('Payment failed')
                                window.location.reload()
                              } catch (err) {
                                setError(err.message)
                                setIsPayingNow(false)
                              }
                            }}
                            disabled={isPayingNow}
                            className="flex-1 py-4 bg-amber hover:bg-[#E08A1E] text-white font-bold text-[15px] rounded-xl shadow-lg shadow-amber/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                          >
                            {isPayingNow ? <Spinner /> : 'Pay Now (Mock)'}
                          </button>
                          <ChatButton className="flex-1 py-4 text-[15px]" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div className="bg-[#EFF6FF] border-b border-blue-200 p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">⏳</div>
                    <div>
                      <h3 className="font-display font-extrabold text-[#1E40AF] text-xl mb-1">Offer Accepted!</h3>
                      <p className="text-[#1D4ED8] text-sm mb-4">Waiting for the tour guide to enable payment. You can continue chatting with the accepted tour guide.</p>
                      <ChatButton className="px-5 py-3 text-[13px]" />
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className="p-6 sm:p-8">
              {/* Offers List */}
              <div className={`flex flex-col ${displayedTravellerOffers.length === 0 ? 'items-center justify-center text-center py-6' : ''} relative overflow-hidden`}>
                {displayedTravellerOffers.length === 0 ? (
                  <>
                    <div className="w-[72px] h-[72px] bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-border/40 flex items-center justify-center text-3xl mb-6">⏳</div>
                    <h2 className="text-[24px] font-display font-extrabold text-charcoal mb-4">Waiting for Offers</h2>
                    <p className="text-secondary/80 text-[13px] leading-relaxed max-w-[240px] mb-8">Tour guides are reviewing your itinerary. Sit tight!</p>
                    {listing.status !== 'confirmed' && (
                      <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3.5 bg-white border border-border text-charcoal font-bold text-[14px] rounded-xl hover:bg-red-50 hover:text-error hover:border-red-200 transition-colors shadow-sm">Cancel Request</button>
                    )}
                  </>
                ) : (
                  <div className="w-full flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-[20px] font-display font-extrabold text-charcoal">{listing?.status === 'confirmed' ? 'Accepted Offer' : `${offers.length} Offers Received`}</h2>
                      <div className="text-3xl">💬</div>
                    </div>
                    <div className="flex flex-col gap-4 flex-1 overflow-y-auto mb-6 pr-1">
                      {displayedTravellerOffers.map(offer => (
                        <div key={offer.id} className="bg-white p-4 border border-border/60 rounded-xl shadow-sm flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={offer.guide_name} size="md" />
                            <div className="flex-1">
                              <p className="font-bold text-charcoal">{offer.guide_name}</p>
                              <p className="text-amber font-extrabold text-sm">{formatMYR(offer.proposed_price)}</p>
                            </div>
                            <StatusBadge status={offer.status} />
                          </div>
                          <div className="flex gap-2 w-full mt-2">
                            {offer.status === 'pending' && !isTravellerOfferLocked(offer) && (
                              <button onClick={() => handleAcceptClick(offer)} disabled={isProcessingTransaction} className="flex-1 py-2 bg-[#F0EBE3] text-charcoal text-xs font-bold rounded-lg hover:bg-[#E4DFD8] transition-colors disabled:opacity-60">{isProcessingTransaction && selectedOffer?.id === offer.id ? 'Accepting...' : 'Accept'}</button>
                            )}
                            <button onClick={() => router.push(`/marketplace/${listing.id}/chat?guide=${offer.guide_id}`)} className="flex-1 py-2 bg-charcoal text-white text-xs font-bold rounded-lg hover:bg-black transition-colors">Chat</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {listing.status !== 'confirmed' && (
                      <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 bg-white border border-border text-charcoal font-bold text-[13px] rounded-xl hover:bg-red-50 hover:text-error hover:border-red-200 transition-colors shadow-sm">Cancel Request</button>
                    )}
                  </div>
                )}
              </div>
            </div>
            </div>

            {/* Traveller's Itinerary Timeline */}
            <div className="bg-white border border-border/80 rounded-[24px] p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-6">
              <h2 className="text-[24px] font-display font-extrabold text-charcoal mb-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-[#FAF9F7] border border-[#E5E0DA] flex items-center justify-center text-[18px] shrink-0">🗺️</span>
                Your Proposed Itinerary
              </h2>
              <ItineraryTimeline 
                listing={{
                  itinerary_content: listing.itinerary_content || {},
                  trip_metadata: listing.trip_metadata || {},
                  city_name: listing.city_name,
                  traveller_name: listing.traveller_name
                }} 
                isEditable={false} 
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-5 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Left Offer Island */}
            <div className="w-full md:w-[35%] flex flex-col min-h-0">
              <div className="bg-[#FAF9F7] border border-border/50 rounded-[24px] overflow-hidden shadow-sm flex flex-col md:h-[680px]">
                {/* Dark Header (inside the card) */}
                <div className="text-warmwhite relative overflow-hidden px-6 sm:px-8 py-6 sm:py-7 z-10 shrink-0" style={{ background: '#0f0f0f' }}>
                  <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px', }} />
                  <div className="relative z-10">
                    <div className="inline-flex w-fit items-center gap-2 bg-white/10 text-amber text-[11px] font-bold px-3 py-1 rounded-full border border-amber/20 mb-3 uppercase tracking-widest leading-none">
                      {myGuideOffer ? (isGuideOfferLocked ? 'Accepted' : 'In Progress') : 'Available Request'}
                    </div>
                    <h1 className="text-2xl sm:text-[30px] font-extrabold text-white font-display mb-1 tracking-tight leading-tight">
                      {myGuideOffer ? (isEditingOffer ? 'Edit Your Offer' : 'Your Active Offer') : 'Submit an Offer'}
                    </h1>
                    <p className="text-[12px] font-body text-white/60 leading-relaxed">
                      {myGuideOffer 
                        ? (isEditingOffer ? 'Update your proposed price or note.' : 'You have successfully submitted an offer.') 
                        : 'Craft a competitive proposal to win this client.'}
                    </p>
                  </div>
                </div>

                {/* Details Content */}
                <div className="p-6 flex-1 overflow-y-auto bg-[#FAF9F7]">
                  {(!myGuideOffer || isEditingOffer) ? (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-extrabold text-charcoal uppercase tracking-[0.15em] mb-2">Proposed Price (RM)</label>
                        <div className="relative">
                           <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-charcoal/30">RM</div>
                           <input type="number" value={proposedPrice} onChange={(e) => setProposedPrice(e.target.value)} className="w-full pl-12 pr-5 py-3.5 bg-[#FAF9F7] border border-[#E5E0DA] rounded-xl text-[16px] font-bold text-charcoal focus:outline-none focus:border-amber transition-all" />
                        </div>
                      </div>
                      {!isEditingOffer && (
                        <div>
                          <label className="block text-[10px] font-extrabold text-charcoal uppercase tracking-[0.15em] mb-2">Intro Message</label>
                          <textarea rows={5} value={introMessage} onChange={(e) => setIntroMessage(e.target.value)} className="w-full px-5 py-3.5 bg-[#FAF9F7] border border-[#E5E0DA] rounded-xl text-[13px] text-charcoal focus:outline-none focus:border-amber transition-all resize-none" placeholder="Explain why you are the best guide..." />
                        </div>
                      )}
                      <div className="flex gap-2">
                        {isEditingOffer && (
                          <button
                            onClick={() => {
                              setIsEditingOffer(false)
                              setProposedPrice('')
                              setIntroMessage('')
                            }}
                            disabled={isSubmittingOffer}
                            className="flex-1 py-3.5 bg-white border border-[#E5E0DA] text-secondary font-bold text-[13px] rounded-xl hover:bg-[#FAF9F7] hover:text-charcoal transition-all"
                          >
                            Cancel
                          </button>
                        )}
                        <button onClick={handleSubmitOffer} disabled={isSubmittingOffer || !proposedPrice} className="flex-1 py-3.5 bg-charcoal text-white font-bold text-[13px] rounded-xl hover:bg-black transition-all flex items-center justify-center">
                          {isSubmittingOffer ? <Spinner /> : isEditingOffer ? 'Update Offer' : 'Submit Offer'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <div className="inline-block bg-[#F0EBE3] text-charcoal text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest mb-3">Trip Info</div>
                        <h4 className="font-display font-extrabold text-[22px] text-charcoal leading-tight mb-3">{listingTitle}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mb-5">
                          {tripInfoChips.map(chip => (
                            <span key={chip.key} className={`flex items-center gap-1.5 px-2 rounded border text-[10px] font-bold uppercase leading-none h-[22px] whitespace-nowrap shrink-0 ${chip.className}`}>
                              {chip.icon}
                              <span className="pt-[1px]">{chip.value}</span>
                            </span>
                          ))}
                          {preferenceTags.map(tag => (
                            <span key={tag} className="flex items-center px-2 rounded border border-[#EAE6DF] bg-[#FDFBF7] text-[#7A7367] text-[10px] font-bold uppercase leading-none h-[22px] whitespace-nowrap shrink-0">
                              <span className="pt-[1px]">{tag}</span>
                            </span>
                          ))}
                        </div>
                        <div className="hidden">
                          <div className="flex gap-3 items-start">
                             <div className="w-8 h-8 rounded-full bg-[#FAF9F7] border border-[#E5E0DA] flex items-center justify-center text-[12px] shrink-0">📍</div>
                             <div>
                                <div className="text-[9px] text-secondary uppercase font-bold tracking-wider mb-0.5">Location</div>
                                <div className="text-[13px] font-bold text-charcoal">{listing.city_name}</div>
                             </div>
                          </div>
                          <div className="flex gap-3 items-start">
                             <div className="w-8 h-8 rounded-full bg-[#FAF9F7] border border-[#E5E0DA] flex items-center justify-center text-[12px] shrink-0">📅</div>
                             <div>
                                <div className="text-[9px] text-secondary uppercase font-bold tracking-wider mb-0.5">Dates</div>
                                <div className="text-[13px] font-bold text-charcoal">{formattedDateRange} <span className="text-secondary font-medium ml-0.5">({pax})</span></div>
                             </div>
                          </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-[#F0EBE3]">
                           <div className="text-[9px] text-secondary uppercase font-bold tracking-wider mb-1">Target Budget</div>
                           <div className="font-display font-extrabold text-[26px] text-charcoal">{formatMYR(listing.desired_budget)}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="p-4 bg-[#FAF9F7] border border-[#E5E0DA] rounded-[16px]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[9px] text-secondary uppercase font-bold tracking-widest mb-1 opacity-60">Submitted Quote</p>
                              <p className="text-amber font-display font-extrabold text-2xl">{formatMYR(myGuideOffer.proposed_price)}</p>
                            </div>
                            <div className={`${isGuideOfferLocked ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEF9C3] text-[#A16207]'} px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider`}>
                              {isGuideOfferLocked ? 'Accepted' : 'Pending'}
                            </div>
                          </div>
                        </div>
                        {!isGuideOfferLocked && (
                          <div className="flex gap-2">
                            <button onClick={handleEditOfferClick} className="flex-1 py-2 bg-white border border-[#E5E0DA] rounded-lg font-bold text-[12px] hover:bg-[#FAF9F7] transition-all">Edit Offer</button>
                            <button onClick={() => handleWithdrawOffer(myGuideOffer.id)} className="flex-1 py-2 bg-[#FEF2F2] text-[#EF4444] rounded-lg font-bold text-[12px] hover:bg-[#FEE2E2] transition-all">Withdraw</button>
                          </div>
                        )}
                        {(isMyGuideOfferAccepted || myGuideOffer.payment_enabled || transaction) && (
                          <div className={`${transaction?.status === 'completed' ? 'bg-[#ECFDF5] border-green-200' : myGuideOffer.payment_enabled || transaction ? 'bg-[#FFFBEB] border-amber/30' : 'bg-[#F0F9FF] border-blue-200'} border rounded-[16px] p-4 space-y-3`}>
                            {transaction?.status === 'completed' ? (
                              <div>
                                <p className="text-[13px] font-extrabold text-[#065F46]">Payment received</p>
                                <p className="text-[12px] text-[#047857] mt-1">The traveller has completed payment for this offer.</p>
                              </div>
                            ) : myGuideOffer.payment_enabled || transaction ? (
                              <div>
                                <p className="text-[13px] font-extrabold text-[#92400E]">Payment enabled</p>
                                <p className="text-[12px] text-[#B45309] mt-1">The traveller can now proceed with payment.</p>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <p className="text-[13px] font-extrabold text-[#1E40AF]">Traveller accepted your offer</p>
                                  <p className="text-[12px] text-[#1D4ED8] mt-1">Turn on payment so the traveller can pay {formatMYR(myGuideOffer.proposed_price)}.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleEnablePayment}
                                  disabled={!canGuideEnablePayment || isEnablingPayment}
                                  role="switch"
                                  aria-checked={Boolean(myGuideOffer.payment_enabled || transaction)}
                                  className="w-full flex items-center justify-between gap-3 rounded-xl bg-[#1D4ED8] px-4 py-3 text-white text-[12px] font-extrabold hover:bg-[#1E40AF] transition-all disabled:opacity-60"
                                >
                                  <span>{isEnablingPayment ? 'Enabling payment...' : 'Enable Payment'}</span>
                                  <span className={`w-10 h-5 rounded-full p-0.5 flex items-center ${myGuideOffer.payment_enabled || transaction ? 'bg-white/40 justify-end' : 'bg-white/25 justify-start'}`}>
                                    <span className="w-4 h-4 rounded-full bg-white" />
                                  </span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Chat Island */}
            <div className="w-full md:w-[65%] flex flex-col min-h-0 md:h-[680px]">
               <MarketplaceChatPanel
                 offerId={myGuideOffer?.id}
                 currentUserId={user?.id}
                 currentUserRole="guide"
                 guideName={myGuideOffer?.guide_name || 'You'}
                 travellerName={listing?.traveller_name || 'Traveller'}
                 listingId={listingId}
                 listingCity={listing.city_name}
                 onViewItinerary={handleOpenItineraryModal}
               />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal title="Withdraw Listing" onClose={() => !isDeleting && setShowDeleteConfirm(false)}>
          <p className="text-secondary mb-6 text-[15px] leading-relaxed">
            Are you sure you want to withdraw your request for <strong>{listingTitle}</strong>? This action cannot be undone, but your itinerary will remain in your saved list.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-5 py-2.5 rounded-xl text-secondary font-bold hover:bg-[#F0EBE3] transition-colors text-[13px]"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteListing}
              className="px-5 py-2.5 rounded-xl bg-error text-white font-bold hover:bg-red-600 transition-colors text-[13px] border border-transparent flex items-center justify-center min-w-[100px]"
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner /> : 'Withdraw'}
            </button>
          </div>
        </Modal>
      )}

      {/* Itinerary Modal */}
      {showItineraryModal && (
        <Modal 
          onClose={() => { setShowItineraryModal(false); setItineraryEditMode(false) }}
          title={itineraryEditMode ? 'Edit Itinerary for This Offer' : `${listing?.traveller_name || 'Traveller'}'s Itinerary`}
          maxWidth="max-w-5xl"
        >
          <div className="bg-[#FAF9F7] rounded-b-2xl overflow-hidden -m-6 flex flex-col">
            {/* Toolbar matching Guide View */}
            <div className="flex flex-col border-b border-border/60 bg-white">
              <div className="flex items-center justify-between px-6 pt-0.5 pb-2">
                <div className="flex items-center gap-3">
                  {myGuideOffer?.edited_itinerary && !itineraryEditMode && (
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
                  
                  {!myGuideOffer?.edited_itinerary && !itineraryEditMode && (
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
                      {Object.keys(viewingOriginal ? (listing?.itinerary_content || {}) : (myGuideOffer?.edited_itinerary || listing?.itinerary_content || {})).length} Days
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isGuide && (
                    !itineraryEditMode ? (
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
                    )
                  )}
                </div>
              </div>
              
              {/* Status Banner */}
              {!itineraryEditMode && (myGuideOffer?.edited_itinerary) && (
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
                    onUpdate={(updates) => {
                      setEditedItinerary((prev) => {
                        const updated = { ...(prev || {}) }
                        updates.forEach((u) => {
                          const dayKey = `day${u.day}`
                          if (u.action === 'add') {
                            const { action, day, ...item } = u
                            updated[dayKey] = [...(updated[dayKey] || []), item]
                          } else if (u.action === 'update') {
                            updated[dayKey] = (updated[dayKey] || []).map((item) =>
                              item.name === u.name
                                ? { ...item, ...(u.new_name ? { ...u, name: u.new_name } : u) }
                                : item
                            )
                          }
                        })
                        return updated
                      })
                    }}
                    onDelete={(dayKey, itemName) => {
                      setEditedItinerary((prev) => {
                        const updated = { ...(prev || {}) }
                        if (updated[dayKey]) {
                          updated[dayKey] = updated[dayKey].filter((i) => i.name !== itemName)
                        }
                        return updated
                      })
                    }}
                    city={listing.city_name}
                    allowFullEdit={true}
                    hideExport={true}
                  />
                </div>
              ) : (
                <div className="pt-1.5 p-5 lg:pt-2 lg:p-6">
                  <ItineraryTimeline 
                    listing={{
                      itinerary_content: (viewingOriginal ? listing.itinerary_content : myGuideOffer?.edited_itinerary || listing.itinerary_content) || {},
                      trip_metadata: listing.trip_metadata || {},
                      city_name: listing.city_name,
                      traveller_name: listing.traveller_name
                    }} 
                    isEditable={false}
                    isGuideEdited={!viewingOriginal && Boolean(myGuideOffer?.edited_itinerary)}
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function ListingDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>
      <ListingDetailContent />
    </Suspense>
  )
}
