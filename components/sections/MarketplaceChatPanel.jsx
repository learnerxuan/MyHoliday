'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'

const OFFER_PRICE_TOKEN = '__OFFER_PRICE__:'
const OFFER_ACCEPTED_TOKEN = '__OFFER_ACCEPTED__:'
const PAYMENT_ENABLED_TOKEN = '__PAYMENT_ENABLED__:'
const PAYMENT_COMPLETED_TOKEN = '__PAYMENT_COMPLETED__:'
const ITINERARY_UPDATED_TOKEN = '__ITINERARY_UPDATED__'
const OFFER_WITHDRAWN_TOKEN = '__OFFER_WITHDRAWN__'

const formatMYR = (amount) =>
  `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export default function MarketplaceChatPanel({
  offerId,
  currentUserId,
  currentUserRole,  // 'guide' | 'traveler'
  guideName,
  travellerName,
  listingId,
  onViewItinerary,
}) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Initial load
  useEffect(() => {
    if (!offerId) return
    fetch(`/api/marketplace/messages/${offerId}`)
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [offerId])

  // Realtime subscription
  useEffect(() => {
    if (!offerId) return
    const channel = supabase
      .channel(`mkt_chat_panel_${offerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_messages',
          filter: `offer_id=eq.${offerId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [offerId])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isSending) return
    setIsSending(true)
    setInput('')
    try {
      await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: offerId,
          sender_id: currentUserId,
          sender_type: currentUserRole,
          content: text,
        }),
      })
    } catch {
      /* ignore */
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#FCFBF9] border border-border/50 rounded-[24px] overflow-hidden shadow-sm">
      {/* Header */}
      <header className="h-[80px] px-8 py-5 border-b border-[#E5E0DA] bg-white flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar name={currentUserRole === 'guide' ? travellerName || 'Traveller' : guideName || 'Guide'} size="md" />
          <div>
            <div className="font-bold text-[14px] text-charcoal leading-tight">
              {currentUserRole === 'guide' ? travellerName || 'Traveller' : guideName || 'Tour Guide'}
            </div>
            <div className="text-[11px] text-[#059669] font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Available
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onViewItinerary && (
            <button
              onClick={onViewItinerary}
              className="px-4 py-2 border border-[#E5E0DA] bg-white text-charcoal hover:bg-[#FAF9F7] text-[12px] font-bold rounded-lg shadow-sm transition-all"
            >
              View Itinerary
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-secondary/60 mt-10">Send a message to start the conversation.</p>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender_id === currentUserId
            const content = msg.content

            // System message tokens
            if (content?.startsWith(OFFER_PRICE_TOKEN)) {
              const amount = content.split(':')[1]
              return (
                <div key={msg.id || idx} className="flex justify-center">
                  <div className="bg-[#FFFDF5] border border-amber/20 px-4 py-1.5 rounded-xl text-[11px] text-amberdark font-medium">
                    Offer submitted: {formatMYR(amount)}
                  </div>
                </div>
              )
            }
            if (content?.startsWith(ITINERARY_UPDATED_TOKEN)) {
              return (
                <div key={msg.id || idx} className="flex justify-center">
                  <div className="bg-[#FFFDF5] border border-amber/20 px-4 py-1.5 rounded-xl text-[11px] text-amberdark font-medium">
                    🗺️ Itinerary updated
                  </div>
                </div>
              )
            }
            if (content?.startsWith(OFFER_ACCEPTED_TOKEN)) {
              return (
                <div key={msg.id || idx} className="flex justify-center">
                  <div className="bg-[#EFF6FF] border border-blue-200 px-4 py-1.5 rounded-xl text-[11px] text-blue-700 font-medium">
                    🎉 Traveller accepted this offer
                  </div>
                </div>
              )
            }
            if (content?.startsWith(OFFER_WITHDRAWN_TOKEN)) {
              return (
                <div key={msg.id || idx} className="flex justify-center">
                  <div className="bg-[#FEF2F2] border border-red-200 px-4 py-1.5 rounded-xl text-[11px] text-red-700 font-medium">
                    Offer withdrawn by tour guide
                  </div>
                </div>
              )
            }
            if (content?.startsWith(PAYMENT_ENABLED_TOKEN)) {
              const amount = content.split(':')[1]
              return (
                <div key={msg.id || idx} className="flex justify-center">
                  <div className="bg-[#FFFBEB] border border-amber/30 px-4 py-1.5 rounded-xl text-[11px] text-amber-700 font-medium">
                    💳 Payment of {formatMYR(amount)} enabled
                    {currentUserRole !== 'guide' && listingId && (
                      <> — <a href={`/marketplace/${listingId}`} className="underline font-bold">Pay Now</a></>
                    )}
                  </div>
                </div>
              )
            }
            if (content?.startsWith(PAYMENT_COMPLETED_TOKEN)) {
              const amount = content.split(':')[1]
              return (
                <div key={msg.id || idx} className="flex justify-center">
                  <div className="bg-[#ECFDF5] border border-green-200 px-4 py-1.5 rounded-xl text-[11px] text-green-700 font-medium">
                    ✅ Payment of {formatMYR(amount)} completed
                  </div>
                </div>
              )
            }

            // Regular chat bubble
            return (
              <div key={msg.id || idx} className={`flex gap-3 max-w-[85%] ${isMine ? 'self-end ms-auto flex-row-reverse' : ''}`}>
                <Avatar
                  name={isMine
                    ? (currentUserRole === 'guide' ? guideName : travellerName)
                    : (currentUserRole === 'guide' ? travellerName : guideName)
                  }
                  size="sm"
                  url={undefined}
                />
                <div className={`${isMine ? 'bg-charcoal text-white rounded-tr-sm' : 'bg-white border border-[#E5E0DA] text-charcoal rounded-tl-sm'} rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed shadow-sm`}>
                  {content}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <div className="p-5 bg-white border-t border-[#E5E0DA] shrink-0">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Reply to ${currentUserRole === 'guide' ? travellerName || 'Traveller' : guideName || 'Tour Guide'}...`}
            disabled={isSending}
            className="w-full bg-[#FAF9F7] border border-[#E5E0DA] rounded-xl pl-5 pr-14 py-3.5 text-[14px] text-charcoal focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/10 transition-all placeholder:text-secondary/60 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-amber hover:text-amberdark hover:bg-amber/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSending ? <span className="w-4 h-4 rounded-full animate-spin border-2 border-amber/20 border-t-amber" /> : <span className="text-[20px] leading-none mb-1">↗</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
