"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type ListingView = 'all' | 'suspended' | 'no-offers'

export default function ListingList({
  listings,
  initialView = 'all'
}: {
  listings: any[]
  initialView?: ListingView
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ListingView>(initialView)
  const [closing, setClosing] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [localListings, setLocalListings] = useState<any[]>(listings || [])

  const suspendedCount = localListings.filter(l => l.is_suspended).length
  const noOffersCount = localListings.filter(l => Number(l.offerCount || 0) === 0).length

  const setListingView = (nextView: ListingView) => {
    setView(nextView)
    const query = nextView === 'all' ? '' : `?view=${nextView}`
    router.replace(`/admin/marketplace${query}`, { scroll: false })
  }

  const filtered = localListings.filter(l => {
    const title = (l.itineraries?.title || '').toLowerCase()
    const name = (l.traveller_profiles?.full_name || '').toLowerCase()
    const dest = (l.destinations?.city || '').toLowerCase()
    const q = search.toLowerCase()
    const matchesSearch = title.includes(q) || name.includes(q) || dest.includes(q)
    const matchesView =
      view === 'all' ||
      (view === 'suspended' && l.is_suspended) ||
      (view === 'no-offers' && Number(l.offerCount || 0) === 0)

    return matchesSearch && matchesView
  })

  const formatCurrency = (amount: any) => {
    if (!amount) return 'N/A'
    return `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const emptyTitle =
    view === 'suspended'
      ? 'No suspended listings found'
      : view === 'no-offers'
        ? 'No listings without offers found'
        : 'No listings found'

  const emptyDescription =
    view === 'suspended'
      ? 'Suspended marketplace postings will appear here.'
      : view === 'no-offers'
        ? 'Listings with zero guide offers will appear here.'
        : 'Try adjusting your search criteria.'

  return (
    <div className="w-full max-w-6xl mx-auto py-10 px-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-charcoal mb-1">Marketplace Postings</h1>
          <p className="text-secondary text-sm">View and moderate listings posted by travellers.</p>
        </div>
        <div className="w-full md:w-72">
          <Input placeholder="Search title, name, or city" value={search} onChange={(e: any) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button
          type="button"
          onClick={() => setListingView('all')}
          className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            view === 'all'
              ? 'bg-charcoal text-white'
              : 'bg-white text-secondary border border-border hover:text-charcoal'
          }`}
        >
          All listings
        </button>
        <button
          type="button"
          onClick={() => setListingView('suspended')}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            view === 'suspended'
              ? 'bg-red-600 text-white'
              : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
          }`}
        >
          Suspended listings
          <span className={`rounded-full px-2 py-0.5 text-xs ${
            view === 'suspended' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
          }`}>
            {suspendedCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setListingView('no-offers')}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            view === 'no-offers'
              ? 'bg-amberdark text-white'
              : 'bg-white text-amberdark border border-amber/30 hover:bg-amber/10'
          }`}
        >
          Listings with no offers
          <span className={`rounded-full px-2 py-0.5 text-xs ${
            view === 'no-offers' ? 'bg-white/20 text-white' : 'bg-amber/15 text-amberdark'
          }`}>
            {noOffersCount}
          </span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 bg-white rounded-3xl border border-border shadow-sm text-center">
          <p className="text-charcoal text-lg font-semibold">{emptyTitle}</p>
          <p className="text-secondary text-sm mt-1">{emptyDescription}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F7F7F8]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Itinerary</th>
                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Traveller</th>
                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Destination</th>
                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Budget</th>
                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Offers</th>
                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Posted On</th>
                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l: any) => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-charcoal max-w-[220px] truncate" title={l.itineraries?.title}>
                    {l.itineraries?.title || 'Untitled'}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">{l.traveller_profiles?.full_name || 'Unknown'}</td>
                  <td className="px-4 py-3">{l.destinations?.city || 'Unknown'}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(l.desired_budget)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex min-w-8 justify-center rounded-full bg-subtle px-2 py-1 text-xs font-bold text-secondary">
                      {Number(l.offerCount || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">{formatDate(l.created_at)}</td>
                  <td className="px-4 py-3">
                    {l.is_suspended ? (
                      <span className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700">
                        Suspended
                      </span>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        l.status === 'open' ? 'bg-green-100 text-green-700' :
                        l.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                        l.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {l.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!l.is_suspended && (
                        <Button variant="danger" className="bg-red-500 hover:bg-red-600 text-white font-semibold shadow-sm px-4 py-1 text-xs h-8" onClick={() => setClosing(l)}>
                          Suspend
                        </Button>
                      )}
                      {l.is_suspended && (
                        <Button variant="secondary" className="px-4 py-1 text-xs h-8" onClick={async () => {
                          setLoading(true)
                          try {
                            const res = await fetch(`/api/admin/marketplace/${l.id}/suspend`, {
                              method: 'PATCH', headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ is_suspended: false })
                            })
                            if (res.ok) {
                              setLocalListings(prev => prev.map(x => x.id === l.id ? { ...x, is_suspended: false } : x))
                            } else {
                              const errData = await res.json()
                              alert(`Failed: ${errData.error}`)
                            }
                          } catch (e) { console.error(e) } finally { setLoading(false) }
                        }}>Unsuspend</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {closing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-display font-bold text-red-600">Suspend Listing</h3>
            </div>
            <div className="p-6">
              <p className="text-charcoal mb-2">Are you sure you want to suspend this marketplace posting?</p>
              <p className="text-sm text-secondary">It will be hidden from the public marketplace.</p>
            </div>
            <div className="p-6 border-t border-border bg-[#F7F7F8] flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setClosing(null)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  setLoading(true)
                  try {
                    const res = await fetch(`/api/admin/marketplace/${closing.id}/suspend`, {
                      method: 'PATCH', headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ is_suspended: true })
                    })
                    if (res.ok) {
                      setLocalListings(prev => prev.map(x => x.id === closing.id ? { ...x, is_suspended: true } : x))
                      setClosing(null)
                    } else {
                      const errData = await res.json()
                      alert(`Failed: ${errData.error}`)
                    }
                  } catch (e) { console.error(e) } finally { setLoading(false) }
                }}
              >
                {loading ? 'Suspending...' : 'Yes, Suspend It'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
