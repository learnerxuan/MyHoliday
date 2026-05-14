'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { CheckCircle2, ClipboardList, Mail, PauseCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface MarketplaceOffer {
  id: string
  listing_id: string
  status: string
  marketplace_listings?: { status?: string | null } | Array<{ status?: string | null }> | null
}

interface MarketplaceLiveStatsProps {
  initialListingsCount: number
  initialListingsWithNoOffers: number
  initialOffers: MarketplaceOffer[]
}

const statusMeta: Record<string, { label: string; color: string; icon: ComponentType<{ className?: string; style?: CSSProperties }> }> = {
  accepted: { label: 'Accepted', color: '#10b981', icon: CheckCircle2 },
  pending: { label: 'Pending', color: '#3b82f6', icon: PauseCircle },
  rejected: { label: 'Rejected', color: '#f43f5e', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: '#94a3b8', icon: PauseCircle }
}

const OFFER_ACCEPTED_TOKEN = '__OFFER_ACCEPTED__:'

function getListingStatus(offer: MarketplaceOffer) {
  const listing = offer.marketplace_listings
  return Array.isArray(listing) ? listing[0]?.status : listing?.status
}

function applyMarketplaceStatusRules(offers: MarketplaceOffer[], acceptedOfferIds: Set<string>) {
  const acceptedListingIds = new Set(
    offers
      .filter(offer => offer.status === 'accepted' || acceptedOfferIds.has(offer.id))
      .map(offer => offer.listing_id)
      .filter(Boolean)
  )

  return offers.map(offer => {
    if (offer.status === 'withdrawn') return offer
    if (offer.status === 'accepted' || acceptedOfferIds.has(offer.id)) {
      return { ...offer, status: 'accepted' }
    }
    if (acceptedListingIds.has(offer.listing_id) || getListingStatus(offer) === 'confirmed') {
      return { ...offer, status: 'rejected' }
    }
    return offer
  })
}

export default function MarketplaceLiveStats({
  initialListingsCount,
  initialListingsWithNoOffers,
  initialOffers
}: MarketplaceLiveStatsProps) {
  const [listingsCount, setListingsCount] = useState(initialListingsCount)
  const [listingsWithNoOffers, setListingsWithNoOffers] = useState(initialListingsWithNoOffers)
  const [offers, setOffers] = useState<MarketplaceOffer[]>(initialOffers)

  useEffect(() => {
    const refreshListings = async () => {
      const [listingsRes, offersRes] = await Promise.all([
        supabase.from('marketplace_listings').select('id'),
        supabase.from('marketplace_offers').select('listing_id, status')
      ])

      if (listingsRes.data) {
        setListingsCount(listingsRes.data.length)
      }

      if (listingsRes.data && offersRes.data) {
        const offerListingIds = new Set(
          offersRes.data
            .filter(offer => offer.status !== 'withdrawn')
            .map(offer => offer.listing_id)
        )
        setListingsWithNoOffers(listingsRes.data.filter(listing => !offerListingIds.has(listing.id)).length)
      }
    }

    const refreshOffers = async () => {
      const { data } = await supabase
        .from('marketplace_offers')
        .select('id, listing_id, status, marketplace_listings(status)')
      if (data) {
        const offerIds = data.map(offer => offer.id).filter(Boolean)
        const { data: acceptedMessages } = offerIds.length
          ? await supabase
            .from('marketplace_messages')
            .select('offer_id')
            .in('offer_id', offerIds)
            .like('content', `${OFFER_ACCEPTED_TOKEN}%`)
          : { data: [] }
        const acceptedOfferIds = new Set((acceptedMessages || []).map(message => message.offer_id))
        setOffers(applyMarketplaceStatusRules(data, acceptedOfferIds))
      }
    }

    const listingsChannel = supabase
      .channel('live-listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, refreshListings)
      .subscribe()

    const offersChannel = supabase
      .channel('live-offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_offers' }, async () => {
        await Promise.all([refreshOffers(), refreshListings()])
      })
      .subscribe()

    const messagesChannel = supabase
      .channel('live-marketplace-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_messages' }, async () => {
        await refreshOffers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(listingsChannel)
      supabase.removeChannel(offersChannel)
      supabase.removeChannel(messagesChannel)
    }
  }, [])

  const statusCounts = useMemo(() => {
    return offers.reduce<Record<string, number>>((acc, offer) => {
      acc[offer.status] = (acc[offer.status] || 0) + 1
      return acc
    }, {})
  }, [offers])

  const totalOffers = offers.length
  const acceptedOffers = statusCounts.accepted || 0
  const donutTotal = totalOffers || 1
  const radius = 54
  const circumference = 2 * Math.PI * radius
  let offset = 0

  const segments = Object.entries(statusMeta).map(([status, meta]) => {
    const value = statusCounts[status] || 0
    const dash = (value / donutTotal) * circumference
    const segment = { status, ...meta, value, dash, offset: -offset }
    offset += dash
    return segment
  })

  return (
    <section className="bg-white p-8 rounded-3xl shadow-sm border border-border mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-charcoal">Marketplace Activity</h2>
          <p className="text-sm text-secondary mt-1">Live listing and offer movement from the marketplace tables.</p>
        </div>
        <span className="inline-flex w-fit px-3 py-1 rounded-full bg-success-bg text-success text-xs font-bold uppercase tracking-widest">
          Realtime
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricTile
            title="Total Listings"
            value={listingsCount}
            icon={<ClipboardList className="w-5 h-5" />}
            tone="bg-violet-50 text-violet-600 border-violet-100"
          />
          <MetricTile
            title="Offers Sent"
            value={totalOffers}
            icon={<Mail className="w-5 h-5" />}
            tone="bg-blue-50 text-blue-600 border-blue-100"
          />
          <MetricTile
            title="Accepted Offers"
            value={acceptedOffers}
            icon={<CheckCircle2 className="w-5 h-5" />}
            tone="bg-emerald-50 text-emerald-600 border-emerald-100"
          />
          <MetricTile
            title="No-Offer Listings"
            value={listingsWithNoOffers}
            icon={<PauseCircle className="w-5 h-5" />}
            tone="bg-amber/10 text-amberdark border-amber/20"
          />
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="relative w-44 h-44">
            <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
              <circle cx="64" cy="64" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
              {totalOffers > 0 && segments.map(segment => (
                segment.value > 0 ? (
                  <circle
                    key={segment.status}
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="14"
                    strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
                    strokeDashoffset={segment.offset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                ) : null
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-display font-black text-charcoal">{totalOffers}</span>
              <span className="text-[9px] font-semibold text-tertiary uppercase tracking-widest">Offers</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-2 mt-5">
            {segments.map(segment => {
              const Icon = segment.icon
              return (
                <div key={segment.status} className="flex items-center gap-2 text-xs text-secondary font-medium">
                  <Icon className="w-3.5 h-3.5" style={{ color: segment.color }} />
                  <span>{segment.label}: {segment.value}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function MetricTile({
  title,
  value,
  icon,
  tone
}: {
  title: string
  value: number
  icon: ReactNode
  tone: string
}) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border ${tone}`}>
      <div className="w-11 h-11 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wider">{title}</div>
        <div className="text-3xl font-display font-black text-charcoal">{value}</div>
      </div>
    </div>
  )
}
