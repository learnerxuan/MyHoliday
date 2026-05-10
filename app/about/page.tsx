import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-warmwhite">
      <section className="relative overflow-hidden bg-charcoal text-warmwhite">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 56% 50% at 72% 20%, rgba(196,135,74,0.22) 0%, transparent 70%), radial-gradient(ellipse 38% 38% at 20% 82%, rgba(196,135,74,0.12) 0%, transparent 68%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-amber font-extrabold tracking-[0.2em] text-[11px] uppercase mb-5 font-body">
              About MyHoliday
            </p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.04] mb-6 text-white">
              Travel planning that starts with what you actually like.
            </h1>
            <p className="text-disabled text-base sm:text-lg max-w-2xl leading-relaxed font-body">
              MyHoliday helps travellers find suitable destinations, build AI-assisted itineraries, and connect with local tour guides through one guided planning flow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 max-w-4xl">
            {PROJECT_FACTS.map((fact) => (
              <div key={fact.label} className="border border-white/10 bg-white/10 rounded-xl p-5">
                <p className="font-display font-extrabold text-3xl text-white mb-1">{fact.value}</p>
                <p className="text-[#A09D9A] text-[11px] uppercase tracking-widest font-semibold font-body">{fact.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20 px-6 border-b border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.8fr_1fr] gap-10 lg:gap-14">
          <div>
            <p className="text-amber font-extrabold tracking-[0.2em] text-[11px] uppercase mb-4 font-body">Why we built it</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal leading-tight mb-4">
              Choosing where to go should feel less random.
            </h2>
            <p className="text-secondary text-sm sm:text-base leading-relaxed font-body">
              Most travel websites start with endless lists of places. MyHoliday starts with the traveller instead: your preferred travel style, budget, climate, dates, and trip length shape the recommendations you see.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PURPOSE_POINTS.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-warmwhite p-6">
                <p className="text-[11px] font-bold font-body text-amber uppercase tracking-[0.16em] mb-3">{item.kicker}</p>
                <h3 className="font-body font-bold text-base text-charcoal mb-2">{item.title}</h3>
                <p className="text-secondary text-sm leading-relaxed font-body">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-subtle py-16 lg:py-20 px-6 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <p className="text-amber font-extrabold tracking-[0.2em] text-[11px] uppercase mb-4 font-body">What we built</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal leading-tight">
              A connected travel planning system.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-white p-6 rounded-xl border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <p className="text-[11px] font-bold font-body text-amber uppercase tracking-[0.16em] mb-4">{feature.kicker}</p>
                <h3 className="font-body font-bold text-[17px] text-charcoal mb-3">{feature.title}</h3>
                <p className="text-secondary text-[15px] leading-relaxed font-body">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20 px-6 border-b border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-10 lg:gap-14 items-start">
          <div>
            <p className="text-amber font-extrabold tracking-[0.2em] text-[11px] uppercase mb-4 font-body">Recommendation logic</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal leading-tight mb-5">
              Matching is based on profile fit, not paid placement.
            </h2>
            <p className="text-secondary text-sm sm:text-base leading-relaxed font-body mb-6">
              The recommender compares traveller preferences with destination attributes using cosine similarity. The vector includes nine travel style scores, budget level, trip duration, and climate fit.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MATCHING_FACTS.map((fact) => (
                <div key={fact.label} className="rounded-xl border border-border bg-subtle p-5">
                  <p className="font-display font-extrabold text-3xl text-charcoal">{fact.value}</p>
                  <p className="text-[11px] font-body text-secondary uppercase tracking-[0.14em] leading-snug">{fact.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-charcoal p-6 lg:p-8 rounded-xl text-white">
            <p className="text-amber font-extrabold text-[11px] uppercase tracking-[0.2em] mb-6 font-body">Style categories</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STYLE_CATEGORIES.map((style) => (
                <div key={style} className="border border-white/10 bg-white/10 rounded-lg px-4 py-3">
                  <p className="font-body font-semibold text-sm text-warmwhite">{style}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-subtle py-16 lg:py-20 px-6 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <p className="text-amber font-extrabold tracking-[0.2em] text-[11px] uppercase mb-4 font-body">User journey</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal leading-tight">
              From registration to confirmed booking history.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {JOURNEY.map((step) => (
              <div key={step.number} className="bg-white rounded-xl border border-border p-5">
                <div className="w-9 h-9 rounded-full bg-charcoal text-warmwhite flex items-center justify-center font-display font-extrabold text-sm mb-4">
                  {step.number}
                </div>
                <h3 className="font-body font-bold text-sm text-charcoal mb-2">{step.title}</h3>
                <p className="text-secondary text-xs leading-relaxed font-body">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20 px-6">
        <div className="max-w-5xl mx-auto rounded-xl border border-border bg-subtle p-8 lg:p-12 text-center">
          <p className="text-amber font-extrabold tracking-[0.2em] text-[11px] uppercase mb-4 font-body">Academic scope</p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal mb-5">
            Built for AAPP011-4-2 Capstone Project.
          </h2>
          <p className="text-secondary max-w-3xl mx-auto mb-8 text-[15px] leading-relaxed font-body">
            MyHoliday is an academic capstone project for Asia Pacific University, Malaysia. Guide verification and payment workflows are represented as system features for assessment, and payment records are simulated rather than connected to real transaction processing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {ACADEMIC_DETAILS.map((detail) => (
              <div key={detail.label} className="bg-white px-5 py-4 rounded-xl border border-border text-left">
                <p className="text-amber text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5 font-body">{detail.label}</p>
                <p className="text-charcoal font-medium text-[14px] leading-snug font-body">{detail.value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/quiz" className="bg-charcoal hover:bg-black text-white px-8 py-3 rounded-md transition-colors font-bold tracking-wide text-[15px] w-full sm:w-auto font-body">
              Plan a trip
            </Link>
            <Link href="/destinations" className="bg-white hover:bg-warmwhite text-charcoal border border-border px-8 py-3 rounded-md transition-colors font-bold tracking-wide text-[15px] w-full sm:w-auto font-body">
              Browse destinations
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

const PROJECT_FACTS = [
  { value: '560', label: 'Destination records' },
  { value: '12', label: 'Recommendation inputs' },
  { value: '9', label: 'Style categories' },
]

const PURPOSE_POINTS = [
  {
    kicker: 'Discover',
    title: 'Find destinations that fit',
    description: 'The recommendation flow compares traveller preferences with destination data so users can start from a focused shortlist.',
  },
  {
    kicker: 'Plan',
    title: 'Turn ideas into itineraries',
    description: 'After choosing a destination, travellers can generate and refine a day-by-day plan instead of starting from a blank page.',
  },
  {
    kicker: 'Connect',
    title: 'Bring in local support',
    description: 'Saved itineraries can be posted to the marketplace, where verified guides can review the plan and submit offers.',
  },
  {
    kicker: 'Manage',
    title: 'Keep the journey organized',
    description: 'Travellers can save plans, revisit booking history, chat with guides, and keep planning activity inside the platform.',
  },
]

const FEATURES = [
  {
    kicker: 'Traveller',
    title: 'Preference-based recommendations',
    description: 'Travellers submit style, region, budget, climate, group size, and date preferences to receive ranked destinations.',
  },
  {
    kicker: 'Planning',
    title: 'AI itinerary planner',
    description: 'The planner turns a chosen destination into a day-by-day itinerary and supports refinement through chat.',
  },
  {
    kicker: 'Marketplace',
    title: 'Tour guide offers',
    description: 'Saved itineraries can be posted to the marketplace for local guide proposals, price comparison, and chat.',
  },
  {
    kicker: 'Guide',
    title: 'Guide onboarding and approval',
    description: 'Tour guides register through a separate flow and require admin approval before participating in the marketplace.',
  },
  {
    kicker: 'Admin',
    title: 'Operational dashboard',
    description: 'Administrators can monitor users, guide requests, marketplace listings, reports, and suspended content.',
  },
  {
    kicker: 'Research',
    title: 'Traveller survey',
    description: 'The survey flow captures supporting traveller information for the project and keeps survey options normalized.',
  },
]

const MATCHING_FACTS = [
  { value: '9', label: 'Travel style columns' },
  { value: '3', label: 'Context inputs' },
  { value: '560', label: 'Destination records' },
]

const STYLE_CATEGORIES = [
  'Culture',
  'Adventure',
  'Nature',
  'Beaches',
  'Nightlife',
  'Cuisine',
  'Wellness',
  'Urban',
  'Seclusion',
]

const JOURNEY = [
  { number: '01', title: 'Register', description: 'Create a traveller or tour guide account.' },
  { number: '02', title: 'Set preferences', description: 'Complete the planning quiz and optional survey flow.' },
  { number: '03', title: 'Compare matches', description: 'Review ranked destination suggestions and city details.' },
  { number: '04', title: 'Plan with AI', description: 'Generate and refine a day-by-day itinerary.' },
  { number: '05', title: 'Post listing', description: 'Save the itinerary and list it for guide offers.' },
  { number: '06', title: 'Confirm booking', description: 'Accept an offer, chat, and record the simulated payment flow.' },
]

const ACADEMIC_DETAILS = [
  { label: 'Subject', value: 'AAPP011-4-2 Capstone Project' },
  { label: 'Institution', value: 'Asia Pacific University, Malaysia' },
  { label: 'Environment', value: 'Academic prototype with simulated payments' },
]
