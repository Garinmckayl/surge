"use client";

import { useEffect, useRef, useState } from "react";
import { Gauge, Play, RotateCcw, Sparkles, Timer, Zap } from "lucide-react";
import { generateBenchmarkCatalog } from "@/lib/benchmark";
import type { FounderProfile } from "@/lib/types";

type Scored = { id: string; name: string; type: string; organizer: string; score: number; scoreLabel: string };
type Run = { total: number; done: number; batches: number; startedAt: number; finishedAt: number | null; scored: Scored[]; error: string | null };

const SIZES = [1000, 5000, 10000];
const CHUNK = 500;
const PARALLEL = 3;
const BATCH = 20;
const MANUAL_MINUTES_PER_RECORD = 12;

function useEased(target: number) {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      current.current += (target - current.current) * 0.18;
      if (Math.abs(target - current.current) < 0.5) current.current = target;
      setValue(Math.round(current.current));
      if (current.current !== target) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

const format = (value: number) => value.toLocaleString("en-US");

export default function ScaleEngine({ profile, onAnalyzed }: { profile: FounderProfile; onAnalyzed: (records: number) => void }) {
  const [size, setSize] = useState(SIZES[1]);
  const [run, setRun] = useState<Run | null>(null);
  const [now, setNow] = useState(0);
  const running = !!run && run.finishedAt === null && !run.error;
  const abort = useRef<AbortController | null>(null);
  const displayed = useEased(run?.done ?? 0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 80);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => () => abort.current?.abort(), []);

  async function start() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const catalog = generateBenchmarkCatalog(size);
    const startedAt = Date.now();
    setNow(startedAt);
    setRun({ total: size, done: 0, batches: 0, startedAt, finishedAt: null, scored: [], error: null });

    const chunks: typeof catalog[] = [];
    for (let index = 0; index < catalog.length; index += CHUNK) chunks.push(catalog.slice(index, index + CHUNK));
    let next = 0;
    try {
      await Promise.all(Array.from({ length: Math.min(PARALLEL, chunks.length) }, async () => {
        while (next < chunks.length) {
          const chunk = chunks[next++];
          const response = await fetch("/api/rank", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile, opportunities: chunk, mode: "scores" }),
            signal: controller.signal,
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(response.status === 429 ? "The public budget for large runs is used up for now and resets daily. Founder personas, the live scan and the four-week plan still work." : payload.error || "Surge could not finish the run.");
          setRun((current) => current && {
            ...current,
            done: current.done + chunk.length,
            batches: current.batches + Math.ceil(chunk.length / BATCH),
            scored: current.scored.concat(payload.opportunities as Scored[]),
          });
        }
      }));
      setRun((current) => current && { ...current, finishedAt: Date.now() });
      onAnalyzed(size);
    } catch (error) {
      if (controller.signal.aborted) return;
      setRun((current) => current && { ...current, error: error instanceof Error ? error.message : "The run failed." });
    }
  }

  const elapsed = run ? ((run.finishedAt ?? now) - run.startedAt) / 1000 : 0;
  const throughput = run && elapsed > 0.2 ? Math.round(run.done / elapsed) : 0;
  const bins = Array.from({ length: 10 }, () => 0);
  run?.scored.forEach((item) => { bins[Math.min(9, Math.floor(item.score / 10))] += 1; });
  const tallest = Math.max(1, ...bins);
  const strong = run ? run.scored.filter((item) => item.score >= 80).length : 0;
  const worth = run ? run.scored.filter((item) => item.score >= 65 && item.score < 80).length : 0;
  const top = run && run.finishedAt ? [...run.scored].sort((a, b) => b.score - a.score).slice(0, 5) : [];
  const savedHours = run ? Math.round((run.done * MANUAL_MINUTES_PER_RECORD) / 60) : 0;
  const finished = !!run?.finishedAt;

  return <section className="scale-engine" aria-labelledby="scale-title">
    <div className="scale-head">
      <div>
        <div className="eyebrow"><span className="eyebrow-dot" />SURGE ENGINE · MARKET SCALE</div>
        <h2 id="scale-title">Analyze the whole market, not a shortlist.</h2>
        <p>Founders can&apos;t open thousands of program pages. Surge scores thousands of opportunities against your startup in seconds — eligibility, project fit, effort and deadline for every record — then hands you the few worth your hours.</p>
      </div>
      <div className="scale-controls">
        <div className="scale-sizes" role="group" aria-label="Catalog size">{SIZES.map((option) => <button key={option} type="button" disabled={running} className={option === size ? "scale-size-active" : ""} onClick={() => setSize(option)}>{format(option)}</button>)}</div>
        <button type="button" className="scale-run" disabled={running} onClick={start}>{finished ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />}{running ? "Analyzing…" : finished ? "Run again" : `Analyze ${format(size)} opportunities`}</button>
      </div>
    </div>

    {run && <div className="scale-board">
      <div className="scale-counter">
        <div className="scale-count"><strong>{format(displayed)}</strong><span>/ {format(run.total)} opportunities scored</span></div>
        <div className="scale-progress" role="progressbar" aria-valuemin={0} aria-valuemax={run.total} aria-valuenow={run.done}><span style={{ width: `${(run.done / run.total) * 100}%` }} /></div>
        {run.error && <p className="scale-error">{run.error}</p>}
        <div className="scale-tiles">
          <div><Zap size={16} /><strong>{format(throughput)}</strong><span>records / second</span></div>
          <div><Timer size={16} /><strong>{elapsed.toFixed(1)}s</strong><span>elapsed</span></div>
          <div><Gauge size={16} /><strong>{format(run.batches)}</strong><span>engine batches</span></div>
          <div className="scale-tile-impact"><Sparkles size={16} /><strong>{format(savedHours)} h</strong><span>manual review avoided*</span></div>
        </div>
      </div>
      <div className="scale-dist">
        <div className="scale-dist-title"><span>FIT DISTRIBUTION · LIVE</span><span>{format(strong)} strong · {format(worth)} worth a look</span></div>
        <div className="scale-bars" aria-label="Distribution of fit scores">{bins.map((count, index) => <div key={index} className="scale-bar"><span className={"scale-bar-fill scale-bar-" + (index >= 8 ? "high" : index >= 6 ? "mid" : "low")} style={{ height: `${Math.max(2, (count / tallest) * 100)}%` }} /><em>{index * 10}</em></div>)}</div>
        {finished && <ol className="scale-top" aria-label="Top matches from this run">{top.map((item) => <li key={item.id}><span className="scale-top-score">{item.score}</span><span className="scale-top-name">{item.name}</span><span className="scale-top-type">{item.type}</span></li>)}</ol>}
      </div>
    </div>}

    <p className="scale-note">{run ? `Scored for ${profile.location || "your location"} · ${profile.sectors || "your focus areas"}. Change the founder and run again: the same catalog ranks completely differently. ` : "Every run is scored against the founder profile on the left. "}*Assumes ~{MANUAL_MINUTES_PER_RECORD} minutes to read a program page and judge fit by hand. The benchmark catalog is synthetic so throughput can be measured without hammering real sites; real, source-cited programs come from “Scan the market”.</p>
  </section>;
}
