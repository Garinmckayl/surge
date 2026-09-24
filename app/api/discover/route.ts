import { NextResponse } from "next/server";
import type { FounderProfile, Opportunity, OpportunityType } from "@/lib/types";

export const runtime = "nodejs";

const categories: OpportunityType[] = ["Grant", "Accelerator", "Hackathon"];

function isSafeSource(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isOfficialSource(sourceUrl: string, organizer: string) {
  const hostname = new URL(sourceUrl).hostname.toLowerCase();
  if (hostname.endsWith(".gov") || hostname.endsWith(".edu")) return true;
  const ignored = new Set(["the", "and", "for", "inc", "llc", "program", "accelerator", "foundation", "company", "group"]);
  const tokens = organizer.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3 && !ignored.has(token));
  const hostParts = hostname.split(".").slice(0, -1);
  if (tokens.some((token) => hostParts.some((part) => part.includes(token)))) return true;
  return ["aws.amazon.com", "builder.aws.com", "aboutamazon.com", "about.amazon.com"].includes(hostname);
}

function sourceKey(value: string) {
  const url = new URL(value);
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
}

function readField(block: string, name: string) {
  return block.match(new RegExp(`(?:^|\\n)\\s*${name}:\\s*(.*)`, "i"))?.[1]?.trim() || "";
}

async function discoverCategory(apiKey: string, profile: FounderProfile, category: OpportunityType): Promise<Opportunity[]> {
  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENROUTER_SEARCH_MODEL || "openai/gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are a careful startup opportunity researcher. Today is ${today} UTC. Search ONLY for ${category.toLowerCase()} opportunities accepting applications now or with an explicitly confirmed future cycle. Never include expired, closed, historical, or undated opportunities whose current status cannot be verified from the official application page. Return at most 2. Use only an official organizer application/program page as the source; no press releases, roundups, or third-party directories. Never guess dates, eligibility, funding, or effort. A missing value must be written as unknown. Use ISO YYYY-MM-DD for a published deadline. For each item, return exactly these lines, with one blank line between items, no introduction or markdown fences:\nNAME: ...\nSTATUS: open or upcoming\nDEADLINE: YYYY-MM-DD or none\nORGANIZER: ...\nLOCATION: ...\nELIGIBILITY: ...\nEFFORT_HOURS: number or unknown\nFUNDING: ... or unknown\nTAGS: comma-separated\nDESCRIPTION: one factual sentence\nSOURCE: [Official application page](https://exact-url)\nThe SOURCE markdown link must cite the official page you actually found in search.`,
        },
        {
          role: "user",
          content: `Find current ${category.toLowerCase()} opportunities for this founder, prioritizing location, stage, and project fit. Return only opportunities whose official source confirms they are open or explicitly upcoming on ${today}.\nFounder profile: ${JSON.stringify(profile)}`,
        },
      ],
      tools: [{ type: "openrouter:web_search", parameters: { max_results: 5, max_total_results: 10 } }],
      tool_choice: "required",
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) return [];

  const payload = await response.json();
  const message = payload.choices?.[0]?.message;
  if (typeof message?.content !== "string") return [];
  const todayValue = today;
  const citedUrls = new Set<string>((message.annotations || [])
    .filter((annotation: { type?: string }) => annotation.type === "url_citation")
    .map((annotation: { url_citation?: { url?: string }; url?: string }) => annotation.url_citation?.url || annotation.url)
    .filter((url: unknown): url is string => typeof url === "string")
    .flatMap((url: string) => {
      try { return [sourceKey(url)]; } catch { return []; }
    }));
  const blocks = message.content.split(/\n\s*\n(?=\s*(?:NAME:|\d+[.)]\s*NAME:))/i);

  return blocks.flatMap((block: string, index: number) => {
    const name = readField(block, "NAME").replace(/^(?:\d+[.)]\s*)/, "");
    const status = readField(block, "STATUS").toLowerCase();
    const rawDeadline = readField(block, "DEADLINE").toLowerCase();
    const sourceMatch = readField(block, "SOURCE").match(/\[[^\]]+\]\((https:\/\/[^)\s]+)\)/i);
    const sourceUrl = sourceMatch?.[1] || "";
    const organizer = readField(block, "ORGANIZER") || "Organizer not listed";
    if (!name || !["open", "upcoming"].includes(status) || !isSafeSource(sourceUrl)) return [];
    if (!citedUrls.has(sourceKey(sourceUrl)) || !isOfficialSource(sourceUrl, organizer)) return [];
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(rawDeadline) ? rawDeadline : null;
    if (deadline && deadline < todayValue) return [];
    const rawEffort = readField(block, "EFFORT_HOURS").toLowerCase();
    const effortHours = /^\d+(?:\.\d+)?$/.test(rawEffort) ? Number(rawEffort) : null;
    const tags = readField(block, "TAGS").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 5);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return [{
      id: `live-${category.toLowerCase()}-${slug}-${index}`,
      name,
      type: category,
      status: status as "open" | "upcoming",
      organizer,
      description: readField(block, "DESCRIPTION") || "See the official source for details.",
      sourceUrl,
      location: readField(block, "LOCATION") || "Check source",
      eligibility: readField(block, "ELIGIBILITY") || "Check source",
      deadline,
      effortHours,
      funding: readField(block, "FUNDING").toLowerCase() === "unknown" ? null : readField(block, "FUNDING") || null,
      tags,
      checkedAt: new Date().toISOString(),
    }];
  });
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

  try {
    const batches = await Promise.all(categories.map((category) => discoverCategory(apiKey, profile, category)));
    const opportunities = batches.flat().slice(0, 8);
    if (!opportunities.length) {
      return NextResponse.json({ error: "No currently open or confirmed upcoming opportunities with verified official-source citations were found. Broaden your focus or try again later." }, { status: 404 });
    }
    return NextResponse.json({ opportunities, checkedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Live search is unavailable or returned invalid results. Try again shortly." }, { status: 502 });
  }
}
