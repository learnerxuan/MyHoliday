import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen">

      {/* 1. HERO SECTION */}
      <section className="bg-[#1C1A1A] text-white pt-[120px] pb-[140px] px-8 lg:px-12">
        <div className="max-w-[1000px] mx-auto text-center">
          <p className="text-[#d48c44] font-extrabold tracking-[0.25em] text-[11px] uppercase mb-8 font-body">About MyHoliday</p>
          <h1 className="font-display font-extrabold text-[44px] md:text-[68px] leading-[1.1] mb-10 tracking-tight text-white">
            Built for travellers who want<br />
            <span className="text-[#d48c44] italic font-body font-bold">more than a list of places.</span>
          </h1>
          <p className="text-[#A09D9A] text-[19px] max-w-3xl mx-auto leading-relaxed mb-24 font-body">
            MyHoliday is a data-driven travel recommendation system that goes beyond generic suggestions — matching you to destinations based on your actual preferences, then helping you plan every detail with AI.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <p className="font-display font-extrabold text-[40px] mb-2 text-white">300+</p>
              <p className="text-[#84827F] text-[11px] uppercase tracking-widest font-semibold font-body">Destinations</p>
            </div>
            <div className="text-center">
              <p className="font-display font-extrabold text-[40px] mb-2 text-white">1.2k+</p>
              <p className="text-[#84827F] text-[11px] uppercase tracking-widest font-semibold font-body">Itineraries Generated</p>
            </div>
            <div className="text-center">
              <p className="font-display font-extrabold text-[40px] mb-2 text-white">200+</p>
              <p className="text-[#84827F] text-[11px] uppercase tracking-widest font-semibold font-body">Verified Tour Guides</p>
            </div>
            <div className="text-center">
              <p className="font-display font-extrabold text-[40px] mb-2 text-white">6</p>
              <p className="text-[#84827F] text-[11px] uppercase tracking-widest font-semibold font-body">Team Members</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WHAT WE BUILT */}
      <section className="bg-white py-28 px-8 lg:px-12 border-b border-border">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-[#d48c44] font-extrabold tracking-[0.2em] text-[11px] uppercase mb-4 font-body">What we built</p>
          <h2 className="font-display font-extrabold text-4xl md:text-[50px] text-charcoal mb-[72px]">A complete travel ecosystem</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[20px] border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="text-[32px] mb-6">🎯</div>
              <h3 className="font-body font-bold text-[17px] text-charcoal mb-4">Preference-Based Recommendations</h3>
              <p className="text-secondary/80 text-[15px] leading-[1.6]">Answer a short quiz about your travel style, budget, dietary needs, and interests. Our algorithm scores destinations across 9 thematic dimensions and returns a personalised ranked list.</p>
            </div>
            <div className="bg-white p-8 rounded-[20px] border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="text-[32px] mb-6">🤖</div>
              <h3 className="font-body font-bold text-[17px] text-charcoal mb-4">AI Itinerary Planner</h3>
              <p className="text-secondary/80 text-[15px] leading-[1.6]">Chat with our AI assistant to build a day-by-day itinerary. The AI is aware of your profile — including dietary restrictions, accessibility needs, and preferred budget — and refines the plan through conversation.</p>
            </div>
            <div className="bg-white p-8 rounded-[20px] border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="text-[32px] mb-6">🛒</div>
              <h3 className="font-body font-bold text-[17px] text-charcoal mb-4">Tour Guide Marketplace</h3>
              <p className="text-secondary/80 text-[15px] leading-[1.6]">Post your AI-generated itinerary to the marketplace. Verified local tour guides in your destination city browse listings, submit price offers, and negotiate via in-platform chat before you confirm a booking.</p>
            </div>
            <div className="bg-white p-8 rounded-[20px] border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="text-[32px] mb-6">🔐</div>
              <h3 className="font-body font-bold text-[17px] text-charcoal mb-4">Dual-Role Authentication</h3>
              <p className="text-secondary/80 text-[15px] leading-[1.6]">Separate registration flows for travellers and tour guides. Guides undergo a simulated verification process — uploading documents for admin approval — before they can access the marketplace.</p>
            </div>
            <div className="bg-white p-8 rounded-[20px] border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="text-[32px] mb-6">📊</div>
              <h3 className="font-body font-bold text-[17px] text-charcoal mb-4">Admin Analytics Dashboard</h3>
              <p className="text-secondary/80 text-[15px] leading-[1.6]">A data visualisation dashboard for administrators, showing descriptive statistics on popular destinations, itinerary trends, marketplace activity, user demographics, and transaction volume over time.</p>
            </div>
            <div className="bg-white p-8 rounded-[20px] border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="text-[32px] mb-6">🗺️</div>
              <h3 className="font-body font-bold text-[17px] text-charcoal mb-4">City Detail Pages</h3>
              <p className="text-secondary/80 text-[15px] leading-[1.6]">Each destination has a full profile — thematic ratings across 9 categories, estimated daily budget, best travel season, external booking links, and a one-click entry point into the AI planner.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TECHNOLOGY */}
      <section className="bg-[#FAF9F7] py-28 px-8 lg:px-12 border-b border-border">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-[#d48c44] font-extrabold tracking-[0.2em] text-[11px] uppercase mb-4 font-body">Technology</p>
          <h2 className="font-display font-extrabold text-4xl md:text-[50px] text-charcoal mb-[72px]">How it's built</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[72px]">
            <div className="flex flex-col gap-4">
              {[
                { k: 'FRAMEWORK', v: 'Next.js 14 — App Router, single codebase for frontend and API' },
                { k: 'DATABASE', v: 'PostgreSQL hosted on Supabase — 11 tables, fully normalised' },
                { k: 'STYLING', v: 'Tailwind CSS 3 with a custom design token system' },
                { k: 'CHARTS', v: 'Recharts — used for admin dashboard analytics' },
                { k: 'FONTS', v: 'Funnel Display (headings) + Noto Serif (body)' },
                { k: 'DEPLOYMENT', v: 'Vercel — continuous deployment from GitHub' }
              ].map(i => (
                <div key={i.k} className="bg-white px-8 py-[22px] rounded-2xl border border-border flex items-center lg:gap-8 gap-4">
                  <p className="text-[#d48c44] font-bold text-[11px] uppercase tracking-widest w-28 shrink-0">{i.k}</p>
                  <p className="text-secondary/90 text-[15px] font-medium leading-snug">{i.v}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#1C1A1A] p-10 lg:p-12 rounded-[24px] shadow-2xl h-full text-white">
              <p className="text-[#d48c44] font-extrabold text-[11px] uppercase tracking-[0.2em] mb-12">Database at a glance</p>

              <div className="flex flex-col gap-7">
                {[
                  { t: 'destinations', d: 'City profiles, thematic ratings, JSONB climate data' },
                  { t: 'users', d: 'Traveller and admin accounts with full profile' },
                  { t: 'tour_guides', d: 'Guide accounts, city assignment, verification status' },
                  { t: 'itineraries', d: 'Saved AI-generated plans, JSONB content' },
                  { t: 'marketplace_listings', d: 'Posted itineraries with desired_budget' },
                  { t: 'marketplace_offers', d: 'Guide price proposals per listing' },
                  { t: 'marketplace_messages', d: 'Polymorphic chat between traveller and guide' },
                  { t: 'transactions', d: 'Booking records with payout constraint' }
                ].map(b => (
                  <div key={b.t} className="border-b border-white/[0.08] pb-6 last:border-0 last:pb-0">
                    <p className="font-bold text-[15px] font-body text-white mb-2 tracking-wide">{b.t}</p>
                    <p className="text-[#A09D9A] text-[13px]">{b.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. USER JOURNEY & META */}
      <section className="bg-white py-28 px-8 lg:px-12">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-[#d48c44] font-extrabold tracking-[0.2em] text-[11px] uppercase mb-4 font-body">User Journey</p>
          <h2 className="font-display font-extrabold text-4xl md:text-[50px] text-charcoal mb-[90px]">From sign-up to confirmed booking</h2>

          <div className="relative flex-col md:flex-row justify-between pt-4 mb-[160px] hidden md:flex">
            {/* Timeline horizontal line */}
            <div className="absolute top-[28px] left-[5%] right-[5%] h-px bg-border -z-10" />

            {[
              { n: '01', t: 'Register', d: 'Create a traveller or tour guide account' },
              { n: '02', t: 'Set Preferences', d: 'Answer the travel preference quiz' },
              { n: '03', t: 'Get Recommendations', d: 'Receive scored city suggestions' },
              { n: '04', t: 'Plan with AI', d: 'Build a day-by-day itinerary via chat' },
              { n: '05', t: 'Post to Marketplace', d: 'List your itinerary with a desired budget' },
              { n: '06', t: 'Confirm Booking', d: 'Accept a guide\'s offer and book', last: true },
            ].map((s) => (
              <div key={s.n} className="flex flex-col items-center flex-1 text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm tracking-widest shadow-[0_0_0_12px_white] mb-6 ${s.last ? 'bg-[#d48c44] text-white' : 'bg-[#1C1A1A] text-white'}`}>
                  {s.n}
                </div>
                <h4 className="font-body font-bold text-[15px] text-charcoal mb-2">{s.t}</h4>
                <p className="text-secondary/70 text-[11.5px] max-w-[140px] leading-relaxed mx-auto">{s.d}</p>
              </div>
            ))}
          </div>

          {/* Academic Block */}
          <div className="bg-[#FAF9F7] py-24 px-8 rounded-[32px] max-w-[900px] mx-auto border border-border/60 text-center">
            <p className="text-[#d48c44] font-extrabold tracking-[0.2em] text-[11px] uppercase mb-5 font-body text-center">Academic Project</p>
            <h2 className="font-display font-extrabold text-[44px] text-charcoal mb-6 text-center">Built for AAPP011-4-2</h2>
            <p className="text-secondary/80 max-w-[680px] mx-auto mb-14 text-[16px] leading-relaxed font-body">
              MyHoliday is a capstone project developed by Group 1 of the Diploma in ICT (Data Informatics) programme at Asia Pacific University (APU), Malaysia. The system is built for academic assessment purposes.
            </p>

            <div className="flex flex-col items-center gap-4 mb-20 px-8">
              <div className="flex flex-col md:flex-row gap-4 w-full justify-center max-w-[560px]">
                <div className="bg-white px-8 py-5 rounded-2xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-left flex-1">
                  <p className="text-[#d48c44] text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5">Group</p>
                  <p className="text-charcoal font-medium text-[15px]">Group 1 — UCDF2407ICT(DI)</p>
                </div>
                <div className="bg-white px-8 py-5 rounded-2xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-left flex-[1.4]">
                  <p className="text-[#d48c44] text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5">Subject</p>
                  <p className="text-charcoal font-medium text-[15px]">AAPP011-4-2 Capstone Project</p>
                </div>
              </div>
              <div className="w-full max-w-[560px]">
                <div className="bg-white px-8 py-5 rounded-2xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-center">
                  <p className="text-[#d48c44] text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5">Institution</p>
                  <p className="text-charcoal font-medium text-[15px]">Asia Pacific University, Malaysia</p>
                </div>
              </div>
              <div className="w-full max-w-[560px] mt-4">
                <div className="bg-white px-8 py-5 rounded-2xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center hover:border-charcoal/30 transition-colors">
                  <p className="text-[#d48c44] text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5">Payment Note</p>
                  <p className="text-charcoal font-medium text-[14px]">Transactions are simulated — no real payments are processed</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth/login" className="bg-[#1A1A1A] hover:bg-black text-white px-9 py-4 rounded-[12px] transition-colors font-bold tracking-wide shadow-xl shadow-black/10 text-[15px] border-2 border-transparent w-full sm:w-auto">
                Get Started
              </Link>
              <Link href="/destinations" className="bg-transparent hover:bg-white text-charcoal border-2 border-border px-9 py-4 rounded-[12px] transition-colors font-bold tracking-wide text-[15px] w-full sm:w-auto">
                Browse Destinations
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
