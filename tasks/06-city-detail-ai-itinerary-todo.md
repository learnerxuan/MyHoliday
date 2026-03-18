# Todo: City Detail & AI Itinerary Planner

## Checklist

### City Detail Page
- [ ] Create `app/destinations/[id]/page.jsx`
- [ ] Fetch destination data from Supabase `destinations` table by ID
- [ ] Display city name and country as the page heading
- [ ] Display city image
- [ ] Display city description and overview text
- [ ] Display popular attractions and points of interest
- [ ] Display estimated travel costs
- [ ] Display climate and style tags using Badge components
- [ ] Add "Plan My Trip" Button (primary) that navigates to the AI planner with city ID
- [ ] Add external booking links section (hotels, transport — links to third-party sites)
- [ ] Handle 404 case — show friendly error if destination ID doesn't exist

### ChatWindow Component
- [ ] Create `components/sections/ChatWindow.jsx` (or coordinate with ZX who builds this)
- [ ] Display message bubbles — differentiate user messages from AI messages visually
- [ ] Add text input field at the bottom of the chat
- [ ] Add send button next to the input field
- [ ] Show typing/loading indicator while waiting for AI response
- [ ] Auto-scroll to newest message
- [ ] Add "Save Plan" button that appears after AI generates a plan

### AI Chat API Route
- [ ] Create `app/api/chat/route.js`
- [ ] Accept POST with: user message, conversation history, destination ID, user profile data
- [ ] Fetch destination details from Supabase (name, country, description, attractions, costs)
- [ ] Fetch user profile from Supabase (dietary restrictions, accessibility needs, language, nationality)
- [ ] Construct system prompt including destination context and user profile
- [ ] Call OpenAI API or Gemini API with the conversation history and system prompt
- [ ] Return AI response to the client
- [ ] Handle API errors gracefully (rate limits, network failures)
- [ ] Ensure API key is never exposed to the client

### AI Itinerary Chat Page
- [ ] Create `app/itinerary/page.jsx`
- [ ] Accept destination ID as a query parameter or state
- [ ] Display the ChatWindow component
- [ ] On page load, optionally auto-send an initial message to generate the first draft itinerary
- [ ] Maintain conversation history in component state
- [ ] On each user message: send to API route, append AI response to history
- [ ] Show the destination name in the page header for context

### Save Itinerary
- [ ] Implement "Save Plan" functionality
- [ ] Extract the itinerary content from the conversation (the AI's plan)
- [ ] Prompt user for a plan title (or auto-generate one)
- [ ] Save to `itineraries` table: user_id, destination_id, title, plan_content (JSON), timestamps
- [ ] Show success confirmation after saving
- [ ] Redirect to My Plans dashboard (`/itinerary/my-plans`)

### LLM System Prompt
- [ ] Write system prompt template in `lib/ai/`
- [ ] Include placeholders for: destination name, country, attractions, costs, user dietary needs, accessibility needs, preferred language, nationality, group size
- [ ] Instruct the AI to generate day-by-day itineraries
- [ ] Instruct the AI to be conversational and accept refinement requests

### Final
- [ ] Test full flow: city detail → plan my trip → chat → refine → save
- [ ] Verify saved itinerary appears in My Plans
- [ ] Verify user profile data is correctly used in AI personalisation
- [ ] Test error handling for AI API failures
