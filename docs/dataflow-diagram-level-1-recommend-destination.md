# MyHoliday Data Flow Diagram - Level 1: Recommend Destinations

This Level 1 DFD expands process **2.0 Recommend Destinations** from the Level 0 data flow diagram.

```mermaid
flowchart LR
  Traveller[/"Traveller"/]
  Google[/"Google Places / Maps APIs"/]
  Wikipedia[/"Wikipedia REST API"/]

  P21(("2.1<br/>Receive Quiz or<br/>Discovery Request"))
  P22(("2.2<br/>Validate Request<br/>and User Session"))
  P23(("2.3<br/>Fetch Destination<br/>and User Signal Data"))
  P24(("2.4<br/>Derive Preference<br/>Profile"))
  P25(("2.5<br/>Filter and Score<br/>Destinations"))
  P26(("2.6<br/>Apply Personalisation<br/>Boosts"))
  P27(("2.7<br/>Return Ranked<br/>Recommendations"))
  P28(("2.8<br/>Record Destination<br/>Interaction"))
  P29(("2.9<br/>Retrieve Destination<br/>Images"))

  D1[(D1<br/>Auth Users)]
  D2[(D2<br/>Traveller Profiles)]
  D4[(D4<br/>Destinations and<br/>Historical Trip Data)]
  D5[(D5<br/>User Interactions)]
  D6[(D6<br/>Chat Sessions<br/>and Messages)]
  D7[(D7<br/>Saved Itineraries)]

  Traveller -->|"Quiz preferences: styles, regions, budget,<br/>climate, group size and travel dates"| P21
  Traveller -->|"Personalized discovery request"| P21
  P21 -->|"Recommendation request payload"| P22

  P22 <-->|"Current user identity and role metadata"| D1
  P22 -->|"Validated quiz request"| P23
  P22 -->|"Authenticated discovery request"| P23
  P22 -->|"Validation error or empty anonymous result"| Traveller

  P23 <-->|"Destination attributes, climate data,<br/>budget level, regions and travel styles"| D4
  P23 <-->|"Traveller profile context when available"| D2
  P23 <-->|"Recent destination click signals"| D5
  P23 <-->|"Recent planner state signals"| D6
  P23 <-->|"Recent saved itinerary metadata"| D7
  P23 -->|"Raw quiz preferences and destination data"| P24
  P23 -->|"Behavioural signals and destination data"| P24

  P24 -->|"Encoded quiz preference vector"| P25
  P24 -->|"Inferred preference profile from<br/>saved itineraries, clicks and chat sessions"| P25
  P24 -->|"Preferred country and region frequency signals"| P26

  P25 -->|"Region-filtered destination candidates"| P25
  P25 -->|"Scored destination candidates"| P26
  P25 <-->|"Destination catalogue for scoring"| D4

  P26 -->|"Ranked quiz recommendations"| P27
  P26 -->|"Personalized discovery recommendations<br/>with region and country boosts"| P27

  P27 -->|"Top 20 quiz recommendations and trip metadata"| Traveller
  P27 -->|"Top 10 personalized discovery recommendations<br/>and signal count"| Traveller

  Traveller -->|"Destination click with destination ID"| P28
  P28 <-->|"Current authenticated user"| D1
  P28 -->|"Stored click interaction"| D5
  P28 -->|"Tracking result"| Traveller

  Traveller -->|"Destination card or detail image request"| P29
  P29 -->|"City or place photo request"| Google
  Google -->|"Place image or city image result"| P29
  P29 -->|"Fallback city image request"| Wikipedia
  Wikipedia -->|"Fallback image metadata"| P29
  P29 -->|"Destination imagery"| Traveller
```

## External Entities

- **Traveller**: submits quiz preferences, opens personalized discovery, views ranked destinations, clicks destination cards, and requests destination imagery.
- **Google Places / Maps APIs**: supplies city and place imagery for destination results.
- **Wikipedia REST API**: supplies fallback city image metadata when Google imagery is unavailable.

## Data Stores

- **D1 Auth Users**: Supabase authentication identity used to personalize discovery and track logged-in clicks.
- **D2 Traveller Profiles**: traveller context available to the wider recommendation experience.
- **D4 Destinations and Historical Trip Data**: destination catalogue, travel style scores, budget level, region, climate data, coordinates, and historical destination attributes.
- **D5 User Interactions**: destination click records used for personalization and analytics.
- **D6 Chat Sessions and Messages**: prior AI planner state used as a behavioural signal for personalized discovery.
- **D7 Saved Itineraries**: saved itinerary metadata used as a strong signal for personalized discovery.

## Process Details

- **2.1 Receive Quiz or Discovery Request** accepts either explicit quiz preferences from the traveller or a personalized discovery request.
- **2.2 Validate Request and User Session** checks required quiz fields and verifies the authenticated user for discovery and click tracking.
- **2.3 Fetch Destination and User Signal Data** loads destinations, saved itineraries, destination clicks, and AI planner session signals from Supabase.
- **2.4 Derive Preference Profile** converts quiz answers into preference vectors or infers preferences from behavioural signals.
- **2.5 Filter and Score Destinations** filters destinations by selected regions, encodes destination features, and calculates cosine similarity scores.
- **2.6 Apply Personalisation Boosts** adds region and country affinity boosts for personalized discovery results.
- **2.7 Return Ranked Recommendations** returns top quiz recommendations with trip metadata or personalized discovery recommendations with signal count.
- **2.8 Record Destination Interaction** stores authenticated destination click events for future personalization.
- **2.9 Retrieve Destination Images** retrieves city/place photos from Google and fallback imagery from Wikipedia.

## Main Data Items

- **Quiz preferences**: travel styles, regions, budget, climate, group size, start date, and end date.
- **Destination features**: culture, adventure, nature, beaches, nightlife, cuisine, wellness, urban, seclusion, budget level, ideal durations, climate, region, and country.
- **Behavioural signals**: saved itinerary metadata, clicked destinations, chat planner state, preferred regions, and preferred countries.
- **Recommendation output**: destination records, match score, trip duration, travel dates, trip metadata, and discovery signal count.

