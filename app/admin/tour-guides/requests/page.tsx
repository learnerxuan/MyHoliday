import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import PendingRequestsList from './PendingRequestsList'

export const dynamic = 'force-dynamic'

export default async function PendingRequestsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() }
      }
    }
  )

  const { data: guides, error } = await supabase
    .from('tour_guides')
    .select('*, destinations(city, country)')
    .eq('verification_status', 'pending')

  if (error) console.error('Error fetching pending guides:', error)

  return (
    <main className="min-h-screen bg-warmwhite py-10 px-6">
      <div className="w-full max-w-5xl mx-auto">
        <Link href="/admin/tour-guides" className="inline-flex items-center text-sm font-semibold font-body text-secondary hover:text-charcoal transition-colors mb-6">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Directory
        </Link>
        <h1 className="text-3xl font-display font-extrabold text-charcoal mb-1">Pending Guide Requests</h1>
        <p className="text-secondary text-sm font-body mb-8">Review and verify applications from aspiring tour guides.</p>
        
        <PendingRequestsList requests={guides || []} />
      </div>
    </main>
  )
}
