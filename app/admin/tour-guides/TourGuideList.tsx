'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function TourGuideList({ guides }: { guides: any[] }) {
  const [search, setSearch] = useState('')

  const filteredGuides = guides.filter(guide => {
    const fullName = guide.full_name?.toLowerCase() || ''
    const city = guide.destinations?.city?.toLowerCase() || ''
    const query = search.toLowerCase()
    return fullName.includes(query) || city.includes(query)
  })

  return (
    <div className="w-full max-w-6xl mx-auto py-10 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-charcoal mb-1">Certified Tour Guides</h1>
          <p className="text-secondary text-sm font-body">Manage and view all approved tour guides on the platform.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href="/admin/tour-guides/requests" className="hidden sm:flex text-sm font-semibold font-body bg-black/5 hover:bg-black/10 transition-colors px-4 py-2.5 rounded-xl border border-black/5 items-center gap-2 text-charcoal whitespace-nowrap">
             <span className="w-2 h-2 rounded-full bg-amber animate-pulse"></span>
             Pending Requests
          </Link>
          <div className="relative flex-1 md:flex-none">
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full md:w-80 pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber bg-white shadow-sm"
            />
          </div>
        </div>
      </div>

      {filteredGuides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-border shadow-sm">
          <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-charcoal text-lg font-semibold font-body">No tour guides found</p>
          <p className="text-secondary text-sm mt-1">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuides.map(guide => (
            <div key={guide.id} className="bg-white rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow group">
               <div className="flex items-center gap-4 mb-5">
                 <div className="w-14 h-14 rounded-full bg-amber/10 flex items-center justify-center text-amber font-display font-bold text-2xl group-hover:scale-105 transition-transform">
                   {guide.full_name?.charAt(0) || '?'}
                 </div>
                 <div>
                   <h3 className="font-bold text-charcoal text-lg font-display leading-tight">{guide.full_name}</h3>
                   <p className="text-sm text-secondary font-body mt-0.5">
                     {guide.destinations?.city || 'Unknown City'}, {guide.destinations?.country}
                   </p>
                 </div>
               </div>
               
               <div className="border-t border-border pt-4 mt-2">
                 <div className="flex justify-between items-center text-sm font-body mb-2">
                   <span className="text-tertiary">Joined</span>
                   <span className="font-semibold text-charcoal">
                     {new Date(guide.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                   </span>
                 </div>
                 <div className="flex justify-between items-center text-sm font-body mt-3">
                   <span className="text-tertiary">Status</span>
                   <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 font-bold text-[11px] uppercase tracking-wider">
                     <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                     Certified
                   </span>
                 </div>
               </div>
               
               {guide.document_url && (
                 <div className="mt-4 pt-4 border-t border-border/50">
                    <a 
                      href={guide.document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-amber hover:text-amberdark flex items-center justify-center gap-1.5 py-2 w-full rounded-xl hover:bg-amber/5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      View Certification Documents
                    </a>
                 </div>
               )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
