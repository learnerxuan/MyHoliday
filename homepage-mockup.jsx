import { useState } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Funnel+Display:wght@800&family=Noto+Serif:ital,wght@0,400;0,600;1,400&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .root { font-family: 'Noto Serif', serif; background: #FAF9F7; color: #1A1A1A; min-height: 100vh; }

  /* NAV */
  .nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 48px; background: #FAF9F7; border-bottom: 1px solid #EBEBEB; position: sticky; top: 0; z-index: 100; }
  .nav-logo { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 22px; color: #1A1A1A; display: flex; align-items: center; gap: 6px; }
  .nav-links { display: flex; gap: 32px; }
  .nav-link { font-size: 13px; color: #666; cursor: pointer; }
  .nav-link.active { color: #1A1A1A; font-weight: 600; }
  .nav-actions { display: flex; gap: 10px; }
  .btn-ghost { padding: 8px 18px; font-size: 13px; background: transparent; border: 1px solid #D0CCC7; border-radius: 6px; cursor: pointer; color: #444; font-family: 'Noto Serif', serif; }
  .btn-primary { padding: 8px 20px; font-size: 13px; font-weight: 600; background: #1A1A1A; border: 1px solid #1A1A1A; border-radius: 6px; cursor: pointer; color: #FAF9F7; font-family: 'Noto Serif', serif; }
  .btn-amber { padding: 8px 20px; font-size: 13px; font-weight: 600; background: #C4874A; border: 1px solid #C4874A; border-radius: 6px; cursor: pointer; color: #FAF9F7; font-family: 'Noto Serif', serif; }

  /* PAGE SWITCHER */
  .page-tabs { display: flex; gap: 6px; padding: 12px 48px; background: #fff; border-bottom: 1px solid #EBEBEB; overflow-x: auto; }
  .page-tab { padding: 5px 14px; font-size: 11px; font-weight: 600; border: 1.5px solid #E5E0DA; border-radius: 5px; cursor: pointer; color: #888; background: transparent; white-space: nowrap; font-family: 'Noto Serif', serif; }
  .page-tab.active { background: #1A1A1A; color: #FAF9F7; border-color: #1A1A1A; }

  /* HERO */
  .hero { display: grid; grid-template-columns: 1fr 1fr; min-height: 88vh; padding: 0 48px; gap: 40px; align-items: center; }
  .hero-left { padding: 60px 0; }
  .hero-tag { display: inline-flex; align-items: center; gap: 6px; background: #F0EBE3; border: 1px solid #E0D8CC; border-radius: 20px; padding: 5px 12px; font-size: 11px; font-weight: 600; color: #8B6A3E; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 28px; }
  .hero-tag-dot { width: 6px; height: 6px; background: #C4874A; border-radius: 50%; }
  .hero-heading { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 58px; line-height: 1.1; color: #1A1A1A; margin-bottom: 20px; letter-spacing: -1.5px; }
  .italic-accent { font-family: 'Noto Serif', serif; font-style: italic; color: #C4874A; }
  .hero-sub { font-size: 16px; color: #666; line-height: 1.7; margin-bottom: 40px; max-width: 420px; }
  .hero-search { display: flex; background: #fff; border: 1.5px solid #E0DBD5; border-radius: 10px; overflow: hidden; max-width: 480px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
  .hero-input { flex: 1; padding: 16px 20px; font-size: 14px; border: none; outline: none; background: transparent; font-family: 'Noto Serif', serif; color: #1A1A1A; }
  .hero-input::placeholder { color: #AAA; }
  .hero-search-btn { padding: 12px 24px; background: #1A1A1A; border: none; cursor: pointer; font-size: 13px; font-weight: 600; color: #FAF9F7; font-family: 'Noto Serif', serif; margin: 5px; border-radius: 7px; }
  .hero-skip { margin-top: 14px; font-size: 12px; color: #AAA; }
  .hero-skip a { color: #C4874A; font-weight: 600; cursor: pointer; }
  .hero-stats { display: flex; gap: 32px; margin-top: 36px; }
  .hero-stat-num { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 28px; color: #1A1A1A; }
  .hero-stat-label { font-size: 12px; color: #999; margin-top: 2px; }
  .hero-right { position: relative; display: flex; align-items: center; justify-content: center; }
  .hero-img { width: 100%; height: 520px; background: linear-gradient(135deg, #C9D4C5, #A8BAA4); border-radius: 16px; position: relative; overflow: hidden; }
  .hero-img-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(26,26,26,0.5) 0%, transparent 60%); }
  .hero-img-badge { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.95); border-radius: 8px; padding: 10px 14px; }
  .hero-img-badge-score { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 20px; color: #1A1A1A; }
  .hero-img-badge-label { font-size: 10px; color: #888; margin-top: 1px; }
  .hero-img-label { position: absolute; bottom: 24px; left: 24px; color: #fff; }
  .hero-img-city { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 22px; }
  .hero-img-meta { font-size: 12px; opacity: 0.8; margin-top: 3px; }
  .hero-float-card { position: absolute; bottom: -16px; left: -20px; background: #fff; border-radius: 12px; padding: 14px 18px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); display: flex; align-items: center; gap: 12px; min-width: 210px; }
  .hero-float-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #C4874A, #8B6A3E); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; }
  .hero-float-main { font-size: 12px; font-weight: 600; color: #1A1A1A; }
  .hero-float-sub { font-size: 11px; color: #888; margin-top: 1px; }

  /* SECTIONS */
  .section { padding: 80px 48px; }
  .section-alt { background: #F5F2EE; }
  .section-tag { font-size: 11px; font-weight: 600; color: #C4874A; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 12px; }
  .section-title { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 38px; color: #1A1A1A; line-height: 1.2; letter-spacing: -0.8px; margin-bottom: 12px; }
  .section-sub { font-size: 15px; color: #777; line-height: 1.7; max-width: 480px; }
  .section-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
  .link-btn { font-size: 13px; font-weight: 600; color: #1A1A1A; cursor: pointer; border-bottom: 1px solid #1A1A1A; padding-bottom: 2px; }

  /* HOW IT WORKS */
  .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: #E8E4DF; border-radius: 12px; overflow: hidden; }
  .step { background: #FAF9F7; padding: 36px 32px; position: relative; }
  .step-num { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 48px; color: #EBEBEB; line-height: 1; margin-bottom: 20px; }
  .step-icon { width: 42px; height: 42px; background: #1A1A1A; border-radius: 10px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; }
  .step-icon-inner { width: 18px; height: 18px; background: #FAF9F7; border-radius: 3px; }
  .step-title { font-size: 16px; font-weight: 600; color: #1A1A1A; margin-bottom: 8px; }
  .step-desc { font-size: 13px; color: #888; line-height: 1.6; }
  .step-arrow { position: absolute; right: -12px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; background: #C4874A; border-radius: 50%; z-index: 2; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; }

  /* CITY CARDS */
  .city-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .city-card { border-radius: 12px; overflow: hidden; cursor: pointer; background: #fff; border: 1px solid #EBEBEB; }
  .city-card-img { height: 160px; position: relative; }
  .city-card-img-1 { background: linear-gradient(135deg, #C9D4C5, #A8BAA4); }
  .city-card-img-2 { background: linear-gradient(135deg, #C5C4D4, #A4A3BA); }
  .city-card-img-3 { background: linear-gradient(135deg, #D4C5C5, #BAA4A4); }
  .city-card-img-4 { background: linear-gradient(135deg, #D4CFC5, #BAB3A4); }
  .city-card-img-5 { background: linear-gradient(135deg, #C5D4D0, #A4BAB6); }
  .city-card-img-6 { background: linear-gradient(135deg, #D0C5D4, #B6A4BA); }
  .city-card-img-7 { background: linear-gradient(135deg, #C5C9D4, #A4A8BA); }
  .city-card-img-8 { background: linear-gradient(135deg, #D4C9C5, #BAA8A4); }
  .city-card-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.4), transparent); }
  .city-card-match { position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.95); border-radius: 6px; padding: 4px 8px; font-size: 10px; font-weight: 700; color: #1A1A1A; }
  .city-card-body { padding: 14px 16px; }
  .city-card-name { font-size: 15px; font-weight: 600; color: #1A1A1A; margin-bottom: 2px; }
  .city-card-country { font-size: 12px; color: #999; margin-bottom: 10px; }
  .city-card-tags { display: flex; gap: 5px; flex-wrap: wrap; }
  .tag { font-size: 10px; font-weight: 600; padding: 3px 8px; background: #F0EBE3; color: #8B6A3E; border-radius: 4px; }
  .tag-green { background: #EAF3DE; color: #3B6D11; }

  /* LISTING CARDS */
  .listing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .listing-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 12px; padding: 20px; cursor: pointer; }
  .listing-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .listing-city { font-size: 16px; font-weight: 600; color: #1A1A1A; }
  .listing-meta-text { font-size: 11px; color: #888; margin-top: 2px; }
  .listing-budget-num { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 18px; color: #C4874A; }
  .listing-budget-label { font-size: 10px; color: #AAA; text-align: right; }
  .listing-tags { display: flex; gap: 5px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
  .status-badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 5px; }
  .s-awaiting    { background: #F0EDE9; color: #888; }
  .s-has-offers  { background: #FEF3C7; color: #D97706; }
  .s-negotiating { background: #EFF6FF; color: #185FA5; }
  .s-confirmed   { background: #ECFDF5; color: #059669; }
  .listing-bottom { display: flex; align-items: center; gap: 8px; padding-top: 12px; border-top: 1px solid #F0EDE9; }
  .guide-dot { width: 26px; height: 26px; background: linear-gradient(135deg, #C4874A, #8B6A3E); border-radius: 50%; flex-shrink: 0; }
  .guide-name-text { font-size: 12px; font-weight: 600; color: #1A1A1A; }
  .guide-city-text { font-size: 11px; color: #888; }
  .guide-status { margin-left: auto; font-size: 11px; font-weight: 600; color: #C4874A; }

  /* CITY DETAIL */
  .detail-layout { display: grid; grid-template-columns: 1fr 360px; gap: 40px; }
  .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #888; margin-bottom: 20px; cursor: pointer; }
  .city-hero-img { height: 280px; border-radius: 14px; position: relative; overflow: hidden; margin-bottom: 24px; }
  .city-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.5), transparent); }
  .city-hero-match { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.95); border-radius: 8px; padding: 10px 16px; text-align: center; }
  .city-hero-match-num { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 22px; color: #1A1A1A; }
  .city-hero-match-label { font-size: 10px; color: #888; }
  .city-hero-text { position: absolute; bottom: 24px; left: 28px; color: #fff; }
  .city-hero-name { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 36px; letter-spacing: -1px; }
  .city-hero-tags { display: flex; gap: 8px; margin-top: 8px; }
  .city-hero-tag { background: rgba(255,255,255,0.2); color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 5px; }
  .stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 10px; padding: 14px 16px; }
  .stat-label { font-size: 11px; color: #888; margin-bottom: 4px; }
  .stat-val { font-size: 14px; font-weight: 600; color: #1A1A1A; }
  .about-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
  .ratings-list { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
  .rating-row { display: flex; align-items: center; gap: 10px; }
  .rating-label { font-size: 12px; color: #666; width: 80px; flex-shrink: 0; }
  .rating-bar-bg { flex: 1; height: 6px; background: #F0EDE9; border-radius: 3px; }
  .rating-bar-fill { height: 6px; background: #C4874A; border-radius: 3px; }
  .rating-num { font-size: 11px; color: #888; width: 16px; text-align: right; }
  .sidebar-cta-card { background: #1A1A1A; border-radius: 14px; padding: 24px; color: #FAF9F7; margin-bottom: 14px; }
  .sidebar-cta-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
  .sidebar-cta-sub { font-size: 12px; color: #888; margin-bottom: 18px; line-height: 1.6; }
  .sidebar-links-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 14px; padding: 20px; }
  .sidebar-link-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #F5F2EE; }
  .sidebar-link-label { font-size: 13px; color: #555; }
  .sidebar-link-arrow { font-size: 11px; font-weight: 600; color: #C4874A; }

  /* MARKETPLACE DETAIL */
  .offer-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 10px; padding: 16px; display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
  .offer-dot { width: 38px; height: 38px; background: linear-gradient(135deg, #C4874A, #8B6A3E); border-radius: 50%; flex-shrink: 0; }
  .offer-name { font-size: 14px; font-weight: 600; color: #1A1A1A; }
  .offer-location { font-size: 12px; color: #888; }
  .offer-price { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 20px; color: #C4874A; }
  .offer-price-sub { font-size: 10px; color: #AAA; }
  .offer-actions { display: flex; gap: 6px; margin-left: auto; }

  /* AI PAGE */
  .ai-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }
  .chip-row { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
  .chip { background: #fff; border: 1px solid #EBEBEB; border-radius: 8px; padding: 8px 14px; }
  .chip-label { font-size: 10px; color: #888; margin-bottom: 2px; }
  .chip-val { font-size: 13px; font-weight: 600; color: #1A1A1A; }
  .itinerary-card { margin-top: 24px; background: #fff; border: 1px solid #EBEBEB; border-radius: 12px; padding: 20px; }
  .day-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #F5F2EE; align-items: center; }
  .day-num { width: 24px; height: 24px; background: #F0EBE3; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #8B6A3E; flex-shrink: 0; }
  .day-text { font-size: 13px; color: #444; font-weight: 500; }
  .itinerary-actions { display: flex; gap: 8px; margin-top: 14px; }
  .ai-chat-window { background: #fff; border: 1px solid #EBEBEB; border-radius: 16px; overflow: hidden; }
  .ai-chat-header { padding: 14px 20px; border-bottom: 1px solid #F0EDE9; display: flex; align-items: center; gap: 10px; }
  .ai-chat-dot { width: 8px; height: 8px; background: #4ADE80; border-radius: 50%; }
  .ai-chat-title { font-size: 13px; font-weight: 600; color: #1A1A1A; }
  .ai-chat-sub { font-size: 11px; color: #888; margin-left: auto; }
  .ai-chat-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; min-height: 260px; background: #FDFCFB; }
  .bubble { max-width: 80%; padding: 10px 14px; border-radius: 10px; font-size: 13px; line-height: 1.5; }
  .bubble-ai { background: #F0EBE3; color: #1A1A1A; align-self: flex-start; border-bottom-left-radius: 3px; }
  .bubble-user { background: #1A1A1A; color: #FAF9F7; align-self: flex-end; border-bottom-right-radius: 3px; }
  .ai-chat-input-row { padding: 12px 16px; border-top: 1px solid #F0EDE9; display: flex; gap: 8px; }
  .ai-chat-field { flex: 1; padding: 8px 12px; border: 1.5px solid #E5E0DA; border-radius: 7px; font-size: 13px; outline: none; font-family: 'Noto Serif', serif; }
  .ai-send-btn { padding: 8px 16px; background: #1A1A1A; color: #fff; border: none; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Noto Serif', serif; }
  .ai-note { margin-top: 10px; padding: 10px 14px; background: #F0EBE3; border: 1px solid #E0D8CC; border-radius: 8px; font-size: 11px; color: #8B6A3E; font-weight: 500; }

  /* FILTER BAR */
  .filter-bar { display: flex; gap: 6px; padding: 14px 18px; background: #fff; border: 1px solid #EBEBEB; border-radius: 10px; margin-bottom: 28px; flex-wrap: wrap; align-items: center; }
  .filter-lbl { font-size: 11px; font-weight: 600; color: #888; margin-right: 3px; }
  .filter-pill { padding: 5px 12px; font-size: 12px; border: 1.5px solid #E5E0DA; border-radius: 6px; cursor: pointer; color: #888; background: transparent; }
  .filter-pill.on { border-color: #1A1A1A; color: #1A1A1A; background: #F0EBE3; font-weight: 600; }
  .filter-sep { width: 1px; height: 20px; background: #EBEBEB; margin: 0 6px; }

  /* PROFILE ISLAND */
  .profile-island { max-width: 1024px; margin: 40px auto; padding: 48px; background: #fff; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #EBEBEB; }
  .profile-header { display: flex; align-items: center; gap: 24px; margin-bottom: 40px; }
  .profile-avatar { width: 90px; height: 90px; border-radius: 50%; background: linear-gradient(135deg, #C4874A, #8B6A3E); border: 4px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); flex-shrink: 0; }
  .profile-name { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 32px; color: #1A1A1A; }
  .profile-role { font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; margin-top: 4px; }
  .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
  .profile-card { background: #FDFCFB; border: 1px solid #EBEBEB; border-radius: 16px; padding: 24px; }
  .profile-card-title { font-size: 16px; font-weight: 600; color: #1A1A1A; margin-bottom: 20px; }
  .profile-field { margin-bottom: 16px; }
  .profile-field-label { font-size: 11px; color: #888; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .profile-field-val { font-size: 14px; color: #1A1A1A; font-weight: 500; background: #fff; border: 1px solid #E5E0DA; padding: 10px 14px; border-radius: 8px; }

  /* FOOTER */
  .footer { background: #1A1A1A; padding: 60px 48px 32px; color: #FAF9F7; }
  .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
  .footer-logo { font-family: 'Funnel Display', sans-serif; font-weight: 800; font-size: 22px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
  .footer-desc { font-size: 13px; color: #888; line-height: 1.7; max-width: 260px; }
  .footer-col-title { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #666; margin-bottom: 14px; }
  .footer-link { font-size: 13px; color: #888; margin-bottom: 10px; cursor: pointer; }
  .footer-bottom { border-top: 1px solid #2E2E2E; padding-top: 20px; display: flex; justify-content: space-between; }
  .footer-copy { font-size: 12px; color: #555; }
`;

const Nav = ({ active = "" }) => (
  <nav className="nav">
    <div className="nav-logo">🌴 myholiday</div>
    <div className="nav-links">
      {["Home", "Destinations", "Marketplace", "About"].map(l => (
        <span key={l} className={`nav-link ${l === active ? "active" : ""}`}>{l}</span>
      ))}
    </div>
    <div className="nav-actions">
      <button className="btn-ghost">Sign In</button>
      <button className="btn-primary">Register</button>
    </div>
  </nav>
);

const CityCard = ({ name, country, tags, matchScore, imgClass, budget }) => (
  <div className="city-card">
    <div className={`city-card-img ${imgClass}`}>
      <div className="city-card-overlay" />
      {matchScore && <div className="city-card-match">{matchScore}% match</div>}
    </div>
    <div className="city-card-body">
      <div className="city-card-name">{name}</div>
      <div className="city-card-country">{country}</div>
      <div className="city-card-tags">
        {tags.map(t => <span key={t} className="tag">{t}</span>)}
        {budget && <span className="tag tag-green">{budget}</span>}
      </div>
    </div>
  </div>
);

const statusMeta = {
  awaiting:    { cls: "s-awaiting",    traveller: "Awaiting Offers",   guide: "Open Listing" },
  has_offers:  { cls: "s-has-offers",  traveller: "3 Offers Received", guide: "Your Offer Submitted" },
  negotiating: { cls: "s-negotiating", traveller: "Negotiating",       guide: "In Negotiation" },
  confirmed:   { cls: "s-confirmed",   traveller: "Booking Confirmed", guide: "Booking Confirmed" },
};

const ListingCard = ({ city, meta, budget, tags, status, guideName, guideCity }) => {
  const s = statusMeta[status] || statusMeta.awaiting;
  return (
    <div className="listing-card">
      <div className="listing-head">
        <div>
          <div className="listing-city">{city}</div>
          <div className="listing-meta-text">{meta}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="listing-budget-num">{budget}</div>
          <div className="listing-budget-label">desired budget</div>
        </div>
      </div>
      <div className="listing-tags">
        {tags.map(t => <span key={t} className="tag">{t}</span>)}
        <span className={`status-badge ${s.cls}`}>{s.traveller}</span>
      </div>
      <div className="listing-bottom">
        {guideName
          ? <><div className="guide-dot" /><div><div className="guide-name-text">{guideName}</div><div className="guide-city-text">{guideCity}</div></div><div className="guide-status">Offer received</div></>
          : <div style={{ fontSize: 12, color: "#AAA" }}>Awaiting guide offers...</div>
        }
      </div>
    </div>
  );
};

const GuideListingCard = ({ title, travellerName, dates, budget, tags, status, offerAmount }) => {
  const isActionable = status === "open";
  return (
    <div className="listing-card">
      <div className="listing-head">
        <div>
          <div className="listing-city">{title}</div>
          <div className="listing-meta-text">{dates} · {travellerName}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="listing-budget-num">{budget}</div>
          <div className="listing-budget-label">traveller budget</div>
        </div>
      </div>
      <div className="listing-tags">
        {tags.map(t => <span key={t} className="tag">{t}</span>)}
        <span className={`status-badge ${status === 'open' ? 's-awaiting' : status === 'negotiating' ? 's-negotiating' : 's-confirmed'}`}>
          {status === 'open' ? 'Open for Offers' : status === 'negotiating' ? 'In Negotiation' : 'Confirmed'}
        </span>
      </div>
      <div className="listing-bottom" style={{ justifyContent: "space-between" }}>
        {offerAmount ? (
          <div><span style={{fontSize: 10, color:"#AAA"}}>Your Offer:</span> <span style={{fontSize: 14, fontWeight: 700, color:"#C4874A", marginLeft: 4}}>{offerAmount}</span></div>
        ) : (
          <div style={{ fontSize: 12, color: "#888" }}>0 offers submitted</div>
        )}
        {isActionable ? (
          <button className="btn-amber" style={{ padding: "6px 12px", fontSize: 11 }}>Submit Offer</button>
        ) : status === 'negotiating' ? (
           <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 11 }}>View Chat</button>
        ) : (
           <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>View Details</button>
        )}
      </div>
    </div>
  );
};

export default function MyHolidayMockup() {
  const [page, setPage] = useState("home");
  const [postStep, setPostStep] = useState(1);
  const [selectedItin, setSelectedItin] = useState(null);
  const [postBudget, setPostBudget] = useState("");

  const pages = [
    { key: "home", label: "Home" },
    { key: "plan-a-trip", label: "Plan a Trip" },
    { key: "destinations", label: "Destinations" },
    { key: "city-detail", label: "City Detail" },
    { key: "marketplace", label: "Traveller Marketplace" },
    { key: "guide-marketplace", label: "Guide Marketplace" },
    { key: "my-itineraries", label: "My Itineraries" },
    { key: "post-itinerary", label: "Post New Itinerary" },
    { key: "my-profile", label: "My Profile" },
    { key: "ai-itinerary", label: "AI Itinerary" },
    { key: "about", label: "About" },
  ];

  return (
    <div className="root">
      <style>{styles}</style>

      <div className="page-tabs">
        <span style={{ fontSize: 11, color: "#AAA", fontFamily: "monospace", alignSelf: "center", marginRight: 8 }}>PAGE:</span>
        {pages.map(p => (
          <button key={p.key} className={`page-tab ${page === p.key ? "active" : ""}`} onClick={() => setPage(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      {/* ─── HOME ─── */}
      {page === "home" && <>
        <Nav active="Home" />

        {/* Hero */}
        <section className="hero">
          <div className="hero-left">
            <div className="hero-tag"><span className="hero-tag-dot" />AI-Powered Travel</div>
            <h1 className="hero-heading">Travel that feels<br /><span className="italic-accent">uniquely yours.</span></h1>
            <p className="hero-sub">Answer a few simple questions and our system recommends destinations that suit your style, budget, and needs — then plans your trip with AI.</p>
            <div className="hero-search">
              <input className="hero-input" placeholder="Where do you want to go?" />
              <button className="hero-search-btn">Search →</button>
            </div>
            <div className="hero-skip">No idea where to go? <a>Start with your preferences →</a></div>
            <div className="hero-stats">
              {[["200+", "Destinations"], ["1.2k+", "Itineraries Generated"], ["300+", "Verified Guides"]].map(([n, l]) => (
                <div key={l}><div className="hero-stat-num">{n}</div><div className="hero-stat-label">{l}</div></div>
              ))}
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-img">
              <div className="hero-img-overlay" />
              <div className="hero-img-badge">
                <div className="hero-img-badge-score">97%</div>
                <div className="hero-img-badge-label">match score</div>
              </div>
              <div className="hero-img-label">
                <div className="hero-img-city">Seoul, South Korea</div>
                <div className="hero-img-meta">City · Food · Culture</div>
              </div>
            </div>
            <div className="hero-float-card">
              <div className="hero-float-icon">🗺️</div>
              <div>
                <div className="hero-float-main">AI Itinerary Ready</div>
                <div className="hero-float-sub">5-day trip · RM 2,400 est.</div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="section">
          <div className="section-header">
            <div>
              <div className="section-tag">How It Works</div>
              <div className="section-title">Three steps to your perfect trip</div>
            </div>
          </div>
          <div className="steps">
            {[
              { num: "01", title: "Set Your Preferences", desc: "Tell us your travel style, budget, group size, dietary needs, and interests." },
              { num: "02", title: "Get City Recommendations", desc: "Our algorithm scores and ranks cities that best match your profile." },
              { num: "03", title: "Plan with AI", desc: "Chat with our AI to generate a personalised day-by-day itinerary." },
            ].map((s, i) => (
              <div key={s.num} className="step">
                <div className="step-num">{s.num}</div>
                <div className="step-icon"><div className="step-icon-inner" /></div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
                {i < 2 && <div className="step-arrow">→</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Featured Destinations */}
        <section className="section section-alt">
          <div className="section-header">
            <div><div className="section-tag">Featured Cities</div><div className="section-title">Popular destinations</div></div>
            <span className="link-btn">View all →</span>
          </div>
          <div className="city-grid">
            <CityCard name="Kyoto" country="Japan" tags={["Culture", "Temples", "Food"]} matchScore={98} imgClass="city-card-img-1" budget="Mid-range" />
            <CityCard name="Bali" country="Indonesia" tags={["Beach", "Nature"]} matchScore={94} imgClass="city-card-img-2" budget="Budget" />
            <CityCard name="Penang" country="Malaysia" tags={["Food", "Heritage"]} matchScore={91} imgClass="city-card-img-3" budget="Budget" />
            <CityCard name="Queenstown" country="New Zealand" tags={["Adventure"]} matchScore={88} imgClass="city-card-img-4" budget="Luxury" />
          </div>
        </section>

        {/* Marketplace Teaser */}
        <section className="section">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", marginBottom: 32 }}>
            <div>
              <div className="section-tag">Marketplace</div>
              <div className="section-title">Connect with verified tour guides</div>
              <div className="section-sub" style={{ marginTop: 10 }}>Post your AI-generated itinerary. Local tour guides send their best offer. Negotiate, agree, and confirm.</div>
              <button className="btn-primary" style={{ marginTop: 22, padding: "12px 28px", fontSize: 14 }}>Browse Marketplace</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["📋", "Post itinerary as listing"], ["💬", "Guides send price offers"], ["🤝", "Negotiate via chat"], ["✅", "Confirm and book"]].map(([icon, label]) => (
                <div key={label} style={{ background: "#F5F2EE", border: "0.5px solid #EBEBEB", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-grid">
            <div>
              <div className="footer-logo">🌴 myholiday</div>
              <div className="footer-desc">AI-powered travel recommendations and itinerary planning for modern travellers.</div>
            </div>
            {[
              { title: "Explore", links: ["Destinations", "Recommendations", "Marketplace", "AI Planner"] },
              { title: "Account", links: ["Sign In", "Register", "My Profile", "My Plans"] },
              { title: "System", links: ["About", "How It Works", "Admin Dashboard", "Contact"] },
            ].map(col => (
              <div key={col.title}>
                <div className="footer-col-title">{col.title}</div>
                {col.links.map(l => <div key={l} className="footer-link">{l}</div>)}
              </div>
            ))}
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2025 MyHoliday. Travel and Tourism Recommendation System.</div>
            <div className="footer-copy">AAPP011-4-2 Capstone Project · Group 1</div>
          </div>
        </footer>
      </>}

      {/* ─── PLAN A TRIP ─── */}
      {page === "plan-a-trip" && <>
        <Nav active="Plan a Trip" />
        <div style={{ background: "#F5F2EE", paddingBottom: 80, paddingTop: 40, minHeight: "100vh" }}>
          
          {/* Progress Bar Container */}
          <div style={{ maxWidth: 800, margin: '0 auto', marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {["Travel Style", "Region", "Budget", "Climate", "Pace"].map((step, i) => (
                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                  <div style={{ width: '100%', height: 6, background: i === 0 ? '#C4874A' : '#E5E0DA', borderRadius: 3 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? '#1A1A1A' : '#888', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-island" style={{ maxWidth: 800, marginTop: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1 style={{ fontFamily: "'Funnel Display', sans-serif", fontSize: 32, fontWeight: 800, color: "#1A1A1A", margin: '0 0 12px 0' }}>What kind of traveller are you?</h1>
              <p style={{ color: "#888", fontSize: 15, margin: 0 }}>Select all travel styles that excite you — the more you pick, the better your matches.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
              {[
                { icon: "🏔️", title: "Adventure", desc: "Hiking, climbing, thrills", selected: true },
                { icon: "🏛️", title: "Culture", desc: "History, art, heritage" },
                { icon: "🏖️", title: "Beach & Relax", desc: "Sun, sand, chill vibes" },
                { icon: "🌿", title: "Nature", desc: "Wildlife, forests, parks", selected: true },
                { icon: "🍜", title: "Food & Cuisine", desc: "Local flavours, markets" },
                { icon: "🌙", title: "Nightlife", desc: "Bars, clubs, live music" },
              ].map((style) => (
                <div key={style.title} style={{ 
                  padding: 24, 
                  borderRadius: 16, 
                  border: style.selected ? '2px solid #C4874A' : '2px solid #EBEBEB',
                  background: style.selected ? '#F0EBE3' : '#fff',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}>
                   {style.selected && <div style={{ position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderRadius: '50%', background: '#C4874A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}>✓</div>}
                   <div style={{ fontSize: 36, marginBottom: 16 }}>{style.icon}</div>
                   <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>{style.title}</div>
                   <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{style.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid #EBEBEB' }}>
               <button style={{ color: '#888', background: 'transparent', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>← Cancel</button>
               <button style={{ background: '#1A1A1A', color: '#fff', padding: '14px 32px', borderRadius: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14 }}>Continue →</button>
            </div>
          </div>
        </div>
      </>}

      {/* ─── DESTINATIONS ─── */}
      {page === "destinations" && <>
        <Nav active="Destinations" />
        <div style={{ background: "#F5F2EE", paddingBottom: 80, paddingTop: 40, minHeight: "100vh" }}>
          <div className="profile-island" style={{ maxWidth: 1100, marginTop: 0 }}>
            <div style={{ marginBottom: 32 }}>
              <div className="section-tag" style={{ background: "#EAF3DE", color: "#3B6D11", display: 'inline-block', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Explore the World</div>
              <h1 style={{ fontFamily: "'Funnel Display', sans-serif", fontSize: 36, fontWeight: 800, color: "#1A1A1A", margin: 0 }}>Browse Destinations</h1>
              <p style={{ color: "#888", fontSize: 15, marginTop: 8 }}>Discover curated cities matched precisely to your unique travel algorithm.</p>
            </div>

            {/* Smart Search Bar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexDirection: 'column', sm: { flexDirection: 'row' } }}>
               <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 18, fontSize: 18 }}>🔍</span>
                  <input type="text" placeholder="Search cities, countries, or specific travel tags..." style={{ width: '100%', padding: '16px 16px 16px 48px', border: '1.5px solid #EBEBEB', borderRadius: 14, outline: 'none', fontSize: 14, background: '#FDFCFB', color: '#1A1A1A', fontWeight: 500 }} />
               </div>
               <button style={{ padding: '16px 32px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Search</button>
            </div>

            {/* Comprehensive Dynamic Filters */}
            <div style={{ background: '#FAF9F7', border: '1px solid #E5E0DA', borderRadius: 16, padding: 20, marginBottom: 40 }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                 {/* Category Filter */}
                 <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Primary Region</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {["All", "Asia", "Europe", "Oceania", "Americas"].map((f, i) => (
                        <span key={f} className={`filter-pill ${i === 0 ? "on" : ""}`} style={i === 0 ? { background: '#1A1A1A', color: '#fff', borderColor: '#1A1A1A' } : {}}>{f}</span>
                      ))}
                    </div>
                 </div>

                 {/* Tags Filter */}
                 <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Travel Style</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {["Culture", "Nature", "Adventure", "Beaches", "Food"].map((f, i) => (
                        <span key={f} className={`filter-pill ${i === 2 ? "on" : ""}`} style={i === 2 ? { background: '#F0EBE3', color: '#1A1A1A', borderColor: '#C4874A' } : {}}>{f}</span>
                      ))}
                    </div>
                 </div>

                 {/* Budget Filter */}
                 <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Estimated Cost</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {["Any", "$", "$$", "$$$"].map((f, i) => (
                        <span key={f} className={`filter-pill ${i === 0 ? "on" : ""}`} style={i === 0 ? { background: '#EAF3DE', color: '#3B6D11', borderColor: '#3B6D11' } : {}}>{f}</span>
                      ))}
                    </div>
                 </div>
               </div>
            </div>

            {/* Listing Grid */}
            <div style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>8 Destinations Found</div>
               <div style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>Sort by: <span style={{ color: '#1A1A1A', cursor: 'pointer' }}>Match Score (Highest) ↓</span></div>
            </div>

            <div className="city-grid" style={{ gap: 24 }}>
              {[
                { name: "Kyoto", country: "Japan", tags: ["Culture", "Food"], matchScore: 98, imgClass: "city-card-img-1", budget: "$$$" },
                { name: "Bali", country: "Indonesia", tags: ["Beach", "Nature"], matchScore: 94, imgClass: "city-card-img-2", budget: "$" },
                { name: "Penang", country: "Malaysia", tags: ["Food", "Heritage"], matchScore: 91, imgClass: "city-card-img-3", budget: "$" },
                { name: "Queenstown", country: "New Zealand", tags: ["Adventure"], matchScore: 88, imgClass: "city-card-img-4", budget: "$$$" },
                { name: "Chiang Mai", country: "Thailand", tags: ["Culture", "Food"], matchScore: 85, imgClass: "city-card-img-5", budget: "$" },
                { name: "Seoul", country: "South Korea", tags: ["City", "Food"], matchScore: 82, imgClass: "city-card-img-6", budget: "$$" },
                { name: "Cappadocia", country: "Turkey", tags: ["Adventure", "Nature"], matchScore: 79, imgClass: "city-card-img-7", budget: "$$" },
                { name: "Langkawi", country: "Malaysia", tags: ["Beach", "Nature"], matchScore: 76, imgClass: "city-card-img-8", budget: "$" },
              ].map(c => <CityCard key={c.name} {...c} />)}
            </div>
          </div>
        </div>
      </>}

      {/* ─── CITY DETAIL ─── */}
      {page === "city-detail" && <>
        <Nav />
        <section className="section">
          <div className="breadcrumb">← Destinations <span style={{ color: "#CCC", margin: "0 4px" }}>/</span> <span style={{ color: "#1A1A1A", fontWeight: 600 }}>Kyoto</span></div>
          <div className="detail-layout">
            <div>
              <div className="city-hero-img" style={{ background: "linear-gradient(135deg, #C9D4C5, #A8BAA4)" }}>
                <div className="city-hero-overlay" />
                <div className="city-hero-match">
                  <div className="city-hero-match-num">98%</div>
                  <div className="city-hero-match-label">match score</div>
                </div>
                <div className="city-hero-text">
                  <div className="city-hero-name">Kyoto, Japan</div>
                  <div className="city-hero-tags">
                    {["Culture", "Temples", "Food", "Halal-friendly"].map(t => <span key={t} className="city-hero-tag">{t}</span>)}
                  </div>
                </div>
              </div>
              <div className="stat-row">
                {[["Est. Budget / Day", "RM 420 – 680"], ["Best Season", "Mar – May, Oct – Nov"], ["Avg. Trip Duration", "5 – 7 days"]].map(([l, v]) => (
                  <div key={l} className="stat-card"><div className="stat-label">{l}</div><div className="stat-val">{v}</div></div>
                ))}
              </div>
              <div className="about-card">
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", marginBottom: 10 }}>About Kyoto</div>
                <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>Kyoto is Japan's cultural heartland, home to over 1,600 Buddhist temples and 400 Shinto shrines. The city blends ancient tradition with modern sensibility — from the bamboo groves of Arashiyama to the neon-lit streets of Gion at night.</div>
              </div>
              <div className="about-card">
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", marginBottom: 4 }}>What this destination is known for</div>
                <div className="ratings-list">
                  {[["Culture", 5], ["Cuisine", 4], ["Urban", 3], ["Wellness", 3], ["Nature", 3], ["Seclusion", 2], ["Nightlife", 2], ["Adventure", 1], ["Beaches", 0]].map(([label, val]) => (
                    <div key={label} className="rating-row">
                      <div className="rating-label">{label}</div>
                      <div className="rating-bar-bg"><div className="rating-bar-fill" style={{ width: `${val * 20}%` }} /></div>
                      <div className="rating-num">{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="sidebar-cta-card">
                <div className="sidebar-cta-title">Ready to plan this trip?</div>
                <div className="sidebar-cta-sub">Chat with our AI to generate a personalised day-by-day itinerary based on your profile.</div>
                <button className="btn-amber" style={{ width: "100%", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 8 }}>Generate AI Itinerary</button>
                <button className="btn-ghost" style={{ width: "100%", padding: 12, borderRadius: 8, fontSize: 13, background: "transparent", borderColor: "#333", color: "#888" }}>Save to My Profile</button>
              </div>
              <div className="sidebar-links-card">
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", marginBottom: 14 }}>Booking Resources</div>
                {["Flights via Skyscanner", "Hotels via Booking.com", "Activities via Klook", "Transport passes"].map(l => (
                  <div key={l} className="sidebar-link-row"><span className="sidebar-link-label">{l}</span><span className="sidebar-link-arrow">↗</span></div>
                ))}
                <div style={{ fontSize: 10, color: "#AAA", marginTop: 10 }}>External links — opens outside MyHoliday</div>
              </div>
            </div>
          </div>
        </section>
      </>}

      {/* ─── MARKETPLACE ─── */}
      {page === "marketplace" && <>
        <Nav active="Marketplace" />
        <section className="section">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", marginBottom: 40 }}>
            <div>
              <div className="section-tag">Marketplace</div>
              <div className="section-title">Find a Tour Guide</div>
              <div className="section-sub" style={{ marginTop: 10 }}>Post your saved itinerary. Verified local guides browse and send their best offer. Negotiate and confirm your booking.</div>
              <button className="btn-primary" style={{ marginTop: 22, padding: "12px 28px", fontSize: 14 }}>Post My Itinerary</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["📋", "Post itinerary as listing"], ["💬", "Guides send price offers"], ["🤝", "Negotiate via chat"], ["✅", "Confirm and book"]].map(([icon, label]) => (
                <div key={label} style={{ background: "#F5F2EE", border: "0.5px solid #EBEBEB", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {["All Listings", "Open", "Has Offers", "My Listings"].map((t, i) => (
              <span key={t} style={{ padding: "6px 16px", fontSize: 12, border: "1.5px solid", borderColor: i === 0 ? "#1A1A1A" : "#E5E0DA", borderRadius: 6, cursor: "pointer", color: i === 0 ? "#1A1A1A" : "#888", background: i === 0 ? "#F0EBE3" : "transparent", fontWeight: i === 0 ? 600 : 400 }}>{t}</span>
            ))}
          </div>
          <div className="listing-grid">
            <ListingCard city="Kyoto, Japan" meta="5 days · 2 pax" budget="RM 3,200" tags={["Culture", "Halal food"]} status="has_offers" guideName="Ahmad R." guideCity="Certified · Kyoto" />
            <ListingCard city="Bali, Indonesia" meta="7 days · 4 pax" budget="RM 5,800" tags={["Beach", "Family"]} status="awaiting" />
            <ListingCard city="Penang, Malaysia" meta="3 days · Solo" budget="RM 900" tags={["Food", "Budget"]} status="negotiating" guideName="Mei L." guideCity="Certified · Penang" />
            <ListingCard city="Seoul, South Korea" meta="6 days · 2 pax" budget="RM 4,100" tags={["City", "Shopping"]} status="awaiting" />
            <ListingCard city="Chiang Mai, Thailand" meta="4 days · Solo" budget="RM 1,400" tags={["Culture", "Budget"]} status="has_offers" guideName="Somchai K." guideCity="Certified · Chiang Mai" />
            <ListingCard city="Langkawi, Malaysia" meta="5 days · Family" budget="RM 3,600" tags={["Beach", "Family"]} status="confirmed" guideName="Razif H." guideCity="Certified · Langkawi" />
          </div>
        </section>
      </>}

      {/* ─── GUIDE MARKETPLACE ─── */}
      {page === "guide-marketplace" && <>
        <Nav active="Marketplace" />
        <section className="section">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", marginBottom: 40 }}>
            <div>
              <div className="section-tag" style={{ color: "#3B6D11", background: "#EAF3DE", display: "inline-flex", padding: "4px 10px", borderRadius: 6, marginBottom: 16, alignItems: "center", gap: 6 }}>💼 Tour Guide Workspace</div>
              <div className="section-title">Find your next client</div>
              <div className="section-sub" style={{ marginTop: 10 }}>Browse itineraries posted by travellers visiting your certified city. Submit competitive price offers and secure bookings.</div>
              <div style={{ marginTop: 22, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>Status:</span>
                <span className="tag tag-green">Verified Guide</span>
                <span style={{ fontSize: 12, color: "#888" }}>Assigned to: Kyoto, Japan</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["🔍", "Browse open listings"], ["💸", "Submit price offers"], ["💬", "Chat with travellers"], ["📅", "Manage bookings"]].map(([icon, label]) => (
                <div key={label} style={{ background: "#F5F2EE", border: "0.5px solid #EBEBEB", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24, justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {["Available Requests", "My Offers", "Confirmed Bookings"].map((t, i) => (
                <span key={t} style={{ padding: "6px 16px", fontSize: 12, border: "1.5px solid", borderColor: i === 0 ? "#1A1A1A" : "#E5E0DA", borderRadius: 6, cursor: "pointer", color: i === 0 ? "#1A1A1A" : "#888", background: i === 0 ? "#F0EBE3" : "transparent", fontWeight: i === 0 ? 600 : 400 }}>{t}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>
              Showing listings for <strong>Kyoto, Japan</strong>
            </div>
          </div>
          <div className="listing-grid">
            <GuideListingCard title="5-Day Cultural Tour" travellerName="John D." dates="Oct 12 - Oct 17" budget="RM 3,200" tags={["Culture", "Temples"]} status="open" />
            <GuideListingCard title="Family Vacation in Kyoto" travellerName="Sarah W." dates="Nov 01 - Nov 07" budget="RM 6,000" tags={["Family", "Relaxed"]} status="negotiating" offerAmount="RM 5,800" />
            <GuideListingCard title="Solo Photography Trip" travellerName="Michael L." dates="Dec 10 - Dec 14" budget="RM 2,500" tags={["Photography", "Walking"]} status="open" />
            <GuideListingCard title="Honeymoon Getaway" travellerName="Emily C." dates="Sep 20 - Sep 25" budget="RM 4,500" tags={["Luxury", "Couples"]} status="confirmed" offerAmount="RM 4,300" />
            <GuideListingCard title="Anime & Manga Tour" travellerName="Kevin H." dates="Aug 05 - Aug 10" budget="RM 2,800" tags={["Pop Culture", "Youth"]} status="open" />
            <GuideListingCard title="Kyoto Foodie Adventure" travellerName="Amanda R." dates="Oct 20 - Oct 23" budget="RM 1,800" tags={["Food", "Budget"]} status="negotiating" offerAmount="RM 1,850" />
          </div>
        </section>
      </>}

      {/* ─── MY PROFILE ─── */}
      {page === "my-profile" && <>
        <Nav active="" />
        <div style={{ padding: "1px 0" }}>
          <section className="profile-island">
            <div className="profile-header">
              <div className="profile-avatar" />
              <div>
                <div className="hero-tag" style={{ margin: 0, marginBottom: 8 }}><span className="hero-tag-dot" /> Verified Traveller</div>
                <div className="profile-name">Sarah Jenkins</div>
                <div className="profile-role">Joined March 2025</div>
              </div>
              <button className="btn-primary" style={{ marginLeft: "auto" }}>Save Changes</button>
            </div>
            
            <div className="profile-grid">
              <div className="profile-card">
                <div className="profile-card-title">Personal Information</div>
                <div className="profile-field">
                  <div className="profile-field-label">Full Name</div>
                  <div className="profile-field-val">Sarah Jenkins</div>
                </div>
                <div className="profile-field">
                  <div className="profile-field-label">Nationality</div>
                  <div className="profile-field-val">British</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="profile-field">
                    <div className="profile-field-label">Age</div>
                    <div className="profile-field-val">28</div>
                  </div>
                  <div className="profile-field">
                    <div className="profile-field-label">Language</div>
                    <div className="profile-field-val">English</div>
                  </div>
                </div>
              </div>

              <div className="profile-card">
                <div className="profile-card-title">Travel Preferences</div>
                <div className="profile-field">
                  <div className="profile-field-label">Dietary Restrictions</div>
                  <div className="profile-field-val" style={{ background: "#F0EBE3", borderColor: "#E0D8CC", color: "#8B6A3E", fontWeight: 600 }}>Vegetarian</div>
                </div>
                <div className="profile-field">
                  <div className="profile-field-label">Accessibility Needs</div>
                  <div className="profile-field-val">None</div>
                </div>
                
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #EBEBEB" }}>
                   <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5, margin: "0 0 12px 0" }}>
                     Ready to upgrade your account to offer local tours in your home country?
                   </div>
                   <button className="btn-ghost" style={{ width: "100%", justifyContent: "center", display: "flex" }}>Apply as Tour Guide</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </>}

      {/* ─── AI ITINERARY ─── */}
      {page === "ai-itinerary" && <>
        <Nav />
        <section className="section">
          <div className="ai-layout">
            <div>
              <div className="section-tag">AI Itinerary Planner</div>
              <div className="section-title">Your personalised<br />Kyoto itinerary</div>
              <div className="section-sub" style={{ marginTop: 10 }}>MyHoliday AI knows your preferences — age, dietary restrictions, travel style, and budget — and builds a custom day-by-day plan. Refine it through conversation.</div>
              <div className="chip-row">
                {[["Duration", "5 days"], ["Desired Budget", "RM 3,200"], ["Style", "Mid-range"], ["Dietary", "Halal"]].map(([l, v]) => (
                  <div key={l} className="chip"><div className="chip-label">{l}</div><div className="chip-val">{v}</div></div>
                ))}
              </div>
              <div className="itinerary-card">
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", marginBottom: 14 }}>Generated Itinerary</div>
                {["Day 1 — Arrival & Gion District", "Day 2 — Fushimi Inari & Nishiki Market", "Day 3 — Arashiyama & Bamboo Grove", "Day 4 — Nijo Castle & Tea Ceremony", "Day 5 — Philosopher's Path & Departure"].map((d, i) => (
                  <div key={d} className="day-row" style={{ borderBottom: i < 4 ? "1px solid #F5F2EE" : "none" }}>
                    <div className="day-num">{i + 1}</div>
                    <div className="day-text">{d}</div>
                  </div>
                ))}
                <div className="itinerary-actions">
                  <button className="btn-primary" style={{ flex: 1, padding: 10, fontSize: 12 }}>Save Itinerary</button>
                  <button className="btn-ghost" style={{ flex: 1, padding: 10, fontSize: 12 }}>Post to Marketplace</button>
                </div>
              </div>
            </div>
            <div>
              <div className="ai-chat-window">
                <div className="ai-chat-header">
                  <div className="ai-chat-dot" />
                  <div className="ai-chat-title">MyHoliday AI</div>
                  <div className="ai-chat-sub">Kyoto · 5-day plan</div>
                </div>
                <div className="ai-chat-body">
                  <div className="bubble bubble-ai">Hi! I've built your 5-day Kyoto itinerary. All food recommendations are Halal-certified. Want to adjust anything?</div>
                  <div className="bubble bubble-user">Can you add more temples on Day 2?</div>
                  <div className="bubble bubble-ai">Of course! I've added Tofuku-ji Temple before Fushimi Inari. It opens at 9am. Shall I also adjust lunch timing?</div>
                  <div className="bubble bubble-user">Yes, and can you suggest Halal restaurants nearby?</div>
                  <div className="bubble bubble-ai">Absolutely — I've added 3 Halal-certified restaurants near Fushimi Inari. Updated itinerary is reflected on the left.</div>
                </div>
                <div className="ai-chat-input-row">
                  <input className="ai-chat-field" placeholder="Ask the AI to refine your itinerary..." />
                  <button className="ai-send-btn">Send</button>
                </div>
              </div>
              <div className="ai-note">✦ AI is aware of your age, dietary restrictions, accessibility needs, and travel style from your profile.</div>
            </div>
          </div>
        </section>
      </>}

      {/* ─── POST NEW ITINERARY ─── */}
      {page === "post-itinerary" && <>
        <Nav active="Marketplace" />
        <section className="section" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 48px" }}>
          
          {/* Header (Identical style to the screenshot's dark banner) */}
          <div style={{ background: "linear-gradient(145deg, #1A1A1A, #111)", borderRadius: 16, padding: "40px 48px", color: "#FAF9F7", display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <div>
              <div style={{ background: "rgba(196,135,74,0.15)", border: "1px solid rgba(196,135,74,0.3)", color: "#C4874A", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: "4px 12px", borderRadius: 20, display: "inline-block", marginBottom: 16, textTransform: "uppercase" }}>Marketplace</div>
              <h1 style={{ fontFamily: "'Funnel Display', sans-serif", fontSize: 36, fontWeight: 800, margin: "0 0 10px 0" }}>Post New Itinerary</h1>
              <p style={{ color: "#AAA", fontSize: 14, margin: 0, maxWidth: 500, lineHeight: 1.6 }}>Select a finalized itinerary to list on the marketplace and receive offers from verified local tour guides.</p>
            </div>
            
            {/* Steps indicator */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "10px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: postStep >= 1 ? 1 : 0.5 }}>
                 <div style={{ width: 22, height: 22, borderRadius: "50%", background: postStep === 1 ? "#C4874A" : "transparent", border: postStep === 1 ? "none" : "1px solid #888", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: postStep === 1 ? "#fff" : "#888" }}>1</div>
                 <span style={{ fontSize: 12, fontWeight: postStep === 1 ? 600 : 500, color: postStep === 1 ? "#FAF9F7" : "#888" }}>Select</span>
              </div>
              <span style={{ color: "#444", margin: "0 4px" }}>—</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: postStep >= 2 ? 1 : 0.5 }}>
                 <div style={{ width: 22, height: 22, borderRadius: "50%", background: postStep === 2 ? "#C4874A" : "transparent", border: postStep === 2 ? "none" : "1px solid #888", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: postStep === 2 ? "#fff" : "#888" }}>2</div>
                 <span style={{ fontSize: 12, fontWeight: postStep === 2 ? 600 : 500, color: postStep === 2 ? "#FAF9F7" : "#888" }}>Budget</span>
              </div>
              <span style={{ color: "#444", margin: "0 4px" }}>—</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: postStep === 3 ? 1 : 0.5 }}>
                 <div style={{ width: 22, height: 22, borderRadius: "50%", background: postStep === 3 ? "#C4874A" : "transparent", border: postStep === 3 ? "none" : "1px solid #888", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: postStep === 3 ? "#fff" : "#888" }}>3</div>
                 <span style={{ fontSize: 12, fontWeight: postStep === 3 ? 600 : 500, color: postStep === 3 ? "#FAF9F7" : "#888" }}>Review</span>
              </div>
            </div>
          </div>

          {/* Step 1: Select Itinerary */}
          {postStep === 1 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", marginBottom: 20 }}>Finalized Itineraries</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 40 }}>
                {[
                  { id: 1,  city: "Tokyo", days: 8, tags: ["SOLO", "BALANCED", "LUXURY"], country: "Japan", img: "linear-gradient(to bottom, #A1C4FD, #C2E9FB)" },
                  { id: 2,  city: "Seoul", days: 5, tags: ["COUPLE", "FAST-PACED", "MID-RANGE"], country: "South Korea", img: "linear-gradient(to bottom, #ff9a9e, #fecfef)" },
                  { id: 3,  city: "Bali", days: 7, tags: ["FAMILY", "RELAXED", "BUDGET"], country: "Indonesia", img: "linear-gradient(to bottom, #84fab0, #8fd3f4)" }
                ].map((itin) => {
                  const isSelected = selectedItin === itin.id;
                  return (
                    <div 
                      key={itin.id} 
                      onClick={() => setSelectedItin(itin.id)}
                      style={{ 
                        background: "#fff", 
                        borderRadius: 16, 
                        overflow: "hidden", 
                        border: isSelected ? "2.5px solid #1A1A1A" : "1px solid #EBEBEB", 
                        cursor: "pointer", 
                        transition: "all 0.2s ease",
                        boxShadow: isSelected ? "0 8px 24px rgba(0,0,0,0.08)" : "none",
                        position: "relative"
                      }}
                    >
                      {isSelected && (
                        <div style={{ position: "absolute", top: 12, right: 12, width: 26, height: 26, borderRadius: "50%", background: "#1A1A1A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                      <div style={{ height: 180, background: itin.img, position: "relative" }}>
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.1)" }} />
                      </div>
                      <div style={{ padding: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>{itin.city} · {itin.days} Days</div>
                          <div style={{ fontSize: 10, color: "#C4874A", fontWeight: 700, textTransform: "uppercase" }}>12 APR - 19 APR</div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>{itin.country}</div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {itin.tags.map(t => (
                              <span key={t} style={{ background: "#F5F2EE", padding: "4px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, color: "#888" }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #EBEBEB", paddingTop: 24 }}>
                <button 
                  disabled={!selectedItin}
                  onClick={() => setPostStep(2)}
                  className="btn-primary" 
                  style={{ padding: "14px 32px", fontSize: 14, opacity: selectedItin ? 1 : 0.5, cursor: selectedItin ? "pointer" : "not-allowed" }}
                >
                  Proceed to Budgeting →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Budget */}
          {postStep === 2 && (
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>💰</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", marginBottom: 8, fontFamily: "'Funnel Display', sans-serif" }}>Set Your Budget</h2>
                <p style={{ color: "#666", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>How much are you willing to pay a local tour guide to execute this itinerary? Guides will send you offers based on this amount.</p>
                
                <div style={{ position: "relative", maxWidth: 300, margin: "0 auto 32px" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 20, fontWeight: 700, color: "#1A1A1A" }}>RM</span>
                  <input 
                    type="number" 
                    value={postBudget}
                    onChange={(e) => setPostBudget(e.target.value)}
                    placeholder="2500" 
                    style={{ width: "100%", padding: "16px 16px 16px 64px", fontSize: 24, fontWeight: 800, fontFamily: "'Funnel Display', sans-serif", border: "2px solid #EBEBEB", borderRadius: 12, outline: "none", color: "#1A1A1A", textAlign: "center" }} 
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
                  <button onClick={() => setPostStep(1)} className="btn-ghost" style={{ padding: "14px 28px", fontSize: 14 }}>← Back</button>
                  <button onClick={() => setPostStep(3)} disabled={!postBudget} className="btn-primary" style={{ padding: "14px 28px", fontSize: 14, opacity: postBudget ? 1 : 0.5 }}>Review Details →</button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {postStep === 3 && (
            <div style={{ maxWidth: 700, margin: "0 auto" }}>
              <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, padding: "40px" }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", marginBottom: 24, fontFamily: "'Funnel Display', sans-serif" }}>Review & List</h2>
                
                <div style={{ background: "#F9F9F9", borderRadius: 12, padding: 24, marginBottom: 32 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #EBEBEB" }}>
                    <div>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Selected Itinerary</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>Tokyo · 8 Days</div>
                    </div>
                    <button onClick={() => setPostStep(1)} style={{ background: "none", border: "none", color: "#C4874A", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>Edit</button>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Desired Guide Budget</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", fontFamily: "'Funnel Display', sans-serif" }}>RM {postBudget}</div>
                    </div>
                    <button onClick={() => setPostStep(2)} style={{ background: "none", border: "none", color: "#C4874A", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>Edit</button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, padding: 16, background: "#F0EBE3", borderRadius: 10, alignItems: "flex-start", marginBottom: 32 }}>
                   <div style={{ fontSize: 18 }}>ℹ️</div>
                   <div style={{ fontSize: 12, color: "#8B6A3E", lineHeight: 1.5 }}>By posting this listing, verified local guides in Japan will be able to review your itinerary and submit competing price proposals. You are not charged until you accept an offer.</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setPostStep(2)} className="btn-ghost" style={{ padding: "14px 28px", fontSize: 14 }}>← Back</button>
                  <button onClick={() => { setPostStep(1); setPage("marketplace"); }} className="btn-amber" style={{ padding: "14px 32px", fontSize: 14 }}>Post to Marketplace ✓</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </>}

      {page === "my-itineraries" && <>
        <Nav active="" />
        <section className="section" style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 48px" }}>
          <div className="section-header" style={{ marginBottom: 40 }}>
            <div>
              <div className="section-tag">My Plans</div>
              <div className="section-title" style={{ fontSize: 36 }}>Your Saved Itineraries</div>
            </div>
            <button className="btn-primary" style={{ padding: "12px 24px" }}>+ Plan New Trip</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Card 1: Listed with Offers */}
            <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#1A1A1A", marginBottom: 6 }}>Kyoto Highlights</div>
                  <div style={{ fontSize: 13, color: "#888", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, color: "#666" }}>Kyoto, Japan</span> • Created 12 Mar 2025
                  </div>
                </div>
                <div className="tag tag-green" style={{ padding: "5px 12px", fontSize: 11 }}>Mid-range</div>
              </div>

              <div style={{ background: "#FDFCFB", border: "1px solid #F0EDE9", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#C4874A", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>Day 1 Preview</div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>Arrival at Kansai Airport, check-in at downtown hotel, evening walk through Gion District and dinner at local Halal restaurant...</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 20, borderTop: "1px solid #E5E0DA" }}>
                <div className="status-badge s-has-offers" style={{ padding: "6px 12px", fontSize: 12 }}>Listed: 3 Offers</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-ghost" style={{ padding: "10px 18px" }}>View & Edit</button>
                  <button className="btn-primary" style={{ padding: "10px 18px" }}>Manage Offers</button>
                </div>
              </div>
            </div>

            {/* Card 2: Draft / Needs listing */}
            <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#1A1A1A", marginBottom: 6 }}>Seoul Spring Trip</div>
                  <div style={{ fontSize: 13, color: "#888", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, color: "#666" }}>Seoul, South Korea</span> • Created 28 Feb 2025
                  </div>
                </div>
                <div className="tag" style={{ background: "#FCE8E8", color: "#B91C1C", padding: "5px 12px", fontSize: 11 }}>Budget</div>
              </div>

              <div style={{ background: "#FDFCFB", border: "1px solid #F0EDE9", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#C4874A", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>Day 1 Preview</div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>Morning visit to Gyeongbokgung Palace, followed by Bukchon Hanok Village. Afternoon street food hunting at Myeongdong...</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 20, borderTop: "1px solid #E5E0DA" }}>
                <div className="status-badge s-awaiting" style={{ padding: "6px 12px", fontSize: 12 }}>Draft / Not Listed</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-ghost" style={{ padding: "10px 18px" }}>View & Edit</button>
                  <button className="btn-amber" style={{ padding: "10px 18px" }}>Post to Marketplace</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>}


      {/* ─── ABOUT ─── */}
      {page === "about" && <>
        <Nav active="About" />

        {/* Hero Banner */}
        <section style={{ background: "#1A1A1A", padding: "80px 48px", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#C4874A", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 16 }}>About MyHoliday</div>
          <h1 style={{ fontFamily: "'Funnel Display', sans-serif", fontWeight: 800, fontSize: 48, color: "#FAF9F7", lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 20 }}>
            Built for travellers who want<br /><span style={{ fontFamily: "'Noto Serif', serif", fontStyle: "italic", color: "#C4874A" }}>more than a list of places.</span>
          </h1>
          <p style={{ fontSize: 16, color: "#888", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 36px" }}>
            MyHoliday is a data-driven travel recommendation system that goes beyond generic suggestions — matching you to destinations based on your actual preferences, then helping you plan every detail with AI.
          </p>
          <div style={{ display: "flex", gap: 48, justifyContent: "center" }}>
            {[["200+", "Destinations"], ["1.2k+", "Itineraries Generated"], ["300+", "Verified Tour Guides"], ["6", "Team Members"]].map(([n, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Funnel Display', sans-serif", fontWeight: 800, fontSize: 32, color: "#FAF9F7" }}>{n}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* What We Built */}
        <section className="section">
          <div className="section-header" style={{ marginBottom: 40 }}>
            <div>
              <div className="section-tag">What We Built</div>
              <div className="section-title">A complete travel ecosystem</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { icon: "🎯", title: "Preference-Based Recommendations", desc: "Answer a short quiz about your travel style, budget, dietary needs, and interests. Our algorithm scores destinations across 9 thematic dimensions and returns a personalised ranked list." },
              { icon: "🤖", title: "AI Itinerary Planner", desc: "Chat with our AI assistant to build a day-by-day itinerary. The AI is aware of your profile — including dietary restrictions, accessibility needs, and preferred budget — and refines the plan through conversation." },
              { icon: "🛒", title: "Tour Guide Marketplace", desc: "Post your AI-generated itinerary to the marketplace. Verified local tour guides in your destination city browse listings, submit price offers, and negotiate via in-platform chat before you confirm a booking." },
              { icon: "🔐", title: "Dual-Role Authentication", desc: "Separate registration flows for travellers and tour guides. Guides undergo a simulated verification process — uploading documents for admin approval — before they can access the marketplace." },
              { icon: "📊", title: "Admin Analytics Dashboard", desc: "A data visualisation dashboard for administrators, showing descriptive statistics on popular destinations, itinerary trends, marketplace activity, user demographics, and transaction volume over time." },
              { icon: "🗺️", title: "City Detail Pages", desc: "Each destination has a full profile — thematic ratings across 9 categories, estimated daily budget, best travel season, external booking links, and a one-click entry point into the AI planner." },
            ].map(f => (
              <div key={f.title} style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="section section-alt">
          <div className="section-header" style={{ marginBottom: 40 }}>
            <div>
              <div className="section-tag">Technology</div>
              <div className="section-title">How it's built</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Framework", "Next.js 14 — App Router, single codebase for frontend and API"],
                  ["Database", "PostgreSQL hosted on Supabase — 11 tables, fully normalised"],
                  ["Styling", "Tailwind CSS 3 with a custom design token system"],
                  ["Charts", "Recharts — used for admin dashboard analytics"],
                  ["Fonts", "Funnel Display (headings) + Noto Serif (body)"],
                  ["Deployment", "Vercel — continuous deployment from GitHub"],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 10, padding: "14px 18px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#C4874A", textTransform: "uppercase", letterSpacing: "0.6px", minWidth: 90, paddingTop: 1 }}>{label}</div>
                    <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ background: "#1A1A1A", borderRadius: 14, padding: 28, height: "100%" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#C4874A", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 18 }}>Database at a Glance</div>
                {[
                  ["destinations", "City profiles, thematic ratings, JSONB climate data"],
                  ["users", "Traveller and admin accounts with full profile"],
                  ["tour_guides", "Guide accounts, city assignment, verification status"],
                  ["itineraries", "Saved AI-generated plans, JSONB content"],
                  ["marketplace_listings", "Posted itineraries with desired_budget"],
                  ["marketplace_offers", "Guide price proposals per listing"],
                  ["marketplace_messages", "Polymorphic chat between traveller and guide"],
                  ["transactions", "Booking records with payout constraint"],
                ].map(([table, desc]) => (
                  <div key={table} style={{ padding: "10px 0", borderBottom: "1px solid #2A2A2A" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#FAF9F7", fontFamily: "monospace", marginBottom: 3 }}>{table}</div>
                    <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How the Journey Works */}
        <section className="section">
          <div className="section-header" style={{ marginBottom: 40 }}>
            <div>
              <div className="section-tag">User Journey</div>
              <div className="section-title">From sign-up to confirmed booking</div>
            </div>
          </div>
          <div style={{ position: "relative" }}>
            {/* Connector line */}
            <div style={{ position: "absolute", top: 24, left: 24, right: 24, height: 2, background: "#F0EBE3", zIndex: 0 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, position: "relative", zIndex: 1 }}>
              {[
                { step: "01", label: "Register", desc: "Create a traveller or tour guide account" },
                { step: "02", label: "Set Preferences", desc: "Answer the travel preference quiz" },
                { step: "03", label: "Get Recommendations", desc: "Receive scored city suggestions" },
                { step: "04", label: "Plan with AI", desc: "Build a day-by-day itinerary via chat" },
                { step: "05", label: "Post to Marketplace", desc: "List your itinerary with a desired budget" },
                { step: "06", label: "Confirm Booking", desc: "Accept a guide's offer and book" },
              ].map((s, i) => (
                <div key={s.step} style={{ textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: i === 5 ? "#C4874A" : "#1A1A1A", color: "#FAF9F7", fontFamily: "'Funnel Display', sans-serif", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>{s.step}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", marginBottom: 5 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="section section-alt">
          <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
            <div className="section-tag" style={{ textAlign: "center" }}>Academic Project</div>
            <div className="section-title" style={{ marginBottom: 16 }}>Built for AAPP011-4-2</div>
            <p style={{ fontSize: 15, color: "#666", lineHeight: 1.8, marginBottom: 28 }}>
              MyHoliday is a capstone project developed by Group 1 of the Diploma in ICT (Data Informatics) programme at Asia Pacific University (APU), Malaysia. The system is built for academic assessment purposes.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                ["Group", "Group 1 — UCDF2407ICT(DI)"],
                ["Subject", "AAPP011-4-2 Capstone Project"],
                ["Institution", "Asia Pacific University, Malaysia"],
                ["Payment note", "Transactions are simulated — no real payments are processed"],
              ].map(([label, val]) => (
                <div key={label} style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 10, padding: "12px 18px", textAlign: "left", minWidth: 200 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#C4874A", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn-primary" style={{ padding: "12px 28px", fontSize: 14 }}>Get Started</button>
              <button className="btn-ghost" style={{ padding: "12px 28px", fontSize: 14 }}>Browse Destinations</button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-grid">
            <div>
              <div className="footer-logo">🌴 myholiday</div>
              <div className="footer-desc">AI-powered travel recommendations and itinerary planning for modern travellers.</div>
            </div>
            {[
              { title: "Explore", links: ["Destinations", "Recommendations", "Marketplace", "AI Planner"] },
              { title: "Account", links: ["Sign In", "Register", "My Profile", "My Plans"] },
              { title: "System", links: ["About", "How It Works", "Admin Dashboard", "Contact"] },
            ].map(col => (
              <div key={col.title}>
                <div className="footer-col-title">{col.title}</div>
                {col.links.map(l => <div key={l} className="footer-link">{l}</div>)}
              </div>
            ))}
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2025 MyHoliday. Travel and Tourism Recommendation System.</div>
            <div className="footer-copy">AAPP011-4-2 Capstone Project · Group 1</div>
          </div>
        </footer>
      </>}
    </div>
  );
}
