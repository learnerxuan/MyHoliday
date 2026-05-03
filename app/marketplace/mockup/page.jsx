import React from 'react';
import { Trash2 } from 'lucide-react';

export default function MarketplaceMockup() {
  return (
    <div className="min-h-screen bg-warmwhite flex flex-col -mt-7 md:-mt-6 p-4 sm:p-6 pb-20 font-body">
      
      {/* ── THE ISLAND CONTAINER ── */}
      <section className="max-w-7xl mx-auto w-full bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden flex flex-col">

        {/* Page header (Dark Hero inside Island) */}
        <div 
          className="text-warmwhite relative overflow-hidden pt-8 sm:pt-10 px-4 sm:px-10 pb-8 sm:pb-10"
          style={{ background: '#0f0f0f' }}
        >
          {/* Ambient amber glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(196,135,74,0.22) 0%, transparent 70%),' +
                'radial-gradient(ellipse 40% 40% at 20% 80%, rgba(196,135,74,0.10) 0%, transparent 65%)',
            }}
          />
          {/* Subtle dot grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/10 text-amber text-xs font-semibold px-3 py-1 rounded-full border border-amber/20 mb-3 uppercase tracking-widest">
                Marketplace
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold font-display mb-4 text-warmwhite leading-tight">
                Find a Tour Guide
              </h1>
              <p className="text-sm sm:text-[15px] font-body text-warmwhite/80 leading-relaxed max-w-lg mb-8">
                Post your saved itinerary. Verified local guides browse and send their best offer. Negotiate and confirm your booking.
              </p>
              
              <button className="bg-amber hover:bg-amberdark text-white text-[15px] px-8 py-3.5 rounded-[10px] transition-colors font-bold tracking-wide shadow-lg shadow-black/10">
                Post My Itinerary
              </button>
            </div>

            {/* Right Info Grid -> Adapting the 4 tiles to the dark header theme */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 md:mt-0 max-w-sm w-full">
              {[
                ["📋", "Post itinerary as listing"], 
                ["💬", "Guides send price offers"], 
                ["🤝", "Negotiate via chat"], 
                ["🟩", "Confirm and book"]
              ].map(([icon, label]) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                  <div className="text-[22px] sm:text-[26px] mb-2 sm:mb-3">{icon}</div>
                  <div className="text-[12px] sm:text-[13px] text-warmwhite/90 font-medium leading-snug">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-12 sm:pb-16 bg-[#FAFAFA]">
          
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide pb-1">
              {['All Listings', 'Open', 'Has Offers', 'My Listings'].map((f, idx) => {
                const isActive = idx === 0;
                return (
                  <button 
                    key={f}
                    className={`px-5 py-2.5 rounded-full border text-[13px] transition-all whitespace-nowrap flex-1 md:flex-none tracking-wide font-semibold ${
                        isActive 
                        ? 'bg-charcoal border-charcoal text-white shadow-sm' 
                        : 'bg-white border-[#E5E0DA] text-[#888] hover:border-amber/50 hover:bg-[#FDFBF7]'
                    }`}
                  >
                    {f}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Listing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Open listing, no offers */}
            <div className="bg-white p-6 rounded-[20px] border border-border shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col cursor-pointer relative group">
              <div className="flex justify-between items-start gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="font-display font-bold text-[22px] text-charcoal leading-tight mb-1 truncate">Kuala Lumpur, Malaysia</h3>
                  <p className="text-secondary text-sm font-medium tracking-wide">8 days · Couple pax</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right whitespace-nowrap">
                    <p className="font-display font-bold text-2xl text-[#d48c44]">RM 3,500</p>
                    <p className="text-[11px] text-[#d48c44]/70 font-semibold tracking-wider relative -top-1">desired budget</p>
                  </div>
                  <button className="text-secondary/50 hover:text-error hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Withdraw Listing">
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-8 flex-grow">
                <span className="px-3 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-lg tracking-wide">Culture</span>
                <span className="px-3 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-lg tracking-wide">Budget</span>
                <span className="px-3 py-1.5 bg-[#F3F4F6] border border-[#E5E7EB] text-[#9CA3AF] text-xs font-bold rounded-lg tracking-wide">Awaiting Offers</span>
              </div>
              
              <div className="h-px w-full bg-[#F3F4F6] mb-5" />
              
              <div className="min-h-[48px] flex items-center">
                <p className="text-[13px] text-secondary/50 font-medium w-full text-left">Awaiting guide offers...</p>
              </div>
            </div>

            {/* Card 2: Has offers */}
            <div className="bg-white p-6 rounded-[20px] border border-border shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col cursor-pointer relative group">
              <div className="flex justify-between items-start gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="font-display font-bold text-[22px] text-charcoal leading-tight mb-1 truncate">Kuala Lumpur, Malaysia</h3>
                  <p className="text-secondary text-sm font-medium tracking-wide">8 days · Couple pax</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right whitespace-nowrap">
                    <p className="font-display font-bold text-2xl text-[#d48c44]">RM 4,000</p>
                    <p className="text-[11px] text-[#d48c44]/70 font-semibold tracking-wider relative -top-1">desired budget</p>
                  </div>
                  <button className="text-secondary/50 hover:text-error hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Withdraw Listing">
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-8 flex-grow">
                <span className="px-3 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-lg tracking-wide">Culture</span>
                <span className="px-3 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-lg tracking-wide">Budget</span>
                <span className="px-3 py-1.5 bg-[#FFF9E5] border border-[#FDE68A] text-[#D48C44] text-xs font-bold rounded-lg tracking-wide">Offers Received</span>
              </div>
              
              <div className="h-px w-full bg-[#F3F4F6] mb-5" />
              
              <div className="min-h-[48px] flex items-center">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#B48F60] border-2 border-[#E7DCCA] text-white flex items-center justify-center font-bold shadow-sm">
                      A
                    </div>
                    <div className="flex flex-col">
                      <p className="font-bold text-sm text-charcoal">Ahmad R.</p>
                      <p className="text-[11px] font-medium text-secondary/80">Certified · Kuala Lumpur</p>
                    </div>
                  </div>
                  <p className="font-bold text-[#d48c44] text-xs tracking-wide">Offer received</p>
                </div>
              </div>
            </div>

            {/* Card 3: Tokyo */}
            <div className="bg-white p-6 rounded-[20px] border border-border shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col cursor-pointer relative group">
              <div className="flex justify-between items-start gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="font-display font-bold text-[22px] text-charcoal leading-tight mb-1 truncate">Tokyo, Japan</h3>
                  <p className="text-secondary text-sm font-medium tracking-wide">8 days · Solo pax</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right whitespace-nowrap">
                    <p className="font-display font-bold text-2xl text-[#d48c44]">RM 9,999</p>
                    <p className="text-[11px] text-[#d48c44]/70 font-semibold tracking-wider relative -top-1">desired budget</p>
                  </div>
                  <button className="text-secondary/50 hover:text-error hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Withdraw Listing">
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-8 flex-grow">
                <span className="px-3 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-lg tracking-wide">Culture</span>
                <span className="px-3 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-lg tracking-wide">Food & Cuisine</span>
                <span className="px-3 py-1.5 bg-[#F3F4F6] border border-[#E5E7EB] text-[#9CA3AF] text-xs font-bold rounded-lg tracking-wide">Awaiting Offers</span>
              </div>
              
              <div className="h-px w-full bg-[#F3F4F6] mb-5" />
              
              <div className="min-h-[48px] flex items-center">
                <p className="text-[13px] text-secondary/50 font-medium w-full text-left">Awaiting guide offers...</p>
              </div>
            </div>

            {/* Card 4: Tokyo alternative budget */}
            <div className="bg-white p-6 rounded-[20px] border border-border shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col cursor-pointer relative group">
              <div className="flex justify-between items-start gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="font-display font-bold text-[22px] text-charcoal leading-tight mb-1 truncate">Tokyo, Japan</h3>
                  <p className="text-secondary text-sm font-medium tracking-wide">8 days · Solo pax</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right whitespace-nowrap">
                    <p className="font-display font-bold text-2xl text-[#d48c44]">RM 9,000</p>
                    <p className="text-[11px] text-[#d48c44]/70 font-semibold tracking-wider relative -top-1">desired budget</p>
                  </div>
                  <button className="text-secondary/50 hover:text-error hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Withdraw Listing">
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-8 flex-grow">
                <span className="px-3 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-lg tracking-wide">Culture</span>
                <span className="px-3 py-1.5 bg-[#FDFBF7] border border-[#EAE6DF] text-[#7A7367] text-xs font-bold rounded-lg tracking-wide">Food & Cuisine</span>
                <span className="px-3 py-1.5 bg-[#F3F4F6] border border-[#E5E7EB] text-[#9CA3AF] text-xs font-bold rounded-lg tracking-wide">Awaiting Offers</span>
              </div>
              
              <div className="h-px w-full bg-[#F3F4F6] mb-5" />
              
              <div className="min-h-[48px] flex items-center">
                <p className="text-[13px] text-secondary/50 font-medium w-full text-left">Awaiting guide offers...</p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
