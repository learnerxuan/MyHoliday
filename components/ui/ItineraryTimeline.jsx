import React from 'react';

export default function ItineraryTimeline({ listing, isEditable = false, onSuggestEdits = () => {}, isGuideEdited = false }) {
  const itineraryContent = listing?.itinerary_content || {};
  const travellerName = listing?.travellerName || listing?.traveller_name || "Traveller";

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {Object.entries(itineraryContent).map(([dayKey, activities], dayIndex) => (
          <div key={dayKey} className="bg-[#FAFAFA] border border-border/60 rounded-[24px] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="bg-charcoal px-6 py-3.5">
              <h4 className="text-white font-bold tracking-widest text-[14px]">DAY {dayIndex + 1}</h4>
            </div>
            <div className="p-6 flex flex-col gap-5">
              {Array.isArray(activities) && activities.map((activity, index) => {
                const isLast = index === activities.length - 1;
                const icon = activity.type === 'hotel' ? '🏨' : activity.type === 'attraction' ? '🎯' : activity.type === 'food_recommendation' ? '🍜' : activity.type === 'transport' ? '🚗' : '📍';
                
                return (
                  <div key={index} className="flex gap-5">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-8 h-8 rounded-full bg-white border border-border text-charcoal flex items-center justify-center text-[13px] font-bold shadow-sm">
                        {index + 1}
                      </div>
                      {!isLast && <div className="w-px h-full bg-border mt-2.5"></div>}
                    </div>
                    <div className={`flex-1 ${!isLast ? 'pb-5 border-b border-border/60' : ''}`}>
                      <div className="flex justify-between items-start mb-1.5">
                        <h5 className="font-extrabold text-charcoal text-[16px]">{activity.name || activity.title || 'Activity'}</h5>
                        {(activity.time || activity.duration) && (
                          <span className="text-[11px] font-black tracking-widest text-[#D48C44] bg-[#FFF9E5] border border-[#FDE68A] px-2.5 py-1 rounded-md">
                            {activity.time || activity.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] text-secondary/80 leading-relaxed mb-3.5">
                        {activity.notes || activity.description || 'No description provided.'}
                      </p>
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold tracking-widest uppercase bg-white border border-border px-2.5 py-1.5 rounded-lg text-secondary">
                          {icon} {activity.type || 'place'}
                        </span>
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
