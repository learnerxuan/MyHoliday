# MyHoliday Context Diagram

```mermaid
flowchart TB
  Traveller["Traveller"]
  Guide["Tour Guide"]
  Admin["Administrator"]
  OpenAI["OpenAI API"]
  Google["Google Places / Maps API"]
  Wikipedia["Wikipedia REST API"]
  Weather["Open-Meteo API"]
  Routing["OSRM Routing API"]

  System(("MyHoliday<br/>Travel Planning and Tour Guide Marketplace System"))

  Traveller -->|"Personal information"| System
  System -->|"Travel recommendation"| Traveller

  Guide -->|"Guide information"| System
  System -->|"Marketplace notification"| Guide

  Admin -->|"Administrative request"| System
  System -->|"Management report"| Admin

  System -->|"Planning request"| OpenAI
  OpenAI -->|"Generated itinerary"| System

  System -->|"Location request"| Google
  Google -->|"Place information"| System

  System -->|"Image request"| Wikipedia
  Wikipedia -->|"Destination image"| System

  System -->|"Weather request"| Weather
  Weather -->|"Weather estimate"| System

  System -->|"Route request"| Routing
  Routing -->|"Route estimate"| System
```

## Checklist Alignment

- Uses **one process symbol** for the entire MyHoliday information system.
- Places all people and third-party services as **external entities** around the process.
- Shows only **data flows** between each external entity and the system.
- Does **not** show data stores, databases, internal modules, or implementation components.
