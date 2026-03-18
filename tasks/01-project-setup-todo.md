# Todo: Project Setup

## Checklist

- [ ] Initialize a new Next.js 15 project with App Router (`npx create-next-app@latest`)
- [ ] Install and configure Tailwind CSS with the custom colour tokens and font families defined in the context file
- [ ] Add Google Fonts import to `globals.css` (Funnel Display Extra Bold + Noto Serif 400/600/italic)
- [ ] Add global CSS rules for body font, heading fonts, and `.italic-accent` class
- [ ] Set up the root `body` class: `bg-warmwhite font-body text-charcoal`
- [ ] Create `.env.local` with all required environment variable placeholders (Supabase URL, anon key, service role key, AI API key, app URL)
- [ ] Install Supabase client library (`@supabase/supabase-js`)
- [ ] Create `lib/supabase/client.ts` — browser Supabase client using public env vars
- [ ] Create `lib/supabase/server.ts` — server Supabase client using service role key
- [ ] Create the full folder structure for route groups: `(auth)`, `(traveller)`, `(guide)`, `(admin)`
- [ ] Create placeholder `page.tsx` files in each route folder so the routes resolve
- [ ] Create `api/` route folders: `recommendation/`, `chat/`, `marketplace/`
- [ ] Create `components/ui/` directory for shared UI components
- [ ] Create `lib/ai/` directory for LLM client and prompt templates
- [ ] Create `supabase/migrations/` directory for database schema migrations
- [ ] Write the initial database migration SQL file with all tables from the schema
- [ ] Verify the dev server starts without errors (`npm run dev`)
- [ ] Verify Tailwind custom tokens work (create a test element with `bg-amber text-charcoal`)
