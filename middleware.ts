import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require the user to be logged in
const PROTECTED_PREFIXES = [
  '/profile',
  '/quiz',
  '/planner',
  '/itinerary',
  '/my-plans',
  '/marketplace',
  '/guide',
  '/admin',
]

// Routes only travellers can access (guides + admins blocked)
const TRAVELLER_ONLY = ['/quiz', '/planner', '/my-plans']

// Routes only guides can access
const GUIDE_ONLY = ['/guide']

// Routes only admins can access
const ADMIN_ONLY = ['/admin']

// Public routes — skip auth check entirely
const PUBLIC_PREFIXES = ['/', '/auth', '/destinations', '/_next', '/favicon']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes through
  if (PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Check if this is a protected route
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → redirect to login
  if (!user) {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const role = user.user_metadata?.role ?? ''

  // Role-based blocking
  if (ADMIN_ONLY.some(p => pathname.startsWith(p)) && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (GUIDE_ONLY.some(p => pathname.startsWith(p)) && role !== 'guide' && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (TRAVELLER_ONLY.some(p => pathname.startsWith(p)) && role !== 'traveller' && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files and image optimisation
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
