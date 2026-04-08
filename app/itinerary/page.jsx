import { Suspense } from 'react'
import ItineraryPlanner from './ItineraryPlanner'

export default function ItineraryPage() {
  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      <Suspense fallback={
        <div className="flex-1 w-full flex items-center justify-center bg-warmwhite">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-body text-secondary">Loading your planner...</p>
          </div>
        </div>
      }>
        <ItineraryPlanner />
      </Suspense>
    </div>
  )
}
