import React from 'react';

export default function ItineraryTimeline({ listing, isEditable = false, onSuggestEdits = () => {} }) {
  const itineraryContent = listing?.itinerary_content || {};
  const travellerName = listing?.travellerName || listing?.traveller_name || "Traveller";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[26px] font-display font-extrabold text-charcoal">
          {listing?.travellerName ? `${travellerName}'s Itinerary Plan` : "Finalized Itinerary Plan"}
        </h3>
        <div className="flex items-center gap-3">
          {isEditable && (
             <button 
               onClick={onSuggestEdits}
               className="text-[13px] font-extrabold text-white tracking-widest uppercase border border-amber px-4 py-2 rounded-lg bg-amber hover:bg-[#E08A1E] transition-colors shadow-sm"
             >
               Suggest Edits (Coming Soon)
             </button>
          )}
          <div className="text-[13px] font-extrabold text-secondary tracking-widest uppercase border border-border px-4 py-2 rounded-lg bg-white shadow-sm">
            {Object.keys(itineraryContent).length} Days Total
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {Object.entries(itineraryContent).map(([dayKey, activities], dayIndex) => (
          <div key={dayKey} className="bg-[#FAFAFA] border border-border/60 rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="bg-charcoal px-7 py-5 flex justify-between items-center">
              <h4 className="text-white font-bold tracking-widest text-[15px]">DAY {dayIndex + 1}</h4>
              <span className="text-white/70 text-[11px] font-bold uppercase tracking-widest">
                {Array.isArray(activities) && activities[0]?.name ? (activities[0].name.length > 25 ? activities[0].name.slice(0, 25) + '...' : activities[0].name) : 'Activities'}
              </span>
            </div>
            <div className="p-7 flex flex-col gap-6">
              {Array.isArray(activities) && activities.map((activity, index) => {
                const isLast = index === activities.length - 1;
                const icon = activity.type === 'hotel' ? '🏨' : activity.type === 'attraction' ? '🎯' : activity.type === 'food_recommendation' ? '🍜' : activity.type === 'transport' ? '🚗' : '📍';
                
                return (
                  <div key={index} className="flex gap-5">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-9 h-9 rounded-full bg-white border border-border text-charcoal flex items-center justify-center text-sm font-bold shadow-sm">
                        {index + 1}
                      </div>
                      {!isLast && <div className="w-px h-full bg-border mt-3"></div>}
                    </div>
                    <div className={`flex-1 ${!isLast ? 'pb-5 border-b border-border/60' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-extrabold text-charcoal text-[16px]">{activity.name || activity.title || 'Activity'}</h5>
                        {(activity.time || activity.duration) && (
                          <span className="text-[11px] font-black tracking-widest text-[#D48C44] bg-[#FFF9E5] border border-[#FDE68A] px-2.5 py-1 rounded-md">
                            {activity.time || activity.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] text-secondary/80 leading-relaxed mb-4">
                        {activity.notes || activity.description || 'No description provided.'}
                      </p>
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold tracking-widest uppercase bg-white border border-border px-2.5 py-1.5 rounded-lg text-secondary">
                          {icon} {activity.type || 'place'}
                        </span>
                        {(activity.price_estimate || activity.cost) && (
                          <span className="text-[10px] font-bold tracking-widest uppercase bg-[#EDFDF3] border border-[#BCE7D0] px-2.5 py-1.5 rounded-lg text-[#036A38]">
                            {activity.price_estimate || `RM ${activity.cost}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
