'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

export default function ChatWindow({ messages = [], isLoading = false, toolStatus = null, onSend }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 mt-16">
            <span className="text-4xl">✈️</span>
            <p className="text-sm font-semibold font-body text-charcoal">Ready to plan your trip!</p>
            <p className="text-xs font-body text-secondary leading-relaxed">
              I can build a quick draft or guide you step by step once we set your trip length and pace.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            quickReplies={i === messages.length - 1 && msg.role === 'assistant' ? msg.quickReplies : []}
            onSend={onSend}
            disabled={isLoading}
          />
        ))}

        {toolStatus && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-muted text-secondary text-sm italic">
              {toolStatus}
            </div>
          </div>
        )}

        {isLoading && !toolStatus && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-muted">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border px-4 py-3 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none input-base text-sm leading-relaxed"
          rows={1}
          placeholder="Type a message..."
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

function preprocessContent(text) {
  if (!text) return text

  const inlinePattern = /\((\d+)\)\s+/g
  if (inlinePattern.test(text)) {
    const parts = text.split(/(?=\(\d+\)\s)/)
    if (parts.length > 1) {
      const introMatch = text.match(/^([\s\S]*?)(?=\(1\)\s)/)
      const intro = introMatch ? introMatch[1].trim() : ''
      const listItems = []
      const itemPattern = /\((\d+)\)\s+([\s\S]*?)(?=\(\d+\)\s|$)/g
      let match
      while ((match = itemPattern.exec(text)) !== null) {
        const clean = match[2].trim().replace(/,?\s+and\s*$/i, '')
        listItems.push(`${match[1]}. ${clean.charAt(0).toUpperCase()}${clean.slice(1)}`)
      }
      if (listItems.length > 1) {
        return (intro ? `${intro}\n\n` : '') + listItems.join('\n')
      }
    }
  }

  return text.replace(/(\?|!|,)\.?\s+[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]\s*/g, '$1 ')
}

function MessageBubble({ role, content, quickReplies = [], onSend, disabled = false }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-charcoal text-warmwhite rounded-tr-sm'
            : 'bg-muted text-charcoal rounded-tl-sm'
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <>
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                h3: ({ children }) => <p className="font-semibold mt-2 mb-0.5">{children}</p>,
                h2: ({ children }) => <p className="font-semibold mt-2 mb-0.5">{children}</p>,
                img: () => null,
                a: ({ children }) => <span className="text-amber underline">{children}</span>,
              }}
            >
              {preprocessContent(content)}
            </ReactMarkdown>

            {quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {quickReplies.map((reply) => (
                  <button
                    key={`${reply.label}-${reply.value}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSend(reply.value)}
                    className="px-3 py-1.5 rounded-full border border-amber text-amber bg-white text-xs font-semibold font-body hover:bg-amber hover:text-warmwhite transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reply.label}
                  </button>
                ))}
              </div>
            )}
          </>
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
