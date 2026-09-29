"use client";

import { useMemo } from "react";
import { CalendarCheck, ExternalLink } from "lucide-react";
import { buildPlan } from "@/lib/plan";
import type { RankedOpportunity } from "@/lib/types";

const shortDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function ActionPlan({ items, weeklyHours }: { items: RankedOpportunity[]; weeklyHours: number }) {
  const plan = useMemo(() => buildPlan(items, weeklyHours), [items, weeklyHours]);
  const applications = new Set(plan.weeks.flatMap((week) => week.items.map((item) => item.id))).size;

  return <section className="action-plan" aria-labelledby="plan-title">
    <div className="plan-head">
      <div>
        <div className="eyebrow"><span className="eyebrow-dot" />FROM RANKING TO ACTION</div>
        <h2 id="plan-title">Your 4-week application plan</h2>
        <p>Surge schedules the best fits into the {plan.capacity} hours a week you have, in deadline order, so nothing strong slips past.</p>
      </div>
      <div className="plan-summary"><strong>{applications}</strong><span>applications</span><strong>{Math.round(plan.totalHours)}h</strong><span>of {plan.capacity * 4}h capacity</span></div>
    </div>
    {applications === 0 ? <div className="plan-empty">No opportunity scores 50+ with a workable deadline yet. Run a scan or adjust the founder profile.</div> :
      <div className="plan-weeks">{plan.weeks.map((week) => <div className="plan-week" key={week.week}>
        <div className="plan-week-head"><strong>Week {week.week}</strong><span>{shortDate(week.start)}</span></div>
        <div className="plan-capacity" aria-label={`${Math.round(week.used)} of ${plan.capacity} hours used`}><span style={{ width: `${Math.min(100, (week.used / plan.capacity) * 100)}%` }} /></div>
        <div className="plan-hours">{Math.round(week.used)} / {plan.capacity} h</div>
        {week.items.length === 0 && <div className="plan-free">Open capacity</div>}
        {week.items.map((item) => <a className="plan-item" key={`${item.id}-${item.part}`} href={item.sourceUrl} target="_blank" rel="noreferrer">
          <span className="plan-score">{item.score}</span>
          <span className="plan-item-main"><strong>{item.name}</strong><em>{item.estimated ? "~" : ""}{Math.round(item.hours * 10) / 10}h{item.parts > 1 ? ` of ${item.total}h · part ${item.part}/${item.parts}` : ""}{item.deadline ? ` · due ${item.deadline.slice(5)}` : ""}</em></span>
          <ExternalLink size={13} />
        </a>)}
      </div>)}</div>}
    {plan.skipped.length > 0 && <p className="plan-skipped"><CalendarCheck size={14} /> Left out: {plan.skipped.slice(0, 3).map((item) => `${item.name} (${item.reason})`).join(" · ")}{plan.skipped.length > 3 ? ` · +${plan.skipped.length - 3} more` : ""}</p>}
  </section>;
}
