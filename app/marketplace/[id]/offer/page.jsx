'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAppRouter as useRouter } from '@/components/providers/PageTransitionProvider'
import { supabase } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
import ItineraryTimeline from '@/components/ui/ItineraryTimeline'
import { resolveMarketplacePlatformFeeRate } from '@/lib/marketplace/payment-config'
const formatMYR = (amount) => `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const PLATFORM_FEE_RATE = resolveMarketplacePlatformFeeRate(process.env.NEXT_PUBLIC_MARKETPLACE_PLATFORM_FEE_RATE)
const platformFeeLabel = `${Math.round(PLATFORM_FEE_RATE * 100)}% Platform Fee`
const calculateExpectedPayout = (amount) => amount - (amount * PLATFORM_FEE_RATE)

export default function SubmitOfferPage() {
  const router = useRouter()
  const params = useParams()
  const listingId = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [listing, setListing] = useState(null)
  const [error, setError] = useState('')

  const [proposedPrice, setProposedPrice] = useState('3400')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!listingId) return

    const fetchListingAndAuth = async () => {
      try {
        const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser()
        if (sessionError || !currentUser) {
          router.push('/auth/login')
          return
        }

        // Must be a guide to submit an offer
        const role = currentUser.user_metadata?.role || 'traveler'
        if (role !== 'guide') {
          router.push('/marketplace')
          return
        }

        setUser({
          id: currentUser.id,
          role
        })

        const res = await fetch(`/api/marketplace/listings/${listingId}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load listing')
        }

        let parsedMeta = {}
        try {
          parsedMeta = typeof data.itinerary_content === 'string' 
            ? JSON.parse(data.itinerary_content) 
            : (data.itinerary_content || {})
        } catch (e) {
          parsedMeta = {}
        }
        
        const tripMeta = data.trip_metadata || {}
        
        const days = parsedMeta.trip_days || tripMeta.trip_days || parsedMeta.duration_days || 5
        const startDate = parsedMeta.start_date || tripMeta.start_date || tripMeta.travel_dates?.start
        const endDate = parsedMeta.end_date || tripMeta.end_date || tripMeta.travel_dates?.end
        
        let formattedDateRange = `${days} Days`
        if (startDate && endDate) {
          try {
            const start = new Date(startDate)
            const end = new Date(endDate)
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const sMonth = start.toLocaleDateString('en-US', { month: 'short' })
              const eMonth = end.toLocaleDateString('en-US', { month: 'short' })
              if (sMonth === eMonth && start.getFullYear() === end.getFullYear()) {
                formattedDateRange = `${start.getDate()} - ${end.getDate()} ${sMonth} ${start.getFullYear()} (${days} Days)`
              } else if (start.getFullYear() === end.getFullYear()) {
                formattedDateRange = `${start.getDate()} ${sMonth} - ${end.getDate()} ${eMonth} ${start.getFullYear()} (${days} Days)`
              } else {
                 formattedDateRange = `${start.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} (${days} Days)`
              }
            }
          } catch(err) {}
        }

        setListing({
          ...data,
          dates: formattedDateRange,
          days,
          travellerName: data.traveller_name || 'John Doe' // Fallback to mock data
        })

      } catch (err) {
        setError(err.message || 'Failed to load data.')
      } finally {
        setLoading(false)
      }
    }

    fetchListingAndAuth()
  }, [listingId, router])

  const handleSubmit = async () => {
    if (!proposedPrice) return
    setIsSubmitting(true)

    try {
      const normalizedMessage = message.trim()

      // 1. Submit Offer
      const offerRes = await fetch('/api/marketplace/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          proposed_price: parseFloat(proposedPrice),
          intro_message: normalizedMessage || null
        })
      })

      if (!offerRes.ok) {
         const errData = await offerRes.json()
         throw new Error(errData.error || 'Failed to submit offer.')
      }

      const offerData = await offerRes.json()

      // 2. Seed chat with offer price card
      const offerCardRes = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: offerData.id,
          sender_id: user.id,
          sender_type: user.role,
          content: `__OFFER_PRICE__:${parseFloat(proposedPrice)}`
        })
      })
      if (!offerCardRes.ok) {
        const cardErr = await offerCardRes.json().catch(() => ({}))
        throw new Error(cardErr.error || 'Failed to write offer card to chat.')
      }

      // 3. Submit Introductory Message (if any)
      if (normalizedMessage) {
        const introRes = await fetch('/api/marketplace/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offer_id: offerData.id,
            sender_id: user.id,
            sender_type: user.role,
            content: normalizedMessage
          })
        })
        if (!introRes.ok) {
          const introErr = await introRes.json().catch(() => ({}))
          throw new Error(introErr.error || 'Failed to write intro message to chat.')
        }
      }

      // Redirect to the listing detail page
      router.push(`/marketplace/${listingId}`)

    } catch (err) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-warmwhite py-20 flex justify-center"><Spinner /></div>
  
  if (error && !listing) return (
    <div className="min-h-screen bg-warmwhite py-20 px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl border border-border/50 text-center text-error">
        {error}
      </div>
    </div>
  )

  const getTargetIndicator = () => {
    if (!listing || !proposedPrice) return null;
    const target = listing.desired_budget || 0;
    const price = parseFloat(proposedPrice);
    if (isNaN(price)) return null;

    if (price === target) {
      return { text: 'On Target Price', color: 'text-success', icon: '✓ ' };
    } else if (price > target) {
      return { text: 'Higher than Target Price', color: 'text-error', icon: '⚠️ ' };
    } else if (price >= target * 0.9 && price < target) {
      return { text: 'Close to Target Price', color: 'text-[#C29665]', icon: '' };
    } else {
      return { text: 'Lower than Target Price', color: 'text-[#3B82F6]', icon: '' };
    }
  };
  const indicator = getTargetIndicator();

  return (
    <div className="min-h-screen bg-warmwhite flex flex-col -mt-7 md:-mt-6 p-4 sm:p-6 pb-20 font-body">
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
                Return to Marketplace
              </button>
            </div>

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
            <div className="bg-white flex flex-col md:flex-row border-x border-b border-[#E5E0DA] rounded-b-[32px] overflow-hidden shadow-xl shadow-black/5 mb-16">
            
            {/* LEFT COLUMN: Trip Details */}
            <div className="md:w-[45%] p-10 md:p-14 border-r border-border/40 flex flex-col relative z-0">
               <div className="flex justify-between items-center mb-6">
                 <div className="text-[10px] text-secondary/70 font-bold tracking-[0.2em] uppercase">
                   Trip Details
                 </div>
                 <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#E5D7CC] animate-pulse"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-[#D6BFA9] animate-pulse" style={{ animationDelay: '200ms' }}></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-[#C29665] animate-pulse" style={{ animationDelay: '400ms' }}></div>
                 </div>
               </div>

               <h2 className="font-display font-extrabold text-[#111] text-3xl leading-[1.1] tracking-tight mb-10">
                 {listing?.itinerary_title || 'Urban Exploration & Food Tour'}
               </h2>

               <div className="flex flex-col gap-6 mb-12 flex-1">
                 {/* Item 1 */}
                 <div className="flex items-start gap-4">
                   <div className="w-10 h-10 rounded-full bg-[#F4EFEB] flex items-center justify-center shrink-0">
                     <span className="text-[#B95945] text-lg">📍</span> 
                   </div>
                   <div>
                     <div className="text-[10px] text-secondary/80 font-bold tracking-widest uppercase mb-1">
                       Location
                     </div>
                     <div className="text-[15px] font-bold text-charcoal">
                       {listing?.city_name || 'Kuala Lumpur, MY'}
                     </div>
                   </div>
                 </div>

                 {/* Item 2 */}
                 <div className="flex items-start gap-4">
                   <div className="w-10 h-10 rounded-full bg-[#EFEFEF] flex items-center justify-center shrink-0">
                     <span className="text-[#888] text-lg">📅</span> 
                   </div>
                   <div>
                     <div className="text-[10px] text-secondary/80 font-bold tracking-widest uppercase mb-1">
                       Dates
                     </div>
                     <div className="text-[15px] font-semibold text-charcoal">
                       {listing?.dates || '14 - 18 Oct 2024 (5 Days)'}
                     </div>
                   </div>
                 </div>

                 {/* Item 3 */}
                 <div className="flex items-start gap-4">
                   <div className="w-10 h-10 rounded-full bg-[#EAEAEA] flex items-center justify-center shrink-0">
                     <span className="text-[#6484A4] text-lg">👤</span>
                   </div>
                   <div>
                     <div className="text-[10px] text-secondary/80 font-bold tracking-widest uppercase mb-1">
                       Traveller
                     </div>
                     <div className="flex items-center gap-2">
                       <span className="text-[15px] font-bold text-charcoal">{listing?.travellerName}</span>
                       <span className="text-[10px] bg-[#F4F4F4] text-[#888] px-2 py-0.5 rounded-md font-bold">First-time visitor</span>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="pt-8 border-t border-border/40">
                 <div className="text-[10px] text-secondary/80 font-bold tracking-widest uppercase mb-2">
                   Target Budget
                 </div>
                 <div className="font-display font-extrabold text-[32px] tracking-tight text-charcoal">
                   {formatMYR(listing?.desired_budget || 0)}
                 </div>
               </div>
            </div>

            {/* RIGHT COLUMN: Propose Your Value */}
            <div className="md:w-[55%] p-10 md:p-14 bg-white relative">
               <h3 className="font-display font-extrabold text-[24px] text-charcoal mb-4">
                 Propose Your Value
               </h3>
               <p className="text-secondary text-[15px] leading-relaxed mb-10">
                 Review the traveller&apos;s requirements closely. Present a competitive offer along with a personalized note to increase your chances of being selected.
               </p>

               {error && <div className="mb-6 p-4 bg-error-bg text-error text-sm rounded-lg">{error}</div>}

               {/* Proposed Price Input */}
               <div className="mb-8 relative">
                 <label className="block text-[11px] font-bold tracking-widest uppercase text-charcoal mb-3">
                   Proposed Price (RM)
                 </label>
                 <div className="relative flex items-center bg-[#FAFAFA] border border-border focus-within:border-charcoal focus-within:ring-1 focus-within:ring-charcoal rounded-[12px] transition-all overflow-hidden h-[70px]">
                   <span className="pl-6 text-[22px] font-extrabold text-[#CCC] select-none text-center">
                     RM
                   </span>
                   <input 
                     type="number"
                     className="w-full h-full bg-transparent pl-3 pr-10 text-[26px] font-extrabold text-charcoal outline-none placeholder:text-[#EEE]"
                     value={proposedPrice}
                     onChange={(e) => setProposedPrice(e.target.value)}
                     placeholder="0"
                   />
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-40">
                     {/* Carets / Spinner icon representation */}
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>
                   </div>
                 </div>
                 
                 <div className="flex justify-between items-center mt-3 px-1">
                   <div className="text-[12px] text-secondary font-medium">
                      Expected Payout: <strong className="text-charcoal ml-0.5">{proposedPrice ? formatMYR(calculateExpectedPayout(parseFloat(proposedPrice))) : 'RM 0'} <span className="text-[#888] font-normal">({platformFeeLabel})</span></strong>
                   </div>
                   {indicator && (
                     <div className={`text-[12px] font-bold ${indicator.color}`}>
                       {indicator.icon}{indicator.text}
                     </div>
                   )}
                 </div>
               </div>

               {/* Introductory Message */}
               <div className="mb-10">
                 <label className="block text-[11px] font-bold tracking-widest uppercase text-charcoal mb-3">
                   Introductory Message <span className="text-secondary/70 font-normal capitalize tracking-normal ml-1">(Optional)</span>
                 </label>
                 <textarea 
                   className="w-full bg-[#FAFAFA] border border-[#EBEBEB] focus:border-charcoal focus:ring-1 focus:ring-charcoal rounded-[12px] p-5 text-[15px] outline-none text-charcoal resize-none placeholder:text-[#AAA] leading-relaxed transition-all h-[140px]"
                   placeholder="Hi John! I've been a verified guide in KL for 5 years. I specialize in hidden food gems and would love to show you the authentic side of the city..."
                   value={message}
                   onChange={(e) => setMessage(e.target.value)}
                 />
               </div>

               {/* Actions */}
               <div className="flex justify-end items-center gap-4 pt-10 border-t border-border/40">
                  <button 
                    onClick={() => router.push('/marketplace')} 
                    className="px-6 py-4 text-[14px] font-bold text-charcoal hover:bg-[#F4F4F4] rounded-[10px] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !proposedPrice}
                    className="bg-[#BB8B5D] hover:bg-[#A37549] text-white px-8 py-4 rounded-[10px] text-[14px] font-bold shadow-md shadow-[#BB8B5D]/20 transition-colors flex items-center justify-center gap-2 min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Spinner /> : 'Submit Offer →'}
                  </button>
               </div>
            </div>
          </div>
          
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
