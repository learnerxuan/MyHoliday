# MyHoliday Data Flow Diagram - Level 0

```mermaid
flowchart LR
  Traveller[/"Traveller"/]
  Guide[/"Tour Guide"/]
  Admin[/"Administrator"/]

  OpenAI[/"OpenAI API"/]
  Google[/"Google Places / Maps APIs"/]
  Weather[/"Open-Meteo API"/]
  Routing[/"OSRM Routing API"/]
  Wikipedia[/"Wikipedia REST API"/]

  P1(("1.0<br/>Manage Authentication<br/>and User Profiles"))
  P2(("2.0<br/>Recommend<br/>Destinations"))
  P3(("3.0<br/>Plan AI<br/>Itinerary"))
  P4(("4.0<br/>Manage Saved<br/>Itineraries"))
  P5(("5.0<br/>Manage<br/>Marketplace"))
  P6(("6.0<br/>Administer Platform<br/>and Reports"))

  D1[(D1<br/>Auth Users)]
  D2[(D2<br/>Traveller Profiles)]
  D3[(D3<br/>Tour Guide Profiles<br/>and Documents)]
  D4[(D4<br/>Destinations and<br/>Historical Trip Data)]
  D5[(D5<br/>User Interactions)]
  D6[(D6<br/>Chat Sessions<br/>and Messages)]
  D7[(D7<br/>Saved Itineraries)]
  D8[(D8<br/>Marketplace Listings)]
  D9[(D9<br/>Offers, Messages<br/>and Transactions)]

  Traveller -->|"Registration, login, onboarding and profile details"| P1
  Guide -->|"Guide registration, onboarding and document upload"| P1
  Admin -->|"Admin login"| P1
  P1 -->|"Session, role and access status"| Traveller
  P1 -->|"Session, role and verification status"| Guide
  P1 -->|"Admin session and role access"| Admin
  P1 <-->|"User account records"| D1
  P1 <-->|"Traveller profile records"| D2
  P1 <-->|"Guide profile and document records"| D3

  Traveller -->|"Quiz answers and discovery request"| P2
  P2 -->|"Ranked destination recommendations"| Traveller
  P2 <-->|"Destination attributes"| D4
  P2 <-->|"Clicks, saved-plan signals and previous planning signals"| D5
  P2 <-->|"Profile preferences"| D2

  Traveller -->|"Destination choice, trip constraints and chat messages"| P3
  P3 -->|"Draft itinerary, refined plan, map data and chat replies"| Traveller
  P3 <-->|"Planner state, chat sessions and messages"| D6
  P3 <-->|"Traveller context"| D2
  P3 <-->|"Destination details"| D4
  P3 -->|"Prompt and tool context"| OpenAI
  OpenAI -->|"Generated itinerary response"| P3
  P3 -->|"Place search, coordinates and photos"| Google
  Google -->|"Place details and map coordinates"| P3
  P3 -->|"Weather estimate request"| Weather
  Weather -->|"Weather estimates"| P3
  P3 -->|"Route estimate request"| Routing
  Routing -->|"Distance and duration estimates"| P3

  Traveller -->|"Save, view and update itinerary request"| P4
  P4 -->|"Saved itinerary list and itinerary details"| Traveller
  P4 <-->|"Saved itinerary records"| D7
  P4 <-->|"Related destination data"| D4
  P4 <-->|"Related chat session state"| D6

  Traveller -->|"Marketplace listing, offer decision, chat and mock payment action"| P5
  Guide -->|"Listing search, offer, chat and payment enablement"| P5
  P5 -->|"Listings, offers, messages and booking status"| Traveller
  P5 -->|"Matching requests, offer status and booking history"| Guide
  P5 <-->|"Published listing records"| D8
  P5 <-->|"Offer, negotiation message and transaction records"| D9
  P5 <-->|"Saved itinerary source data"| D7
  P5 <-->|"Guide verification and city assignment"| D3

  Admin -->|"User management, guide review, moderation and report request"| P6
  P6 -->|"Dashboards, approval results, reports and moderation status"| Admin
  P6 <-->|"Traveller account and profile data"| D2
  P6 <-->|"Guide applications and documents"| D3
  P6 <-->|"Destination and interaction analytics"| D4
  P6 <-->|"Click and behaviour analytics"| D5
  P6 <-->|"Marketplace moderation data"| D8
  P6 <-->|"Offer and transaction analytics"| D9

  Traveller -->|"Destination page and image request"| P2
  P2 -->|"City/place photo request"| Google
  Google -->|"City/place photos"| P2
  P2 -->|"Fallback city image request"| Wikipedia
  Wikipedia -->|"Fallback image metadata"| P2
  P2 -->|"Record destination click"| D5
```

## External Entities

- **Traveller**: uses MyHoliday to register, complete onboarding, answer the quiz, browse destinations, plan trips with AI, save itineraries, create marketplace listings, chat with guides, and complete mock transactions.
- **Tour Guide**: registers, submits guide verification details, browses traveller marketplace requests, submits offers, chats with travellers, and manages accepted bookings.
- **Administrator**: manages users, reviews guide applications, moderates listings, and views operational reports.
- **OpenAI API**: generates AI itinerary responses.
- **Google Places / Maps APIs**: provides place search, geocoding, coordinates, nearby places, and imagery.
- **Open-Meteo API**: provides fallback weather estimates.
- **OSRM Routing API**: provides route distance and duration estimates.
- **Wikipedia REST API**: provides fallback destination image data.

## Data Stores

- **D1 Auth Users**: Supabase authentication accounts, sessions, and user metadata roles.
- **D2 Traveller Profiles**: traveller onboarding details, preferences, account status, and profile data.
- **D3 Tour Guide Profiles and Documents**: guide onboarding details, city assignment, verification status, and uploaded document references.
- **D4 Destinations and Historical Trip Data**: destination catalogue, destination attributes, climate data, and seeded historical trip data.
- **D5 User Interactions**: destination clicks and behavioural signals used for personalization and reporting.
- **D6 Chat Sessions and Messages**: AI planner conversations, messages, and structured planner state.
- **D7 Saved Itineraries**: saved itinerary JSON content and trip metadata.
- **D8 Marketplace Listings**: traveller-published itinerary requests and listing statuses.
- **D9 Offers, Messages and Transactions**: guide offers, marketplace chat messages, and mock transaction records.

## Process Summary

- **1.0 Manage Authentication and User Profiles** validates users, manages sessions, stores traveller profiles, stores guide profiles, and enforces role-based access.
- **2.0 Recommend Destinations** processes quiz input and behavioural signals to return destination recommendations and personalized discovery results.
- **3.0 Plan AI Itinerary** manages traveller chat input, calls AI and travel-support APIs, stores planner state, and returns itinerary drafts or refinements.
- **4.0 Manage Saved Itineraries** saves generated plans and retrieves itinerary history or itinerary details.
- **5.0 Manage Marketplace** publishes saved itineraries as listings, handles guide offers, supports negotiation chat, and records mock transactions.
- **6.0 Administer Platform and Reports** supports traveller management, guide approval, marketplace moderation, and reporting analytics.

