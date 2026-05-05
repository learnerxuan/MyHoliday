'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
import Avatar from '@/components/ui/Avatar'
import StatusBadge from '@/components/ui/StatusBadge'

// Reusable Dark Header matching the Mockup
function DarkHeader({ tag, title, description, children }) {
  return (
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
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 w-full">
        <div>
          {tag && (
            <div className="inline-flex w-fit items-center gap-2 bg-white/10 text-amber text-[11px] font-bold px-3 py-1 rounded-full border border-amber/20 mb-3 uppercase tracking-widest leading-none">
              {tag}
            </div>
          )}
          <h1 className="text-3xl sm:text-[40px] font-extrabold text-white font-display mb-2 tracking-tight leading-tight">
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

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const listingId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const targetGuideId = searchParams?.get('guide') || null

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [listing, setListing] = useState(null)
  const [offer, setOffer] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatMessage, setChatMessage] = useState('')
  const [isSendingMsg, setIsSendingMsg] = useState(false)
  const [error, setError] = useState('')

  const scrollRef = useRef(null)

  useEffect(() => {
    if (!listingId) return

    const fetchAllData = async () => {
      try {
        const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser()
        if (sessionError || !currentUser) throw new Error('Not authenticated')

        const role = currentUser.user_metadata?.role || 'traveler'
        setUser({ id: currentUser.id, role })

        // Guide viewing their own chat vs Traveller viewing a specific guide's chat
        const guideIdToFetch = role === 'guide' ? currentUser.id : targetGuideId

        if (!guideIdToFetch) {
           throw new Error('Guide ID is required to open a chat.')
        }

        const [listingRes, offersRes, msgRes] = await Promise.all([
           fetch(`/api/marketplace/listings/${listingId}`),
           fetch(`/api/marketplace/offers/${listingId}`),
           fetch(`/api/marketplace/messages/${listingId}`)
        ])

        if (!listingRes.ok) throw new Error('Failed to load listing')
        const listingData = await listingRes.json()
        setListing(listingData)

        if (offersRes.ok) {
           const offersData = await offersRes.json()
           const matchedOffer = offersData.find(o => o.guide_id === guideIdToFetch)
           if (matchedOffer) setOffer(matchedOffer)
        }

        if (msgRes.ok) {
           const msgData = await msgRes.json()
           // Filter messages to only show those between this listing + this guide
           const filteredMsgs = msgData.filter(m => m.guide_id === guideIdToFetch)
           setMessages(filteredMsgs)
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

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !user || !offer) return
    setIsSendingMsg(true)
    try {
      const res = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          guide_id: offer.guide_id,
          sender_id: user.id,
          message: chatMessage.trim()
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

  const isGuide = user?.role === 'guide'
  const isTraveller = user?.role !== 'guide'

  if (loading) {
    return <div className="py-20 flex justify-center"><Spinner /></div>
  }

  if (error) {
    return <div className="py-20 flex justify-center text-error">{error}</div>
  }

  if (!offer) {
     return <div className="py-20 flex justify-center text-secondary">No active offer found for this chat.</div>
  }

  return (
    <main className="bg-[#FAF9F7] min-h-screen pt-24 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="mb-6">
          <Link href={`/marketplace/${listingId}`} className="text-[12px] text-secondary font-bold hover:text-charcoal transition-colors tracking-wide uppercase">
            &larr; Back to Offer
          </Link>
        </div>

        <DarkHeader 
          tag={offer.status === 'pending' ? 'In Progress' : offer.status} 
          title="Chat with Tour Guide" 
          description="Communicate securely to finalize trip details and negotiate the final pricing." 
        />

        <div className="bg-white flex flex-col md:flex-row border-x border-b border-[#E5E0DA] rounded-b-[32px] overflow-hidden shadow-xl shadow-black/5">
           {/* Left Context Pane */}
           <div className="w-full md:w-[35%] bg-[#FAF9F7] p-8 border-r border-[#E5E0DA] flex flex-col justify-between">
             <div>
               <div className="inline-block bg-[#F0EBE3] text-charcoal text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest mb-3">
                 Current Offer
               </div>
               <h3 className="font-display font-extrabold text-[24px] text-charcoal leading-tight mb-6">
                 {formatMYR(offer.proposed_price)}
               </h3>

               <div className="space-y-4 mb-8">
                 <div>
                   <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Tour Guide</div>
                   <div className="text-[14px] font-bold text-charcoal flex items-center gap-2">
                     {offer.guide_name || 'Guide'} <span className="bg-[#EAF3DE] text-[#3B6D11] px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold">Verified</span>
                   </div>
                 </div>
                 <div>
                   <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Traveller Target</div>
                   <div className="text-[14px] font-bold text-charcoal line-through decoration-secondary/40">{formatMYR(listing.desired_budget)}</div>
                 </div>
               </div>
               <p className="text-[13px] text-secondary leading-relaxed border-t border-border pt-6">
                 Use the chat to discuss specific requirements, clarify inclusions, or negotiate the final price. The traveller must accept the offer to secure the booking.
               </p>
             </div>
           </div>

           {/* Right Chat Interface */}
           <div className="w-full md:w-[65%] flex flex-col h-[600px] relative bg-[#FCFBF9]">
             {/* Chat header */}
             <div className="px-8 py-5 border-b border-[#E5E0DA] bg-white flex justify-between items-center z-10">
               <div className="flex items-center gap-3">
                  <Avatar name={offer.guide_name || 'Guide'} size="md" />
                  <div>
                    <div className="font-bold text-[14px] text-charcoal leading-tight">{offer.guide_name || 'Tour Guide'}</div>
                    <div className="text-[11px] text-[#059669] font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Available
                    </div>
                  </div>
               </div>
               {isTraveller && offer.status === 'pending' && (
                 <button className="px-5 py-2.5 bg-amber hover:bg-[#E08A1E] text-white text-[12px] font-bold rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-amber/40 outline-none">
                   Accept {formatMYR(offer.proposed_price)}
                 </button>
               )}
               {isGuide && offer.status === 'pending' && (
                 <button className="px-5 py-2.5 bg-[#F0EBE3] text-charcoal text-[12px] font-bold rounded-lg shadow-sm transition-all">
                   Offer Pending
                 </button>
               )}
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
                    return (
                      <div key={idx} className={`flex gap-3 max-w-[85%] ${isMine ? 'self-end ms-auto flex-row-reverse' : ''}`}>
                        <Avatar name={isMine ? 'Me' : (isGuide ? 'Traveller' : offer.guide_name)} size="sm" />
                        <div className={`flex flex-col ${isMine ? 'items-end' : ''}`}>
                          <div className={`${isMine ? 'bg-charcoal text-white rounded-tr-sm' : 'bg-white border border-[#E5E0DA] text-charcoal rounded-tl-sm'} rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed shadow-sm`}>
                            {msg.message}
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
                    disabled={isSendingMsg || offer.status === 'withdrawn'}
                    placeholder={offer.status === 'withdrawn' ? "Offer is withdrawn." : "Type your message..."} 
                    className="w-full bg-[#FAF9F7] border border-[#E5E0DA] rounded-xl pl-5 pr-14 py-3.5 text-[14px] text-charcoal focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/10 transition-all placeholder:text-secondary/60 disabled:opacity-50"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isSendingMsg || !chatMessage.trim() || offer.status === 'withdrawn'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-amber hover:text-amberdark hover:bg-amber/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSendingMsg ? <Spinner className="w-4 h-4 border-2" /> : <span className="text-[20px] leading-none mb-1">↗</span>}
                  </button>
                </div>
                <div className="text-[10px] text-secondary/50 font-medium text-center mt-3 flex items-center justify-center gap-2">
                  <span>🔒</span> Messages are end-to-end encrypted
                </div>
             </div>
           </div>
        </div>
      </div>
    </main>
  )
}
