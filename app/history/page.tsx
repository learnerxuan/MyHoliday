import BookingHistoryList from '@/components/BookingHistoryList'

export default function TravellerHistoryPage() {
  return (
    <main className="min-h-screen bg-warmwhite flex flex-col -mt-7 md:-mt-6 p-4 sm:p-6 pb-20 font-body">
      <div className="max-w-7xl mx-auto w-full">
        <BookingHistoryList scope="traveller" />
      </div>
    </main>
  )
}
