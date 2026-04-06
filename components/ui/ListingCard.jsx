export default function ListingCard({ city, desiredBudget, displayStatus }) {
  const getStatusBadge = (status) => {
    switch(status) {
      case 'awaiting': 
        return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full border border-yellow-200">Awaiting Guide</span>
      case 'has_offers': 
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-200">Offers Available</span>
      case 'confirmed': 
        return <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">Confirmed</span>
      default: 
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full border border-gray-200 capitalize">{status}</span>
    }
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col gap-4">
      <div className="flex justify-between items-start gap-4">
        <h3 className="font-display font-bold text-xl text-charcoal leading-tight">{city}</h3>
        {getStatusBadge(displayStatus)}
      </div>
      
      <div className="bg-subtle/50 p-3 rounded-xl border border-border/50">
        <p className="text-xs text-secondary font-semibold uppercase tracking-wider mb-0.5">Budget</p>
        <p className="font-display font-bold text-amber">MYR {parseFloat(desiredBudget).toFixed(2)}</p>
      </div>
    </div>
  )
}
