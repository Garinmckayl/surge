import type { Opportunity, OpportunityType } from "@/lib/types";

// A deterministic, clearly synthetic catalog used to measure engine throughput at scale
// without hammering real program websites. Real programs come from the live scan.
const regions = ["Global", "United States", "European Union", "United Kingdom", "India", "Kenya", "Nigeria", "Ethiopia", "Ghana", "Brazil", "Mexico", "Canada", "Germany", "Singapore", "Indonesia", "Australia", "South Africa", "Egypt", "Vietnam", "Colombia"];
const sectors: { name: string; tags: string[] }[] = [
  { name: "Climate", tags: ["climate", "clean energy", "sustainability"] },
  { name: "AI", tags: ["AI", "machine learning", "developer tools"] },
  { name: "Fintech", tags: ["fintech", "payments", "financial inclusion"] },
  { name: "Health", tags: ["healthtech", "biotech", "diagnostics"] },
  { name: "Agriculture", tags: ["agriculture", "food", "supply chain"] },
  { name: "Education", tags: ["edtech", "learning", "skills"] },
  { name: "Deep tech", tags: ["deep tech", "robotics", "hardware"] },
  { name: "Social impact", tags: ["social impact", "community", "nonprofit"] },
  { name: "Creative", tags: ["media", "gaming", "creator economy"] },
  { name: "Mobility", tags: ["mobility", "logistics", "transport"] },
];
const kinds: Record<OpportunityType, string[]> = {
  Grant: ["Seed Grant", "Innovation Fund", "Impact Grant", "R&D Award"],
  Accelerator: ["Accelerator", "Startup Studio", "Founder Cohort", "Venture Program"],
  Hackathon: ["Hackathon", "Build Challenge", "Demo Sprint", "Innovation Cup"],
  "Startup program": ["Startup Program", "Credits Program"],
};
const stages = ["Idea", "Pre-seed", "Seed", "Early-stage"];
const efforts = [3, 5, 8, 12, 16, 24, 40, null];

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateBenchmarkCatalog(count: number, seed = 2026): Opportunity[] {
  const random = rng(seed);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const types: OpportunityType[] = ["Grant", "Grant", "Accelerator", "Accelerator", "Hackathon", "Startup program"];
  const today = Date.now();
  return Array.from({ length: count }, (_, index) => {
    const type = pick(types);
    const sector = pick(sectors);
    const region = pick(regions);
    const stage = pick(stages);
    const effortHours = pick(efforts);
    const hasDeadline = random() < 0.72;
    const deadline = hasDeadline ? new Date(today + (5 + Math.floor(random() * 150)) * 86_400_000).toISOString().slice(0, 10) : null;
    const eligibilityRegion = region === "Global" ? "founders worldwide" : `startups based in ${region}`;
    return {
      id: `bench-${index}`,
      name: `${region} ${sector.name} ${pick(kinds[type])} ${1 + Math.floor(random() * 9)}`,
      type,
      organizer: `${region} ${sector.name} Foundation`,
      description: `Supports ${stage.toLowerCase()} ${sector.name.toLowerCase()} startups with ${type === "Grant" ? "non-dilutive funding" : type === "Accelerator" ? "mentorship and investor access" : "prizes and partnerships"}.`,
      sourceUrl: "https://example.org/synthetic-benchmark",
      location: region,
      eligibility: `${stage} ${sector.name.toLowerCase()} ${eligibilityRegion}.`,
      deadline,
      effortHours,
      funding: type === "Grant" ? `$${pick([10, 25, 50, 100, 250])}k` : null,
      tags: sector.tags,
    };
  });
}
