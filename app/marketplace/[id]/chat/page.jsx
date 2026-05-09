'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import ItineraryTimeline from '@/components/ui/ItineraryTimeline'
import ItineraryPanel from '@/components/sections/ItineraryPanel'
// Reusable Dark Header matching the Mockup
function DarkHeader({ tag, title, description, children }) {
  return (
    <div 
      className="text-warmwhite relative overflow-hidden px-6 sm:px-8 py-6 sm:py-7 shadow-sm z-10"
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
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 w-full">
        <div>
          {tag && (
            <div className="inline-flex w-fit items-center gap-2 bg-white/10 text-amber text-[11px] font-bold px-3 py-1 rounded-full border border-amber/20 mb-3 uppercase tracking-widest leading-none">
              {tag}
            </div>
          )}
          <h1 className="text-2xl sm:text-[30px] font-extrabold text-white font-display mb-1 tracking-tight leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm sm:text-[15px] font-body text-white/60 max-w-2xl leading-relaxed mt-2">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="shrink-0 flex items-center justify-end w-full lg:w-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

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

const getBudgetStyle = (budget) => {
  if (!budget) return 'bg-white text-secondary border-border/50'
  const b = budget.toLowerCase()
  if (b.includes('economy') || b.includes('budget')) return 'bg-success-bg text-success border-success/10'
  if (b.includes('mid-range') || b.includes('balanced') || b.includes('midrange')) return 'bg-warning-bg text-warning border-warning/10'
  if (b.includes('luxury')) return 'bg-muted text-amberdark border-amberdark/10'
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
    } catch {
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

const OFFER_PRICE_TOKEN = '__OFFER_PRICE__:'
const OFFER_ACCEPTED_TOKEN = '__OFFER_ACCEPTED__:'
const PAYMENT_ENABLED_TOKEN = '__PAYMENT_ENABLED__:'
const PAYMENT_COMPLETED_TOKEN = '__PAYMENT_COMPLETED__:'
const ITINERARY_UPDATED_TOKEN = '__ITINERARY_UPDATED__'
const OFFER_WITHDRAWN_TOKEN = '__OFFER_WITHDRAWN__'

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const listingId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const targetGuideId = searchParams?.get('guide') || null

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [listing, setListing] = useState(null)
  const [activeOffer, setActiveOffer] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatMessage, setChatMessage] = useState('')
  const [isSendingMsg, setIsSendingMsg] = useState(false)
  const [error, setError] = useState('')
  const [showItineraryModal, setShowItineraryModal] = useState(false)
  const [viewingOriginal, setViewingOriginal] = useState(false)
  const [itineraryEditMode, setItineraryEditMode] = useState(false)
  const [editedItinerary, setEditedItinerary] = useState(null)
  const [isSavingItinerary, setIsSavingItinerary] = useState(false)
  const [showEditPriceModal, setShowEditPriceModal] = useState(false)
  const [editPrice, setEditPrice] = useState('')
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false)
  const [transaction, setTransaction] = useState(null)
  const scrollRef = useRef(null)

  // Set default view based on whether an edit exists
  useEffect(() => {
    const timer = setTimeout(() => {
      setViewingOriginal(!activeOffer?.edited_itinerary)
    }, 0)
    return () => clearTimeout(timer)
  }, [activeOffer?.edited_itinerary])

  useEffect(() => {
    if (!listingId) return

    const fetchAllData = async () => {
      try {
        const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser()
        if (sessionError || !currentUser) throw new Error('Not authenticated')

        const role = currentUser.user_metadata?.role || 'traveler'
        setUser({ id: currentUser.id, role })

        // Guides should use the consolidated chats dashboard, not this traveller page
        if (role === 'guide') {
          router.replace('/guide/chats')
          return
        }

        let guideIdToFetch = targetGuideId

        const [listingRes, offersRes] = await Promise.all([
          fetch(`/api/marketplace/listings/${listingId}`),
          fetch(`/api/marketplace/offers/${listingId}`)
        ])

        if (!listingRes.ok) throw new Error('Failed to load listing')
        const listingData = await listingRes.json()

        if ((!listingData?.traveller_name || listingData.traveller_name === 'Anonymous Traveller') && listingData?.user_id) {
          const profileRes = await fetch('/api/marketplace/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: [listingData.user_id] })
          })
          if (profileRes.ok) {
            const profileRows = await profileRes.json()
            if (Array.isArray(profileRows) && profileRows[0]?.full_name) {
              listingData.traveller_name = profileRows[0].full_name
            }
          }
        }
        setListing(listingData)

        if (!offersRes.ok) throw new Error('Failed to load offers')
        const offersData = await offersRes.json()

        let chosenOffer = null
        if (role === 'guide') {
          chosenOffer = offersData.find(o => o.guide_id === guideIdToFetch)
        } else if (guideIdToFetch) {
          chosenOffer = offersData.find(o => o.guide_id === guideIdToFetch)
        } else {
          chosenOffer = offersData.find(o => o.status === 'pending') || offersData[0]
        }

        if (!chosenOffer) {
          throw new Error('No active offer found for this chat.')
        }

        setActiveOffer(chosenOffer)

        const msgRes = await fetch(`/api/marketplace/messages/${chosenOffer.id}`)
        if (msgRes.ok) {
          const msgData = await msgRes.json()
          setMessages(msgData || [])
        }

        const txRes = await fetch(`/api/marketplace/transactions?offer_id=${chosenOffer.id}`)
        if (txRes.ok) {
          const txData = await txRes.json()
          setTransaction(txData)
        }
      } catch (err) {
        setError(err.message || 'Failed to load data.')
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [listingId, targetGuideId])

  useEffect(() => {
    if (scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (!activeOffer?.id) return

    const channel = supabase.channel(`messages_${activeOffer.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketplace_messages', filter: `offer_id=eq.${activeOffer.id}` },
        (payload) => {
          const newMsg = payload.new
          
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          
          if (newMsg.content && newMsg.content.startsWith('__OFFER_PRICE__:')) {
            const newPrice = parseFloat(newMsg.content.split(':')[1])
            setActiveOffer(prev => prev ? { ...prev, proposed_price: newPrice } : prev)
          }

          if (newMsg.content && newMsg.content.startsWith(OFFER_ACCEPTED_TOKEN)) {
            setActiveOffer(prev => prev ? { ...prev, status: 'accepted' } : prev)
            setShowEditPriceModal(false)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeOffer?.id])

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !user || !activeOffer) return
    setIsSendingMsg(true)
    try {
      const res = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: activeOffer.id,
          sender_id: user.id,
          sender_type: user.role,
          content: chatMessage.trim()
        })
      })
      if (!res.ok) throw new Error('Failed to send message')
      
      const newMsg = await res.json()
      setMessages(prev => [...prev, newMsg])
      setChatMessage('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSendingMsg(false)
    }
  }

  const handleOpenEdit = () => {
    if (activeOffer?.edited_itinerary) {
      setEditedItinerary(activeOffer.edited_itinerary)
    } else {
      setEditedItinerary(listing?.itinerary_content || {})
    }
    setItineraryEditMode(true)
    setViewingOriginal(false)
  }

  const handleSaveEdits = async () => {
    if (!activeOffer?.id || !editedItinerary) return
    setIsSavingItinerary(true)
    try {
      const { error: updateError } = await supabase
        .from('marketplace_offers')
        .update({ edited_itinerary: editedItinerary })
        .eq('id', activeOffer.id)

      if (updateError) throw updateError
      
      setActiveOffer(prev => ({ ...prev, edited_itinerary: editedItinerary }))
      setItineraryEditMode(false)
    } catch (err) {
      console.error('Failed to save itinerary:', err)
      setError('Failed to save itinerary edits.')
    } finally {
      setIsSavingItinerary(false)
    }
  }

  const handleUpdatePrice = async () => {
    if (isOfferLocked) {
      setError('Accepted offers cannot be edited.')
      setShowEditPriceModal(false)
      return
    }

    const priceNum = parseFloat(editPrice)
    if (isNaN(priceNum) || priceNum <= 0) return

    setIsUpdatingPrice(true)
    setError('')

    try {
      const updateRes = await fetch(`/api/marketplace/offers/${activeOffer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposed_price: priceNum })
      })

      if (!updateRes.ok) {
        const data = await updateRes.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update offer price')
      }

      const msgRes = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: activeOffer.id,
          sender_id: user.id,
          sender_type: 'guide',
          content: `__OFFER_PRICE__:${priceNum}`
        })
      })

      if (!msgRes.ok) throw new Error('Failed to update price message')

      setActiveOffer(prev => ({ ...prev, proposed_price: priceNum }))
      
      const newMsg = await msgRes.json()
      setMessages(prev => [...prev, newMsg])
      
      setShowEditPriceModal(false)
      setEditPrice('')
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUpdatingPrice(false)
    }
  }

  const handleAcceptOffer = async () => {
    if (!activeOffer?.id) return
    setError('')

    try {
      const res = await fetch(`/api/marketplace/offers/${activeOffer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to accept offer')
      }

      router.push(`/marketplace/${listingId}`)
    } catch (err) {
      setError(err.message || 'Failed to accept offer')
    }
  }

  const isGuide = user?.role === 'guide'
  const isTraveller = user?.role !== 'guide'
  const hasAcceptanceMessage = messages.some((msg) => typeof msg?.content === 'string' && msg.content.startsWith(OFFER_ACCEPTED_TOKEN))
  const isOfferLocked = Boolean(
    activeOffer && (
      activeOffer.status === 'accepted' ||
      listing?.status === 'confirmed' ||
      activeOffer.payment_enabled ||
      hasAcceptanceMessage ||
      transaction
    )
  )

  useEffect(() => {
    if (isOfferLocked && showEditPriceModal) {
      const timer = setTimeout(() => setShowEditPriceModal(false), 0)
      return () => clearTimeout(timer)
    }
  }, [isOfferLocked, showEditPriceModal])

  if (loading) {
    return <div className="py-20 flex justify-center"><Spinner /></div>
  }

  if (error) {
    return <div className="py-20 flex justify-center text-error">{error}</div>
  }

  if (!activeOffer) {
     return <div className="py-20 flex justify-center text-secondary">No active offer found for this chat.</div>
  }

  const isOfferPriceMessage = (msg) => typeof msg?.content === 'string' && msg.content.startsWith(OFFER_PRICE_TOKEN)
  const isSystemMessage = (msg) => [
    OFFER_ACCEPTED_TOKEN, PAYMENT_ENABLED_TOKEN, PAYMENT_COMPLETED_TOKEN, OFFER_WITHDRAWN_TOKEN
  ].some(tok => msg?.content?.startsWith(tok))

  const rawContent = listing?.itinerary_content
  let parsedMeta = {}
  try {
    parsedMeta = typeof rawContent === 'string' ? JSON.parse(rawContent) : (rawContent || {})
  } catch {
    parsedMeta = {}
  }
  const tripMeta = listing?.trip_metadata || {}
  const days = parsedMeta.trip_days || tripMeta.trip_days || parsedMeta.duration_days || 5
  const groupSize = parsedMeta.group_size || tripMeta.group_size || parsedMeta.pax || tripMeta.pax
  const budgetType = parsedMeta.budget || tripMeta.budget || parsedMeta.budget_profile || tripMeta.budget_profile
  const pace = parsedMeta.pace || tripMeta.pace
  const preferenceTags = [
    ...normaliseList(parsedMeta.preferred_styles),
    ...normaliseList(tripMeta.preferred_styles),
    ...normaliseList(parsedMeta.styles),
    ...normaliseList(tripMeta.styles)
  ].filter((tag, index, all) => all.indexOf(tag) === index)
  const startDate = parsedMeta.start_date || tripMeta.travel_date_start || tripMeta.start_date || tripMeta.travel_dates?.start
  const endDate = parsedMeta.end_date || tripMeta.travel_date_end || tripMeta.end_date || tripMeta.travel_dates?.end
  const formattedDateRange = formatTripDateRange(startDate, endDate, days)
  const listingTitle = listing?.itinerary_title || `${listing?.city_name || 'Trip'} Itinerary`
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
    }
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-warmwhite flex flex-col -mt-7 md:-mt-6 p-4 sm:p-6 pb-20 font-body [&_button:not(:disabled)]:cursor-pointer [&_button:disabled]:cursor-not-allowed">
      <section className="max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

           {/* Left Context Island */}
           <div className="w-full md:w-[35%] bg-[#FAF9F7] border border-border/50 rounded-[24px] shadow-sm overflow-hidden flex flex-col md:h-[680px]">
             <DarkHeader 
               tag={activeOffer.status === 'pending' ? 'In Progress' : activeOffer.status} 
               title="Chat with Tour Guide" 
             />
             <div className="p-6 flex-1 md:overflow-y-auto">
               <div>
                 <div className="mb-5">
                   <div className="inline-block bg-[#F0EBE3] text-charcoal text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest mb-3">
                     Trip Info
                   </div>
                   <h2 className="font-display font-extrabold text-[22px] text-charcoal leading-tight mb-3">
                     {listingTitle}
                   </h2>
                   <div className="flex flex-wrap items-center gap-1.5">
                     {tripInfoChips.map(chip => (
                       <span
                         key={chip.key}
                         className={`flex items-center gap-1.5 px-2 rounded border text-[10px] font-bold uppercase leading-none h-[22px] whitespace-nowrap shrink-0 ${chip.className}`}
                       >
                         {chip.icon}
                         <span className="pt-[1px]">{chip.value}</span>
                       </span>
                     ))}
                   </div>
                 </div>

                 {preferenceTags.length > 0 && (
                   <div className="mb-5">
                     <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-2">Preference</div>
                     <div className="flex flex-wrap items-center gap-1.5">
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
                 )}

                 <div className="space-y-3 mb-5">
                   <div>
                     <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Tour Guide</div>
                     <div className="text-[14px] font-bold text-charcoal flex items-center gap-2">
                       {activeOffer.guide_name || 'Guide'} <span className="bg-[#EAF3DE] text-[#3B6D11] px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold">Verified</span>
                     </div>
                   </div>
                   <div>
                     <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Current Offer</div>
                     <div className="font-display font-extrabold text-[24px] text-charcoal leading-tight">
                       {formatMYR(activeOffer.proposed_price)}
                     </div>
                   </div>
                   <div>
                     <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Traveller Target</div>
                     <div className="text-[14px] font-bold text-charcoal line-through decoration-secondary/40">{formatMYR(listing.desired_budget)}</div>
                   </div>
                 </div>
                 <p className="text-[13px] text-secondary leading-relaxed border-t border-border pt-4">
                   Use the chat to discuss specific requirements, clarify inclusions, or negotiate the final price. The traveller must accept the offer to secure the booking.
                 </p>
               </div>
             </div>
           </div>

           {/* Right Chat Island */}
           <div className="w-full md:w-[65%] flex flex-col h-[680px] relative bg-[#FCFBF9] border border-border/50 rounded-[24px] shadow-sm overflow-hidden">
             {/* Chat header */}
             <div className="h-[80px] px-8 py-5 border-b border-[#E5E0DA] bg-white flex justify-between items-center z-10">
               <div className="flex items-center gap-3">
                 <Avatar name={isGuide ? listing?.traveller_name || 'Traveller' : activeOffer.guide_name || 'Guide'} size="md" />
                  <div>
                   <div className="font-bold text-[14px] text-charcoal leading-tight">{isGuide ? listing?.traveller_name || 'Traveller' : activeOffer.guide_name || 'Tour Guide'}</div>
                    <div className="text-[11px] text-[#059669] font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Available
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                 <button
                   onClick={() => setShowItineraryModal(true)}
                   className="px-4 py-2 border border-[#E5E0DA] bg-white text-charcoal hover:bg-[#FAF9F7] text-[12px] font-bold rounded-lg shadow-sm transition-all"
                 >
                   View Itinerary
                 </button>
                 {isTraveller && activeOffer.status === 'pending' && !isOfferLocked && (
                  <button
                    onClick={handleAcceptOffer}
                     className="px-5 py-2 bg-amber hover:bg-[#E08A1E] text-white text-[12px] font-bold rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-amber/40 outline-none"
                   >
                     Accept {formatMYR(activeOffer.proposed_price)}
                   </button>
                 )}
                 {isGuide && !isOfferLocked && (
                   <button
                     onClick={() => {
                       if (isOfferLocked) return
                       setEditPrice(activeOffer?.proposed_price?.toString() || '')
                       setShowEditPriceModal(true)
                     }}
                     className="px-4 py-2 border border-[#D48C44] bg-[#D48C44] text-white hover:bg-[#C27E3B] text-[12px] font-bold rounded-lg shadow-sm transition-all"
                   >
                     Edit Offer Price
                   </button>
                 )}
                 {isGuide && activeOffer.status === 'pending' && (
                   <button className="px-5 py-2 bg-[#F0EBE3] text-charcoal text-[12px] font-bold rounded-lg shadow-sm transition-all hidden sm:block">
                     Offer Pending
                   </button>
                 )}
               </div>
             </div>

             {/* Chat Messages */}
             <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest bg-[#F0EBE3] px-3 py-1 rounded-full">Chat Started</span>
                </div>

                {messages.length === 0 ? (
                  <p className="text-center text-sm text-secondary/60 mt-10">Send a message to start the conversation.</p>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.sender_id === user?.id
                    if (isOfferPriceMessage(msg)) {
                      const amount = msg.content.split(':')[1]
                      return (
                        <div key={msg.id || idx} className="flex justify-center my-2">
                          <div className="bg-[#FFFDF5] border border-amber/20 px-4 py-2 rounded-xl text-[12px] text-amberdark font-medium">
                            Offer submitted: {formatMYR(amount)}
                          </div>
                        </div>
                      )
                    }
                    const content = msg.content
                    if (content && content.startsWith(OFFER_ACCEPTED_TOKEN)) {
                      return (<div key={msg.id || idx} className="flex justify-center"><div className="bg-[#EFF6FF] border border-blue-200 px-4 py-2 rounded-xl text-[12px] text-blue-700 font-medium">🎉 Traveller accepted this offer</div></div>)
                    }
                    if (content && content.startsWith(OFFER_WITHDRAWN_TOKEN)) {
                      return (<div key={msg.id || idx} className="flex justify-center"><div className="bg-[#FEF2F2] border border-red-200 px-4 py-2 rounded-xl text-[12px] text-red-700 font-medium">Offer withdrawn by tour guide</div></div>)
                    }
                    if (content && content.startsWith(PAYMENT_ENABLED_TOKEN)) {
                      const amt = content.split(':')[1]
                      return (<div key={msg.id || idx} className="flex justify-center"><div className="bg-[#FFFBEB] border border-amber/30 px-4 py-2 rounded-xl text-[12px] text-amber-700 font-medium">💳 Payment of {formatMYR(amt)} enabled — <a href={'/marketplace/' + listingId} className="underline font-bold">Pay Now</a></div></div>)
                    }
                    if (content && content.startsWith(PAYMENT_COMPLETED_TOKEN)) {
                      const amt = content.split(':')[1]
                      return (<div key={msg.id || idx} className="flex justify-center"><div className="bg-[#ECFDF5] border border-green-200 px-4 py-2 rounded-xl text-[12px] text-green-700 font-medium">✅ Payment of {formatMYR(amt)} completed</div></div>)
                    }
                    if (content && content.startsWith(ITINERARY_UPDATED_TOKEN)) {
                      return (<div key={msg.id || idx} className="flex justify-center"><div className="bg-[#FFFDF5] border border-amber/20 px-4 py-2 rounded-xl text-[12px] text-amberdark font-medium">🗺️ Itinerary updated</div></div>)
                    }
                    return (
                      <div key={msg.id || idx} className={`flex gap-3 max-w-[85%] ${isMine ? 'self-end ms-auto flex-row-reverse' : ''}`}>
                        <Avatar 
                          name={isMine 
                            ? (isTraveller ? listing?.traveller_name : activeOffer?.guide_name) 
                            : (isTraveller ? activeOffer?.guide_name : listing?.traveller_name)
                          } 
                          size="sm" 
                        />
                        <div className={`flex flex-col ${isMine ? 'items-end' : ''}`}>
                          <div className={`${isMine ? 'bg-charcoal text-white rounded-tr-sm' : 'bg-white border border-[#E5E0DA] text-charcoal rounded-tl-sm'} rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed shadow-sm`}>
                            {content}
                          </div>
                          <div className="text-[10px] text-secondary/60 font-medium mt-1.5 px-1 flex items-center gap-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
             </div>

             {/* Message Input */}
             <div className="p-5 bg-white border-t border-[#E5E0DA]">
                <div className="relative">
                  <input 
                    type="text" 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isSendingMsg || activeOffer.status === 'withdrawn'}
                    placeholder={activeOffer.status === 'withdrawn' ? "Offer is withdrawn." : "Type your message..."} 
                    className="w-full bg-[#FAF9F7] border border-[#E5E0DA] rounded-xl pl-5 pr-14 py-3.5 text-[14px] text-charcoal focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/10 transition-all placeholder:text-secondary/60 disabled:opacity-50"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isSendingMsg || !chatMessage.trim() || activeOffer.status === 'withdrawn'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-amber hover:text-amberdark hover:bg-amber/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSendingMsg ? <Spinner className="w-4 h-4 border-2" /> : <span className="text-[20px] leading-none mb-1">↗</span>}
                  </button>
                </div>
             </div>
           </div>
      </section>

      {showItineraryModal && (
        <Modal 
          title={activeOffer?.edited_itinerary ? "Tour Guide's Suggested Itinerary" : "Itinerary Details"} 
          onClose={() => setShowItineraryModal(false)}
          maxWidth="max-w-5xl"
        >
          <div className="bg-[#FAF9F7] rounded-b-2xl overflow-hidden -m-6 flex flex-col">
            {/* Toolbar matching Guide View */}
            <div className="flex flex-col border-b border-border/60 bg-white">
              <div className="flex items-center justify-between px-6 pt-0.5 pb-2">
                <div className="flex items-center gap-3">
                  {activeOffer?.edited_itinerary && !itineraryEditMode ? (
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
                  ) : !itineraryEditMode ? (
                    <div className="px-3 py-1 bg-muted rounded-lg text-[11px] font-bold text-secondary uppercase tracking-widest">
                      Original Plan
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-[11px] font-bold px-3 py-1 rounded-full border border-green-200 uppercase tracking-widest">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Mode
                    </span>
                  )}

                  {!itineraryEditMode && (
                    <div className="text-[11px] font-extrabold text-secondary tracking-widest uppercase border border-border px-3 py-1 rounded-lg bg-white shadow-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary/30"></span>
                      {Object.keys(viewingOriginal ? (listing?.itinerary_content || {}) : (activeOffer?.edited_itinerary || listing?.itinerary_content || {})).length} Days
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isGuide && (
                    !itineraryEditMode ? (
                      <button
                        onClick={handleOpenEdit}
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
                          onClick={handleSaveEdits}
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

              {activeOffer?.edited_itinerary && !itineraryEditMode && (
                <div className={`px-6 py-1 border-t border-border/40 ${!viewingOriginal ? 'bg-amber/[0.03]' : 'bg-gray-50/50'}`}>
                  {!viewingOriginal ? (
                    <div className="flex items-center gap-2 text-[11px] text-amber font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
                      Viewing customized offer plan
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-secondary font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary/30" />
                      Viewing original plan
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
                    onUpdate={(updates) => {
                      setEditedItinerary(prev => {
                        const updated = { ...(prev || {}) }
                        updates.forEach(u => {
                          const dayKey = `day${u.day}`
                          if (u.action === 'add') {
                            const { action, day, ...item } = u
                            updated[dayKey] = [...(updated[dayKey] || []), item]
                          } else if (u.action === 'update') {
                            updated[dayKey] = (updated[dayKey] || []).map(item => 
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
                      setEditedItinerary(prev => {
                        const updated = { ...(prev || {}) }
                        if (updated[dayKey]) {
                          updated[dayKey] = updated[dayKey].filter(i => i.name !== itemName)
                        }
                        return updated
                      })
                    }}
                    city={listing?.city_name}
                    allowFullEdit={true}
                    hideExport={true}
                  />
                </div>
              ) : (
                <div className="pt-1.5 p-5 lg:pt-2 lg:p-6">
                  <ItineraryTimeline 
                    listing={{
                      ...listing,
                      itinerary_content: (viewingOriginal ? listing?.itinerary_content : activeOffer?.edited_itinerary || listing?.itinerary_content) || {}
                    }}
                    isEditable={false}
                    isGuideEdited={!viewingOriginal && Boolean(activeOffer?.edited_itinerary)}
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Price Modal */}
      {showEditPriceModal && !isOfferLocked && (
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
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
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
