'use client'

import { useState } from 'react'
import { acceptGuide, declineGuide } from './actions'

export default function PendingRequestsList({ requests }: { requests: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<string | null>(null)

  async function handleAccept(id: string) {
    setLoadingId(id)
    setActionType('accept')
    try {
      await acceptGuide(id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
      setActionType(null)
    }
  }

  async function handleDecline(id: string) {
    setLoadingId(id)
    setActionType('decline')
    try {
      await declineGuide(id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
      setActionType(null)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-border shadow-sm">
        <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-charcoal text-lg font-semibold font-body">All caught up!</p>
        <p className="text-secondary text-sm mt-1 font-body">There are no pending applications at the moment.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {requests.map(req => (
        <div key={req.id} className="bg-white rounded-3xl border border-border p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-4 mb-5">
             <div className="w-14 h-14 rounded-full bg-charcoal flex items-center justify-center text-white font-display font-bold text-2xl">
               {req.full_name?.charAt(0) || '?'}
             </div>
             <div>
               <h3 className="font-bold text-charcoal text-lg font-display leading-tight">{req.full_name}</h3>
               <p className="text-sm text-secondary font-body mt-0.5">
                 {req.destinations?.city || 'Unknown City'}, {req.destinations?.country}
               </p>
             </div>
          </div>
          
          <div className="flex-1 bg-black/5 rounded-2xl p-5 mb-6 border border-black/5">
             <p className="text-[10px] font-bold text-tertiary font-body uppercase tracking-widest mb-3">Submitted Document</p>
             {req.document_url ? (
               <a 
                 href={req.document_url} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex items-center gap-2 text-sm font-semibold font-body text-blue-600 hover:text-blue-800 transition-colors"
               >
                 <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                 </svg>
                 <span className="truncate hover:underline">View Uploaded License/ID</span>
               </a>
             ) : (
               <p className="text-sm font-body text-secondary italic">No document uploaded.</p>
             )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-auto">
             <button 
               onClick={() => handleDecline(req.id)}
               disabled={loadingId === req.id}
               className="py-3 px-4 rounded-xl border-2 border-transparent hover:border-red-200 text-charcoal hover:bg-red-50 hover:text-red-700 transition-colors font-bold font-body text-sm disabled:opacity-50 text-center"
             >
               {loadingId === req.id && actionType === 'decline' ? 'Declining...' : 'Decline'}
             </button>
             <button 
               onClick={() => handleAccept(req.id)}
               disabled={loadingId === req.id}
               className="py-3 px-4 rounded-xl bg-charcoal text-warmwhite hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-bold font-body text-sm disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none text-center"
             >
               {loadingId === req.id && actionType === 'accept' ? 'Approving...' : 'Accept'}
             </button>
          </div>
        </div>
      ))}
    </div>
  )
}
