export default function StatusBadge({ status }) {
  const normalized = status?.toLowerCase() || 'unknown'
  
  switch(normalized) {
    case 'open':
    case 'pending': 
    case 'awaiting':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200 capitalize tracking-wide font-body">{normalized}</span>
    case 'has_offers':
    case 'negotiating':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 capitalize tracking-wide font-body">{normalized.replace('_', ' ')}</span>
    case 'accepted':
    case 'confirmed': 
    case 'approved':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 capitalize tracking-wide font-body">{normalized}</span>
    case 'rejected':
    case 'withdrawn':
    case 'closed':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 capitalize tracking-wide font-body">{normalized}</span>
    default: 
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 capitalize tracking-wide font-body">{normalized}</span>
  }
}
