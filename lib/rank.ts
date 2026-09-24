import type { FounderProfile, Opportunity, RankedOpportunity } from "@/lib/types";

const terms = (value: string) => value.toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length > 2);

export function rankForDemo(opportunity: Opportunity, profile: FounderProfile): RankedOpportunity {
  const founderText = `${profile.sectors} ${profile.project} ${profile.stage}`.toLowerCase();
  const matchedTags = opportunity.tags.filter((tag) => terms(tag).some((word) => founderText.includes(word)));
  const locationMatch = opportunity.location.toLowerCase().includes("global")
    || opportunity.location.toLowerCase().includes("online")
    || profile.location.toLowerCase().split(/[ ,]+/).some((part) => part.length > 2 && opportunity.location.toLowerCase().includes(part));
  const profileTerms = terms(`${profile.sectors} ${profile.project}`);
  const eligibilityTerms = terms(opportunity.eligibility);
  const sharedEligibility = profileTerms.filter((word) => eligibilityTerms.includes(word));
  const sectorFit = Math.min(100, 48 + matchedTags.length * 9 + sharedEligibility.length * 3);
  const effortFit = opportunity.effortHours === null
    ? 62
    : Math.max(18, Math.min(100, 100 - Math.max(0, opportunity.effortHours - profile.weeklyHours) * 1.45));
  const deadlineDays = opportunity.deadline ? Math.ceil((new Date(opportunity.deadline).getTime() - Date.now()) / 86_400_000) : null;
  const deadlineFit = deadlineDays === null ? 72 : deadlineDays < 0 ? 0 : deadlineDays < 4 ? 35 : deadlineDays < 8 ? 55 : deadlineDays < 15 ? 70 : 90;
  const score = Math.round(sectorFit * 0.4 + (locationMatch ? 90 : 48) * 0.2 + effortFit * 0.2 + deadlineFit * 0.2);
  const reasons = [
    matchedTags.length ? `Project overlap: ${matchedTags.slice(0, 2).join(" + ")}.` : "Project fit is a broad match; confirm the program’s focus before applying.",
    locationMatch ? `Location works: ${opportunity.location}.` : `Location needs checking: ${opportunity.location}.`,
    opportunity.effortHours === null
      ? "Application effort is not published; estimate it from the official requirements."
      : `Estimated ${opportunity.effortHours} application hours vs ${profile.weeklyHours} hours available per week.`,
    deadlineDays === null ? "No single deadline listed here; check the official page for the current cycle." : deadlineDays < 0 ? "Listed deadline has passed." : `${deadlineDays} days until the listed deadline.`,
  ];
  const watchouts = [
    opportunity.demo ? "Reference listing: verify current availability and requirements at the source." : "Confirm eligibility and deadline on the organizer’s page.",
    !locationMatch ? "Program geography may not match your location." : "",
    deadlineDays !== null && deadlineDays < 8 ? "Short application window; confirm required materials immediately." : "",
  ].filter(Boolean);

  return {
    ...opportunity,
    score,
    scoreLabel: score >= 80 ? "Strong fit" : score >= 65 ? "Worth a look" : "Stretch",
    reasons,
    watchouts,
    scoreSource: "Rules-based demo",
  };
}

export function rankDeadline(deadline: string | null): { points: number; reason: string } {
  if (!deadline) return { points: 15, reason: "No deadline published; confirm the current cycle at the source." };
  const days = Math.ceil((new Date(`${deadline}T23:59:59Z`).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { points: 0, reason: "The listed deadline has passed." };
  if (days <= 3) return { points: 4, reason: `${days} days left; the window is very tight.` };
  if (days <= 7) return { points: 8, reason: `${days} days left; prioritize only if materials are ready.` };
  if (days <= 14) return { points: 12, reason: `${days} days left to prepare an application.` };
  if (days <= 30) return { points: 16, reason: `${days} days left; enough runway for a focused application.` };
  return { points: 20, reason: `${days} days left; a manageable application window.` };
}
