# MyHoliday Entity Relationship Diagram

This ERD is generated from the consolidated Supabase migration in
`supabase/migrations/20260420000000_full_schema.sql`.

```mermaid
erDiagram
    AUTH_USERS {
        uuid id PK
    }

    DESTINATIONS {
        uuid id PK
        varchar city
        varchar country
        varchar region
        text short_description
        float latitude
        float longitude
        jsonb avg_temp_monthly
        jsonb ideal_durations
        varchar budget_level
        smallint culture
        smallint adventure
        smallint nature
        smallint beaches
        smallint nightlife
        smallint cuisine
        smallint wellness
        smallint urban
        smallint seclusion
        text categories
        text best_time_to_visit
    }

    TRAVELLER_PROFILES {
        uuid id PK
        uuid user_id FK
        varchar full_name
        date date_of_birth
        varchar nationality
        varchar dietary_restrictions
        boolean accessibility_needs
        varchar preferred_language
        boolean is_active
        timestamp created_at
    }

    TOUR_GUIDES {
        uuid id PK
        uuid user_id FK
        varchar full_name "NOT NULL"
        uuid city_id FK
        varchar document_url
        varchar verification_status
        timestamp created_at
    }

    CHAT_SESSIONS {
        uuid id PK
        uuid user_id FK
        uuid destination_id FK
        varchar status
        jsonb planner_state
        timestamp created_at
    }

    CHAT_MESSAGES {
        uuid id PK
        uuid session_id FK
        varchar role
        text content
        timestamp created_at
    }

    ITINERARIES {
        uuid id PK
        uuid user_id FK
        uuid destination_id FK
        uuid session_id FK
        varchar title
        jsonb content
        jsonb trip_metadata
        timestamp created_at
        timestamp updated_at
    }

    MARKETPLACE_LISTINGS {
        uuid id PK
        uuid user_id FK
        uuid itinerary_id
        uuid destination_id FK
        numeric desired_budget
        varchar status
        boolean is_suspended
        timestamp created_at
    }

    MARKETPLACE_OFFERS {
        uuid id PK
        uuid listing_id FK
        uuid guide_id FK
        numeric proposed_price
        varchar status
        text intro_message
        jsonb edited_itinerary
        boolean payment_enabled
        timestamp created_at
    }

    MARKETPLACE_MESSAGES {
        uuid id PK
        uuid offer_id FK
        varchar sender_type
        uuid sender_id
        text content
        timestamp created_at
    }

    TRANSACTIONS {
        uuid id PK
        uuid offer_id FK
        uuid payer_id FK
        uuid payee_id FK
        numeric total_amount
        numeric service_charge
        numeric guide_payout
        varchar status
        varchar payment_reference
        timestamp created_at
    }

    USER_INTERACTIONS {
        uuid id PK
        uuid user_id FK
        uuid destination_id FK
        text type
        timestamptz created_at
    }

    HISTORICAL_TRIPS {
        serial id PK
        varchar destination
        float duration_days
        float traveler_age
        varchar traveler_gender
        varchar traveler_nationality
        varchar accommodation_type
        numeric accommodation_cost
        varchar transportation_type
        numeric transportation_cost
    }

    AUTH_USERS ||--o| TRAVELLER_PROFILES : "has profile"
    AUTH_USERS ||--o| TOUR_GUIDES : "has guide account"
    AUTH_USERS ||--o{ CHAT_SESSIONS : "starts"
    AUTH_USERS ||--o{ ITINERARIES : "owns"
    AUTH_USERS ||--o{ MARKETPLACE_LISTINGS : "creates"
    AUTH_USERS ||--o{ TRANSACTIONS : "pays"
    AUTH_USERS ||--o{ USER_INTERACTIONS : "performs"

    DESTINATIONS ||--o{ TOUR_GUIDES : "based in"
    DESTINATIONS ||--o{ CHAT_SESSIONS : "planned for"
    DESTINATIONS ||--o{ ITINERARIES : "visited by"
    DESTINATIONS ||--o{ MARKETPLACE_LISTINGS : "listed for"
    DESTINATIONS ||--o{ USER_INTERACTIONS : "receives"

    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : "contains"
    CHAT_SESSIONS |o--o{ ITINERARIES : "may generate"

    ITINERARIES ||--o{ MARKETPLACE_LISTINGS : "published as"
    MARKETPLACE_LISTINGS ||--o{ MARKETPLACE_OFFERS : "receives"
    TOUR_GUIDES ||--o{ MARKETPLACE_OFFERS : "submits"
    MARKETPLACE_OFFERS ||--o{ MARKETPLACE_MESSAGES : "has chat"
    MARKETPLACE_OFFERS ||--o{ TRANSACTIONS : "paid through"
    TOUR_GUIDES ||--o{ TRANSACTIONS : "receives payout"
```

## Relationship Notes

- `AUTH_USERS` represents Supabase Auth's `auth.users` table. It is external to the public schema but is referenced by traveller profiles, tour guides, chat sessions, itineraries, listings, transactions, and interactions.
- `traveller_profiles.user_id` and `tour_guides.user_id` are both unique, so each auth user can have at most one traveller profile and at most one tour guide profile.
- `marketplace_messages.sender_id` is polymorphic in application logic. The migration does not define a foreign key for it; `sender_type` determines whether the sender is a traveller user or guide user.
- `marketplace_listings.itinerary_id` stores the source itinerary id, but the current live Supabase public schema does not declare a database foreign key for it.
- `historical_trips` is an ML/survey dataset table and does not declare foreign keys to the operational tables.
- `itineraries.trip_metadata` stores trip context captured during itinerary planning, such as trip dates, duration, pace, group details, and budget preferences.
