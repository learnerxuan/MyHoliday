export default function ListingCard({
  city,
  country = 'Destination',
  budget,
  days = 3,
  pax = 2,
  tags = ['Culture', 'Budget'],
  displayStatus,
  guideInfo = null
}) {
  return (
    <div className="bg-white p-6 rounded-[20px] border border-border shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer group">
      
      {/* Top Header Row */}
      <div className="flex justify-between items-start gap-4 mb-2">
        <div className="flex-1">
          <h3 className="font-display font-bold text-[22px] text-charcoal leading-tight mb-1 truncate">{city}, {country}</h3>
          <p className="text-secondary text-sm font-medium tracking-wide">{days} days · {pax} pax</p>
        </div>
        <div className="text-right whitespace-nowrap">
          <p className="font-display font-bold text-2xl text-[#d48c44]">RM {Number(budget).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-[11px] text-[#d48c44]/70 font-semibold tracking-wider relative -top-1">desired budget</p>
        </div>
      </div>

      {/* Middle Tags Row */}
      <div className="flex flex-wrap items-center gap-2 mt-2 mb-8 flex-grow">
        {Array.isArray(tags) && tags.map(tag => (
          <span key={tag} className="px-3 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-lg tracking-wide">
            {tag}
          </span>
        ))}
        {displayStatus === 'has_offers' && <span className="px-3 py-1.5 bg-[#FFF9E5] border border-[#FDE68A] text-[#D48C44] text-xs font-bold rounded-lg tracking-wide">Offers Received</span>}
        {displayStatus === 'awaiting' && <span className="px-3 py-1.5 bg-[#F3F4F6] border border-[#E5E7EB] text-[#9CA3AF] text-xs font-bold rounded-lg tracking-wide">Awaiting Offers</span>}
        {displayStatus === 'negotiating' && <span className="px-3 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-xs font-bold rounded-lg tracking-wide">Negotiating</span>}
        {displayStatus === 'confirmed' && <span className="px-3 py-1.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-xs font-bold rounded-lg tracking-wide">Booking Confirmed</span>}
      </div>

      {/* Footer Separator */}
      <div className="h-px w-full bg-[#F3F4F6] mb-5" />

      {/* Footer Row */}
      <div className="min-h-[48px] flex items-center">
        {guideInfo ? (
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
            <p className="font-bold text-[#d48c44] text-xs tracking-wide">Offer received</p>
          </div>
        ) : (
          <p className="text-[13px] text-secondary/50 font-medium w-full text-left">Awaiting guide offers...</p>
        )}
      </div>
    </div>
  )
}
