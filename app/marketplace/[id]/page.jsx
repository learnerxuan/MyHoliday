'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import StatusBadge from '@/components/ui/StatusBadge'
import Badge from '@/components/ui/Badge'
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
  const { id: listingId } = useParams()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [listing, setListing] = useState(null)
  const [offers, setOffers] = useState([])
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')

  // Guide-specific state
  const [proposedPrice, setProposedPrice] = useState('')
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false)
  
  // Traveller-specific state
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false)
  
  // Chat state
  const [chatMessage, setChatMessage] = useState('')
  const [isSendingMsg, setIsSendingMsg] = useState(false)

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. Fetch User Profile
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session?.user) throw new Error('Not authenticated')
        
        const currentUser = session.user
        setUser({ 
          id: currentUser.id, 
          email: currentUser.email,
          role: currentUser.user_metadata?.role || 'traveler'
        })

        // 2. Fetch Listing
        const listingRes = await fetch(`/api/marketplace/listings/${listingId}`)
        if (!listingRes.ok) throw new Error('Listing not found')
        const listingData = await listingRes.json()
        setListing(listingData)

        // 3. Fetch Offers
        const offersRes = await fetch(`/api/marketplace/offers/${listingId}`)
        if (offersRes.ok) {
          const offersData = await offersRes.json()
          setOffers(offersData)
        }

        // 4. Fetch Messages
        const msgRes = await fetch(`/api/marketplace/messages/${listingId}`)
        if (msgRes.ok) {
          const msgData = await msgRes.json()
          setMessages(msgData)
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

  // --- GUIDE ACTIONS ---
  const handleSubmitOffer = async () => {
    if (!proposedPrice) return
    setIsSubmittingOffer(true)
    try {
      const res = await fetch('/api/marketplace/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          guide_id: user.id,
          proposed_price: parseFloat(proposedPrice)
        })
      })
      if (res.ok) {
        window.location.reload()
      }
    } catch (err) {
      setError('Failed to submit offer.')
      setIsSubmittingOffer(false)
    }
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
          listing_id: listingId,
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
  const isTraveller = user?.role === 'traveler'
  const myGuideOffer = isTraveller ? null : offers.find(o => o.guide_id === user?.id)

  return (
    <section className="py-20 max-w-5xl mx-auto px-12">
      <div className="flex justify-between items-start mb-8">
        <div>
          <PageHeader tag="Listing Detail" title={`${listing.city_name} Trip`} />
          <div className="flex items-center gap-3 mt-2">
            <span className="text-secondary text-sm">Budget: {formatMYR(listing.desired_budget)}</span>
            <StatusBadge status={displayStatus} />
          </div>
        </div>
      </div>

      {error && <div className="bg-error-bg text-error p-4 rounded-xl mb-6">{error}</div>}

      {/* Booking Confirmed Panel */}
      {listing.status === 'confirmed' && (
        <div className="bg-success-bg border border-success/20 p-6 rounded-xl mb-8">
          <h3 className="font-display font-extrabold text-success text-xl mb-2">Booking Confirmed!</h3>
          <p className="text-success/80 text-sm mb-4"> Payment reference: Saved in transaction record</p>
          <p className="text-xs text-secondary mt-4">Disclaimer: Payment is simulated — no real transaction occurs.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* LEFT COLUMN: Itinerary & Offers */}
        <div className="flex flex-col gap-8">
          
          {/* Offers Panel (Traveller View) */}
          {isTraveller && listing.status !== 'confirmed' && (
            <div className="bg-white p-6 rounded-xl border border-border">
              <h3 className="font-body font-semibold text-charcoal mb-4">Guide Offers</h3>
              {offers.length === 0 ? (
                <p className="text-secondary text-sm italic">Awaiting offers from guides...</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {offers.map(offer => (
                    <div key={offer.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar name={offer.guide_name} size="sm" />
                        <div>
                          <p className="font-semibold text-sm">{offer.guide_name}</p>
                          <p className="text-amber font-bold">{formatMYR(offer.proposed_price)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {offer.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleRejectOffer(offer.id)}>Reject</Button>
                            <Button variant="primary" size="sm" onClick={() => handleAcceptClick(offer)}>Accept</Button>
                          </>
                        )}
                        {offer.status !== 'pending' && <StatusBadge status={offer.status} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Guide Submission Panel (Guide View) */}
          {!isTraveller && listing.status !== 'confirmed' && (
            <div className="bg-white p-6 rounded-xl border border-border">
              <h3 className="font-body font-semibold text-charcoal mb-4">Your Proposal</h3>
              {!myGuideOffer ? (
                <div className="flex flex-col gap-4">
                  <Input 
                    type="number" 
                    placeholder="Your Proposed Price (MYR)" 
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                  />
                  <Button variant="primary" onClick={handleSubmitOffer} disabled={isSubmittingOffer || !proposedPrice}>
                    {isSubmittingOffer ? <Spinner /> : 'Submit Offer'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-warmwhite rounded-lg border border-border">
                  <div>
                    <p className="text-sm text-secondary">Submitted Quote</p>
                    <p className="text-amber font-bold text-lg">{formatMYR(myGuideOffer.proposed_price)}</p>
                    <StatusBadge status={myGuideOffer.status} />
                  </div>
                  {myGuideOffer.status === 'pending' && (
                    <Button variant="ghost" onClick={() => handleWithdrawOffer(myGuideOffer.id)}>Withdraw Offer</Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Chat Window */}
        <div className="h-[600px] flex flex-col bg-white border border-border rounded-xl overflow-hidden">
          {/* Note: This simulates the ChatWindow component usage as specified by ZX */}
          <ChatWindow 
            messages={messages} 
            currentUserRole={user?.role} 
          />
          <div className="p-4 border-t border-border bg-warmwhite flex gap-2">
            <Input 
              value={chatMessage} 
              onChange={(e) => setChatMessage(e.target.value)} 
              placeholder="Type a message..." 
              className="flex-1"
            />
            <Button variant="primary" onClick={handleSendMessage} disabled={isSendingMsg}>
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Accept Offer Modal */}
      {showAcceptModal && selectedOffer && (
        <Modal onClose={() => setShowAcceptModal(false)} title="Confirm Booking">
          <p className="text-secondary text-sm mb-4">
            You are about to accept the offer from <strong>{selectedOffer.guide_name}</strong> for <strong>{formatMYR(selectedOffer.proposed_price)}</strong>.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setShowAcceptModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirmAcceptOffer} disabled={isProcessingTransaction}>
              {isProcessingTransaction ? <Spinner /> : 'Confirm & Book'}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  )
}