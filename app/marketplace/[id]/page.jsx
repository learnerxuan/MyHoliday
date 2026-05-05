'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import StatusBadge from '@/components/ui/StatusBadge'
import Badge from '@/components/ui/Badge'
import ItineraryTimeline from '@/components/ui/ItineraryTimeline'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Avatar from '@/components/ui/Avatar'
import ChatWindow from '@/components/sections/ChatWindow'

// Derive frontend display status
function getDisplayStatus(dbStatus, offerCount) {
  if (dbStatus === 'open' && offerCount === 0) return 'awaiting'
  if (dbStatus === 'open' && offerCount > 0) return 'has_offers'
  return dbStatus 
}

// Currency formatter
const formatMYR = (amount) => `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export default function ListingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const showSuccess = searchParams ? searchParams.get('success') === 'true' : false
  const listingId = Array.isArray(params?.id) ? params.id[0] : params?.id

  console.log('params =', params)
  console.log('listingId =', listingId)
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

  useEffect(() => {
    if (!listingId) return

    const fetchAllData = async () => {
      try {
        const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser()
        if (sessionError || !currentUser) throw new Error('Not authenticated')

        setUser({
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.user_metadata?.role || 'traveler'
        })

        const listingRes = await fetch(`/api/marketplace/listings/${listingId}`)
        const listingData = await listingRes.json()

        if (!listingRes.ok) {
          throw new Error(listingData.error || 'Failed to load listing')
        }

        setListing(listingData)

        const offersRes = await fetch(`/api/marketplace/offers/${listingId}`)
        if (offersRes.ok) {
          const offersData = await offersRes.json()
          setOffers(offersData)
        }

      } catch (err) {
        setError(err.message || 'Failed to load data.')
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [listingId])

  // --- TRAVELLER ACTIONS ---
  const handleAcceptClick = (offer) => {
    setSelectedOffer(offer)
    setShowAcceptModal(true)
  }

  const confirmAcceptOffer = async () => {
    setIsProcessingTransaction(true)
    try {
      const serviceCharge = 0
      const totalAmount = parseFloat(selectedOffer.proposed_price)
      const guidePayout = totalAmount - serviceCharge

      // Frontend validation check matching HS's backend constraint
      if (guidePayout !== totalAmount - serviceCharge) {
        throw new Error("Transaction math mismatch.")
      }

      // 1. Accept Offer
      await fetch(`/api/marketplace/offers/${selectedOffer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' })
      })

      // 2. Confirm Listing
      await fetch(`/api/marketplace/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' })
      })

      // 3. Create Transaction
      const txRes = await fetch('/api/marketplace/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: selectedOffer.id,
          payer_id: user.id,
          payee_id: selectedOffer.guide_id,
          total_amount: totalAmount,
          service_charge: serviceCharge,
          guide_payout: guidePayout,
          payment_reference: crypto.randomUUID()
        })
      })

      if (!txRes.ok) {
        const errData = await txRes.json()
        throw new Error(errData.error || 'Transaction failed')
      }

      setShowAcceptModal(false)
      window.location.reload() // Reload to get confirmed state
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

      if (introMessage?.trim()) {
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

      router.push(`/marketplace/${listingId}/chat?guide=${currentGuideId}`)
    } catch (err) {
      setError(err.message || 'Failed to submit offer.')
      setIsSubmittingOffer(false)
    }
  }

  const handleEditOfferClick = () => {
    setProposedPrice(myGuideOffer.proposed_price || '')
    setIntroMessage(myGuideOffer.intro_message || '')
    setIsEditingOffer(true)
  }

  const handleWithdrawOffer = async (offerId) => {
    try {
      await fetch(`/api/marketplace/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'withdrawn' })
      })
      window.location.reload()
    } catch (err) {
      setError('Failed to withdraw offer.')
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

  if (loading) return <div className="py-20 flex justify-center"><Spinner /></div>
  if (error && !listing) return <div className="py-20 text-center text-error">{error}</div>

  const displayStatus = getDisplayStatus(listing.status, offers.length)
  const isTraveller =
    user?.role === 'traveler' || user?.role === 'traveller'

  const isGuide = user?.role === 'guide'

  const myGuideOffer = isTraveller ? null : offers.find(o => o.guide_id === user?.id)

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

  let tags = parsedMeta.preferred_styles || tripMeta.preferred_styles || []
  if (!tags || tags.length === 0) {
    tags = ['Culture', 'Budget']
  } else if (tags.length > 3) {
    tags = tags.slice(0, 3)
  }

  const startDate = parsedMeta.start_date || tripMeta.travel_date_start || tripMeta.start_date || tripMeta.travel_dates?.start
  const endDate = parsedMeta.end_date || tripMeta.travel_date_end || tripMeta.end_date || tripMeta.travel_dates?.end
  let formattedDateRange = `${days} Days`
  if (startDate && endDate) {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      formattedDateRange = `${startStr} - ${endStr}`
    } catch(e) {}
  }

  const listingTitle = listing?.itinerary_title || `${listing?.city_name} Trip`

  return (
    <div className="min-h-screen bg-warmwhite flex flex-col pt-6 sm:pt-10 px-4 sm:px-6 pb-20 font-body">
      <section className="max-w-7xl mx-auto w-full bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden flex flex-col">
        <div className="px-4 sm:px-10 pt-8 sm:pt-12 pb-12 sm:pb-16 bg-white flex flex-col items-center">
          <div className="w-full max-w-[1100px]">
            {/* Top Navigation */}
            <div className="mb-8">
        <button 
          onClick={() => router.push('/marketplace')} 
          className="text-[12px] font-bold text-secondary uppercase tracking-widest hover:text-charcoal transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          BACK TO MARKETPLACE
        </button>
      </div>

      {error && <div className="bg-error-bg text-error p-4 rounded-xl mb-8">{error}</div>}

      {/* --- TRAVELLER REDESIGN HEADER --- */}
      {isTraveller ? (
        <>
          {/* Success Banner */}
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

          {/* Listing Status Header */}
          <div className="bg-[#0f0f0f] relative overflow-hidden rounded-[20px] p-6 sm:p-7 mb-8 flex items-center justify-between shadow-lg">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            <h2 className="text-white font-display font-extrabold text-2xl sm:text-[26px] relative z-10 tracking-wide">Listing Status</h2>
            <div className="relative z-10 px-4 py-1.5 rounded-lg border border-[#D48C44]/40 bg-[#D48C44]/10 text-[#D48C44] text-[12px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(212,140,68,0.15)]">
              {displayStatus === 'awaiting' ? 'AWAITING OFFERS' : displayStatus === 'has_offers' ? 'OFFERS RECEIVED' : displayStatus === 'negotiating' ? 'NEGOTIATING' : displayStatus}
            </div>
          </div>

          {/* Listing Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 mb-12">
            
            {/* Left Card: Details */}
            <div className="bg-white border border-border/80 rounded-[24px] p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-[#F0EBE3] px-3.5 py-1.5 text-[#7A7367] text-[11px] font-extrabold tracking-widest rounded-lg uppercase">
                    {listing.city_name}{listing.country_name ? `, ${listing.country_name}` : ''}
                  </div>
                  <div className="text-right">
                    <p className="text-[#888] text-[10px] font-bold tracking-widest uppercase mb-1">TARGET BUDGET</p>
                    <p className="text-[#D48C44] text-2xl font-display font-extrabold">{formatMYR(listing.desired_budget)}</p>
                  </div>
                </div>

                <h1 className="text-[28px] sm:text-[34px] font-display font-extrabold text-charcoal leading-tight mb-5 pr-4 sm:pr-10">
                  {listingTitle}
                </h1>

                <div className="flex items-center gap-4 text-secondary text-sm font-medium mb-10">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    {formattedDateRange}
                  </div>
                  <div className="w-1 h-1 rounded-full bg-border"></div>
                  <div className="flex items-center gap-2">
                    <span>👥</span>
                    {pax}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-6">
                {tags.map(tag => (
                  <span key={tag} className="px-4 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-xl tracking-wide">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Card: Status Action */}
            <div className={`bg-[#FAFAFA] border border-border/80 rounded-[24px] p-6 sm:p-8 flex flex-col ${offers.length === 0 ? 'items-center justify-center text-center' : ''} shadow-[0_2px_12px_rgba(0,0,0,0.02)] relative overflow-hidden`}>
              
              {offers.length === 0 ? (
                <>
                  <div className="w-[72px] h-[72px] bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-border/40 flex items-center justify-center text-3xl mb-6">
                    ⏳
                  </div>
                  <h2 className="text-[24px] font-display font-extrabold text-charcoal mb-4">
                    Waiting for Offers
                  </h2>
                  <p className="text-secondary/80 text-[13px] leading-relaxed max-w-[240px] mb-8">
                    Tour guides are reviewing your itinerary. Sit tight, you&apos;ll be notified via email when an offer arrives.
                  </p>
                  {listing.status !== 'confirmed' && (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full sm:w-[85%] py-3.5 bg-white border border-border text-charcoal font-bold text-[14px] rounded-xl hover:bg-red-50 hover:text-error hover:border-red-200 transition-colors shadow-sm"
                    >
                      Cancel Request
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[20px] font-display font-extrabold text-charcoal">
                      {listing?.status === 'confirmed' ? 'Accepted Offer' : `${offers.length} Offers Received`}
                    </h2>
                    <div className="text-3xl">💬</div>
                  </div>
                  
                  <div className="flex flex-col gap-4 flex-1 overflow-y-auto mb-6 max-h-[400px] pr-2">
                    {(listing?.status === 'confirmed' ? offers.filter(o => o.status === 'accepted') : offers).map(offer => (
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
                          {offer.status === 'pending' && (
                            <button 
                              onClick={() => handleAcceptClick(offer)}
                              className="flex-1 py-2 bg-[#F0EBE3] text-charcoal text-xs font-bold rounded-lg hover:bg-[#E4DFD8] transition-colors"
                            >
                              Accept
                            </button>
                          )}
                          <button 
                            onClick={() => router.push(`/marketplace/${listing.id}/chat?guide=${offer.guide_id}`)}
                            className="flex-1 py-2 bg-charcoal text-white text-xs font-bold rounded-lg hover:bg-black transition-colors"
                          >
                            Chat
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {listing.status !== 'confirmed' && (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-3 bg-white border border-border text-charcoal font-bold text-[13px] rounded-xl hover:bg-red-50 hover:text-error hover:border-red-200 transition-colors shadow-sm mt-auto"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </>
      ) : (
        /* --- GUIDE HEADER & OFFER SUBMISSION --- */
        <div className="mb-12">
          {/* Dark Header */}
          <div 
            className="text-warmwhite relative overflow-hidden pt-10 sm:pt-12 px-6 sm:px-12 pb-8 sm:pb-10 rounded-t-[32px] shadow-sm z-10"
            style={{ background: '#0f0f0f' }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(196,135,74,0.22) 0%, transparent 70%),' +
                  'radial-gradient(ellipse 40% 40% at 20% 80%, rgba(196,135,74,0.10) 0%, transparent 65%)',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />
            <div className="relative z-10">
              <h1 className="text-3xl sm:text-[40px] font-extrabold text-white font-display mb-2 tracking-tight leading-tight">
                Submit an Offer
              </h1>
              <p className="text-sm sm:text-[15px] font-body text-white/60 max-w-2xl leading-relaxed mt-2">
                You are bidding on a confirmed itinerary request. Craft a competitive proposal to win this client.
              </p>
            </div>
          </div>
          
          {/* Body: Two Panes */}
          <div className="bg-white flex flex-col md:flex-row border-x border-b border-[#E5E0DA] rounded-b-[32px] overflow-hidden shadow-xl shadow-black/5">
            {/* Left: Traveller Context */}
            <div className="w-full md:w-[45%] bg-[#FAF9F7] p-8 sm:p-10 border-r border-[#E5E0DA] relative">
              <h3 className="text-[11px] text-secondary/80 uppercase tracking-widest font-extrabold mb-6">Trip Details</h3>
              <h4 className="font-display font-extrabold text-[28px] text-charcoal leading-tight mb-4">
                {listingTitle}
              </h4>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                   <div className="w-10 h-10 rounded-full bg-[#F0EBE3] flex items-center justify-center text-[16px] shrink-0">📍</div>
                   <div>
                      <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Location</div>
                      <div className="text-[14px] font-bold text-charcoal">{listing.city_name}{listing.country_name ? `, ${listing.country_name}` : ''}</div>
                   </div>
                </div>
                <div className="flex gap-4 items-start">
                   <div className="w-10 h-10 rounded-full bg-[#F0EBE3] flex items-center justify-center text-[16px] shrink-0">📅</div>
                   <div>
                      <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Dates</div>
                      <div className="text-[14px] font-bold text-charcoal">{formattedDateRange} <span className="text-secondary font-medium ml-1">({pax})</span></div>
                   </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-border">
                 <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-2">Target Budget</div>
                 <div className="font-display font-extrabold text-[32px] text-charcoal">{formatMYR(listing.desired_budget)}</div>
              </div>
            </div>

            {/* Right: Offer Form */}
            <div className="w-full md:w-[55%] p-8 sm:p-10 bg-white relative">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber to-[#FBAE3C]"></div>
              
              {listing.status === 'confirmed' ? (
                <div className="h-full flex flex-col justify-center text-center">
                  <h3 className="text-[22px] font-display font-extrabold text-charcoal mb-2">Listing Closed</h3>
                  <p className="text-secondary text-[13.5px]">This listing has been confirmed and is no longer accepting offers.</p>
                </div>
              ) : (!myGuideOffer || isEditingOffer) ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[22px] font-display font-extrabold text-charcoal mb-2">Propose Your Value</h3>
                    <p className="text-secondary text-[13.5px] leading-relaxed mb-6">Review the traveller&apos;s requirements closely. Present a competitive offer along with a personalized note.</p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-extrabold text-charcoal uppercase tracking-wider mb-2">
                      Proposed Price (RM)
                    </label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[18px] font-display font-bold text-charcoal/40 group-focus-within:text-amber transition-colors">RM</div>
                      <input 
                        type="number" 
                        placeholder="Your Proposed Price" 
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(e.target.value)}
                        className="w-full pl-14 pr-5 py-5 bg-[#FAF9F7] border-2 border-[#E5E0DA] rounded-2xl text-[24px] font-display font-extrabold text-charcoal focus:outline-none focus:border-amber focus:bg-white focus:ring-4 focus:ring-amber/10 transition-all placeholder:text-charcoal/20"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-[12px] font-extrabold text-charcoal uppercase tracking-wider mb-2">
                      Introductory Message <span className="text-secondary font-medium normal-case tracking-normal ml-1">(Optional)</span>
                    </label>
                    <textarea 
                      rows={4}
                      value={introMessage}
                      onChange={(e) => setIntroMessage(e.target.value)}
                      placeholder="e.g. Hi! I've been a verified guide here for 5 years..."
                      className="w-full px-5 py-4 bg-[#FAF9F7] border border-[#E5E0DA] rounded-2xl text-[14px] text-charcoal focus:outline-none focus:border-amber focus:bg-white focus:ring-4 focus:ring-amber/10 transition-all resize-none placeholder:text-secondary/50 leading-relaxed"
                    ></textarea>
                  </div>
                  
                  <div className="pt-6 border-t border-border mt-8 flex justify-end gap-3 items-center">
                     {isEditingOffer && (
                       <button onClick={() => setIsEditingOffer(false)} className="px-6 py-3.5 text-[14px] font-bold text-secondary hover:text-charcoal transition-colors">
                         Cancel
                       </button>
                     )}
                     <button 
                       onClick={handleSubmitOffer} 
                       disabled={isSubmittingOffer || !proposedPrice}
                       className="px-8 py-3.5 bg-amber hover:bg-[#E08A1E] text-white text-[14px] font-bold rounded-xl shadow-lg shadow-amber/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                       {isSubmittingOffer ? <Spinner /> : isEditingOffer ? 'Update Offer' : 'Submit Offer'}
                     </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                   <div>
                     <h3 className="text-[22px] font-display font-extrabold text-charcoal mb-2">Your Proposal is Active</h3>
                     <p className="text-secondary text-[13.5px] leading-relaxed mb-6">The traveller is reviewing your offer. You can edit or withdraw it before they make a decision.</p>
                   </div>
                   
                   <div className="p-6 bg-warmwhite rounded-2xl border border-border">
                     <div className="flex items-center justify-between mb-4">
                       <div>
                         <p className="text-xs text-secondary uppercase font-bold tracking-widest mb-1">Submitted Quote</p>
                         <p className="text-amber font-display font-extrabold text-3xl">{formatMYR(myGuideOffer.proposed_price)}</p>
                       </div>
                       <StatusBadge status={myGuideOffer.status} />
                     </div>
                     {myGuideOffer.intro_message && (
                       <div className="pt-4 border-t border-border/50">
                         <p className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-2">Intro Message</p>
                         <p className="text-[14px] text-charcoal leading-relaxed">{myGuideOffer.intro_message}</p>
                       </div>
                     )}
                   </div>

                   {myGuideOffer.status === 'pending' && (
                     <div className="flex gap-3 pt-4 border-t border-border">
                       <button onClick={handleEditOfferClick} className="flex-1 py-3.5 border border-border/50 rounded-xl font-bold text-[14px] hover:bg-black/5 transition-colors">
                         Edit Offer
                       </button>
                       <button onClick={() => handleWithdrawOffer(myGuideOffer.id)} className="flex-1 py-3.5 bg-red-50 text-error rounded-xl font-bold text-[14px] hover:bg-red-100 transition-colors">
                         Withdraw Offer
                       </button>
                     </div>
                   )}
                   {myGuideOffer.status !== 'withdrawn' && (
                     <div className="pt-4">
                       <button onClick={() => window.location.href = `/marketplace/${listingId}/chat?guide=${myGuideOffer.guide_id}`} className="w-full py-3.5 bg-charcoal text-white rounded-xl font-bold text-[14px] shadow-md hover:bg-black transition-colors">
                         Open Chat
                       </button>
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking Confirmed Panel */}
      {listing.status === 'confirmed' && (
        <div className="bg-success-bg border border-success/20 p-6 rounded-xl mb-8">
          <h3 className="font-display font-extrabold text-success text-xl mb-2">Booking Confirmed!</h3>
          <p className="text-success/80 text-sm mb-4"> Payment reference: Saved in transaction record</p>
          <p className="text-xs text-secondary mt-4">Disclaimer: Payment is simulated — no real transaction occurs.</p>
        </div>
      )}

      {/* POLISHED ITINERARY VIEW */}
      <div className="mb-16 w-full">
         <ItineraryTimeline listing={listing} />
      </div>

          </div>
        </div>
      </section>
    </div>
  )
}
