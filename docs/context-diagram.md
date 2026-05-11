# MyHoliday System Context Diagram

```mermaid
flowchart LR
  Traveller["Traveller<br/>Plans trips, saves itineraries,<br/>posts listings, chats and confirms offers"]
  Guide["Tour Guide<br/>Registers for verification,<br/>browses city listings,<br/>submits offers and chats"]
  Admin["Administrator<br/>Manages users, verifies guides,<br/>moderates marketplace and views reports"]

  subgraph Boundary["MyHoliday System Boundary"]
    App["MyHoliday Web Application<br/>Next.js App Router UI, middleware and API routes"]
    Recommender["Recommendation Engine<br/>Quiz matching and destination discovery"]
    Planner["AI Itinerary Planner<br/>Chat orchestration, itinerary tools and guardrails"]
    Marketplace["Marketplace Module<br/>Listings, offers, messages and mock transactions"]
    AdminModule["Admin Module<br/>User management, guide approval, moderation and analytics"]
  end

  Supabase["Supabase<br/>Auth, PostgreSQL, Row Level Security,<br/>Realtime data and guide document storage"]
  OpenAI["OpenAI API<br/>Conversational itinerary generation"]
  GooglePlaces["Google Places / Maps APIs<br/>Place search, geocoding and place photos"]
  Wikipedia["Wikipedia REST API<br/>Fallback destination images"]
  OpenMeteo["Open-Meteo API<br/>Fallback weather estimates"]
  OSRM["OSRM Routing API<br/>Transport distance and duration estimates"]
  StaticData["Destination Datasets<br/>Seed CSV files and historical destination attributes"]

  Traveller -->|"Uses browser UI"| App
  Guide -->|"Uses browser UI"| App
  Admin -->|"Uses browser UI"| App

  App -->|"Authenticates sessions and enforces role access"| Supabase
  App -->|"Reads/writes profiles, destinations, itineraries,<br/>chat sessions, listings, offers, messages,<br/>transactions, reports and documents"| Supabase

  App --> Recommender
  App --> Planner
  App --> Marketplace
  App --> AdminModule

  Recommender -->|"Loads destination attributes and saved interactions"| Supabase
  Recommender -->|"Uses seeded destination data"| StaticData

  Planner -->|"Sends prompts and tool calls"| OpenAI
  Planner -->|"Stores chat sessions, messages and planner state"| Supabase
  Planner -->|"Searches places and enriches itinerary items"| GooglePlaces
  Planner -->|"Gets weather fallback"| OpenMeteo
  Planner -->|"Checks route estimates"| OSRM

  Marketplace -->|"Publishes listings, records offers,<br/>messages and simulated payment records"| Supabase
  AdminModule -->|"Approves guides, accesses documents,<br/>suspends listings and reads analytics"| Supabase

  App -->|"Fetches city and place images"| GooglePlaces
  App -->|"Fetches fallback city images"| Wikipedia
```

## External Actors

- **Traveller**: registers, completes quiz/profile data, receives destination recommendations, builds AI-assisted itineraries, saves plans, posts marketplace listings, chats with guides, and confirms mock transactions.
- **Tour Guide**: registers through guide onboarding, uploads verification documents, waits for admin approval, views matching city listings, submits offers, chats with travellers, and enables mock payment records.
- **Administrator**: manages traveller accounts, reviews guide applications/documents, moderates marketplace listings, and views dashboard/reporting analytics.

## External Systems

- **Supabase**: provides authentication, PostgreSQL data storage, row-level security, realtime-supported marketplace/chat data, and guide document storage.
- **OpenAI API**: powers the conversational AI itinerary planner through server-side API routes.
- **Google Places / Maps APIs**: support place search, geocoding, nearby places, map coordinates, and place/city imagery.
- **Wikipedia REST API**: provides fallback city imagery when Google imagery is unavailable.
- **Open-Meteo API**: provides fallback weather estimates when destination climate data is unavailable.
- **OSRM Routing API**: provides approximate routing distance and duration for itinerary transport checks.
- **Destination Datasets**: local CSV datasets used to seed and support destination recommendation data.

## Notes

- Payment handling is represented as **mock transactions inside MyHoliday/Supabase**, not a live external payment gateway.
- Role access is enforced in both the Next.js middleware/API layer and Supabase Row Level Security policies.
