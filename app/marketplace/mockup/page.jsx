import React from 'react';

export default function ViewAfterPostingMockup() {
  return (
    <div className="min-h-screen bg-warmwhite flex flex-col pt-6 sm:pt-10 px-4 sm:px-6 pb-20 font-body">
      
      {/* ── THE ISLAND CONTAINER ── */}
      <section className="max-w-7xl mx-auto w-full bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden flex flex-col">

        {/* Content Body */}
        <div className="px-4 sm:px-10 pt-8 sm:pt-12 pb-12 sm:pb-16 bg-white flex flex-col items-center">
          
          {/* Inner content wrapper aligned with header (max-w-[1000px] keeps it elegant) */}
          <div className="w-full max-w-[1100px]">
            
            {/* Top Navigation */}
            <div className="mb-8">
              <button className="text-[12px] font-bold text-secondary uppercase tracking-widest hover:text-charcoal transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                BACK TO MARKETPLACE
              </button>
            </div>

            {/* Success Banner */}
            <div className="bg-[#EDFDF3] border border-[#BCE7D0] rounded-2xl p-5 sm:p-6 mb-8 flex items-start gap-4 shadow-sm">
              <div className="text-3xl mt-1">🎉</div>
              <div>
                <h3 className="text-[#036A38] font-bold text-lg mb-1 tracking-tight">Success! Your itinerary is live on the marketplace.</h3>
                <p className="text-[#13844D] text-[14px] leading-relaxed">
                  Verified local tour guides in Kuala Lumpur, Malaysia have been notified about your trip. You will receive competitive offers shortly.
                </p>
              </div>
            </div>

            {/* Listing Status Header */}
            <div className="bg-[#0f0f0f] relative overflow-hidden rounded-[20px] p-6 sm:p-7 mb-8 flex items-center justify-between shadow-lg w-full">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <h2 className="text-white font-display font-extrabold text-2xl sm:text-[26px] relative z-10 tracking-wide">Listing Status</h2>
              <div className="relative z-10 px-4 py-1.5 rounded-lg border border-[#D48C44]/40 bg-[#D48C44]/10 text-[#D48C44] text-[12px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(212,140,68,0.15)]">
                AWAITING OFFERS
              </div>
            </div>

            {/* Listing Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 mb-12">
              
              {/* Left Card: Details */}
              <div className="bg-white border border-border/80 rounded-[24px] p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-[#F0EBE3] px-3.5 py-1.5 text-[#7A7367] text-[11px] font-extrabold tracking-widest rounded-lg uppercase">
                      KUALA LUMPUR, MY
                    </div>
                    <div className="text-right">
                      <p className="text-[#888] text-[10px] font-bold tracking-widest uppercase mb-1">TARGET BUDGET</p>
                      <p className="text-[#D48C44] text-2xl font-display font-extrabold">RM 3,500</p>
                    </div>
                  </div>

                  <h1 className="text-[28px] sm:text-[34px] font-display font-extrabold text-charcoal leading-tight mb-5 pr-4 sm:pr-10">
                    Urban Exploration & Food Tour
                  </h1>

                  <div className="flex items-center gap-4 text-secondary text-sm font-medium mb-10">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      14 - 18 Oct 2024
                    </div>
                    <div className="w-1 h-1 rounded-full bg-border"></div>
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      Couple
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-6">
                  <span className="px-4 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-xl tracking-wide">Culture</span>
                  <span className="px-4 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-xl tracking-wide">Food</span>
                  <span className="px-4 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-xl tracking-wide">Walking</span>
                </div>
              </div>

              {/* Right Card: Status Action */}
              <div className="bg-[#FAFAFA] border border-border/80 rounded-[24px] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] relative overflow-hidden">
                <div className="w-[72px] h-[72px] bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-border/40 flex items-center justify-center text-3xl mb-6">
                  ⏳
                </div>
                
                <h2 className="text-[24px] font-display font-extrabold text-charcoal mb-4">
                  Waiting for Offers
                </h2>
                
                <p className="text-secondary/80 text-[13px] leading-relaxed max-w-[240px] mb-8">
                  Tour guides are reviewing your itinerary. Sit tight, you'll be notified via email when an offer arrives.
                </p>

                <button className="w-full sm:w-[85%] py-3.5 bg-white border border-border text-charcoal font-bold text-[14px] rounded-xl hover:bg-red-50 hover:text-error hover:border-red-200 transition-colors shadow-sm">
                  Cancel Request
                </button>
              </div>
            </div>

            {/* POLISHED ITINERARY VIEW */}
            <div className="mt-16">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[26px] font-display font-extrabold text-charcoal">Finalized Itinerary Plan</h3>
                <div className="text-[13px] font-extrabold text-secondary tracking-widest uppercase border border-border px-4 py-2 rounded-lg bg-white shadow-sm">
                  2 Days Total
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Day 1 */}
                <div className="bg-[#FAFAFA] border border-border/60 rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                  <div className="bg-charcoal px-7 py-5 flex justify-between items-center">
                    <h4 className="text-white font-bold tracking-widest text-[15px]">DAY 1</h4>
                    <span className="text-white/70 text-[11px] font-bold uppercase tracking-widest">Arrival & City Center</span>
                  </div>
                  <div className="p-7 flex flex-col gap-6">
                    {/* Activity 1 */}
                    <div className="flex gap-5">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-9 h-9 rounded-full bg-white border border-border text-charcoal flex items-center justify-center text-sm font-bold shadow-sm">1</div>
                        <div className="w-px h-full bg-border mt-3"></div>
                      </div>
                      <div className="flex-1 pb-5 border-b border-border/60">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-extrabold text-charcoal text-[16px]">Check-in at Mandarin Oriental</h5>
                          <span className="text-[11px] font-black tracking-widest text-[#D48C44] bg-[#FFF9E5] border border-[#FDE68A] px-2.5 py-1 rounded-md">14:00 PM</span>
                        </div>
                        <p className="text-[14px] text-secondary/80 leading-relaxed mb-4">Settle into the hotel and freshen up after the flight. Located right next to KLCC.</p>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold tracking-widest uppercase bg-white border border-border px-2.5 py-1.5 rounded-lg text-secondary">🏨 Hotel</span>
                        </div>
                      </div>
                    </div>

                    {/* Activity 2 */}
                    <div className="flex gap-5">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-9 h-9 rounded-full bg-white border border-border text-charcoal flex items-center justify-center text-sm font-bold shadow-sm">2</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-extrabold text-charcoal text-[16px]">Petronas Twin Towers Tour</h5>
                          <span className="text-[11px] font-black tracking-widest text-[#D48C44] bg-[#FFF9E5] border border-[#FDE68A] px-2.5 py-1 rounded-md">16:30 PM</span>
                        </div>
                        <p className="text-[14px] text-secondary/80 leading-relaxed mb-4">Walk the skybridge and go up to the observation deck for a stunning sunset view over the city.</p>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold tracking-widest uppercase bg-white border border-border px-2.5 py-1.5 rounded-lg text-secondary">🎯 Attraction</span>
                          <span className="text-[10px] font-bold tracking-widest uppercase bg-[#EDFDF3] border border-[#BCE7D0] px-2.5 py-1.5 rounded-lg text-[#036A38]">RM 120 Est.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Day 2 */}
                <div className="bg-[#FAFAFA] border border-border/60 rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                  <div className="bg-charcoal px-7 py-5 flex justify-between items-center">
                    <h4 className="text-white font-bold tracking-widest text-[15px]">DAY 2</h4>
                    <span className="text-white/70 text-[11px] font-bold uppercase tracking-widest">Culture & Heritage</span>
                  </div>
                  <div className="p-7 flex flex-col gap-6">
                    {/* Activity 1 */}
                    <div className="flex gap-5">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-9 h-9 rounded-full bg-white border border-border text-charcoal flex items-center justify-center text-sm font-bold shadow-sm">1</div>
                        <div className="w-px h-full bg-border mt-3"></div>
                      </div>
                      <div className="flex-1 pb-5 border-b border-border/60">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-extrabold text-charcoal text-[16px]">Batu Caves Expedition</h5>
                          <span className="text-[11px] font-black tracking-widest text-[#D48C44] bg-[#FFF9E5] border border-[#FDE68A] px-2.5 py-1 rounded-md">09:00 AM</span>
                        </div>
                        <p className="text-[14px] text-secondary/80 leading-relaxed mb-4">Climb the 272 vibrant steps to the ancient limestone cave temple. Watch out for the monkeys!</p>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold tracking-widest uppercase bg-white border border-border px-2.5 py-1.5 rounded-lg text-secondary">🎯 Attraction</span>
                        </div>
                      </div>
                    </div>

                    {/* Activity 2 */}
                    <div className="flex gap-5">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-9 h-9 rounded-full bg-white border border-border text-charcoal flex items-center justify-center text-sm font-bold shadow-sm">2</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-extrabold text-charcoal text-[16px]">Chinatown Street Food</h5>
                          <span className="text-[11px] font-black tracking-widest text-[#D48C44] bg-[#FFF9E5] border border-[#FDE68A] px-2.5 py-1 rounded-md">13:30 PM</span>
                        </div>
                        <p className="text-[14px] text-secondary/80 leading-relaxed mb-4">Explore Petaling Street and try local delicacies like Hokkien Mee, roasted duck, and sweet apam balik.</p>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold tracking-widest uppercase bg-white border border-border px-2.5 py-1.5 rounded-lg text-secondary">🍜 Food</span>
                          <span className="text-[10px] font-bold tracking-widest uppercase bg-[#EDFDF3] border border-[#BCE7D0] px-2.5 py-1.5 rounded-lg text-[#036A38]">RM 50 Est.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="mt-16 flex justify-center border-t border-border/50 pt-10">
              <button className="px-8 py-3.5 bg-white border border-border text-charcoal font-bold text-[14px] rounded-xl hover:bg-[#FDFBF7] hover:border-amber/40 transition-colors flex items-center gap-2 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Return to Marketplace
              </button>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
