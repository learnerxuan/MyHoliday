'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface GrowthData {
  month: string
  travellers: number
  guides: number
}

export interface LabelValue {
  name: string
  value: number
}

export interface DestinationMetric {
  destination: string
  listings: number
  itineraries: number
  interactions: number
}

export interface SupplyDemandMetric {
  destination: string
  listings: number
  approvedGuides: number
}

export interface MlMixMetric {
  name: string
  value: number
}

export interface AdminDashboardData {
  activeTravellers: number
  approvedGuides: number
  openAiSessions: number
  suspendedListings: number
  pendingGuides: number
  completedGmv: number
  platformRevenue: number
  listingsCount: number
  listingsWithNoOffers: number
  offers: Array<{ id: string; listing_id: string; status: string }>
  topClickedDestinations: Array<{ city: string; country: string; click_count: number }>
}

export interface AdminReportsData {
  overview: {
    totalTravellers: number
    activeTravellers: number
    approvedGuides: number
    completedGmv: number
    platformRevenue: number
    averageTransactionValue: number
    completedTransactions: number
  }
  growth: GrowthData[]
  journeyFunnel: LabelValue[]
  marketplace: {
    listingStatus: LabelValue[]
    offerStatus: LabelValue[]
    averageOffersPerListing: number
    matchRate: number
  }
  aiPlanner: {
    completionRate: number
    averageMessagesPerSession: number
    itineraryVolume: LabelValue[]
  }
  destinations: {
    topDestinations: DestinationMetric[]
    supplyDemand: SupplyDemandMetric[]
  }
  mlDataset: {
    totalRecords: number
    distinctDestinations: number
    averageDuration: number
    accommodationMix: MlMixMetric[]
    transportMix: MlMixMetric[]
  }
}

const toNumber = (value: unknown) => Number(value || 0)
const OFFER_ACCEPTED_TOKEN = '__OFFER_ACCEPTED__:'

type DashboardOfferRow = {
  id: string
  listing_id: string
  status: string
  marketplace_listings?: { status?: string | null } | Array<{ status?: string | null }> | null
}

const getOfferListingStatus = (offer: DashboardOfferRow) => {
  const listing = offer.marketplace_listings
  return Array.isArray(listing) ? listing[0]?.status : listing?.status
}

const applyMarketplaceStatusRules = (
  offers: DashboardOfferRow[],
  acceptedOfferIds: Set<string>
): Array<{ id: string; listing_id: string; status: string }> => {
  const acceptedListingIds = new Set(
    offers
      .filter(offer => offer.status === 'accepted' || acceptedOfferIds.has(offer.id))
      .map(offer => offer.listing_id)
      .filter(Boolean)
  )

  return offers.map(offer => {
    let status = offer.status
    if (status !== 'withdrawn') {
      if (status === 'accepted' || acceptedOfferIds.has(offer.id)) {
        status = 'accepted'
      } else if (acceptedListingIds.has(offer.listing_id) || getOfferListingStatus(offer) === 'confirmed') {
        status = 'rejected'
      }
    }

    return {
      id: offer.id,
      listing_id: offer.listing_id,
      status
    }
  })
}

const emptyAdminDashboardData: AdminDashboardData = {
  activeTravellers: 0,
  approvedGuides: 0,
  openAiSessions: 0,
  suspendedListings: 0,
  pendingGuides: 0,
  completedGmv: 0,
  platformRevenue: 0,
  listingsCount: 0,
  listingsWithNoOffers: 0,
  offers: [],
  topClickedDestinations: []
}

const emptyAdminReportsData: AdminReportsData = {
  overview: {
    totalTravellers: 0,
    activeTravellers: 0,
    approvedGuides: 0,
    completedGmv: 0,
    platformRevenue: 0,
    averageTransactionValue: 0,
    completedTransactions: 0
  },
  growth: [],
  journeyFunnel: [
    { name: 'Register', value: 0 },
    { name: 'Browse', value: 0 },
    { name: 'Plan', value: 0 },
    { name: 'Save', value: 0 },
    { name: 'List', value: 0 },
    { name: 'Negotiate', value: 0 },
    { name: 'Pay', value: 0 }
  ],
  marketplace: {
    listingStatus: [],
    offerStatus: [],
    averageOffersPerListing: 0,
    matchRate: 0
  },
  aiPlanner: {
    completionRate: 0,
    averageMessagesPerSession: 0,
    itineraryVolume: []
  },
  destinations: {
    topDestinations: [],
    supplyDemand: []
  },
  mlDataset: {
    totalRecords: 0,
    distinctDestinations: 0,
    averageDuration: 0,
    accommodationMix: [],
    transportMix: []
  }
}

function logReportsError(source: string, error: unknown) {
  void source
  void error
}

async function countRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  apply?: (builder: any) => any
) {
  let builder = supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (apply) builder = apply(builder)

  const { count, error } = await builder
  if (error) throw error
  return count || 0
}

async function safeCountRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  apply?: (builder: any) => any
) {
  try {
    return await countRows(supabase, table, apply)
  } catch {
    return 0
  }
}

async function fetchAllRows<T>(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  columns: string,
  apply?: (builder: any) => any
): Promise<T[]> {
  const pageSize = 1000
  let page = 0
  let rows: T[] = []

  while (true) {
    let builder = supabase
      .from(table)
      .select(columns)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (apply) builder = apply(builder)

    const { data, error } = await builder
    if (error) throw error

    const batch = (data || []) as T[]
    rows = rows.concat(batch)

    if (batch.length < pageSize) return rows
    page += 1
  }
}

async function safeFetchAllRows<T>(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  columns: string,
  apply?: (builder: any) => any
): Promise<T[]> {
  try {
    return await fetchAllRows<T>(supabase, table, columns, apply)
  } catch {
    return []
  }
}

async function getAdminDashboardDataFromSupabase(): Promise<AdminDashboardData> {
  const supabase = await createSupabaseServerClient()

  const [
    totalTravellers,
    inactiveTravellers,
    approvedGuides,
    openAiSessions,
    suspendedListings,
    pendingGuides,
    listingsCount,
    completedTransactions,
    listings,
    rawOffers,
    acceptedMessages,
    clickedInteractions
  ] = await Promise.all([
    safeCountRows(supabase, 'traveller_profiles'),
    safeCountRows(supabase, 'traveller_profiles', builder => builder.eq('is_active', false)),
    safeCountRows(supabase, 'tour_guides', builder => builder.eq('verification_status', 'approved')),
    safeCountRows(supabase, 'chat_sessions', builder => builder.eq('status', 'active')),
    safeCountRows(supabase, 'marketplace_listings', builder => builder.eq('is_suspended', true)),
    safeCountRows(supabase, 'tour_guides', builder => builder.eq('verification_status', 'pending')),
    safeCountRows(supabase, 'marketplace_listings'),
    safeFetchAllRows<{ total_amount: number | string | null; service_charge: number | string | null }>(
      supabase,
      'transactions',
      'total_amount, service_charge',
      builder => builder.eq('status', 'completed')
    ),
    safeFetchAllRows<{ id: string }>(supabase, 'marketplace_listings', 'id'),
    safeFetchAllRows<DashboardOfferRow>(
      supabase,
      'marketplace_offers',
      'id, listing_id, status, marketplace_listings(status)'
    ),
    safeFetchAllRows<{ offer_id: string | null }>(
      supabase,
      'marketplace_messages',
      'offer_id',
      builder => builder.like('content', `${OFFER_ACCEPTED_TOKEN}%`)
    ),
    safeFetchAllRows<{ destination_id: string | null; destinations: { city: string | null; country: string | null } | null }>(
      supabase,
      'user_interactions',
      'destination_id, destinations(city, country)',
      builder => builder.eq('type', 'click').not('destination_id', 'is', null)
    )
  ])

  const acceptedOfferIds = new Set(acceptedMessages.map(message => message.offer_id).filter(Boolean) as string[])
  const offers = applyMarketplaceStatusRules(rawOffers, acceptedOfferIds)
  const offerListingIds = new Set(offers.filter(offer => offer.status !== 'withdrawn').map(offer => offer.listing_id).filter(Boolean))
  const listingsWithNoOffers = listings.filter(listing => !offerListingIds.has(listing.id)).length

  const completedGmv = completedTransactions.reduce(
    (sum, tx) => sum + toNumber(tx.total_amount),
    0
  )
  const platformRevenue = completedTransactions.reduce(
    (sum, tx) => sum + toNumber(tx.service_charge),
    0
  )

  const clicksByDestination = new Map<string, { city: string; country: string; click_count: number }>()
  for (const interaction of clickedInteractions) {
    const city = interaction.destinations?.city
    const country = interaction.destinations?.country
    if (!interaction.destination_id || !city || !country) continue

    const current = clicksByDestination.get(interaction.destination_id)
    if (current) {
      current.click_count += 1
    } else {
      clicksByDestination.set(interaction.destination_id, { city, country, click_count: 1 })
    }
  }

  const topClickedDestinations = [...clicksByDestination.values()]
    .sort((a, b) => b.click_count - a.click_count || a.city.localeCompare(b.city))
    .slice(0, 3)

  return {
    activeTravellers: totalTravellers - inactiveTravellers,
    approvedGuides,
    openAiSessions,
    suspendedListings,
    pendingGuides,
    completedGmv,
    platformRevenue,
    listingsCount,
    listingsWithNoOffers,
    offers,
    topClickedDestinations
  }
}

const monthKey = (value: string | null | undefined) => {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 7)
}

const weekLabel = (value: string | null | undefined) => {
  if (!value) return 'Unknown'
  const date = new Date(value)
  date.setDate(date.getDate() - date.getDay())
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
}

const increment = <T extends string>(map: Map<T, number>, key: T, amount = 1) => {
  map.set(key, (map.get(key) || 0) + amount)
}

function mapToLabelValues(map: Map<string, number>): LabelValue[] {
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function getAdminReportsDataFromSupabase(): Promise<AdminReportsData> {
  const supabase = await createSupabaseServerClient()

  const [
    travellers,
    guides,
    transactions,
    chatSessions,
    chatMessagesCount,
    itineraries,
    listings,
    offers,
    destinations,
    interactions,
    historicalTrips
  ] = await Promise.all([
    safeFetchAllRows<{ user_id: string | null; is_active: boolean | null; created_at: string | null }>(
      supabase,
      'traveller_profiles',
      'user_id, is_active, created_at'
    ),
    safeFetchAllRows<{ id: string; verification_status: string | null; created_at: string | null; city_id: string | null }>(
      supabase,
      'tour_guides',
      'id, verification_status, created_at, city_id'
    ),
    safeFetchAllRows<{ status: string | null; total_amount: number | string | null; service_charge: number | string | null }>(
      supabase,
      'transactions',
      'status, total_amount, service_charge'
    ),
    safeFetchAllRows<{ status: string | null; created_at: string | null }>(
      supabase,
      'chat_sessions',
      'status, created_at'
    ),
    safeCountRows(supabase, 'chat_messages'),
    safeFetchAllRows<{ destination_id: string | null; created_at: string | null }>(
      supabase,
      'itineraries',
      'destination_id, created_at'
    ),
    safeFetchAllRows<{ id: string; status: string | null; destination_id: string | null; created_at: string | null }>(
      supabase,
      'marketplace_listings',
      'id, status, destination_id, created_at'
    ),
    safeFetchAllRows<{ listing_id: string | null; status: string | null }>(
      supabase,
      'marketplace_offers',
      'listing_id, status'
    ),
    safeFetchAllRows<{ id: string; city: string | null; country: string | null }>(
      supabase,
      'destinations',
      'id, city, country'
    ),
    safeFetchAllRows<{ user_id: string | null; destination_id: string | null }>(
      supabase,
      'user_interactions',
      'user_id, destination_id'
    ),
    safeFetchAllRows<{
      destination: string | null
      duration_days: number | string | null
      accommodation_type: string | null
      transportation_type: string | null
    }>(
      supabase,
      'historical_trips',
      'destination, duration_days, accommodation_type, transportation_type'
    )
  ])

  const activeTravellers = travellers.filter(row => row.is_active !== false).length
  const approvedGuides = guides.filter(row => row.verification_status === 'approved')
  const completedTransactions = transactions.filter(row => row.status === 'completed')
  const completedGmv = completedTransactions.reduce((sum, tx) => sum + toNumber(tx.total_amount), 0)
  const platformRevenue = completedTransactions.reduce((sum, tx) => sum + toNumber(tx.service_charge), 0)

  const growthByMonth = new Map<string, { travellers: number; guides: number }>()
  for (const traveller of travellers) {
    const month = monthKey(traveller.created_at)
    if (!month) continue
    growthByMonth.set(month, {
      travellers: (growthByMonth.get(month)?.travellers || 0) + 1,
      guides: growthByMonth.get(month)?.guides || 0
    })
  }
  for (const guide of guides) {
    const month = monthKey(guide.created_at)
    if (!month) continue
    growthByMonth.set(month, {
      travellers: growthByMonth.get(month)?.travellers || 0,
      guides: (growthByMonth.get(month)?.guides || 0) + 1
    })
  }

  const listingStatus = new Map<string, number>()
  for (const listing of listings) increment(listingStatus, listing.status ? listing.status[0].toUpperCase() + listing.status.slice(1) : 'Unknown')

  const offerStatus = new Map<string, number>()
  for (const offer of offers) increment(offerStatus, offer.status ? offer.status[0].toUpperCase() + offer.status.slice(1) : 'Unknown')

  const itineraryVolume = new Map<string, number>()
  for (const itinerary of itineraries) increment(itineraryVolume, weekLabel(itinerary.created_at))

  const destinationMap = new Map(destinations.map(dest => [
    dest.id,
    `${dest.city || 'Unknown'}, ${dest.country || 'Unknown'}`
  ]))
  const destinationMetrics = new Map<string, DestinationMetric>()

  const ensureDestinationMetric = (destinationId: string | null) => {
    if (!destinationId) return null
    const destination = destinationMap.get(destinationId)
    if (!destination) return null
    if (!destinationMetrics.has(destination)) {
      destinationMetrics.set(destination, { destination, listings: 0, itineraries: 0, interactions: 0 })
    }
    return destinationMetrics.get(destination)!
  }

  for (const listing of listings) {
    const metric = ensureDestinationMetric(listing.destination_id)
    if (metric) metric.listings += 1
  }
  for (const itinerary of itineraries) {
    const metric = ensureDestinationMetric(itinerary.destination_id)
    if (metric) metric.itineraries += 1
  }
  for (const interaction of interactions) {
    const metric = ensureDestinationMetric(interaction.destination_id)
    if (metric) metric.interactions += 1
  }

  const approvedGuidesByDestination = new Map<string, number>()
  for (const guide of approvedGuides) {
    if (guide.city_id) increment(approvedGuidesByDestination, guide.city_id)
  }
  const listingsByDestination = new Map<string, number>()
  for (const listing of listings) {
    if (listing.destination_id) increment(listingsByDestination, listing.destination_id)
  }

  const supplyDemand = destinations
    .map(dest => ({
      destination: `${dest.city || 'Unknown'}, ${dest.country || 'Unknown'}`,
      listings: listingsByDestination.get(dest.id) || 0,
      approvedGuides: approvedGuidesByDestination.get(dest.id) || 0
    }))
    .filter(row => row.listings + row.approvedGuides > 0)
    .sort((a, b) => b.listings - a.listings || a.approvedGuides - b.approvedGuides || a.destination.localeCompare(b.destination))
    .slice(0, 8)

  const accommodationMix = new Map<string, number>()
  const transportMix = new Map<string, number>()
  let durationTotal = 0
  for (const trip of historicalTrips) {
    durationTotal += toNumber(trip.duration_days)
    increment(accommodationMix, trip.accommodation_type || 'Unknown')
    increment(transportMix, trip.transportation_type || 'Unknown')
  }

  return {
    overview: {
      totalTravellers: travellers.length,
      activeTravellers,
      approvedGuides: approvedGuides.length,
      completedGmv,
      platformRevenue,
      averageTransactionValue: completedTransactions.length ? completedGmv / completedTransactions.length : 0,
      completedTransactions: completedTransactions.length
    },
    growth: [...growthByMonth.entries()]
      .map(([month, value]) => ({ month, travellers: value.travellers, guides: value.guides }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    journeyFunnel: [
      { name: 'Register', value: travellers.length },
      { name: 'Browse', value: new Set(interactions.map(row => row.user_id).filter(Boolean)).size },
      { name: 'Plan', value: chatSessions.length },
      { name: 'Save', value: itineraries.length },
      { name: 'List', value: listings.length },
      { name: 'Negotiate', value: new Set(offers.map(row => row.listing_id).filter(Boolean)).size },
      { name: 'Pay', value: completedTransactions.length }
    ],
    marketplace: {
      listingStatus: mapToLabelValues(listingStatus),
      offerStatus: mapToLabelValues(offerStatus),
      averageOffersPerListing: listings.length ? offers.length / listings.length : 0,
      matchRate: listings.length ? listings.filter(row => row.status === 'confirmed').length * 100 / listings.length : 0
    },
    aiPlanner: {
      completionRate: chatSessions.length ? chatSessions.filter(row => row.status === 'completed').length * 100 / chatSessions.length : 0,
      averageMessagesPerSession: chatSessions.length ? chatMessagesCount / chatSessions.length : 0,
      itineraryVolume: mapToLabelValues(itineraryVolume)
    },
    destinations: {
      topDestinations: [...destinationMetrics.values()]
        .sort((a, b) => b.interactions - a.interactions || b.listings - a.listings || b.itineraries - a.itineraries || a.destination.localeCompare(b.destination))
        .slice(0, 8),
      supplyDemand
    },
    mlDataset: {
      totalRecords: historicalTrips.length,
      distinctDestinations: new Set(historicalTrips.map(row => row.destination).filter(Boolean)).size,
      averageDuration: historicalTrips.length ? durationTotal / historicalTrips.length : 0,
      accommodationMix: mapToLabelValues(accommodationMix).sort((a, b) => b.value - a.value).slice(0, 6),
      transportMix: mapToLabelValues(transportMix).sort((a, b) => b.value - a.value).slice(0, 6)
    }
  }
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    return await getAdminDashboardDataFromSupabase()
  } catch (error) {
    logReportsError('getAdminDashboardData', error)
    return emptyAdminDashboardData
  }
}

export async function getUserGrowthData(): Promise<GrowthData[]> {
  return (await getAdminReportsDataFromSupabase()).growth
}

export async function getAdminReportsData(): Promise<AdminReportsData> {
  try {
    return await getAdminReportsDataFromSupabase()
  } catch (error) {
    logReportsError('getAdminReportsData', error)
    return emptyAdminReportsData
  }
}

export async function getDashboardStats() {
  try {
    const supabase = await createSupabaseServerClient()
    const [travellerCount, guideCount, pendingGuides] = await Promise.all([
      safeCountRows(supabase, 'traveller_profiles'),
      safeCountRows(supabase, 'tour_guides'),
      safeCountRows(supabase, 'tour_guides', builder => builder.eq('verification_status', 'pending'))
    ])

    return {
      travellerCount,
      guideCount,
      pendingGuides
    }
  } catch (error) {
    logReportsError('getDashboardStats', error)
    return {
      travellerCount: 0,
      guideCount: 0,
      pendingGuides: 0
    }
  }
}
