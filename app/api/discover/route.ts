import { NextResponse } from "next/server";
import type { FounderProfile, Opportunity, OpportunityType } from "@/lib/types";

export const runtime = "nodejs";

const schema = {
  type: "object",
  properties: {
    opportunities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ["Grant", "Accelerator", "Hackathon", "Startup program"] },
          organizer: { type: "string" },
          description: { type: "string" },
          sourceUrl: { type: "string" },
          location: { type: "string" },
          eligibility: { type: "string" },
          deadline: { type: ["string", "null"] },
          effortHours: { type: ["number", "null"] },
          funding: { type: ["string", "null"] },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["name", "type", "organizer", "description", "sourceUrl", "location", "eligibility", "deadline", "effortHours", "funding", "tags"],
        additionalProperties: false,
      },
    },
  },
  required: ["opportunities"],
  additionalProperties: false,
};

function isOpportunityType(value: unknown): value is OpportunityType {
  return value === "Grant" || value === "Accelerator" || value === "Hackathon" || value === "Startup program";
}

function isSafeSource(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Add OPENROUTER_API_KEY to enable live discovery." }, { status: 503 });

  let profile: FounderProfile;
  try {
    profile = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid founder profile." }, { status: 400 });
  }
  if (!profile.location || !profile.project || !profile.sectors) {
    return NextResponse.json({ error: "Add a location, project summary, and focus areas first." }, { status: 400 });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENROUTER_SEARCH_MODEL || "openai/gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are Surge, a careful startup opportunity researcher. Search for open or upcoming grants, accelerators, hackathons, and startup programs that could fit the founder profile. Return no more than 8 distinct opportunities total, covering all three requested categories where relevant. Include only entries with a real, official organizer source URL that appeared in search results. Do not invent application windows, amounts, terms, or eligibility: use null for an unknown deadline, effort, or award and say what is unknown in the description. Prefer official organizer pages over roundup articles. Estimate application hours only when the official requirements support an estimate; otherwise null. Use ISO YYYY-MM-DD for a published deadline. Keep each description factual and short.",
        },
        {
          role: "user",
          content: `Find opportunities for this founder. Search the web for current cycles and official application pages.\n\nFounder profile: ${JSON.stringify(profile)}\n\nReturn grounded opportunities as JSON matching the schema. For each item, sourceUrl must be the official page you actually found. Include a deadline only if a current official page explicitly publishes one.`,
        },
      ],
      tools: [{ type: "openrouter:web_search", parameters: { max_results: 5, max_total_results: 12 } }],
      response_format: { type: "json_schema", json_schema: { name: "surge_opportunities", strict: true, schema } },
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Live search is unavailable right now. Keep using the reference list, or try again shortly." }, { status: 502 });
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") return NextResponse.json({ error: "Search returned no readable results." }, { status: 502 });

  try {
    const parsed = JSON.parse(content) as { opportunities?: Record<string, unknown>[] };
    const items: Opportunity[] = (parsed.opportunities || []).flatMap((item, index) => {
      if (!isOpportunityType(item.type) || !isSafeSource(item.sourceUrl) || typeof item.name !== "string") return [];
      return [{
        id: `live-${Date.now()}-${index}`,
        name: item.name,
        type: item.type,
        organizer: String(item.organizer || "Organizer not listed"),
        description: String(item.description || "See the official source for details."),
        sourceUrl: item.sourceUrl,
        location: String(item.location || "Check source"),
        eligibility: String(item.eligibility || "Check source"),
        deadline: typeof item.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.deadline) ? item.deadline : null,
        effortHours: typeof item.effortHours === "number" && item.effortHours >= 0 ? item.effortHours : null,
        funding: typeof item.funding === "string" ? item.funding : null,
        tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 5) : [],
        checkedAt: new Date().toISOString(),
      }];
    });
    return NextResponse.json({ opportunities: items, checkedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Could not read the search results. Please try again." }, { status: 502 });
  }
}
