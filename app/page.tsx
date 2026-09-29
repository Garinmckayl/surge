"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp, ArrowRight, Bookmark, CalendarDays, CalendarPlus, Check, ChevronDown, CircleHelp,
  Compass, Download, Gauge, PanelLeftClose, PanelLeftOpen, ExternalLink, Filter, Flame, Layers3, MapPin, Radar,
  Search, Settings2, Sparkles, Timer, TrendingUp, X,
} from "lucide-react";
import { demoOpportunities, defaultProfile } from "@/lib/demo";
import { rankForDemo } from "@/lib/rank";
import { SAMPLE_SCAN_DATE, sampleScan } from "@/lib/sample-scan";
import ActionPlan from "@/app/components/ActionPlan";
import ScaleEngine from "@/app/components/ScaleEngine";
import type { FounderProfile, Opportunity, OpportunityType, RankedOpportunity } from "@/lib/types";

const filters = ["All opportunities", "Grants", "Accelerators", "Hackathons"] as const;
type FilterName = (typeof filters)[number];

const scoreFactors = [
  { key: "projectFit", label: "Project", max: 40, tone: "factor-project" },
  { key: "eligibility", label: "Eligibility", max: 25, tone: "factor-eligibility" },
  { key: "effortFit", label: "Effort", max: 15, tone: "factor-effort" },
  { key: "deadlineRunway", label: "Deadline", max: 20, tone: "factor-deadline" },
] as const;

function typeClass(type: OpportunityType) {
  return type === "Grant" ? "type-grant" : type === "Accelerator" ? "type-accelerator" : type === "Hackathon" ? "type-hackathon" : "type-program";
}

function formatDeadline(deadline: string | null) {
  if (!deadline) return "Cycle varies";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${deadline}T00:00:00Z`));
}

const founderPersonas: { label: string; profile: Pick<FounderProfile, "location" | "stage" | "sectors" | "project" | "weeklyHours"> }[] = [
  { label: "AI SaaS \u00B7 US", profile: { location: "United States", stage: "Pre-seed", sectors: "AI, developer tools, SaaS", project: "An AI agent platform that automates back-office workflows for small businesses.", weeklyHours: 8 } },
  { label: "Climate \u00B7 Kenya", profile: { location: "Kenya", stage: "Seed", sectors: "Climate, agriculture, clean energy", project: "Solar-powered cold storage that cuts post-harvest food loss for smallholder farmers.", weeklyHours: 12 } },
  { label: "Fintech \u00B7 India", profile: { location: "India", stage: "Idea", sectors: "Fintech, payments, financial inclusion", project: "UPI-based micro-savings and credit for gig workers without bank histories.", weeklyHours: 5 } },
  { label: "Health \u00B7 UK", profile: { location: "United Kingdom", stage: "Pre-seed", sectors: "Healthtech, biotech, AI diagnostics", project: "AI-assisted early screening tool that helps clinics catch diabetic eye disease.", weeklyHours: 10 } },
];

function isSampleSet(items: Opportunity[]) {
  return items.length > 0 && items.every((item) => item.id.startsWith("sample-"));
}

function download(filename: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCalendar(items: RankedOpportunity[]) {
  const escape = (text: string) => text.replace(/[\\;,]/g, (char) => "\\" + char).replace(/\n/g, "\\n");
  const events = items.filter((item) => item.deadline).map((item) => {
    const day = item.deadline!.replaceAll("-", "");
    return ["BEGIN:VEVENT", `UID:${item.id}@surge.arcumet.com`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, "")}`, `DTSTART;VALUE=DATE:${day}`, `SUMMARY:${escape(`Deadline: ${item.name}`)}`, `DESCRIPTION:${escape(`Surge fit ${item.score}/100 \u00B7 ${item.organizer}\nVerify at ${item.sourceUrl}`)}`, `URL:${item.sourceUrl}`, "BEGIN:VALARM", "TRIGGER:-P3D", "ACTION:DISPLAY", "DESCRIPTION:Application deadline in 3 days", "END:VALARM", "END:VEVENT"].join("\r\n");
  });
  download("surge-pipeline.ics", "text/calendar", ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Surge//Founder pipeline//EN", ...events, "END:VCALENDAR"].join("\r\n"));
  return events.length;
}

function exportCsv(items: RankedOpportunity[]) {
  const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [["Rank", "Name", "Type", "Organizer", "Fit score", "Deadline", "Effort hours", "Funding", "Source"], ...items.map((item, index) => [index + 1, item.name, item.type, item.organizer, item.score, item.deadline ?? "", item.effortHours ?? "", item.funding ?? "", item.sourceUrl])];
  download("surge-pipeline.csv", "text/csv", rows.map((row) => row.map(cell).join(",")).join("\n"));
}

function profileRankKey(profile: FounderProfile) {
  return JSON.stringify({ location: profile.location, stage: profile.stage, sectors: profile.sectors, project: profile.project, weeklyHours: profile.weeklyHours });
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function AnimatedScore({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 0 : 920;

    const step = (currentTime: number) => {
      startTime ??= currentTime;
      const progress = duration === 0 ? 1 : Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(value * easedProgress));
      if (progress < 1) animationFrame = window.requestAnimationFrame(step);
    };

    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  return <span className="score-number" aria-label={`${value} out of 100`}>{displayValue}</span>;
}

function OpportunitySignalMap({ items, loading }: { items: RankedOpportunity[]; loading: boolean }) {
  const types: OpportunityType[] = ["Grant", "Accelerator", "Hackathon", "Startup program"];
  const typeCounts = types.map((type) => ({ type, count: items.filter((item) => item.type === type).length }));
  const scoreBands = [
    { label: "Strong fit", range: "80–100", count: items.filter((item) => item.score >= 80).length, tone: "signal-strong" },
    { label: "Worth a look", range: "65–79", count: items.filter((item) => item.score >= 65 && item.score < 80).length, tone: "signal-mid" },
    { label: "Stretch", range: "0–64", count: items.filter((item) => item.score < 65).length, tone: "signal-stretch" },
  ];
  const deadlineBands = [
    { label: "Next 7 days", count: items.filter((item) => deadlineDays(item.deadline) !== null && deadlineDays(item.deadline)! >= 0 && deadlineDays(item.deadline)! <= 7).length, tone: "runway-immediate" },
    { label: "8–30 days", count: items.filter((item) => deadlineDays(item.deadline) !== null && deadlineDays(item.deadline)! > 7 && deadlineDays(item.deadline)! <= 30).length, tone: "runway-soon" },
    { label: "Flexible / unknown", count: items.filter((item) => !item.deadline).length, tone: "runway-flexible" },
  ];
  const circumference = 2 * Math.PI * 34;
  let offset = 0;
  const chartSegments = typeCounts.map((item) => {
    const length = items.length ? item.count / items.length * circumference : 0;
    const segment = { ...item, length, offset };
    offset += length;
    return segment;
  });
  const maxBandCount = Math.max(1, ...scoreBands.map((band) => band.count));

  return <section className={`signal-map ${loading ? "signal-map-scanning" : ""}`} aria-label="Opportunity signal map">
    <div className="signal-map-heading"><div><span className="signal-kicker"><span /> FIT LANDSCAPE</span><h2>See the signal in the noise.</h2><p>A live snapshot of fit, opportunity type, and deadline runway.</p></div><span className="signal-stamp"><Radar size={14} /> {items.length} in this view</span></div>
    <div className="signal-map-grid">
      <div className="signal-card signal-mix-card">
        <div className="signal-card-title"><span>OPPORTUNITY MIX</span><span>BY TYPE</span></div>
        <div className="signal-mix-body"><div className="signal-donut-wrap"><svg className="signal-donut" viewBox="0 0 88 88" role="img" aria-label={`${items.length} opportunities across three types`}><circle className="signal-donut-track" cx="44" cy="44" r="34" />{chartSegments.map((segment) => <circle key={segment.type} className={`signal-donut-segment ${typeClass(segment.type)}`} cx="44" cy="44" r="34" strokeDasharray={`${segment.length} ${circumference - segment.length}`} strokeDashoffset={-segment.offset} />)}</svg><div className="signal-donut-center"><strong>{items.length}</strong><span>signals</span></div></div><div className="signal-legend">{chartSegments.map((segment) => <div className="signal-legend-row" key={segment.type}><span className={`signal-legend-dot ${typeClass(segment.type)}`} /><span>{segment.type === "Grant" ? "Grants" : `${segment.type}s`}</span><strong>{segment.count}</strong></div>)}</div></div>
      </div>
      <div className="signal-card signal-fit-card">
        <div className="signal-card-title"><span>FIT DISTRIBUTION</span><span>SURGE ENGINE</span></div>
        <div className="signal-bars">{scoreBands.map((band, index) => <div className={`signal-bar-row ${band.tone}`} key={band.label}><div className="signal-bar-meta"><span>{band.label}<small>{band.range}</small></span><strong>{band.count}</strong></div><div className="signal-bar-track"><span style={{ width: `${band.count / maxBandCount * 100}%`, animationDelay: `${index * 100}ms` }} /></div></div>)}</div>
        <div className="signal-fit-foot"><Sparkles size={13} /> Ranking is personalized to this founder profile</div>
      </div>
      <div className="signal-card signal-runway-card">
        <div className="signal-card-title"><span>DEADLINE RUNWAY</span><span>UTC</span></div>
        <div className="runway-list">{deadlineBands.map((band) => <div className={`runway-row ${band.tone}`} key={band.label}><span className="runway-indicator" /><span>{band.label}</span><strong>{band.count}</strong></div>)}</div>
        <div className="runway-note"><CalendarDays size={13} /> Dates stay visible beside every source</div>
      </div>
    </div>
  </section>;
}

function deadlineDays(deadline: string | null) {
  if (!deadline) return null;
  return Math.ceil((new Date(`${deadline}T23:59:59Z`).getTime() - Date.now()) / 86_400_000);
}

export default function Home() {
  const [profile, setProfile] = useState<FounderProfile>(defaultProfile);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(demoOpportunities);
  const [ranked, setRanked] = useState<RankedOpportunity[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterName>("All opportunities");
  const [savedOnly, setSavedOnly] = useState(false);
  const [deadlineOnly, setDeadlineOnly] = useState(false);
  const [sortMode, setSortMode] = useState<"fit" | "deadline" | "effort">("fit");
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [profileReranking, setProfileReranking] = useState(false);
  const [profileEditVersion, setProfileEditVersion] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [analyzedRecords, setAnalyzedRecords] = useState(0);
  const [notice, setNotice] = useState("A source-backed reference set is ready. Scan live sources to rank fresh opportunities.");
  const [profileOpen, setProfileOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [scanStage, setScanStage] = useState<"idle" | "discovering" | "ranking">("idle");
  const listRef = useRef<HTMLDivElement>(null);
  const previousRects = useRef(new Map<string, DOMRect>());
  const previousScores = useRef(new Map<string, string>());
  const previousRanks = useRef(new Map<string, number>());
  const lastRankedProfile = useRef<string | null>(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => setCooldownSeconds((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    const restore = () => {
      setSidebarCollapsed(localStorage.getItem("surge-sidebar") === "collapsed");
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
      let restored: Opportunity[] = [];
      if (storedOpportunities) {
        try { restored = JSON.parse(storedOpportunities); } catch { localStorage.removeItem("surge-opportunities"); }
      }
      if (Array.isArray(restored) && restored.length && !restored.every((item) => item.demo)) {
        setOpportunities(restored);
        if (storedRanked) {
          try { setRanked(JSON.parse(storedRanked)); } catch { localStorage.removeItem("surge-ranked"); }
        }
      } else {
        // First visit: start from a real, cited sample scan and let Surge rank it against the profile.
        setOpportunities(sampleScan);
        setProfileEditVersion(1);
      }
      setHydrated(true);
    };
    window.requestAnimationFrame(restore);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("surge-sidebar", sidebarCollapsed ? "collapsed" : "open");
  }, [hydrated, sidebarCollapsed]);

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

  useEffect(() => {
    if (!hydrated || profileEditVersion === 0 || loading || cooldownSeconds > 0 || !opportunities.some((item) => !item.demo)) return;
    const profileSignature = profileRankKey(profile);
    if (profileSignature === lastRankedProfile.current) return;

    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setProfileReranking(true);
      setNotice(isSampleSet(opportunities) ? "Surge is ranking a real sample scan against your founder profile…" : "Founder profile changed · Surge is re-aligning every live opportunity…");
      try {
        const response = await fetch("/api/rank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, opportunities }),
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) {
          if (response.status === 429 && !cancelled) setCooldownSeconds(Math.max(1, Number(response.headers.get("Retry-After")) || 60));
          throw new Error(payload.error || "Surge could not update the ranking.");
        }
        if (cancelled) return;
        const newlyRanked = payload.opportunities as RankedOpportunity[];
        lastRankedProfile.current = profileSignature;
        setRanked(newlyRanked);
        setNotice(isSampleSet(opportunities) ? `Surge ranked ${newlyRanked.length} opportunities from a real scan (${SAMPLE_SCAN_DATE}). Change the profile or pick a founder to watch them re-rank, or scan the market for fresh results.` : "Preferences applied · Surge re-aligned " + newlyRanked.length + " live opportunities to your profile.");
      } catch (error) {
        if (!cancelled) setNotice(error instanceof Error ? error.message + " The previous live ranking is preserved." : "Surge could not update the ranking. The previous live ranking is preserved.");
      } finally {
        if (!cancelled) setProfileReranking(false);
      }
    }, 720);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cooldownSeconds, hydrated, loading, opportunities, profile, profileEditVersion]);

  const allScored = useMemo(() => ranked.length ? ranked : opportunities.map((item) => rankForDemo(item, profile)), [opportunities, profile, ranked]);

  const resultItems = useMemo(() => {
    const scored = allScored;
    return scored
      .filter((item) => activeFilter === "All opportunities" || item.type.toLowerCase() === activeFilter.slice(0, -1).toLowerCase())
      .filter((item) => !savedOnly || saved.includes(item.id))
      .filter((item) => !deadlineOnly || (deadlineDays(item.deadline) !== null && deadlineDays(item.deadline)! >= 0 && deadlineDays(item.deadline)! <= 30))
      .sort((a, b) => {
        if (sortMode === "deadline") {
          const aDays = deadlineDays(a.deadline) ?? Number.POSITIVE_INFINITY;
          const bDays = deadlineDays(b.deadline) ?? Number.POSITIVE_INFINITY;
          return aDays - bDays || b.score - a.score;
        }
        if (sortMode === "effort") return (a.effortHours ?? Number.POSITIVE_INFINITY) - (b.effortHours ?? Number.POSITIVE_INFINITY) || b.score - a.score;
        return b.score - a.score;
      });
  }, [activeFilter, allScored, deadlineOnly, saved, savedOnly, sortMode]);

  const liveCount = opportunities.filter((item) => !item.demo).length;
  const topScore = resultItems[0]?.score ?? 0;
  const fitCount = resultItems.filter((item) => item.score >= 80).length;

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const cards = Array.from(list.querySelectorAll<HTMLElement>("[data-opportunity-id]"));
    const previous = previousRects.current;
    const current = new Map<string, DOMRect>();
    const currentScores = new Map<string, string>();
    const currentRanks = new Map<string, number>();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    cards.forEach((card, index) => {
      const opportunityId = card.dataset.opportunityId;
      if (!opportunityId) return;
      const nextRect = card.getBoundingClientRect();
      const nextScore = card.dataset.score || "";
      const previousRect = previous.get(opportunityId);
      const previousScore = previousScores.current.get(opportunityId);
      current.set(opportunityId, nextRect);
      currentScores.set(opportunityId, nextScore);
      currentRanks.set(opportunityId, index + 1);
      const previousRank = previousRanks.current.get(opportunityId);
      if (previousScore !== undefined && previousScore !== nextScore && previousRank !== undefined) {
        const scoreDelta = Number(nextScore) - Number(previousScore);
        const rankDelta = previousRank - (index + 1);
        card.dataset.move = `${rankDelta > 0 ? "\u25B2" + rankDelta + " \u00B7 " : rankDelta < 0 ? "\u25BC" + -rankDelta + " \u00B7 " : ""}${scoreDelta > 0 ? "+" : ""}${scoreDelta}`;
        card.dataset.moveDir = scoreDelta >= 0 ? "up" : "down";
        window.setTimeout(() => { delete card.dataset.move; delete card.dataset.moveDir; }, 6500);
      }
      if (reducedMotion) return;

      card.getAnimations().forEach((animation) => animation.cancel());
      if (previousRect) {
        const deltaX = previousRect.left - nextRect.left;
        const deltaY = previousRect.top - nextRect.top;
        const scoreChanged = previousScore !== undefined && previousScore !== nextScore;
        if (deltaX || deltaY || scoreChanged) {
          card.animate([
            { transform: `translate(${deltaX}px, ${deltaY}px) scale(.975)`, opacity: 0.58, filter: "blur(2px) saturate(.64)", boxShadow: "0 0 0 1px rgba(153,190,91,.3), 0 16px 34px rgba(70,112,64,.14)" },
            { transform: "translate(0, 0) scale(1)", opacity: 1, filter: "blur(0) saturate(1)", boxShadow: "0 2px 5px rgba(28,51,61,.018)" },
          ], { duration: 1050, delay: Math.min(index, 9) * 72, easing: "cubic-bezier(.16, 1, .3, 1)" });
        }
      } else {
        card.animate([
          { transform: "translateY(36px) scale(.94)", opacity: 0, filter: "blur(8px) saturate(.6)" },
          { transform: "translateY(0) scale(1)", opacity: 1, filter: "blur(0) saturate(1)" },
        ], { duration: 820, delay: Math.min(index, 9) * 72, easing: "cubic-bezier(.16, 1, .3, 1)" });
      }
    });

    previousRects.current = current;
    previousScores.current = currentScores;
    previousRanks.current = currentRanks;
  }, [resultItems]);

  function updateProfile<K extends keyof FounderProfile>(key: K, value: FounderProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    if (key !== "name") setProfileEditVersion((version) => version + 1);
  }

  async function runScan() {
    if (cooldownSeconds > 0) return;
    setLoading(true);
    setScanStage("discovering");
    setNotice("Scanning official sources and batching founder-fit decisions…");
    let retryAfterSeconds = 0;
    try {
      const discoveryResponse = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const discovery = await discoveryResponse.json();
      if (!discoveryResponse.ok) {
        if (discoveryResponse.status === 429) {
          retryAfterSeconds = Math.max(1, Number(discoveryResponse.headers.get("Retry-After")) || 60);
          setCooldownSeconds(retryAfterSeconds);
        }
        throw new Error(discovery.error || "Live discovery is unavailable.");
      }
      const found = discovery.opportunities as Opportunity[];
      if (!found.length) throw new Error("No official opportunities found for this profile. Try broader focus areas.");
      setOpportunities(found);
      setScanStage("ranking");
      setNotice(`Found ${found.length} source-cited candidates. Surge Engine is scoring them against your startup…`);
      const rankResponse = await fetch("/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, opportunities: found }),
      });
      const rankPayload = await rankResponse.json();
      if (!rankResponse.ok) {
        if (rankResponse.status === 429) {
          retryAfterSeconds = Math.max(1, Number(rankResponse.headers.get("Retry-After")) || 60);
          setCooldownSeconds(retryAfterSeconds);
        }
        throw new Error(rankPayload.error || "Surge ranking is unavailable.");
      }
      lastRankedProfile.current = profileRankKey(profile);
      setRanked(rankPayload.opportunities as RankedOpportunity[]);
      const batchCount = Number(rankPayload.metadata?.batchCount || 1);
      const durationSeconds = (Number(rankPayload.metadata?.durationMs || 0) / 1000).toFixed(1);
      setNotice(`${found.length} source-cited candidates · Surge scored ${batchCount} batch${batchCount === 1 ? "" : "es"} in ${durationSeconds}s. Open sources to verify details.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Live scan failed.";
      if (opportunities.some((item) => item.demo)) {
        setRanked([]);
        setNotice(`${message} ${retryAfterSeconds > 0 ? "Your reference list is still available; the live scan button will unlock when the limit resets." : "Showing transparent reference scores instead."}`);
      } else {
        setNotice(message);
      }
    } finally {
      setLoading(false);
      setScanStage("idle");
    }
  }

  function toggleSaved(id: string) {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <button type="button" className="sidebar-toggle" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((value) => !value)}>{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
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
          <div className="persona-row" role="group" aria-label="Try a founder profile"><span className="field-label">Try a founder</span>{founderPersonas.map((persona) => <button type="button" key={persona.label} className={"persona-chip" + (profileRankKey({ ...profile, ...persona.profile }) === profileRankKey(profile) ? " persona-active" : "")} onClick={() => { setProfile((current) => ({ ...current, ...persona.profile })); setProfileEditVersion((version) => version + 1); }}>{persona.label}</button>)}</div>
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
          <div className="breadcrumb"><span>Workspace</span><span className="slash">/</span><strong>Founder-fit engine</strong></div>
          <div className="topbar-right"><div className="live-status"><span className="status-dot" />{liveCount ? (isSampleSet(opportunities) ? "Sample scan loaded" : "Live results loaded") : "Live scan ready"}</div><button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button><div className="top-avatar">{initials(profile.name || "AM")}</div></div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> GLOBAL DISCOVERY · FOUNDER-SPECIFIC FIT</div>
              <h1>Thousands of opportunities.<br className="title-break" /> <em>Ranked</em> for your<br /> startup in seconds.</h1>
              <p className="intro-copy">Surge analyzes grants, accelerators, and hackathons across the global market in real time, scores every one against your startup, and turns the best into a scheduled plan — with a source and a reason behind every rank.</p>
            </div>
            <div className="welcome-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="art-spark art-spark-one">✳</div><div className="art-spark art-spark-two">✳</div><div className="art-core"><Radar size={29} /></div><div className="art-label">A better<br />shot at yes</div></div>
          </section>

          <section className="stats-row" aria-label="Opportunity summary">
            <div className="stat-card stat-highlight"><div className="stat-icon lime-icon"><Sparkles size={16} /></div><div><span className="stat-label">TOP MATCH SCORE</span><div className="stat-value">{topScore}<span className="stat-unit"> / 100</span></div></div><span className="stat-trend"><TrendingUp size={13} /> profile fit</span></div>
            <div className="stat-card"><div className="stat-icon blue-icon"><Layers3 size={16} /></div><div><span className="stat-label">OPPORTUNITIES</span><div className="stat-value">{opportunities.length}<span className="stat-unit"> tracked</span></div></div></div>
            <div className="stat-card"><div className="stat-icon peach-icon"><Flame size={16} /></div><div><span className="stat-label">STRONG FITS</span><div className="stat-value">{fitCount}<span className="stat-unit"> to explore</span></div></div></div>
          <div className="stat-card"><div className="stat-icon lime-icon"><Gauge size={16} /></div><div><span className="stat-label">RECORDS ANALYZED</span><div className="stat-value">{(analyzedRecords + opportunities.length).toLocaleString("en-US")}<span className="stat-unit"> this session</span></div></div></div>
          </section>

          <ScaleEngine profile={profile} onAnalyzed={(records) => setAnalyzedRecords((total) => total + records)} />

          <OpportunitySignalMap items={resultItems} loading={loading || profileReranking} />

          <section className="opportunities-section">
            <div className="section-heading">
              <div><div className="section-title-line"><h2>Your next moves</h2><span className={`mode-pill ${ranked.length ? "mode-live" : ""}`}><span />{isSampleSet(opportunities) ? `REAL SCAN · ${SAMPLE_SCAN_DATE.toUpperCase()}` : ranked.length ? "SURGE MATCH ENGINE" : "REFERENCE SET"}</span></div><p>Not another directory. A source-backed decision queue for this startup.</p></div>
              <button className="scan-button" onClick={runScan} disabled={loading || profileReranking || cooldownSeconds > 0}><span className="scan-icon">{loading || profileReranking ? <span className="spinner" /> : <Search size={16} />}</span>{profileReranking ? "Realigning your matches…" : loading ? "Scanning the market…" : cooldownSeconds > 0 ? `Retry in ${cooldownSeconds >= 60 ? `${Math.floor(cooldownSeconds / 60)}m ${cooldownSeconds % 60}s` : `${cooldownSeconds}s`}` : "Scan the market"}<ArrowRight size={15} /></button>
            </div>

            <div className={`source-note ${profileReranking ? "source-note-realigning" : ""}`} aria-live="polite"><span className="note-mark"><CircleHelp size={14} /></span><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={14} /></button></div>
            {(loading || profileReranking) && <div className={`scan-progress scan-progress-${profileReranking ? "ranking" : scanStage}`} aria-live="polite"><span className="scan-progress-orb"><Radar size={15} /></span><div className="scan-progress-copy"><strong>{profileReranking ? "Surge is realigning your grid" : scanStage === "ranking" ? "Surge is aligning the field" : "Surge is scanning the market"}</strong><span>{profileReranking ? "Your profile changed · live scores and card positions are updating" : scanStage === "ranking" ? "Project fit · eligibility · location · deadline · effort" : "Checking grants · accelerators · hackathons"}</span></div><span className="scan-progress-track"><span /></span></div>}

            <div className="filter-row">
              <div className="filter-tabs" role="tablist" aria-label="Opportunity types">{filters.map((filter) => <button role="tab" aria-selected={activeFilter === filter} className={activeFilter === filter ? "filter-active" : ""} key={filter} onClick={() => { setActiveFilter(filter); setSavedOnly(false); }}>{filter}{filter === "All opportunities" && <span>{opportunities.length}</span>}</button>)}</div>
              <div className="filter-actions">{saved.length > 0 && <><button className="sort-button" title="Download saved deadlines as a calendar file" onClick={() => { const pipeline = (ranked.length ? ranked : opportunities.map((item) => rankForDemo(item, profile))).filter((item) => saved.includes(item.id)); const count = exportCalendar(pipeline); setNotice(count ? `Exported ${count} deadline${count === 1 ? "" : "s"} to surge-pipeline.ics with 3-day reminders.` : "None of your saved opportunities has a published deadline to add to a calendar."); }}><CalendarPlus size={14} /> .ics</button><button className="sort-button" title="Download your saved pipeline as CSV" onClick={() => exportCsv((ranked.length ? ranked : opportunities.map((item) => rankForDemo(item, profile))).filter((item) => saved.includes(item.id)))}><Download size={14} /> CSV</button></>}<button className="saved-toggle" onClick={() => { setSavedOnly(!savedOnly); setActiveFilter("All opportunities"); }}><Bookmark size={14} fill={savedOnly ? "currentColor" : "none"} /> Saved <span>{saved.length}</span></button><button className="sort-button" onClick={() => setSortMode((mode) => mode === "fit" ? "deadline" : mode === "deadline" ? "effort" : "fit")} title="Cycle sort: best fit, deadline, application effort"><ArrowDownUp size={14} /> {sortMode === "fit" ? "Best fit" : sortMode === "deadline" ? "Closing soon" : "Least effort"} <ChevronDown size={13} /></button><button className={`filter-button ${deadlineOnly ? "filter-button-active" : ""}`} aria-label="Filter deadlines within 30 days" aria-pressed={deadlineOnly} title={deadlineOnly ? "Showing deadlines within 30 days" : "Filter to deadlines within 30 days"} onClick={() => setDeadlineOnly((active) => !active)}><Filter size={15} /></button></div>
            </div>

            <div className={`opportunity-list-stage ${loading || profileReranking ? "is-scanning" : ""}`}>
              {loading && <div className="scan-beam" aria-hidden="true" />}
              <div className="opportunity-list" ref={listRef}>
              {resultItems.map((opportunity, index) => <OpportunityCard key={opportunity.id} opportunity={opportunity} rank={index + 1} saved={saved.includes(opportunity.id)} onSave={() => toggleSaved(opportunity.id)} />)}
              {!resultItems.length && <div className="empty-state"><div className="empty-icon"><Search size={22} /></div><h3>{savedOnly ? "Your pipeline is waiting" : "Nothing in this view yet"}</h3><p>{savedOnly ? "Save an opportunity with the bookmark icon and it will show up here." : "Try another category or broaden the focus areas in your founder profile."}</p></div>}
            </div>
            </div>
            <div className="list-footer"><span>Showing {resultItems.length} of {opportunities.length} opportunities</span><span><span className="footer-dot" />{ranked.length ? "Sources checked just now" : "Reference list · verify current cycles"}</span></div>
          </section>

          <ActionPlan items={allScored} weeklyHours={profile.weeklyHours} />

          <section className="how-it-works"><div className="how-icon"><Sparkles size={17} /></div><div><strong>Built for the decision, not the directory.</strong><p>The Surge Engine returns structured fit, eligibility, and effort judgments for every record. Surge adds source checks and deadline math, then turns the pool into a scheduled plan of your next best moves.</p></div><button onClick={() => setNotice("Surge's project-fit and effort-fit scores contribute 40 and 15 points. Eligibility contributes up to 25; deadline runway contributes up to 20. Dates and hard requirements are checked separately from semantic judgments.")}>See the scoring model <ArrowRight size={14} /></button></section>
          <footer className="page-footer"><span>Built for founders with more ambition than hours.</span><span>Surge <span className="footer-separator">·</span> Make your next move count</span></footer>
        </div>
      </main>
    </div>
  );
}

function OpportunityCard({ opportunity, rank, saved, onSave }: { opportunity: RankedOpportunity; rank: number; saved: boolean; onSave: () => void }) {
  return <article className="opportunity-card" data-opportunity-id={opportunity.id} data-score={opportunity.score} style={{ animationDelay: `${Math.min(rank - 1, 8) * 55}ms` }}>
    <div className="rank-rail"><span className="rank-number">{String(rank).padStart(2, "0")}</span><span className="rank-line" /></div>
    <div className="card-main">
      <div className="card-topline"><div className="type-organizer"><span className={`type-badge ${typeClass(opportunity.type)}`}>{opportunity.type}</span><span className="org-name">{opportunity.organizer}</span>{opportunity.status && <span className="live-opportunity-status">{opportunity.status === "open" ? "Open now" : "Upcoming"}</span>}</div><div className="card-top-actions">{opportunity.demo && <span className="reference-tag">REFERENCE</span>}<button className={`bookmark-button ${saved ? "bookmarked" : ""}`} aria-label={saved ? "Remove from pipeline" : "Save to pipeline"} onClick={onSave}><Bookmark size={17} fill={saved ? "currentColor" : "none"} /></button></div></div>
      <div className="card-heading-row"><h3>{opportunity.name}</h3><div className={`score-bubble ${opportunity.score >= 80 ? "score-high" : opportunity.score >= 65 ? "score-mid" : "score-low"}`}><AnimatedScore value={opportunity.score} /><span className="score-outof">/100</span></div></div>
      <p className="opportunity-description">{opportunity.description}</p>
      <div className="detail-row"><span><MapPin size={13} />{opportunity.location}</span><span><CalendarDays size={13} />{formatDeadline(opportunity.deadline)}</span>{opportunity.effortHours !== null && <span><Timer size={13} />~{opportunity.effortHours}h effort</span>}{opportunity.funding && <span className="funding-detail"><Sparkles size={13} />{opportunity.funding}</span>}</div>
      {opportunity.scoreBreakdown && <div className="score-breakdown" aria-label="How each score is composed"><div className="score-breakdown-heading"><span>SURGE FIT COMPOSITION</span><span>{opportunity.score}/100</span></div><div className="score-breakdown-grid">{scoreFactors.map((factor) => { const points = opportunity.scoreBreakdown?.[factor.key] ?? 0; return <div className={"score-factor " + factor.tone} key={factor.key}><div className="score-factor-label"><span>{factor.label}</span><strong>{points}<small>/{factor.max}</small></strong></div><div className="score-factor-track"><span style={{ width: (points / factor.max * 100) + "%" }} /></div></div>; })}</div></div>}
      <div className="reason-panel"><div className="reason-heading"><span className="reason-check"><Check size={11} /></span><strong>Why it ranks here</strong><span className={`reason-engine ${opportunity.scoreSource === "Surge Engine" ? "reason-engine-name" : ""}`}>{opportunity.scoreSource}</span></div><div className="reason-chips">{opportunity.reasons.map((reason, index) => <span className="reason-chip" key={`${opportunity.id}-reason-${index}`}>{reason}</span>)}</div>{opportunity.watchouts.length > 0 && <div className="watchout"><CircleHelp size={13} /><span>{opportunity.watchouts[0]}</span></div>}</div>
      <div className="card-bottom"><div className="tags">{opportunity.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div><a className="source-link" href={opportunity.sourceUrl} target="_blank" rel="noreferrer">View source <ExternalLink size={13} /></a></div>
    </div>
  </article>;
}

function MoreDots() {
  return <button className="more-dots" aria-label="More account options"><span /><span /><span /></button>;
}
