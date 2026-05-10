import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import TourGuideList from './TourGuideList'

export const dynamic = 'force-dynamic'

export default async function AdminTourGuidesPage() {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: guides, error } = await supabase
    .from('tour_guides')
    .select('id, full_name, document_url, verification_status, created_at, destinations(city, country)')
    .eq('verification_status', 'approved')

  if (error) {
    console.error('Error fetching tour guides:', error)
  }

  // Fetch pending count
  const { count: pendingCount, error: countError } = await supabase
    .from('tour_guides')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'pending')

  if (countError) {
    console.error('Error fetching pending count:', countError)
  }

  return (
    <main className="min-h-screen bg-warmwhite">
      <TourGuideList
        guides={(guides || []).map(({ document_url, ...guide }) => ({
          ...guide,
          has_document: Boolean(document_url),
        }))}
        pendingCount={pendingCount || 0}
      />
    </main>
  )
}
