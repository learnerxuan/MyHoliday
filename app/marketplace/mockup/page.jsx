import React from 'react';

export default function ViewAfterPostingMockup() {
  return (
    <div className="min-h-screen bg-warmwhite flex flex-col pt-6 sm:pt-10 px-4 sm:px-6 pb-20 font-body">
      <div className="max-w-7xl mx-auto w-full space-y-10">
        {/* Traveller Chat Mockup */}
        <div className="space-y-3">
          <button className="text-[12px] font-bold text-secondary uppercase tracking-widest hover:text-charcoal transition-colors flex items-center gap-2 px-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Offer
          </button>

          <section className="w-full bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden flex flex-col">
          <div className="text-warmwhite relative overflow-hidden pt-8 sm:pt-10 px-4 sm:px-10 pb-8 sm:pb-10 bg-[#0f0f0f]">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(196,135,74,0.22) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(196,135,74,0.10) 0%, transparent 65%)' }} />
            <div className="relative">
              <div className="inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-white/10 text-[#E6DCCF] border border-white/15 mb-3">
                In Progress
              </div>
              <h1 className="text-3xl sm:text-[42px] font-display font-extrabold text-white leading-tight mb-3">Chat with Tour Guide</h1>
              <p className="text-[14px] text-white/75">Communicate securely with the guide to finalize your trip details and lock in the final pricing.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] min-h-[620px]">
            <aside className="border-r border-border/70 bg-[#FCFCFC] p-8 flex flex-col">
              <div className="text-[10px] font-black tracking-widest uppercase text-secondary bg-[#F0EBE3] inline-block px-2.5 py-1 rounded-md w-fit mb-3">Current Offer</div>
              <p className="text-[38px] leading-none font-display font-extrabold text-charcoal mb-6">RM 3,200</p>

              <div className="space-y-4 text-[13px]">
                <div>
                  <div className="text-[10px] text-secondary font-bold tracking-widest uppercase mb-1">Tour Guide</div>
                  <div className="font-bold text-charcoal">Ahmad R. <span className="ml-1 text-[10px] bg-[#EDFDF3] text-[#0A7A3C] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Verified</span></div>
                </div>
                <div>
                  <div className="text-[10px] text-secondary font-bold tracking-widest uppercase mb-1">Traveller Target</div>
                  <div className="font-bold text-charcoal">RM 3,500</div>
                </div>
              </div>

              <p className="text-[13px] text-secondary/90 leading-relaxed mt-8 pt-6 border-t border-border/60">
                Use the chat to discuss specific requirements, clarify inclusions, or negotiate the final price. The traveller must accept the offer to secure booking.
              </p>
            </aside>

            <div className="flex flex-col">
              <header className="h-[80px] border-b border-border/70 px-8 py-5 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#F0EEE9] text-charcoal flex items-center justify-center text-[12px] font-extrabold">AR</div>
                  <div>
                    <p className="font-bold text-charcoal text-[14px]">Ahmad R.</p>
                    <p className="text-[12px] text-[#11995E]">Available</p>
                  </div>
                </div>
                <button className="bg-amber hover:bg-amberdark text-white text-[13px] font-bold rounded-lg px-4 py-2.5">Accept RM 3,200</button>
              </header>

              <main className="flex-1 bg-[#FAFAFA] p-8 space-y-6">
                <div className="text-center">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-secondary/80 bg-[#EFEDE8] px-2.5 py-1 rounded-full">Today</span>
                </div>

                <div className="max-w-[85%]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F0EEE9] text-charcoal flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 mt-1">AR</div>
                    <div>
                      <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm">
                        <p className="text-[14px] text-charcoal leading-relaxed">
                          Hi Joha! I&apos;m thrilled to submit an offer for your KL trip. I noticed you love street food. I can definitely squeeze out a dedicated local culinary night walk if we lock this in!
                        </p>
                      </div>
                      <p className="text-[11px] text-secondary mt-1.5">10:42 AM</p>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[11px] text-[#897550] bg-[#FFF9E8] border border-[#F3E4B5] rounded-lg px-4 py-2 max-w-[420px] mx-auto">
                  Ahmad R. updated the proposed offer to RM 3,200.
                </div>

                <div className="max-w-[85%] ml-auto">
                  <div className="flex items-end gap-3 justify-end">
                    <div>
                      <div className="bg-charcoal text-white rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-sm">
                        <p className="text-[14px] leading-relaxed">
                          That sounds incredible! Does the RM 3,200 cover all transportation for the 5 days, or just the guiding fees?
                        </p>
                      </div>
                      <p className="text-[11px] text-secondary mt-1.5 text-right">10:48 AM</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#111] text-white flex items-center justify-center text-[11px] font-extrabold flex-shrink-0">JD</div>
                  </div>
                </div>
              </main>

              <footer className="border-t border-border/70 bg-white p-5">
                <div className="h-[48px] rounded-xl border border-border/80 bg-[#FCFCFC] flex items-center justify-between px-4">
                  <span className="text-[14px] text-secondary/70">Type your message...</span>
                  <span className="text-amber text-lg">↗</span>
                </div>
              </footer>
            </div>
          </div>
          </section>
        </div>

        {/* Tour Guide Chat Mockup */}
        <div className="space-y-3">
          <button className="text-[12px] font-bold text-secondary uppercase tracking-widest hover:text-charcoal transition-colors flex items-center gap-2 px-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Offer
          </button>

          <section className="w-full bg-white rounded-[24px] shadow-sm border border-border/50 overflow-hidden flex flex-col">
          <div className="text-warmwhite relative overflow-hidden pt-8 sm:pt-10 px-4 sm:px-10 pb-8 sm:pb-10 bg-[#0f0f0f]">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(59,109,17,0.22) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(59,109,17,0.10) 0%, transparent 65%)' }} />
            <div className="relative">
              <div className="inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-white/10 text-[#DDE8CC] border border-white/15 mb-3">
                Tour Guide View
              </div>
              <h2 className="text-3xl sm:text-[40px] font-display font-extrabold text-white leading-tight mb-3">Traveller Chats</h2>
              <p className="text-[14px] text-white/75">Manage all ongoing traveller conversations from one inbox and continue negotiation in each thread.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] min-h-[640px]">
            <aside className="border-r border-border/70 bg-[#FBFBFB]">
              <div className="px-6 py-5 border-b border-border/60">
                <div className="h-[42px] rounded-lg border border-border/70 bg-white px-3 flex items-center text-[13px] text-secondary">Search traveller chats...</div>
              </div>

              <div className="divide-y divide-border/60">
                {[
                  ['Joha D.', 'KL Food & City Walk', 'Can we include Batu Caves transfer?', '2m', true],
                  ['Nadia L.', 'Penang Cultural Route', 'I can do RM 2,900 with private van.', '18m', false],
                  ['Ariff H.', 'Melaka Heritage Daytrip', 'Thanks, I will confirm by tonight.', '1h', false],
                  ['Marcus P.', 'Langkawi Island Plan', 'Can we add snorkeling package?', '3h', false],
                ].map(([name, title, text, time, active]) => (
                  <button
                    key={name}
                    className={`w-full px-6 py-4 text-left hover:bg-white transition-colors ${active ? 'bg-white border-l-4 border-l-amber' : 'bg-transparent border-l-4 border-l-transparent'}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-[14px] font-bold text-charcoal">{name}</p>
                      <p className="text-[11px] text-secondary">{time}</p>
                    </div>
                    <p className="text-[12px] font-semibold text-[#8A7A67] mb-1">{title}</p>
                    <p className="text-[12px] text-secondary truncate">{text}</p>
                  </button>
                ))}
              </div>
            </aside>

            <div className="flex flex-col">
              <header className="h-[80px] border-b border-border/70 px-8 py-5 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#111] text-white flex items-center justify-center text-[12px] font-extrabold">JD</div>
                  <div>
                    <p className="font-bold text-charcoal text-[14px]">Joha D.</p>
                    <p className="text-[12px] text-secondary">KL Food &amp; City Walk</p>
                  </div>
                </div>
                <button className="bg-charcoal hover:bg-black text-white text-[13px] font-bold rounded-lg px-4 py-2.5">Update Offer</button>
              </header>

              <main className="flex-1 bg-[#FAFAFA] p-8 space-y-6">
                <div className="max-w-[85%] ml-auto">
                  <div className="bg-white border border-border rounded-2xl px-5 py-3.5 shadow-sm">
                    <p className="text-[14px] text-charcoal">Does this include airport pickup for both arrival and departure?</p>
                  </div>
                  <p className="text-[11px] text-secondary mt-1.5 text-right">11:18 AM</p>
                </div>

                <div className="max-w-[85%]">
                  <div className="bg-[#111] text-white rounded-2xl px-5 py-3.5 shadow-sm">
                    <p className="text-[14px]">Yes, both-way airport transfer is included. I can also add a Batu Caves half-day add-on at RM 180.</p>
                  </div>
                  <p className="text-[11px] text-secondary mt-1.5">11:22 AM</p>
                </div>

                <div className="max-w-[85%] ml-auto">
                  <div className="bg-white border border-border rounded-2xl px-5 py-3.5 shadow-sm">
                    <p className="text-[14px] text-charcoal">Perfect, please revise the offer and I&apos;ll review it now.</p>
                  </div>
                  <p className="text-[11px] text-secondary mt-1.5 text-right">11:23 AM</p>
                </div>
              </main>

              <footer className="border-t border-border/70 bg-white p-5">
                <div className="h-[48px] rounded-xl border border-border/80 bg-[#FCFCFC] flex items-center justify-between px-4">
                  <span className="text-[14px] text-secondary/70">Reply to Joha D...</span>
                  <span className="text-charcoal text-lg">↗</span>
                </div>
              </footer>
            </div>
          </div>
          </section>
        </div>
      </div>
    </div>
  );
}
