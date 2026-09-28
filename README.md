# Surge

Surge is a founder-fit decision engine for the global opportunity market—not another static directory. It searches grants, accelerators, and hackathons, then ranks what fits a startup by project, eligibility, location, deadline, and application capacity, with source and reason attached.

## Live demo

[Open Surge](https://surge.arcumet.com) — hosted on AWS EC2. See [SUBMISSION.md](SUBMISSION.md) for the Builder Center project story and demo outline.

**Live demo walkthrough:** [31-second recording](docs/surge-demo.mp4)

![Surge dashboard preview](docs/surge-dashboard.png)

## What works

- A founder profile for location, stage, focus areas, project summary, and weekly application time.
- Live web discovery through OpenRouter's web search tool, constrained to official opportunity sources.
- Typed Jev decisions for eligibility (`choice`), project fit (`score`), and effort fit (`score`) run in 20-record batches; each rank request accepts up to 1,000 candidates with bounded concurrency. Deadline runway stays deterministic.
- Public OpenRouter routes have per-client and daily budgets to limit spend.
- A live signal map visualizes opportunity mix, fit tiers, and deadline runway; the shortlist includes animated re-ranking, sorting, and near-term deadline filtering.
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

Open `http://localhost:3000`. Without a key, the reference list and demo scoring work; clicking **Scan the market** explains how to enable live search.

## Score model

Live match scores total 100 points: project fit (40, Jev), eligibility (25, Jev choice), application-effort fit (15, Jev), and deadline runway (20, deterministic date calculation). Jev confidence is displayed as context, not treated as accuracy. Missing dates and effort are surfaced as unknowns instead of guessed. Every opportunity links to its source; founders should confirm current terms and eligibility before applying.

## API routes

- `POST /api/discover` — searches current opportunities using the OpenRouter web search server tool and returns source-linked records.
- `POST /api/rank` — sends the founder and shortlist to `typesafe/jev-1.13` through the OpenRouter Decisions API, then combines its typed judgments with code-owned deadline scoring.
