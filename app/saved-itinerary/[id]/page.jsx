import { Suspense } from 'react'
import SavedItineraryViewer from './SavedItineraryViewer'

export const metadata = {
  title: 'My Trip Itinerary | MyHoliday',
  description: 'View and manage your finalized travel itinerary.',
}

export default function SavedItineraryPage() {
  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden bg-warmwhite">
      <Suspense fallback={
        <div className="flex-1 w-full flex items-center justify-center bg-warmwhite">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-body text-secondary">Loading your trip...</p>
          </div>
        </div>
      }>
        <SavedItineraryViewer />
      </Suspense>
    </div>
  )
}
