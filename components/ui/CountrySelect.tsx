"use client"

import { useEffect, useMemo, useState } from 'react'
import { COUNTRIES } from '@/lib/countries'

export default function CountrySelect({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'Search country...'
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  placeholder?: string
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) setQuery(value)
  }, [open, value])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized || COUNTRIES.includes(query)) return COUNTRIES
    return COUNTRIES.filter(country => country.toLowerCase().includes(normalized))
  }, [query])

  const selectCountry = (country: string) => {
    onChange(country)
    setQuery(country)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        required={required}
        disabled={disabled}
        value={open ? query : value}
        onFocus={() => {
          if (!disabled) {
            setQuery(value)
            setOpen(true)
          }
        }}
        onChange={event => {
          const nextValue = event.target.value
          setQuery(nextValue)
          onChange(COUNTRIES.includes(nextValue) ? nextValue : '')
          setOpen(true)
        }}
        placeholder={placeholder}
        className={`w-full py-2.5 px-3.5 rounded-xl border border-border text-sm font-body text-charcoal placeholder:text-tertiary focus:outline-none focus:border-amber transition-colors bg-white ${disabled ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}`}
      />

      {open && !disabled && (
        <>
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto overscroll-contain">
            {filtered.length > 0 ? (
              filtered.map(country => (
                <button
                  key={country}
                  type="button"
                  onClick={() => selectCountry(country)}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-none text-sm font-body text-charcoal"
                >
                  {country}
                </button>
              ))
            ) : (
              <div className="px-4 py-4 text-center text-xs text-tertiary font-body italic">
                No matching countries found.
              </div>
            )}
          </div>
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  )
}
