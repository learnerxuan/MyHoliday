'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { usePathname, useSearchParams, useRouter as useNextRouter } from 'next/navigation'

import Spinner from '@/components/ui/Spinner'

// We create a custom router context to optionally allow programmatic navigation 
// to instantly trigger the global loading overlay.
const RouterTransitionContext = createContext<(() => void) | null>(null)

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 1. Clear navigation state when URL definitively changes
  // This means the new Route Segment has finished rendering via Next.js suspended loading.
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname, searchParams])

  useEffect(() => {
    // 2. Intercept Anchor Clicks
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      
      const href = anchor.getAttribute('href')
      const target = anchor.getAttribute('target')
      
      // Ignore new tabs or external links, anchor links, mailtos, etc.
      if (!href || href.startsWith('http') || target === '_blank' || href.startsWith('mailto:') || href.startsWith('tel:')) return
      if (href.startsWith('#')) return

      // Don't trigger if it's the exact same URL + search
      const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      if (href === currentUrl) return

      setIsNavigating(true)
    }

    // 3. Intercept browser back/forward buttons
    const handlePopState = () => setIsNavigating(true)

    document.documentElement.addEventListener('click', handleClick, true)
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.documentElement.removeEventListener('click', handleClick, true)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [pathname, searchParams])

  // Optional: Debounce displaying the spinner by 100ms.
  // If the navigation takes < 100ms (instant cache hit), the spinner won't flash annoyingly.
  const [showOverlay, setShowOverlay] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isNavigating) {
      timer = setTimeout(() => setShowOverlay(true), 150)
    } else {
      setShowOverlay(false)
    }
    return () => clearTimeout(timer)
  }, [isNavigating])

  return (
    <RouterTransitionContext.Provider value={() => setIsNavigating(true)}>
      {children}
      
      {/* GLASSSMORPHISM GAUSSIAN BLUR OVERLAY */}
      <div 
        className={`fixed inset-0 z-[9999] backdrop-blur-[8px] bg-white/40 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${showOverlay ? 'opacity-100' : 'opacity-0 hidden'}`}
      >
        <div className="flex flex-col items-center justify-center gap-4">
           <Spinner className="w-14 h-14 border-4" />
        </div>
      </div>
    </RouterTransitionContext.Provider>
  )
}

/**
 * Enhanced `useRouter` that guarantees the globally blurred loading overlay
 * triggers instantly for programmatic navigation like `router.push()` or `router.replace()`.
 */
export function useAppRouter() {
  const router = useNextRouter()
  const triggerTransition = useContext(RouterTransitionContext)

  return {
    ...router,
    push: (href: string, options?: any) => {
      if (triggerTransition) triggerTransition()
      router.push(href, options)
    },
    replace: (href: string, options?: any) => {
      if (triggerTransition) triggerTransition()
      router.replace(href, options)
    }
  }
}
