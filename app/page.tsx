"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp, ArrowRight, Bookmark, CalendarDays, Check, ChevronDown, CircleHelp,
  Compass, ExternalLink, Filter, Flame, Layers3, MapPin, Radar,
  Search, Settings2, Sparkles, Timer, TrendingUp, X,
} from "lucide-react";
import { demoOpportunities, defaultProfile } from "@/lib/demo";
import { rankForDemo } from "@/lib/rank";
import type { FounderProfile, Opportunity, OpportunityType, RankedOpportunity } from "@/lib/types";

const filters = ["All opportunities", "Grants", "Accelerators", "Hackathons"] as const;
type FilterName = (typeof filters)[number];

function typeClass(type: OpportunityType) {
  return type === "Grant" ? "type-grant" : type === "Accelerator" ? "type-accelerator" : type === "Hackathon" ? "type-hackathon" : "type-program";
}

function formatDeadline(deadline: string | null) {
  if (!deadline) return "Cycle varies";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${deadline}T00:00:00Z`));
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function Home() {
  const [profile, setProfile] = useState<FounderProfile>(defaultProfile);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(demoOpportunities);
  const [ranked, setRanked] = useState<RankedOpportunity[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterName>("All opportunities");
  const [savedOnly, setSavedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("Reference listings are ready. Verify each live cycle at its source.");
  const [profileOpen, setProfileOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restore = () => {
      const storedProfile = localStorage.getItem("surge-profile");
      const storedSaved = localStorage.getItem("surge-saved");
      const storedOpportunities = localStorage.getItem("surge-opportunities");
      const storedRanked = localStorage.getItem("surge-ranked");
      if (storedProfile) {
        try { setProfile({ ...defaultProfile, ...JSON.parse(storedProfile) }); } catch { localStorage.removeItem("surge-profile"); }
      }
      if (storedSaved) {
        try { setSaved(JSON.parse(storedSaved)); } catch { localStorage.removeItem("surge-saved"); }
      }
      if (storedOpportunities) {
        try { setOpportunities(JSON.parse(storedOpportunities)); } catch { localStorage.removeItem("surge-opportunities"); }
      }
      if (storedRanked) {
        try { setRanked(JSON.parse(storedRanked)); } catch { localStorage.removeItem("surge-ranked"); }
      }
      setHydrated(true);
    };
    window.requestAnimationFrame(restore);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("surge-profile", JSON.stringify(profile));
  }, [hydrated, profile]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("surge-saved", JSON.stringify(saved));
  }, [hydrated, saved]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("surge-opportunities", JSON.stringify(opportunities));
  }, [hydrated, opportunities]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("surge-ranked", JSON.stringify(ranked));
  }, [hydrated, ranked]);

  const resultItems = useMemo(() => {
    const scored = ranked.length ? ranked : opportunities.map((item) => rankForDemo(item, profile));
    return scored
      .filter((item) => activeFilter === "All opportunities" || item.type.toLowerCase() === activeFilter.slice(0, -1).toLowerCase())
      .filter((item) => !savedOnly || saved.includes(item.id))
      .sort((a, b) => b.score - a.score);
  }, [activeFilter, opportunities, profile, ranked, saved, savedOnly]);

  const liveCount = opportunities.filter((item) => !item.demo).length;
  const topScore = resultItems[0]?.score ?? 0;
  const fitCount = resultItems.filter((item) => item.score >= 75).length;

  function updateProfile<K extends keyof FounderProfile>(key: K, value: FounderProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setRanked([]);
  }

  async function runScan() {
    setLoading(true);
    setNotice("Searching official sources, then asking Jev to score the shortlist…");
    try {
      const discoveryResponse = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const discovery = await discoveryResponse.json();
      if (!discoveryResponse.ok) throw new Error(discovery.error || "Live discovery is unavailable.");
      const found = discovery.opportunities as Opportunity[];
      if (!found.length) throw new Error("No official opportunities found for this profile. Try broader focus areas.");
      setOpportunities(found);
      const rankResponse = await fetch("/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, opportunities: found }),
      });
      const rankPayload = await rankResponse.json();
      if (!rankResponse.ok) throw new Error(rankPayload.error || "Jev ranking is unavailable.");
      setRanked(rankPayload.opportunities as RankedOpportunity[]);
      setNotice(`${found.length} sourced opportunities checked ${new Date(discovery.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Ranked with Jev 1.13.`);
    } catch (error) {
      if (opportunities.some((item) => item.demo)) {
        setRanked([]);
        setNotice(`${error instanceof Error ? error.message : "Live scan failed."} Showing transparent demo scores instead.`);
      } else {
        setNotice(error instanceof Error ? error.message : "Live scan failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleSaved(id: string) {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Surge home">
          <span className="brand-mark"><Radar size={21} strokeWidth={2.5} /></span>
          <span>surge<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-switcher">
          <div className="workspace-icon">{initials(profile.name)}</div>
          <div className="workspace-label"><span>Workspace</span><strong>{profile.name}&apos;s startup</strong></div>
          <ChevronDown size={15} />
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <button className="nav-item nav-active"><Compass size={17} /><span>Opportunity radar</span><span className="nav-count">{opportunities.length}</span></button>
          <button className={`nav-item ${savedOnly ? "nav-active" : ""}`} onClick={() => { setSavedOnly(!savedOnly); setActiveFilter("All opportunities"); }}><Bookmark size={17} /><span>My pipeline</span><span className="nav-count">{saved.length}</span></button>
          <button className="nav-item" onClick={() => setProfileOpen(!profileOpen)}><Settings2 size={17} /><span>Founder profile</span><ChevronDown className={`nav-chevron ${profileOpen ? "chevron-open" : ""}`} size={15} /></button>
        </nav>

        <div className="sidebar-section-label finder-label">YOUR FIT PROFILE <button aria-label="Collapse profile" onClick={() => setProfileOpen(!profileOpen)}><ChevronDown size={13} /></button></div>
        {profileOpen && <div className="profile-card">
          <label className="field-label" htmlFor="founder-name">Founder</label>
          <input id="founder-name" value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} />
          <label className="field-label" htmlFor="founder-location">Based in</label>
          <div className="input-with-icon"><MapPin size={14} /><input id="founder-location" value={profile.location} onChange={(event) => updateProfile("location", event.target.value)} /></div>
          <label className="field-label" htmlFor="founder-stage">Stage</label>
          <select id="founder-stage" value={profile.stage} onChange={(event) => updateProfile("stage", event.target.value)}>
            {["Idea", "Pre-seed", "Seed", "Series A", "Growth"].map((stage) => <option key={stage}>{stage}</option>)}
          </select>
          <label className="field-label" htmlFor="founder-sectors">Focus areas</label>
          <input id="founder-sectors" value={profile.sectors} onChange={(event) => updateProfile("sectors", event.target.value)} />
          <label className="field-label" htmlFor="founder-project">What are you building?</label>
          <textarea id="founder-project" rows={4} value={profile.project} onChange={(event) => updateProfile("project", event.target.value)} />
          <label className="field-label" htmlFor="founder-hours">Hours per week for applications</label>
          <div className="hours-control"><Timer size={14} /><input id="founder-hours" type="number" min={1} max={60} value={profile.weeklyHours} onChange={(event) => updateProfile("weeklyHours", Number(event.target.value))} /><span>hrs / week</span></div>
          <div className="profile-save"><Check size={13} /> Profile saved on this device</div>
        </div>}

        <div className="sidebar-bottom">
          <div className="sidebar-help"><CircleHelp size={16} /><span>How Surge scores matches</span><ArrowRight size={14} /></div>
          <div className="user-row"><div className="avatar">{initials(profile.name || "AM")}</div><div className="user-info"><strong>{profile.name || "Founder"}</strong><span>Founder account</span></div><MoreDots /></div>
        </div>
      </aside>

      <main className="main-area" id="home">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="slash">/</span><strong>Opportunity radar</strong></div>
          <div className="topbar-right"><div className="live-status"><span className="status-dot" />{liveCount ? "Live search connected" : "Demo workspace"}</div><button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button><div className="top-avatar">{initials(profile.name || "AM")}</div></div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT YES STARTS HERE</div>
              <h1>Find the right <em>doors</em><br className="title-break" /> to knock on.</h1>
              <p className="intro-copy">Grants, accelerators, and build challenges—sourced and scored for the startup you&apos;re actually building.</p>
            </div>
            <div className="welcome-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="art-spark art-spark-one">✳</div><div className="art-spark art-spark-two">✳</div><div className="art-core"><Radar size={29} /></div><div className="art-label">A better<br />shot at yes</div></div>
          </section>

          <section className="stats-row" aria-label="Opportunity summary">
            <div className="stat-card stat-highlight"><div className="stat-icon lime-icon"><Sparkles size={16} /></div><div><span className="stat-label">TOP MATCH SCORE</span><div className="stat-value">{topScore}<span className="stat-unit"> / 100</span></div></div><span className="stat-trend"><TrendingUp size={13} /> profile fit</span></div>
            <div className="stat-card"><div className="stat-icon blue-icon"><Layers3 size={16} /></div><div><span className="stat-label">OPPORTUNITIES</span><div className="stat-value">{opportunities.length}<span className="stat-unit"> tracked</span></div></div></div>
            <div className="stat-card"><div className="stat-icon peach-icon"><Flame size={16} /></div><div><span className="stat-label">STRONG FITS</span><div className="stat-value">{fitCount}<span className="stat-unit"> to explore</span></div></div></div>
          </section>

          <section className="opportunities-section">
            <div className="section-heading">
              <div><div className="section-title-line"><h2>Your opportunity radar</h2><span className={`mode-pill ${ranked.length ? "mode-live" : ""}`}><span />{ranked.length ? "JEV RANKED" : "DEMO MODE"}</span></div><p>Every score comes with a source and a reason.</p></div>
              <button className="scan-button" onClick={runScan} disabled={loading}><span className="scan-icon">{loading ? <span className="spinner" /> : <Search size={16} />}</span>{loading ? "Scanning the web…" : "Find live opportunities"}<ArrowRight size={15} /></button>
            </div>

            <div className="source-note"><span className="note-mark"><CircleHelp size={14} /></span><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={14} /></button></div>

            <div className="filter-row">
              <div className="filter-tabs" role="tablist" aria-label="Opportunity types">{filters.map((filter) => <button role="tab" aria-selected={activeFilter === filter} className={activeFilter === filter ? "filter-active" : ""} key={filter} onClick={() => { setActiveFilter(filter); setSavedOnly(false); }}>{filter}{filter === "All opportunities" && <span>{opportunities.length}</span>}</button>)}</div>
              <div className="filter-actions"><button className="saved-toggle" onClick={() => { setSavedOnly(!savedOnly); setActiveFilter("All opportunities"); }}><Bookmark size={14} fill={savedOnly ? "currentColor" : "none"} /> Saved <span>{saved.length}</span></button><button className="sort-button"><ArrowDownUp size={14} /> Best fit <ChevronDown size={13} /></button><button className="filter-button" aria-label="Filters"><Filter size={15} /></button></div>
            </div>

            <div className="opportunity-list">
              {resultItems.map((opportunity, index) => <OpportunityCard key={opportunity.id} opportunity={opportunity} rank={index + 1} saved={saved.includes(opportunity.id)} onSave={() => toggleSaved(opportunity.id)} />)}
              {!resultItems.length && <div className="empty-state"><div className="empty-icon"><Search size={22} /></div><h3>{savedOnly ? "Your pipeline is waiting" : "Nothing in this view yet"}</h3><p>{savedOnly ? "Save an opportunity with the bookmark icon and it will show up here." : "Try another category or broaden the focus areas in your founder profile."}</p></div>}
            </div>
            <div className="list-footer"><span>Showing {resultItems.length} of {opportunities.length} opportunities</span><span><span className="footer-dot" />{ranked.length ? "Sources checked just now" : "Reference list · verify current cycles"}</span></div>
          </section>

          <section className="how-it-works"><div className="how-icon"><Sparkles size={17} /></div><div><strong>Scored for your reality, not just your pitch.</strong><p>Jev weighs project fit and application effort. Code checks deadline runway. You get the why—not a black-box number.</p></div><button onClick={() => setNotice("Jev's project-fit and effort-fit scores contribute 40 and 15 points. Eligibility contributes up to 25; deadline runway contributes up to 20. Dates and hard requirements are checked separately from semantic judgments.")}>See the scoring model <ArrowRight size={14} /></button></section>
          <footer className="page-footer"><span>Built for founders with more ambition than hours.</span><span>Surge <span className="footer-separator">·</span> Make your next move count</span></footer>
        </div>
      </main>
    </div>
  );
}

function OpportunityCard({ opportunity, rank, saved, onSave }: { opportunity: RankedOpportunity; rank: number; saved: boolean; onSave: () => void }) {
  return <article className="opportunity-card">
    <div className="rank-rail"><span className="rank-number">{String(rank).padStart(2, "0")}</span><span className="rank-line" /></div>
    <div className="card-main">
      <div className="card-topline"><div className="type-organizer"><span className={`type-badge ${typeClass(opportunity.type)}`}>{opportunity.type}</span><span className="org-name">{opportunity.organizer}</span>{opportunity.status && <span className="live-opportunity-status">{opportunity.status === "open" ? "Open now" : "Upcoming"}</span>}</div><div className="card-top-actions">{opportunity.demo && <span className="reference-tag">REFERENCE</span>}<button className={`bookmark-button ${saved ? "bookmarked" : ""}`} aria-label={saved ? "Remove from pipeline" : "Save to pipeline"} onClick={onSave}><Bookmark size={17} fill={saved ? "currentColor" : "none"} /></button></div></div>
      <div className="card-heading-row"><h3>{opportunity.name}</h3><div className={`score-bubble ${opportunity.score >= 80 ? "score-high" : opportunity.score >= 65 ? "score-mid" : "score-low"}`}><span className="score-number">{opportunity.score}</span><span className="score-outof">/100</span></div></div>
      <p className="opportunity-description">{opportunity.description}</p>
      <div className="detail-row"><span><MapPin size={13} />{opportunity.location}</span><span><CalendarDays size={13} />{formatDeadline(opportunity.deadline)}</span>{opportunity.effortHours !== null && <span><Timer size={13} />~{opportunity.effortHours}h effort</span>}{opportunity.funding && <span className="funding-detail"><Sparkles size={13} />{opportunity.funding}</span>}</div>
      <div className="reason-panel"><div className="reason-heading"><span className="reason-check"><Check size={11} /></span><strong>Why it ranks here</strong><span className={`reason-engine ${opportunity.scoreSource === "Jev 1.13" ? "reason-jev" : ""}`}>{opportunity.scoreSource}</span></div><div className="reason-chips">{opportunity.reasons.map((reason, index) => <span className="reason-chip" key={`${opportunity.id}-reason-${index}`}>{reason}</span>)}</div>{opportunity.watchouts.length > 0 && <div className="watchout"><CircleHelp size={13} /><span>{opportunity.watchouts[0]}</span></div>}</div>
      <div className="card-bottom"><div className="tags">{opportunity.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div><a className="source-link" href={opportunity.sourceUrl} target="_blank" rel="noreferrer">View source <ExternalLink size={13} /></a></div>
    </div>
  </article>;
}

function MoreDots() {
  return <button className="more-dots" aria-label="More account options"><span /><span /><span /></button>;
}
