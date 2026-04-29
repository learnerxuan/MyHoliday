"use client"

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function UserList({ profiles }: { profiles: any[] }) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const [deactivating, setDeactivating] = useState<any | null>(null)
  // itineraries removed for table view
  const [loading, setLoading] = useState(false)
  const [localProfiles, setLocalProfiles] = useState<any[]>(profiles || [])

  const filtered = localProfiles.filter(p => {
    const name = (p.full_name || '').toLowerCase()
    const nat = (p.nationality || '').toLowerCase()
    const q = search.toLowerCase()
    return name.includes(q) || nat.includes(q)
  })

  // itineraries removed — table view keeps UI focused on profiles

  async function saveEdit(e: any) {
    e.preventDefault()
    if (!editing) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/travellers/${editing.id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(editing),
      })
      if (res.ok) {
        const json = await res.json()
        const updated = json.profile
        if (updated) setLocalProfiles(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
        setEditing(null)
      }
      else console.error('Failed to save')
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-10 px-6">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-charcoal mb-1">Travellers</h1>
          <p className="text-secondary text-sm">Search and manage traveller profiles.</p>
        </div>
        <div className="w-72">
          <Input placeholder="Search by name or nationality" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 bg-white rounded-3xl border border-border shadow-sm text-center">
          <p className="text-charcoal text-lg font-semibold">No travellers found</p>
          <p className="text-secondary text-sm mt-1">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F7F7F8]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Nationality</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => {
                const profileId = p.id ?? p.user_id ?? null
                return (
                <tr key={profileId ?? `row-${idx}`} className="border-t">
                  <td className="px-4 py-3">{p.full_name || '—'}</td>
                  <td className="px-4 py-3">{p.nationality || '—'}</td>
                  <td className="px-4 py-3">{p.preferred_language || '—'}</td>
                  <td className="px-4 py-3">{p.is_active === false ? 'Inactive' : 'Active'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                          <Button onClick={() => setEditing(p)}>Edit</Button>
                      {p.is_active === false ? (
                        <Button variant="secondary" onClick={async () => {
                          console.log('Reactivate clicked', { profileId, profile: p })
                          setLoading(true)
                            try {
                            if (!profileId || profileId === 'undefined' || profileId === 'null') {
                              console.error('missing profile id, aborting')
                              setLoading(false)
                              return
                            }
                            const res = await fetch(`/api/admin/travellers/${profileId}`, {
                              method: 'PATCH', headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ is_active: true })
                            })
                            if (res.ok) {
                              const json = await res.json()
                              const updated = json.profile || { id: profileId, is_active: true }
                              setLocalProfiles(prev => prev.map(x => (x.id === updated.id || x.user_id === updated.user_id || (x.id || x.user_id) === profileId) ? { ...x, ...updated } : x))
                            } else {
                              const txt = await res.text()
                              console.error('Reactivate failed', res.status, txt)
                            }
                          } catch (e) { console.error(e) } finally { setLoading(false) }
                        }}>Reactivate</Button>
                      ) : (
                        <Button variant="danger" className="bg-red-500 hover:bg-red-600 text-white font-semibold shadow-sm px-4" onClick={() => setDeactivating(p)}>
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <form onSubmit={saveEdit} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-display font-bold text-charcoal">Edit Profile</h3>
              <p className="text-sm text-secondary mt-1">Update details for {editing.full_name || editing.id}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Full Name</label>
                <Input value={editing.full_name || ''} onChange={(e) => setEditing({...editing, full_name: e.target.value})} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Nationality</label>
                <Input value={editing.nationality || ''} onChange={(e) => setEditing({...editing, nationality: e.target.value})} placeholder="Nationality" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Preferred Language</label>
                <Input value={editing.preferred_language || ''} onChange={(e) => setEditing({...editing, preferred_language: e.target.value})} placeholder="Language" />
              </div>
            </div>
            <div className="p-6 border-t border-border bg-[#F7F7F8] flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {deactivating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-display font-bold text-red-600">Deactivate User</h3>
            </div>
            <div className="p-6">
              <p className="text-charcoal mb-2">Are you sure you want to deactivate <strong>{deactivating.full_name || 'this user'}</strong>?</p>
              <p className="text-sm text-secondary">This user will lose access to their account until reactivated.</p>
            </div>
            <div className="p-6 border-t border-border bg-[#F7F7F8] flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setDeactivating(null)}>Cancel</Button>
              <Button 
                variant="danger" 
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  setLoading(true)
                  try {
                    const profileId = deactivating.id ?? deactivating.user_id ?? null
                    if (!profileId || profileId === 'undefined' || profileId === 'null') {
                      console.error('missing profile id, aborting')
                      setLoading(false)
                      return
                    }
                    const res = await fetch(`/api/admin/travellers/${profileId}`, {
                      method: 'PATCH', headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ is_active: false })
                    })
                    if (res.ok) {
                      const json = await res.json()
                      const updated = json.profile || { id: profileId, is_active: false }
                      setLocalProfiles(prev => prev.map(x => (x.id === updated.id || x.user_id === updated.user_id || (x.id || x.user_id) === profileId) ? { ...x, ...updated } : x))
                      setDeactivating(null)
                    } else {
                      const txt = await res.text()
                      console.error('Deactivate failed', res.status, txt)
                    }
                  } catch (e) { console.error(e) } finally { setLoading(false) }
                }}
              >
                {loading ? 'Deactivating...' : 'Yes, Deactivate'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
