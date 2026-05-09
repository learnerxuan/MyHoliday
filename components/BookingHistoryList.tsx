'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ExternalLink, MessageCircle, ReceiptText, WalletCards } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

type HistoryScope = 'traveller' | 'guide'

type BookingHistoryRecord = {
  transactionId: string
  listingId: string
  guideId: string
  title: string
  destination: { city: string; country: string }
  dates: { startDate: string; endDate: string; days: string }
  pax: string
  travellerName: string
  guideName: string
  payment: {
    status: string
    totalAmount: number
    serviceCharge: number
    guidePayout: number
    paymentReference: string
    createdAt: string
  }
}

const formatMYR = (amount: number) =>
  `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

function formatDate(date: string) {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTripDates(record: BookingHistoryRecord) {
  const start = formatDate(record.dates.startDate)
  const end = formatDate(record.dates.endDate)

  if (start && end) return `${start} - ${end}`
  if (start) return start
  if (record.dates.days) return `${record.dates.days} days`
  return 'Dates TBD'
}

export default function BookingHistoryList({ scope }: { scope: HistoryScope }) {
  const [records, setRecords] = useState<BookingHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isGuide = scope === 'guide'
  const copy = useMemo(() => ({
    title: isGuide ? 'Booking History' : 'My Travel History',
    subtitle: isGuide
      ? 'Completed paid bookings with traveller details and payout breakdowns.'
      : 'Completed paid bookings with your accepted tour guides.',
    emptyTitle: isGuide ? 'No Completed Bookings' : 'No Travel History Yet',
    emptyText: isGuide
      ? 'Completed paid tours will appear here after travellers finish payment.'
      : 'Your completed paid marketplace bookings will appear here.',
    ctaHref: isGuide ? '/marketplace' : '/marketplace',
    ctaLabel: isGuide ? 'Browse Marketplace' : 'Go to Marketplace',
  }), [isGuide])

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      setLoading(true)
      setError('')

      try {
        const res = await fetch(`/api/marketplace/history?scope=${scope}`)
        const payload = await res.json()

        if (!res.ok) {
          throw new Error(payload.error || 'Failed to load booking history.')
        }

        if (!cancelled) {
          setRecords(Array.isArray(payload.records) ? payload.records : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load booking history.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadHistory()

    return () => {
      cancelled = true
    }
  }, [scope])

  return (
    <section className="w-full bg-white rounded-[24px] border border-border/50 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-10 py-8 sm:py-10 border-b border-border/60 bg-[#FAF9F7]">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#D48C44]/30 bg-[#D48C44]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[#9A632C] mb-3">
              <ReceiptText className="h-3.5 w-3.5" />
              Completed Payments
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-charcoal leading-tight">{copy.title}</h1>
            <p className="text-secondary text-sm sm:text-[15px] mt-2 max-w-xl">{copy.subtitle}</p>
          </div>
          <div className="bg-white border border-border rounded-2xl px-5 py-4 min-w-[160px]">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-secondary mb-1">Records</p>
            <p className="text-3xl font-display font-extrabold text-charcoal">{records.length}</p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-10">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-error/20 bg-error-bg px-5 py-4 text-sm font-semibold text-error">
            {error}
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl bg-[#FAF9F7]">
            <WalletCards className="h-10 w-10 mx-auto text-secondary/50 mb-4" />
            <h2 className="text-xl font-display font-bold text-charcoal mb-2">{copy.emptyTitle}</h2>
            <p className="text-secondary text-sm max-w-sm mx-auto mb-6">{copy.emptyText}</p>
            <Link href={copy.ctaHref} className="inline-flex items-center justify-center px-6 py-3 bg-charcoal text-white font-bold rounded-xl hover:bg-black transition-colors">
              {copy.ctaLabel}
            </Link>
          </div>
        ) : (
          <div className="grid gap-5">
            {records.map((record) => {
              const partyName = isGuide ? record.travellerName : record.guideName
              const detailsHref = `/marketplace/${record.listingId}`
              const chatHref = `/marketplace/${record.listingId}/chat?guide=${record.guideId}`
              const paidAt = formatDate(record.payment.createdAt)

              return (
                <article key={record.transactionId} className="border border-[#E5E0DA] bg-white rounded-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-3 py-1 rounded-lg bg-[#ECFDF5] text-[#047857] text-[10px] font-extrabold uppercase tracking-widest">
                          Paid
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-[#F0EBE3] text-secondary text-[10px] font-extrabold uppercase tracking-widest">
                          {record.destination.city}{record.destination.country ? `, ${record.destination.country}` : ''}
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-display font-extrabold text-charcoal leading-tight mb-3">
                        {record.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-secondary font-medium">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {formatTripDates(record)}
                        </span>
                        <span>{record.pax}</span>
                        <span>{isGuide ? 'Traveller' : 'Guide'}: <strong className="text-charcoal">{partyName}</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 lg:min-w-[220px]">
                      <AmountBlock label="Total Paid" value={formatMYR(record.payment.totalAmount)} emphasis />
                      {isGuide && (
                        <>
                          <AmountBlock label="Service Charge" value={formatMYR(record.payment.serviceCharge)} />
                          <AmountBlock label="Guide Payout" value={formatMYR(record.payment.guidePayout)} emphasis />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-[#F0EDE9] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="text-[12px] text-secondary">
                      <span className="font-bold text-charcoal">Reference:</span> {record.payment.paymentReference || record.transactionId}
                      {paidAt && <span className="block sm:inline sm:ml-3"><span className="font-bold text-charcoal">Recorded:</span> {paidAt}</span>}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link href={detailsHref} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-charcoal rounded-xl text-sm font-bold hover:bg-[#FAF9F7] transition-colors">
                        <ExternalLink className="h-4 w-4" />
                        View Details
                      </Link>
                      <Link href={chatHref} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-charcoal text-white rounded-xl text-sm font-bold hover:bg-black transition-colors">
                        <MessageCircle className="h-4 w-4" />
                        Open Chat
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function AmountBlock({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${emphasis ? 'bg-[#FFFDF5] border-amber/25' : 'bg-[#FAF9F7] border-border'}`}>
      <p className="text-[10px] font-extrabold text-secondary uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-display font-extrabold ${emphasis ? 'text-amber text-2xl' : 'text-charcoal text-xl'}`}>{value}</p>
    </div>
  )
}
