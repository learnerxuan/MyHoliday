'use server'

import { query } from '@/lib/supabase/db'

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

async function one<T>(sql: string, params?: unknown[]): Promise<T> {
  const result = await query(sql, params)
  return result.rows[0] as T
}

async function many<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const result = await query(sql, params)
  return result.rows as T[]
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    summary,
    offers,
    topClickedDestinations
  ] = await Promise.all([
    one<{
      active_travellers: number
      approved_guides: number
      open_ai_sessions: number
      suspended_listings: number
      pending_guides: number
      completed_gmv: string
      platform_revenue: string
      listings_count: number
      listings_with_no_offers: number
    }>(`
      select
        (select count(*)::int from traveller_profiles where coalesce(is_active, true) = true) as active_travellers,
        (select count(*)::int from tour_guides where verification_status = 'approved') as approved_guides,
        (select count(*)::int from chat_sessions where status = 'active') as open_ai_sessions,
        (select count(*)::int from marketplace_listings where coalesce(is_suspended, false) = true) as suspended_listings,
        (select count(*)::int from tour_guides where verification_status = 'pending') as pending_guides,
        coalesce((select sum(total_amount) from transactions where status = 'completed'), 0)::text as completed_gmv,
        coalesce((select sum(service_charge) from transactions where status = 'completed'), 0)::text as platform_revenue,
        (select count(*)::int from marketplace_listings) as listings_count,
        (
          select count(*)::int
          from marketplace_listings ml
          where not exists (
            select 1 from marketplace_offers mo where mo.listing_id = ml.id
          )
        ) as listings_with_no_offers
    `),
    many<{ id: string; listing_id: string; status: string }>(`
      select id::text, listing_id::text, status
      from marketplace_offers
    `),
    many<{ city: string; country: string; click_count: number }>(`
      select d.city, d.country, count(*)::int as click_count
      from user_interactions ui
      join destinations d on d.id = ui.destination_id
      where ui.type = 'click'
      group by d.city, d.country
      order by click_count desc, d.city asc
      limit 3
    `)
  ])

  return {
    activeTravellers: toNumber(summary.active_travellers),
    approvedGuides: toNumber(summary.approved_guides),
    openAiSessions: toNumber(summary.open_ai_sessions),
    suspendedListings: toNumber(summary.suspended_listings),
    pendingGuides: toNumber(summary.pending_guides),
    completedGmv: toNumber(summary.completed_gmv),
    platformRevenue: toNumber(summary.platform_revenue),
    listingsCount: toNumber(summary.listings_count),
    listingsWithNoOffers: toNumber(summary.listings_with_no_offers),
    offers,
    topClickedDestinations
  }
}

export async function getUserGrowthData(): Promise<GrowthData[]> {
  const rows = await many<{ month: string; travellers: number; guides: number }>(`
    with bounds as (
      select date_trunc('month', min(created_at)) as start_month
      from (
        select created_at from traveller_profiles
        union all
        select created_at from tour_guides
      ) all_growth
    ),
    months as (
      select generate_series(
        coalesce((select start_month from bounds), date_trunc('month', now())),
        date_trunc('month', now()),
        interval '1 month'
      ) as month_start
    ),
    traveller_counts as (
      select date_trunc('month', created_at) as month_start, count(*)::int as total
      from traveller_profiles
      group by 1
    ),
    guide_counts as (
      select date_trunc('month', created_at) as month_start, count(*)::int as total
      from tour_guides
      group by 1
    )
    select
      to_char(m.month_start, 'YYYY-MM') as month,
      coalesce(tc.total, 0)::int as travellers,
      coalesce(gc.total, 0)::int as guides
    from months m
    left join traveller_counts tc on tc.month_start = m.month_start
    left join guide_counts gc on gc.month_start = m.month_start
    order by m.month_start
  `)

  return rows.map(row => ({
    month: row.month,
    travellers: toNumber(row.travellers),
    guides: toNumber(row.guides)
  }))
}

export async function getAdminReportsData(): Promise<AdminReportsData> {
  const [
    overview,
    growth,
    journey,
    listingStatus,
    offerStatus,
    marketplaceHealth,
    aiPlanner,
    itineraryVolume,
    topDestinations,
    supplyDemand,
    mlSummary,
    accommodationMix,
    transportMix
  ] = await Promise.all([
    one<{
      total_travellers: number
      active_travellers: number
      approved_guides: number
      completed_gmv: string
      platform_revenue: string
      average_transaction_value: string
      completed_transactions: number
    }>(`
      select
        (select count(*)::int from traveller_profiles) as total_travellers,
        (select count(*)::int from traveller_profiles where coalesce(is_active, true) = true) as active_travellers,
        (select count(*)::int from tour_guides where verification_status = 'approved') as approved_guides,
        coalesce((select sum(total_amount) from transactions where status = 'completed'), 0)::text as completed_gmv,
        coalesce((select sum(service_charge) from transactions where status = 'completed'), 0)::text as platform_revenue,
        coalesce((select avg(total_amount) from transactions where status = 'completed'), 0)::text as average_transaction_value,
        (select count(*)::int from transactions where status = 'completed') as completed_transactions
    `),
    getUserGrowthData(),
    one<{
      travellers: number
      interacting_users: number
      chat_sessions: number
      saved_itineraries: number
      marketplace_listings: number
      listings_with_offers: number
      completed_transactions: number
    }>(`
      select
        (select count(*)::int from traveller_profiles) as travellers,
        (select count(distinct user_id)::int from user_interactions where user_id is not null) as interacting_users,
        (select count(*)::int from chat_sessions) as chat_sessions,
        (select count(*)::int from itineraries) as saved_itineraries,
        (select count(*)::int from marketplace_listings) as marketplace_listings,
        (select count(distinct listing_id)::int from marketplace_offers) as listings_with_offers,
        (select count(*)::int from transactions where status = 'completed') as completed_transactions
    `),
    many<{ name: string; value: number }>(`
      select initcap(status) as name, count(*)::int as value
      from marketplace_listings
      group by status
      order by status
    `),
    many<{ name: string; value: number }>(`
      select initcap(status) as name, count(*)::int as value
      from marketplace_offers
      group by status
      order by status
    `),
    one<{ average_offers_per_listing: string; match_rate: string }>(`
      select
        coalesce(
          (select count(*)::numeric from marketplace_offers) /
          nullif((select count(*)::numeric from marketplace_listings), 0),
          0
        )::text as average_offers_per_listing,
        coalesce(
          (select count(*)::numeric from marketplace_listings where status = 'confirmed') * 100 /
          nullif((select count(*)::numeric from marketplace_listings), 0),
          0
        )::text as match_rate
    `),
    one<{ completion_rate: string; average_messages_per_session: string }>(`
      select
        coalesce(
          (select count(*)::numeric from chat_sessions where status = 'completed') * 100 /
          nullif((select count(*)::numeric from chat_sessions), 0),
          0
        )::text as completion_rate,
        coalesce(
          (select count(*)::numeric from chat_messages) /
          nullif((select count(*)::numeric from chat_sessions), 0),
          0
        )::text as average_messages_per_session
    `),
    many<{ name: string; value: number }>(`
      select to_char(date_trunc('week', created_at), 'Mon DD') as name, count(*)::int as value
      from itineraries
      group by date_trunc('week', created_at)
      order by date_trunc('week', created_at)
    `),
    many<DestinationMetric>(`
      with listing_counts as (
        select destination_id, count(*)::int as listings
        from marketplace_listings
        group by destination_id
      ),
      itinerary_counts as (
        select destination_id, count(*)::int as itineraries
        from itineraries
        group by destination_id
      ),
      interaction_counts as (
        select destination_id, count(*)::int as interactions
        from user_interactions
        group by destination_id
      )
      select
        d.city || ', ' || d.country as destination,
        coalesce(lc.listings, 0)::int as listings,
        coalesce(ic.itineraries, 0)::int as itineraries,
        coalesce(uc.interactions, 0)::int as interactions
      from destinations d
      left join listing_counts lc on lc.destination_id = d.id
      left join itinerary_counts ic on ic.destination_id = d.id
      left join interaction_counts uc on uc.destination_id = d.id
      where coalesce(lc.listings, 0) + coalesce(ic.itineraries, 0) + coalesce(uc.interactions, 0) > 0
      order by interactions desc, listings desc, itineraries desc, destination asc
      limit 8
    `),
    many<SupplyDemandMetric>(`
      with demand as (
        select destination_id, count(*)::int as listings
        from marketplace_listings
        group by destination_id
      ),
      supply as (
        select city_id as destination_id, count(*)::int as approved_guides
        from tour_guides
        where verification_status = 'approved'
        group by city_id
      )
      select
        d.city || ', ' || d.country as destination,
        coalesce(demand.listings, 0)::int as listings,
        coalesce(supply.approved_guides, 0)::int as "approvedGuides"
      from destinations d
      left join demand on demand.destination_id = d.id
      left join supply on supply.destination_id = d.id
      where coalesce(demand.listings, 0) + coalesce(supply.approved_guides, 0) > 0
      order by coalesce(demand.listings, 0) desc, coalesce(supply.approved_guides, 0) asc, destination asc
      limit 8
    `),
    one<{ total_records: number; distinct_destinations: number; average_duration: string }>(`
      select
        count(*)::int as total_records,
        count(distinct destination)::int as distinct_destinations,
        coalesce(avg(duration_days), 0)::text as average_duration
      from historical_trips
    `),
    many<MlMixMetric>(`
      select coalesce(accommodation_type, 'Unknown') as name, count(*)::int as value
      from historical_trips
      group by accommodation_type
      order by value desc, name asc
      limit 6
    `),
    many<MlMixMetric>(`
      select coalesce(transportation_type, 'Unknown') as name, count(*)::int as value
      from historical_trips
      group by transportation_type
      order by value desc, name asc
      limit 6
    `)
  ])

  return {
    overview: {
      totalTravellers: toNumber(overview.total_travellers),
      activeTravellers: toNumber(overview.active_travellers),
      approvedGuides: toNumber(overview.approved_guides),
      completedGmv: toNumber(overview.completed_gmv),
      platformRevenue: toNumber(overview.platform_revenue),
      averageTransactionValue: toNumber(overview.average_transaction_value),
      completedTransactions: toNumber(overview.completed_transactions)
    },
    growth,
    journeyFunnel: [
      { name: 'Register', value: toNumber(journey.travellers) },
      { name: 'Browse', value: toNumber(journey.interacting_users) },
      { name: 'Plan', value: toNumber(journey.chat_sessions) },
      { name: 'Save', value: toNumber(journey.saved_itineraries) },
      { name: 'List', value: toNumber(journey.marketplace_listings) },
      { name: 'Negotiate', value: toNumber(journey.listings_with_offers) },
      { name: 'Pay', value: toNumber(journey.completed_transactions) }
    ],
    marketplace: {
      listingStatus: listingStatus.map(row => ({ name: row.name, value: toNumber(row.value) })),
      offerStatus: offerStatus.map(row => ({ name: row.name, value: toNumber(row.value) })),
      averageOffersPerListing: toNumber(marketplaceHealth.average_offers_per_listing),
      matchRate: toNumber(marketplaceHealth.match_rate)
    },
    aiPlanner: {
      completionRate: toNumber(aiPlanner.completion_rate),
      averageMessagesPerSession: toNumber(aiPlanner.average_messages_per_session),
      itineraryVolume: itineraryVolume.map(row => ({ name: row.name, value: toNumber(row.value) }))
    },
    destinations: {
      topDestinations: topDestinations.map(row => ({
        destination: row.destination,
        listings: toNumber(row.listings),
        itineraries: toNumber(row.itineraries),
        interactions: toNumber(row.interactions)
      })),
      supplyDemand: supplyDemand.map(row => ({
        destination: row.destination,
        listings: toNumber(row.listings),
        approvedGuides: toNumber(row.approvedGuides)
      }))
    },
    mlDataset: {
      totalRecords: toNumber(mlSummary.total_records),
      distinctDestinations: toNumber(mlSummary.distinct_destinations),
      averageDuration: toNumber(mlSummary.average_duration),
      accommodationMix: accommodationMix.map(row => ({ name: row.name, value: toNumber(row.value) })),
      transportMix: transportMix.map(row => ({ name: row.name, value: toNumber(row.value) }))
    }
  }
}

export async function getDashboardStats() {
  const row = await one<{ traveller_count: number; guide_count: number; pending_guides: number }>(`
    select
      (select count(*)::int from traveller_profiles) as traveller_count,
      (select count(*)::int from tour_guides) as guide_count,
      (select count(*)::int from tour_guides where verification_status = 'pending') as pending_guides
  `)

  return {
    travellerCount: toNumber(row.traveller_count),
    guideCount: toNumber(row.guide_count),
    pendingGuides: toNumber(row.pending_guides)
  }
}
