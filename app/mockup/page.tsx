'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import MyHolidayMockup from '../../homepage-mockup';

// Reusable Dark Header for Mockups
function MockupDarkHeader({ tag, title, description, children }: { tag?: string, title: string, description?: string, children?: React.ReactNode }) {
  return (
    <div 
      className="text-warmwhite relative overflow-hidden pt-10 sm:pt-12 px-6 sm:px-12 pb-8 sm:pb-10 rounded-t-[32px] shadow-sm z-10"
      style={{ background: '#0f0f0f' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(196,135,74,0.22) 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 40% at 20% 80%, rgba(196,135,74,0.10) 0%, transparent 65%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 w-full">
        <div>
          {tag && (
            <div className="inline-flex w-fit items-center gap-2 bg-white/10 text-amber text-[11px] font-bold px-3 py-1 rounded-full border border-amber/20 mb-3 uppercase tracking-widest leading-none">
              {tag}
            </div>
          )}
          <h1 className="text-3xl sm:text-[40px] font-extrabold text-white font-display mb-2 tracking-tight leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm sm:text-[15px] font-body text-white/60 max-w-2xl leading-relaxed mt-2">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="shrink-0 flex items-center justify-end w-full lg:w-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MockupPage() {
  const [activeTab, setActiveTab] = useState('traveller');

  return (
    <div className="min-h-screen bg-[#FAF9F7] font-sans pb-24">
      {/* Mockup Top Navigation Panel */}
      <div className="bg-charcoal text-white py-6 px-12 sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-display font-extrabold text-[24px]">Platform UX Mockups</h1>
            <p className="text-white/70 text-[13px] mt-1 font-medium tracking-wide">Marketplace Flow Designs</p>
          </div>
          <div className="flex bg-white/10 p-1.5 rounded-xl border border-white/20 overflow-x-auto max-w-[650px]">
            <button 
              onClick={() => setActiveTab('legacy_homepage')}
              className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'legacy_homepage' ? 'bg-white text-charcoal shadow-sm' : 'text-white/80 hover:text-white'}`}
            >
              Legacy Homepage Mockup
            </button>
            <button 
              onClick={() => setActiveTab('traveller')}
              className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'traveller' ? 'bg-white text-charcoal shadow-sm' : 'text-white/80 hover:text-white'}`}
            >
              Traveller: View After Posting
            </button>
            <button 
              onClick={() => setActiveTab('guide')}
              className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'guide' ? 'bg-white text-charcoal shadow-sm' : 'text-white/80 hover:text-white'}`}
            >
              Guide: Submit Offer Action
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'chat' ? 'bg-white text-charcoal shadow-sm' : 'text-white/80 hover:text-white'}`}
            >
              Active Negotiation
            </button>
          </div>
        </div>
      </div>

      <div>
        {activeTab === 'legacy_homepage' && <MyHolidayMockup />}
      </div>

      <div className="max-w-5xl mx-auto mt-16 px-8">
        {activeTab === 'traveller' && <TravellerPostView />}
        {activeTab === 'guide' && <GuideSubmitOfferView />}
        {activeTab === 'chat' && <NegotiationChatView />}
      </div>
    </div>
  );
}

function TravellerPostView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="mb-6">
        <Link href="#" className="text-[12px] text-secondary font-bold hover:text-charcoal transition-colors tracking-wide uppercase">
          &larr; Back to Marketplace
        </Link>
      </div>

      {/* Success Banner */}
      <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-6 mb-12 flex items-start gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#A7F3D0] rounded-full blur-3xl opacity-40"></div>
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[24px] shadow-sm shrink-0 z-10 text-[#059669]">
          🎉
        </div>
        <div className="z-10">
          <h2 className="text-[18px] font-extrabold text-[#065F46] font-display">Success! Your itinerary is live on the marketplace.</h2>
          <p className="text-[#047857] text-[14px] mt-1 leading-relaxed">
            Verified local tour guides in Kuala Lumpur, Malaysia have been notified about your trip. You will receive competitive offers shortly.
          </p>
        </div>
      </div>

      {/* Listing Status Dashboard */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-6 bg-[#0f0f0f] px-6 py-4 rounded-2xl shadow-sm border border-black/5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          <h3 className="font-display font-extrabold text-[22px] text-white relative z-10">Listing Status</h3>
          <span className="bg-amber/10 text-amber text-[11px] font-extrabold px-3 py-1.5 rounded-lg uppercase tracking-wider border border-amber/20 relative z-10">
            Awaiting Offers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trip Summary Card */}
          <div className="md:col-span-2 bg-white border border-[#E5E0DA] rounded-3xl p-8 hover:shadow-lg transition-all duration-300 relative group">
             <div className="absolute top-8 right-8 text-right">
                <div className="text-[11px] text-secondary/70 uppercase tracking-widest font-bold mb-1">Target Budget</div>
                <div className="font-display font-extrabold text-[26px] text-amber">RM 3,500</div>
             </div>
             
             <div className="pr-32">
                <div className="inline-block bg-[#F0EBE3] text-charcoal text-[11px] font-bold px-3 py-1 rounded-md mb-4 uppercase tracking-widest">
                  Kuala Lumpur, MY
                </div>
                <h4 className="font-display font-extrabold text-[32px] text-charcoal leading-tight mb-2 group-hover:text-amber transition-colors">
                  Urban Exploration & Food Tour
                </h4>
                <div className="text-secondary text-[14px] font-medium flex gap-3 items-center">
                  <span>📅 14 - 18 Oct 2024</span>
                  <span className="w-1 h-1 bg-border rounded-full"></span>
                  <span>👥 Couple</span>
                </div>
             </div>

             <div className="mt-8 pt-8 border-t border-[#F0EDE9] flex gap-2 flex-wrap">
                {['Culture', 'Food', 'Walking'].map(t => (
                  <span key={t} className="text-[12px] font-bold px-4 py-1.5 bg-subtle text-charcoal rounded-lg border border-[#E5E0DA]">
                    {t}
                  </span>
                ))}
             </div>
          </div>

          {/* Activity Panel */}
          <div className="bg-[#FAF9F7] border border-[#E5E0DA] rounded-3xl p-8 flex flex-col justify-center items-center text-center shadow-inner relative overflow-hidden">
             <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-[#E5E0DA] flex items-center justify-center mb-6 relative">
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white opacity-0">1</div>
                <span className="text-[32px] animate-pulse">⏳</span>
             </div>
             
             <h4 className="font-display font-extrabold text-[22px] text-charcoal mb-2">0 Offers Received</h4>
             <p className="text-secondary text-[13.5px] leading-relaxed mb-6">
               Tour guides are reviewing your itinerary. Sit tight, you&apos;ll be notified via email when an offer arrives.
             </p>
             
             <button className="w-full max-w-[200px] mt-2 px-5 py-3 bg-white border border-[#E5E0DA] hover:border-red-300 hover:bg-red-50 hover:text-red-600 text-charcoal text-[13px] font-bold rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-red-500/20 outline-none">
               Cancel Request
             </button>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center pt-8 border-t border-[#E5E0DA]">
        <Link href="#" className="inline-flex items-center gap-2 text-[13px] text-charcoal font-bold hover:text-amber transition-colors px-6 py-3 border border-[#E5E0DA] bg-white rounded-xl hover:border-amber shadow-sm">
          &larr; Return to Marketplace
        </Link>
      </div>

    </div>
  )
}

function GuideSubmitOfferView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="mb-6">
         <Link href="#" className="text-[12px] text-secondary font-bold hover:text-charcoal transition-colors tracking-wide uppercase">
           &larr; Back to Marketplace
         </Link>
       </div>

       {/* Unified Dark Header Replicated */}
       <MockupDarkHeader 
         title="Submit an Offer" 
         description="You are bidding on a confirmed itinerary request. Craft a competitive proposal to win this client." 
       />

       <div className="bg-white flex flex-col md:flex-row border-x border-b border-[#E5E0DA] rounded-b-[32px] overflow-hidden shadow-xl shadow-black/5">
          
          {/* Left: Traveller Context */}
          <div className="w-full md:w-[45%] bg-[#FAF9F7] p-10 border-r border-[#E5E0DA] relative">
            <div className="absolute top-10 right-10 flex gap-1">
              <span className="w-2 h-2 rounded-full bg-amber/40"></span>
              <span className="w-2 h-2 rounded-full bg-amber/40"></span>
              <span className="w-2 h-2 rounded-full bg-amber text-white flex items-center justify-center animate-pulse"></span>
            </div>

            <h3 className="text-[11px] text-secondary/80 uppercase tracking-widest font-extrabold mb-6">Trip Details</h3>
            
            <h4 className="font-display font-extrabold text-[28px] text-charcoal leading-tight mb-4">
              Urban Exploration & Food Tour
            </h4>

            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                 <div className="w-10 h-10 rounded-full bg-[#F0EBE3] flex items-center justify-center text-[16px] shrink-0">📍</div>
                 <div>
                    <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Location</div>
                    <div className="text-[14px] font-bold text-charcoal">Kuala Lumpur, MY</div>
                 </div>
              </div>
              <div className="flex gap-4 items-start">
                 <div className="w-10 h-10 rounded-full bg-[#F0EBE3] flex items-center justify-center text-[16px] shrink-0">📅</div>
                 <div>
                    <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Dates</div>
                    <div className="text-[14px] font-bold text-charcoal">14 - 18 Oct 2024 <span className="text-secondary font-medium ml-1">(5 Days)</span></div>
                 </div>
              </div>
              <div className="flex gap-4 items-start">
                 <div className="w-10 h-10 rounded-full bg-[#F0EBE3] flex items-center justify-center text-[16px] shrink-0">👤</div>
                 <div>
                    <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Traveller</div>
                    <div className="text-[14px] font-bold text-charcoal">John Doe <span className="bg-subtle px-2 py-0.5 rounded text-[10px] ml-2 text-secondary">First-time visitor</span></div>
                 </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border">
               <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-2">Target Budget</div>
               <div className="font-display font-extrabold text-[32px] text-charcoal">RM 3,500</div>
            </div>
          </div>

          {/* Right: The Offer Form */}
          <div className="w-full md:w-[55%] p-10 bg-white relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber to-[#FBAE3C]"></div>
            
            <h3 className="text-[22px] font-display font-extrabold text-charcoal mb-2">Propose Your Value</h3>
            <p className="text-secondary text-[13.5px] leading-relaxed mb-8">Review the traveller&apos;s requirements closely. Present a competitive offer along with a personalized note to increase your chances of being selected.</p>

            <div className="space-y-6">
              
              {/* Proposal Input */}
              <div>
                <label className="block text-[12px] font-extrabold text-charcoal uppercase tracking-wider mb-2">
                  Proposed Price (RM)
                </label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[18px] font-display font-bold text-charcoal/40 group-focus-within:text-amber transition-colors">RM</div>
                  <input 
                    type="number" 
                    placeholder="3,200"
                    defaultValue="3400"
                    className="w-full pl-14 pr-5 py-5 bg-[#FAF9F7] border-2 border-[#E5E0DA] rounded-2xl text-[24px] font-display font-extrabold text-charcoal focus:outline-none focus:border-amber focus:bg-white focus:ring-4 focus:ring-amber/10 transition-all placeholder:text-charcoal/20"
                  />
                </div>
                <div className="flex justify-between mt-2.5 px-1">
                   <div className="text-[11px] font-medium text-secondary">Expected Payout: <strong className="text-charcoal">RM 3,400</strong> (0% Platform Fee)</div>
                   <div className="text-[11px] font-bold text-amber">Close to target</div>
                </div>
              </div>

              {/* Message Input */}
              <div className="pt-4">
                <label className="block text-[12px] font-extrabold text-charcoal uppercase tracking-wider mb-2">
                  Introductory Message <span className="text-secondary font-medium normal-case tracking-normal ml-1">(Optional)</span>
                </label>
                <textarea 
                  rows={4}
                  placeholder="Hi John! I&apos;ve been a verified guide in KL for 5 years. I specialize in hidden food gems and would love to show you the authentic side of the city..."
                  className="w-full px-5 py-4 bg-[#FAF9F7] border border-[#E5E0DA] rounded-2xl text-[14px] text-charcoal focus:outline-none focus:border-amber focus:bg-white focus:ring-4 focus:ring-amber/10 transition-all resize-none placeholder:text-secondary/50 leading-relaxed"
                ></textarea>
              </div>
              
              {/* Submission Action */}
              <div className="pt-6 border-t border-border mt-8 flex justify-end gap-3 items-center">
                 <button className="px-6 py-3.5 text-[14px] font-bold text-secondary hover:text-charcoal transition-colors">
                   Cancel
                 </button>
                 <button className="px-8 py-3.5 bg-amber hover:bg-[#E08A1E] text-white text-[14px] font-bold rounded-xl shadow-lg shadow-amber/30 transition-all hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden group">
                   <span className="relative z-10 flex items-center gap-2">Submit Offer &rarr;</span>
                   <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                 </button>
              </div>

            </div>
          </div>
       </div>
    </div>
  )
}

function NegotiationChatView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="mb-6">
         <Link href="#" className="text-[12px] text-secondary font-bold hover:text-charcoal transition-colors tracking-wide uppercase">
           &larr; Back to Offer
         </Link>
       </div>

       {/* Unified Dark Header Replicated */}
       <MockupDarkHeader 
         tag="In Progress" 
         title="Chat with Tour Guide" 
         description="Communicate securely with the guide to finalize your trip details and lock in the final pricing." 
       />

       <div className="bg-white flex flex-col md:flex-row border-x border-b border-[#E5E0DA] rounded-b-[32px] overflow-hidden shadow-xl shadow-black/5">
          {/* Left Context Pane */}
          <div className="w-full md:w-[35%] bg-[#FAF9F7] p-8 border-r border-[#E5E0DA] flex flex-col justify-between">
            <div>
              <div className="inline-block bg-[#F0EBE3] text-charcoal text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest mb-3">
                Current Offer
              </div>
              <h3 className="font-display font-extrabold text-[24px] text-charcoal leading-tight mb-6">
                RM 3,200
              </h3>

              <div className="space-y-4 mb-8">
                <div>
                  <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Tour Guide</div>
                  <div className="text-[14px] font-bold text-charcoal flex items-center gap-2">
                    Ahmad R. <span className="bg-[#EAF3DE] text-[#3B6D11] px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold">Verified</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-secondary uppercase font-bold tracking-wider mb-0.5">Traveller Target</div>
                  <div className="text-[14px] font-bold text-charcoal line-through decoration-secondary/40">RM 3,500</div>
                </div>
              </div>
              <p className="text-[13px] text-secondary leading-relaxed border-t border-border pt-6">
                Use the chat to discuss specific requirements, clarify inclusions, or negotiate the final price. The traveller must accept the offer to secure the booking.
              </p>
            </div>
          </div>

          {/* Right Chat Interface */}
          <div className="w-full md:w-[65%] flex flex-col h-[600px] relative bg-[#FCFBF9]">
            {/* Chat header */}
            <div className="px-8 py-5 border-b border-[#E5E0DA] bg-white flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-[#F0EBE3] flex items-center justify-center font-display font-bold text-charcoal text-[16px]">AR</div>
                 <div>
                   <div className="font-bold text-[14px] text-charcoal leading-tight">Ahmad R.</div>
                   <div className="text-[11px] text-[#059669] font-medium flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Available
                   </div>
                 </div>
              </div>
              <button className="px-5 py-2.5 bg-amber hover:bg-[#E08A1E] text-white text-[12px] font-bold rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-amber/40 outline-none">
                Accept RM 3,200
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
               <div className="text-center">
                 <span className="text-[10px] font-bold text-secondary uppercase tracking-widest bg-[#F0EBE3] px-3 py-1 rounded-full">Today</span>
               </div>

               {/* Guide message */}
               <div className="flex gap-3 max-w-[85%]">
                 <div className="w-8 h-8 rounded-full bg-[#F0EBE3] flex shrink-0 items-center justify-center font-display font-bold text-charcoal text-[12px]">AR</div>
                 <div>
                   <div className="bg-white border border-[#E5E0DA] text-charcoal rounded-2xl rounded-tl-sm px-5 py-3.5 text-[14px] leading-relaxed shadow-sm">
                     Hi John! I&apos;m thrilled to submit an offer for your KL trip. I noticed you love street food. I can definitely squeeze out a dedicated local culinary night walk if we lock this in!
                   </div>
                   <div className="text-[10px] text-secondary/60 font-medium mt-1.5 ml-1">10:42 AM</div>
                 </div>
               </div>

               {/* Platform message */}
               <div className="flex justify-center my-4">
                 <div className="bg-[#FFFDF5] border border-amber/20 px-4 py-2 rounded-xl text-[12px] text-amberdark font-medium flex items-center gap-2">
                   <span>💡</span> Ahmad R. updated the proposed offer to RM 3,200.
                 </div>
               </div>

               {/* Traveller message */}
               <div className="flex gap-3 max-w-[85%] self-end ms-auto flex-row-reverse">
                 <div className="w-8 h-8 rounded-full bg-charcoal flex shrink-0 items-center justify-center font-display font-bold text-white text-[12px]">JD</div>
                 <div className="flex flex-col items-end">
                   <div className="bg-charcoal text-white rounded-2xl rounded-tr-sm px-5 py-3.5 text-[14px] leading-relaxed shadow-md">
                     That sounds incredible! Does the RM 3,200 cover all transportation for the 5 days, or just the guiding fees?
                   </div>
                   <div className="text-[10px] text-secondary/60 font-medium mt-1.5 mr-1 flex items-center gap-1">
                     10:48 AM <span className="text-amber">✓✓</span>
                   </div>
                 </div>
               </div>
            </div>

            {/* Message Input */}
            <div className="p-5 bg-white border-t border-[#E5E0DA]">
               <div className="relative">
                 <input 
                   type="text" 
                   placeholder="Type your message..." 
                   className="w-full bg-[#FAF9F7] border border-[#E5E0DA] rounded-xl pl-5 pr-14 py-3.5 text-[14px] text-charcoal focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/10 transition-all placeholder:text-secondary/60"
                 />
                 <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-amber hover:text-amberdark hover:bg-amber/10 rounded-lg transition-colors">
                   <span className="text-[20px] leading-none mb-1">↗</span>
                 </button>
               </div>
               <div className="text-[10px] text-secondary/50 font-medium text-center mt-3 flex items-center justify-center gap-2">
                 <span>🔒</span> Messages are end-to-end encrypted
               </div>
            </div>
          </div>
       </div>
    </div>
  )
}
