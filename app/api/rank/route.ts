import { NextResponse } from "next/server";
import { rankDeadline } from "@/lib/rank";
import type { FounderProfile, Opportunity, RankedOpportunity } from "@/lib/types";
import { reservePublicApiBudget } from "@/lib/public-api-guard";

export const runtime = "nodejs";

const BATCH_SIZE = 20;
const MAX_OPPORTUNITIES = 1000;
const MAX_CONCURRENT_BATCHES = 4;

type DecisionAnswer = {
  type: "score" | "choice";
  score?: number;
  choice?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
};

function decisionRequest(profile: FounderProfile, opportunities: Opportunity[]) {
  const stateOpportunities = Object.fromEntries(opportunities.map((item, index) => [`item_${index}`, {
    name: item.name,
    kind: item.type,
    description: item.description,
    location: item.location,
    eligibility: item.eligibility,
    application_effort_hours: item.effortHours,
    funding: item.funding,
    tags: item.tags,
    deadline: item.deadline,
  }]));
  const questions: Record<string, unknown> = {};

  opportunities.forEach((_item, index) => {
    const field = `opportunities.item_${index}`;
    questions[`item_${index}_eligibility`] = {
      type: "choice",
      instructions: `Given founder and ${field}, assess whether the founder is eligible based only on the explicit profile and opportunity requirements. Do not infer legal or geographic eligibility when missing.`,
      criteria: {
        likely_eligible: "The explicit founder profile matches the stated stage, location, and eligibility requirements; no material conflict is stated.",
        uncertain: "Key eligibility details are missing, ambiguous, or program-dependent, so the founder should verify before investing effort.",
        likely_ineligible: "An explicit requirement conflicts with the founder's profile, such as incompatible geography, stage, entity type, or focus area.",
      },
    };
    questions[`item_${index}_project_fit`] = {
      type: "score",
      instructions: `How closely does the founder's project and stated focus match the purpose and focus of ${field}? Ignore deadline and application workload.`,
      criteria: [
        "No meaningful overlap; the opportunity is aimed at a different kind of project.",
        "Weak overlap; only a secondary or broad connection exists.",
        "Moderate overlap; the project fits one relevant theme but is not a clear priority match.",
        "Strong overlap; the project's core work directly fits the stated focus.",
        "Exceptional overlap; the opportunity is specifically designed for this project's core problem or technology.",
      ],
    };
    questions[`item_${index}_effort_fit`] = {
      type: "score",
      instructions: `How manageable is the stated application effort for this founder? Use ${field}.application_effort_hours and founder.weekly_hours when both are provided; if workload is unknown, choose the middle level rather than guessing.`,
      criteria: [
        "Poorly manageable; the work appears far beyond the available time or requires substantial unlisted materials.",
        "Difficult; likely to crowd out other work or need more time than this founder has available.",
        "Manageable with planning; workload is uncertain or moderately fits the founder's stated availability.",
        "Good fit; the expected effort fits the founder's available time with modest planning.",
        "Excellent fit; application is lightweight relative to the founder's available time.",
      ],
    };
  });

  return {
    model: "typesafe/jev-1.13",
    state: {
      founder: {
        location: profile.location,
        stage: profile.stage,
        focus_areas: profile.sectors,
        project: profile.project,
        weekly_hours: profile.weeklyHours,
      },
      opportunities: stateOpportunities,
    },
    questions,
  };
}

function scoreBatch(profile: FounderProfile, opportunities: Opportunity[], answers: Record<string, DecisionAnswer>): RankedOpportunity[] {
  return opportunities.map((item, index) => {
    const eligibility = answers[`item_${index}_eligibility`];
    const fit = answers[`item_${index}_project_fit`];
    const effort = answers[`item_${index}_effort_fit`];
    const eligiblePoints = eligibility?.choice === "likely_eligible" ? 25 : eligibility?.choice === "uncertain" ? 13 : 0;
    const fitPoints = Math.max(0, Math.min(4, fit?.score ?? 2)) * 10;
    const effortPoints = Math.max(0, Math.min(4, effort?.score ?? 2)) * 3.75;
    const deadline = rankDeadline(item.deadline);
    const score = Math.round(Math.max(0, Math.min(100, eligiblePoints + fitPoints + effortPoints + deadline.points)));
    const reasons = [
      `Jev project-fit score: ${Number(fit?.score ?? 2).toFixed(1)} / 4.`,
      `Eligibility judgment: ${(eligibility?.choice || "uncertain").replaceAll("_", " ")} (${Math.round((eligibility?.confidence ?? 0) * 100)}% confidence).`,
      `Jev effort-fit score: ${Number(effort?.score ?? 2).toFixed(1)} / 4 against ${profile.weeklyHours} hours available per week.`,
      deadline.reason,
    ];
    const watchouts = [
      eligibility?.choice !== "likely_eligible" ? "Confirm eligibility from the official rules before applying." : "",
      item.deadline === null ? "No deadline confirmed; check the source for the next cycle." : "",
      item.effortHours === null ? "Application effort is unknown; review required materials at the source." : "",
    ].filter(Boolean);

    return {
      ...item,
      score,
      scoreLabel: score >= 80 ? "Strong fit" : score >= 65 ? "Worth a look" : "Stretch",
      reasons,
      watchouts,
      scoreSource: "Jev 1.13",
      scoreBreakdown: { projectFit: fitPoints, eligibility: eligiblePoints, effortFit: effortPoints, deadlineRunway: deadline.points },
      confidence: fit?.confidence,
      probability: eligibility?.probabilities?.[eligibility.choice || ""],
    };
  });
}

async function rankBatch(apiKey: string, profile: FounderProfile, opportunities: Opportunity[]) {
  const response = await fetch("https://openrouter.ai/api/alpha/decisions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(decisionRequest(profile, opportunities)),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error("Jev batch request failed.");

  const payload = await response.json();
  const answers = payload.answers as Record<string, DecisionAnswer> | undefined;
  if (!answers) throw new Error("Jev returned an unexpected response.");
  return scoreBatch(profile, opportunities, answers);
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Add OPENROUTER_API_KEY to enable Jev rankings." }, { status: 503 });

  let body: { profile?: FounderProfile; opportunities?: Opportunity[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid ranking request." }, { status: 400 });
  }
  const profile = body.profile;
  const opportunities = Array.isArray(body.opportunities) ? body.opportunities : [];
  if (!profile?.location || !profile.project || opportunities.length === 0) {
    return NextResponse.json({ error: "A complete founder profile and at least one opportunity are required." }, { status: 400 });
  }
  if (opportunities.length > MAX_OPPORTUNITIES) {
    return NextResponse.json({ error: `A single rank request supports up to ${MAX_OPPORTUNITIES} opportunities.` }, { status: 413 });
  }

  const startedAt = Date.now();
  const batches: Opportunity[][] = [];
  for (let index = 0; index < opportunities.length; index += BATCH_SIZE) {
    batches.push(opportunities.slice(index, index + BATCH_SIZE));
  }
  const budget = reservePublicApiBudget(request, "rank", batches.length, 50, 60, 60 * 60_000);
  if (!budget.allowed) {
    return NextResponse.json({ error: "The public Jev budget is temporarily exhausted. Please try again later." }, { status: 429, headers: { "Retry-After": String(budget.retryAfterSeconds) } });
  }

  const rankedBatches = new Array<RankedOpportunity[]>(batches.length);
  let nextBatch = 0;

  try {
    const workers = Array.from({ length: Math.min(MAX_CONCURRENT_BATCHES, batches.length) }, async () => {
      while (true) {
        const batchIndex = nextBatch++;
        if (batchIndex >= batches.length) return;
        rankedBatches[batchIndex] = await rankBatch(apiKey, profile, batches[batchIndex]);
      }
    });
    await Promise.all(workers);
  } catch {
    return NextResponse.json({ error: "Jev could not complete all ranking batches. Retry with fewer opportunities." }, { status: 502 });
  }

  return NextResponse.json({
    opportunities: rankedBatches.flat(),
    model: "typesafe/jev-1.13",
    metadata: {
      opportunityCount: opportunities.length,
      batchSize: BATCH_SIZE,
      batchCount: batches.length,
      concurrency: Math.min(MAX_CONCURRENT_BATCHES, batches.length),
      durationMs: Date.now() - startedAt,
    },
  });
}
