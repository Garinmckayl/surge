import type { RankedOpportunity } from "@/lib/types";

export type PlanItem = { id: string; name: string; hours: number; total: number; estimated: boolean; score: number; deadline: string | null; part: number; parts: number; sourceUrl: string };
export type PlanWeek = { week: number; start: Date; used: number; items: PlanItem[] };
export type Plan = { weeks: PlanWeek[]; capacity: number; totalHours: number; skipped: { name: string; reason: string }[] };

const DAY = 86_400_000;
const DEFAULT_HOURS = 8;

// Deterministic scheduler: best-fit opportunities first, placed in the earliest weeks that still
// finish before their deadline and fit inside the founder's weekly capacity.
export function buildPlan(items: RankedOpportunity[], weeklyHours: number, weekCount = 4, minScore = 50): Plan {
  const capacity = Math.max(1, weeklyHours || 1);
  const now = Date.now();
  const weeks: PlanWeek[] = Array.from({ length: weekCount }, (_, index) => ({ week: index + 1, start: new Date(now + index * 7 * DAY), used: 0, items: [] }));
  const skipped: Plan["skipped"] = [];

  const candidates = items.filter((item) => item.score >= minScore).sort((a, b) => b.score - a.score);
  for (const item of candidates) {
    const estimated = item.effortHours === null;
    const hours = item.effortHours ?? DEFAULT_HOURS;
    const daysLeft = item.deadline ? Math.ceil((new Date(`${item.deadline}T23:59:59Z`).getTime() - now) / DAY) : null;
    if (daysLeft !== null && daysLeft < 0) continue;
    const lastWeek = daysLeft === null ? weekCount : Math.max(1, Math.min(weekCount, Math.floor(daysLeft / 7)));

    let placed = false;
    for (let start = 0; start < lastWeek && !placed; start++) {
      const allocation: number[] = [];
      let remaining = hours;
      for (let index = start; index < lastWeek && remaining > 0; index++) {
        const room = capacity - weeks[index].used;
        const take = Math.min(room, remaining);
        if (take > 0) { allocation[index] = take; remaining -= take; }
        else if (allocation.length) break;
      }
      if (remaining > 0.001) continue;
      const slots = allocation.map((take, index) => ({ take, index })).filter((slot) => slot.take);
      slots.forEach((slot, order) => {
        weeks[slot.index].used += slot.take;
        weeks[slot.index].items.push({ id: item.id, name: item.name, hours: slot.take, total: hours, estimated, score: item.score, deadline: item.deadline, part: order + 1, parts: slots.length, sourceUrl: item.sourceUrl });
      });
      placed = true;
    }
    if (!placed) skipped.push({ name: item.name, reason: daysLeft !== null && daysLeft < 7 ? "deadline too close for your capacity" : "over your weekly capacity" });
  }
  return { weeks, capacity, totalHours: weeks.reduce((sum, week) => sum + week.used, 0), skipped };
}
