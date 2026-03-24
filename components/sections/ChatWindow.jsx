'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

export default function ChatWindow({ messages = [], isLoading = false, toolStatus = null, onSend }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, toolStatus])

  function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    onSend(text)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Message list ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 mt-16">
            <span className="text-4xl">✈️</span>
            <p className="text-sm font-semibold font-body text-charcoal">Ready to plan your trip!</p>
            <p className="text-xs font-body text-secondary leading-relaxed">
              Tell me how many days you're travelling and I'll build a personalised itinerary for you.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} content={msg.content} />
        ))}

        {/* Tool status — transient bubble while tool is running */}
        {toolStatus && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-muted text-secondary text-sm italic">
              {toolStatus}
            </div>
          </div>
        )}

        {/* Typing indicator — shown when loading but no tool status yet */}
        {isLoading && !toolStatus && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-muted">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ─────────────────────────────────────── */}
      <div className="border-t border-border px-4 py-3 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none input-base text-sm leading-relaxed"
          rows={1}
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="shrink-0 bg-amber text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-amberdark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>

    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────

function MessageBubble({ role, content }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-charcoal text-warmwhite rounded-tr-sm'
            : 'bg-muted text-charcoal rounded-tl-sm'
          }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <ReactMarkdown
            components={{
              p:      ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              ul:     ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
              ol:     ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
              li:     ({ children }) => <li>{children}</li>,
              h3:     ({ children }) => <p className="font-semibold mt-2 mb-0.5">{children}</p>,
              h2:     ({ children }) => <p className="font-semibold mt-2 mb-0.5">{children}</p>,
              // Strip images and links from AI messages — real data goes in Options panel
              img:    () => null,
              a:      ({ children }) => <span className="text-amber underline">{children}</span>,
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-secondary opacity-60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
