import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function GuideDashboard() {
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

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data: guide } = await supabase
    .from('tour_guides')
    .select('verification_status')
    .eq('user_id', user.id)
    .single()

  if (guide?.verification_status === 'pending') {
    return (
      <main className="min-h-screen bg-warmwhite flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-sm text-center border border-border">
          <div className="w-16 h-16 bg-amber/10 text-amber rounded-full flex items-center justify-center mx-auto mb-6">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </div>
          <h1 className="text-2xl font-display font-extrabold text-charcoal mb-2">Request Pending</h1>
          <p className="text-secondary font-body text-sm mb-8 leading-relaxed">
            Your tour guide application is currently being reviewed by our administrators. We will verify your submitted documents and approve your account shortly.
          </p>
          <Link href="/" className="inline-flex w-full py-3 px-4 bg-charcoal text-white rounded-xl font-bold font-body text-sm hover:bg-black hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all justify-center items-center">
            Return to Homepage
          </Link>
        </div>
      </main>
    )
  }

  if (guide?.verification_status === 'rejected') {
    return (
      <main className="min-h-screen bg-warmwhite flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-sm text-center border border-border">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </div>
          <h1 className="text-2xl font-display font-extrabold text-charcoal mb-2">Request Declined</h1>
          <p className="text-secondary font-body text-sm mb-8 leading-relaxed">
            Unfortunately, your tour guide application has not been approved at this time. Should you have any questions, please contact our support team.
          </p>
          <Link href="/" className="inline-flex w-full py-3 px-4 border border-border text-charcoal rounded-xl font-bold font-body text-sm hover:bg-black/5 transition-all justify-center items-center">
            Return to Homepage
          </Link>
        </div>
      </main>
    )
  }

  // Blank dashboard stub for approved guides
  return (
    <main className="min-h-screen bg-warmwhite py-20 px-8 flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-100">
         <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
         </svg>
      </div>
      <h1 className="text-4xl font-display font-extrabold text-charcoal mb-3">Welcome to your Dashboard</h1>
      <p className="text-secondary text-lg max-w-md font-body">
        Your application has been approved! The comprehensive guide marketplace and dashboard interface are currently under construction.
      </p>
    </main>
  )
}
