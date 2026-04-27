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
    .select('*, destinations(city, country)')
    .eq('verification_status', 'approved')

  if (error) {
    console.error('Error fetching tour guides:', error)
  }

  return (
    <main className="min-h-screen bg-warmwhite">
      <TourGuideList guides={guides || []} />
    </main>
  )
}
