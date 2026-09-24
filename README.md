# Surge

Surge is a founder-focused opportunity radar for grants, accelerators, hackathons, and startup programs. It helps a founder find the next good application by showing the source, what matches, what might not, and the effort involved.

## What works

- A founder profile for location, stage, focus areas, project summary, and weekly application time.
- Live web discovery through OpenRouter's web search tool, constrained to official opportunity sources.
- Typed Jev decisions for eligibility (`choice`), project fit (`score`), and application effort (`score`). Deadline runway is calculated deterministically in code.
- A visible 100-point score breakdown with match reasons and eligibility/deadline watchouts.
- Local demo listings, a transparent rules-based demo score, and a saved pipeline that work without an API key. Demo entries are references, not claims that a cycle is open.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
# Add an OpenRouter key to .env.local to enable live discovery and Jev ranking.
npm run dev
```

Open `http://localhost:3000`. Without a key, the reference list and demo scoring work; selecting **Find live opportunities** explains how to enable live search.

## Score model

Live match scores total 100 points: project fit (40, Jev), eligibility (25, Jev choice), application-effort fit (15, Jev), and deadline runway (20, deterministic date calculation). Jev confidence is displayed as context, not treated as accuracy. Missing dates and effort are surfaced as unknowns instead of guessed. Every opportunity links to its source; founders should confirm current terms and eligibility before applying.

## API routes

- `POST /api/discover` — searches current opportunities using the OpenRouter web search server tool and returns source-linked records.
- `POST /api/rank` — sends the founder and shortlist to `typesafe/jev-1.13` through the OpenRouter Decisions API, then combines its typed judgments with code-owned deadline scoring.
