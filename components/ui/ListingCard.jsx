import { Trash2 } from 'lucide-react'

const getBudgetStyle = (budget) => {
  if (!budget) return 'bg-white text-secondary border-border/50'
  const b = String(budget).toLowerCase()
  if (b.includes('economy') || b.includes('budget')) return 'bg-success-bg text-success border-success/10'
  if (b.includes('mid-range') || b.includes('balanced') || b.includes('midrange')) return 'bg-warning-bg text-warning border-warning/10'
  if (b.includes('luxury')) return 'bg-muted text-amberdark border-amberdark/10'
  return 'bg-white text-secondary border-border/50'
}

export default function ListingCard({
  title,
  city,
  country = 'Destination',
  budget,
  dates,
  days = 3,
  pax = 2,
  tags = [],
  budgetType,
  displayStatus,
  guideInfo = null,
  offerCount = 0,
  onDelete
}) {
  return (
    <div className="bg-white p-5 rounded-[20px] border border-border shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer group relative">
      
      {/* Top Header Row */}
      <div className="flex justify-between items-start gap-4 mb-2">
        <div className="flex-1">
          <h3 className="font-display font-bold text-[22px] text-charcoal leading-tight mb-1 truncate">{title || `${city}, ${country}`}</h3>
          {title && <p className="text-[12px] text-secondary/70 font-bold uppercase tracking-widest mb-1">{city}, {country}</p>}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="flex items-center px-2 rounded border border-border/40 bg-[#F0EBE3] text-secondary text-[10px] font-bold uppercase leading-none h-[22px] whitespace-nowrap shrink-0">
              <span className="pt-[1px]">{dates || `${days} days`}</span>
            </span>
            <span className="flex items-center px-2 rounded border border-border/40 bg-[#F0EBE3] text-secondary text-[10px] font-bold uppercase leading-none h-[22px] whitespace-nowrap shrink-0">
              <span className="pt-[1px]">{pax}</span>
            </span>
            {budgetType && (
              <span className={`flex items-center px-2 rounded border text-[10px] font-bold uppercase leading-none h-[22px] whitespace-nowrap shrink-0 ${getBudgetStyle(budgetType)}`}>
                <span className="pt-[1px]">{budgetType}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right whitespace-nowrap">
            <p className="font-display font-bold text-2xl text-[#d48c44]">RM {Number(budget).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <p className="text-[11px] text-[#d48c44]/70 font-semibold tracking-wider relative -top-1">
              {displayStatus === 'accepted' || displayStatus === 'confirmed' ? 'offer price' : 'desired budget'}
            </p>
          </div>
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-secondary/50 hover:text-error hover:bg-red-50 p-1.5 rounded-lg transition-colors"
              title="Withdraw Listing"
            >
              <Trash2 className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
      </div>

      {/* Middle Tags Row */}
      <div className="flex flex-wrap items-center gap-2 mt-2 mb-4 flex-grow">
        {Array.isArray(tags) && tags.map(tag => (
          <span key={tag} className="flex items-center px-2 rounded border border-[#EAE6DF] bg-[#FDFBF7] text-[#7A7367] text-[10px] font-bold uppercase leading-none h-[22px] whitespace-nowrap shrink-0">
            {tag}
          </span>
        ))}
        {displayStatus === 'suspended' && <span className="px-3 py-1.5 bg-red-50 border border-red-200 text-error text-xs font-bold rounded-lg tracking-wide">Suspended</span>}
        {displayStatus === 'has_offers' && <span className="px-3 py-1.5 bg-[#FFF9E5] border border-[#FDE68A] text-[#D48C44] text-xs font-bold rounded-lg tracking-wide">Offers Received</span>}
        {displayStatus === 'awaiting' && <span className="px-3 py-1.5 bg-[#F3F4F6] border border-[#E5E7EB] text-[#9CA3AF] text-xs font-bold rounded-lg tracking-wide">Awaiting Offers</span>}
        {displayStatus === 'negotiating' && <span className="px-3 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-xs font-bold rounded-lg tracking-wide">Negotiating</span>}
        {displayStatus === 'accepted' && <span className="px-3 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-xs font-bold rounded-lg tracking-wide">Offer Accepted</span>}
        {displayStatus === 'confirmed' && <span className="px-3 py-1.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-xs font-bold rounded-lg tracking-wide">Booking Confirmed</span>}
      </div>

      {/* Footer Separator */}
      <div className="h-px w-full bg-[#F3F4F6] mb-3" />

      {/* Footer Row */}
      <div className="min-h-[38px] flex items-center">
        {displayStatus === 'suspended' ? (
          <p className="text-[13px] text-error font-medium w-full text-left">This listing is suspended.</p>
        ) : ((displayStatus === 'confirmed' || displayStatus === 'accepted') && guideInfo) || (guideInfo && ['Accepted', 'Confirmed'].includes(guideInfo.status)) ? (
           <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#B48F60] border-2 border-[#E7DCCA] text-white flex items-center justify-center font-bold shadow-sm">
                {guideInfo.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <p className="font-bold text-sm text-charcoal">{guideInfo.name}</p>
                <p className="text-[11px] font-medium text-secondary/80">Certified Â· {guideInfo.location || city}</p>
              </div>
            </div>
            <p className={`font-bold ${displayStatus === 'confirmed' ? 'text-[#059669]' : 'text-[#2563EB]'} text-xs tracking-wide`}>
              {displayStatus === 'confirmed' ? 'Confirmed' : 'Accepted'}
            </p>
          </div>
        ) : offerCount > 0 ? (
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="font-bold text-[13px] text-charcoal">{offerCount} {offerCount === 1 ? 'offer' : 'offers'} received</p>
              <p className="text-[10.5px] font-medium text-secondary/80">Review all guide proposals</p>
            </div>
            <p className="font-bold text-[#d48c44] text-xs tracking-wide">View offers</p>
          </div>
        ) : guideInfo ? (
           <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#B48F60] border-2 border-[#E7DCCA] text-white flex items-center justify-center font-bold shadow-sm">
                {guideInfo.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <p className="font-bold text-sm text-charcoal">{guideInfo.name}</p>
                <p className="text-[11px] font-medium text-secondary/80">Certified · {guideInfo.location || city}</p>
              </div>
            </div>
            <p className={`font-bold ${guideInfo.status === 'Accepted' ? 'text-[#059669]' : 'text-[#d48c44]'} text-xs tracking-wide`}>{guideInfo.status || 'Offer received'}</p>
          </div>
        ) : (
          <p className="text-[13px] text-secondary/50 font-medium w-full text-left">Awaiting guide offers...</p>
        )}
      </div>
    </div>
  )
}
