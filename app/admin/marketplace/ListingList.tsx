"use client"

import { useState, Fragment } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function ListingList({ listings }: { listings: any[] }) {
  const [search, setSearch] = useState('')
  const [closing, setClosing] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [localListings, setLocalListings] = useState<any[]>(listings || [])
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())

  const filtered = localListings.filter(l => {
    const title = (l.itineraries?.title || '').toLowerCase()
    const name = (l.traveller_profiles?.full_name || '').toLowerCase()
    const dest = (l.destinations?.city || '').toLowerCase()
    const q = search.toLowerCase()
    return title.includes(q) || name.includes(q) || dest.includes(q)
  })

  const groupedUsers = filtered.reduce((acc: any, l: any) => {
    const userId = l.user_id || 'unknown'
    if (!acc[userId]) {
      acc[userId] = {
        userId,
        name: l.traveller_profiles?.full_name || 'Anonymous',
        listings: []
      }
    }
    acc[userId].listings.push(l)
    return acc
  }, {})
  const groupedArray = Object.values(groupedUsers)

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const formatCurrency = (amount: any) => {
    if (!amount) return 'N/A'
    return `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-10 px-6">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-charcoal mb-1">Marketplace Postings</h1>
          <p className="text-secondary text-sm">View and moderate listings posted by travellers.</p>
        </div>
        <div className="w-72">
          <Input placeholder="Search title, name, or city" value={search} onChange={(e: any) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 bg-white rounded-3xl border border-border shadow-sm text-center">
          <p className="text-charcoal text-lg font-semibold">No listings found</p>
          <p className="text-secondary text-sm mt-1">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F7F7F8]">
              <tr>
                <th className="px-4 py-3">Traveller</th>
                <th className="px-4 py-3">Total Posts</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groupedArray.map((group: any) => (
                <Fragment key={group.userId}>
                  <tr 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpand(group.userId)}
                  >
                    <td className="px-4 py-4 font-semibold text-charcoal">{group.name}</td>
                    <td className="px-4 py-4 text-secondary">{group.listings.length} Posts</td>
                    <td className="px-4 py-4 text-right">
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expandedUsers.has(group.userId) ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </td>
                  </tr>
                  {expandedUsers.has(group.userId) && (
                    <tr className="bg-gray-50/30">
                      <td colSpan={3} className="p-0 border-t border-border">
                        <div className="p-4 sm:p-6 bg-[#FDFCFB] shadow-inner">
                          <table className="w-full text-left bg-white border border-border rounded-xl shadow-sm overflow-hidden">
                            <thead className="bg-[#F7F7F8] border-b border-border">
                              <tr>
                                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Itinerary</th>
                                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Destination</th>
                                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Budget</th>
                                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Posted On</th>
                                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {group.listings.map((l: any) => (
                                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 font-medium text-charcoal max-w-[200px] truncate" title={l.itineraries?.title}>{l.itineraries?.title || 'Untitled'}</td>
                                  <td className="px-4 py-3">{l.destinations?.city || 'Unknown'}</td>
                                  <td className="px-4 py-3 font-semibold">{formatCurrency(l.desired_budget)}</td>
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
                                      {l.itinerary_id && (
                                        <a 
                                          href={`/saved-itinerary/${l.itinerary_id}?admin=true`} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center px-4 py-1 text-xs h-8 font-semibold rounded-lg bg-[#C4874A] hover:bg-[#8B6A3E] text-white shadow-sm transition-colors"
                                        >
                                          View Plan
                                        </a>
                                      )}
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
                      </td>
                    </tr>
                  )}
                </Fragment>
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
