# Surge

Surge is a founder-fit decision engine for the global opportunity market—not another static directory. It searches grants, accelerators, and hackathons, then ranks what fits a startup by project, eligibility, location, deadline, and application capacity, with source and reason attached.

## Live demo

[Open Surge](https://surge.arcumet.com) — hosted on AWS EC2. See [SUBMISSION.md](SUBMISSION.md) for the Builder Center project story and demo outline.

**Live demo walkthrough:** [67-second narrated demo](docs/surge-demo.mp4)

![Surge dashboard preview](docs/surge-dashboard.png)

## What works

- **Scale engine:** score 1,000 / 5,000 / 10,000 opportunities in one click with a live counter, throughput and fit distribution (measured ≈ 9 s for 10,000 on the live deployment; the benchmark catalog is synthetic and labelled).
- **4-week application plan:** the best fits scheduled into the founder's weekly hours, in deadline order.
- **Collapsible sidebar** and larger, more readable type.
- **Instant, real first impression:** first visit loads a snapshot of real, citation-verified opportunities and Surge ranks them against the founder profile within seconds — no waiting on a scan.
- **Watch the AI re-rank:** one-click founder personas (AI SaaS · US, Climate · Kenya, Fintech · India, Health · UK) or any profile edit re-runs the Surge Engine on the whole grid; cards animate into their new positions with `▲/▼` rank-movement and score-delta chips.
- **Pipeline export:** save opportunities, then download deadlines as a calendar (`.ics`, 3-day reminders) or the whole pipeline as CSV.
- A founder profile for location, stage, focus areas, project summary, and weekly application time.
- Live web discovery through OpenRouter's web search tool, constrained to official opportunity sources.
- Typed Surge Engine decisions for eligibility (`choice`), project fit (`score`), and effort fit (`score`) run in 20-record batches; each rank request accepts up to 1,000 candidates with bounded concurrency. Deadline runway stays deterministic.
- Public OpenRouter routes have per-client and daily budgets, server-side payload clamping, and a 6-hour cache for identical scans to limit spend.
- A live signal map visualizes opportunity mix, fit tiers, and deadline runway; preference edits re-run the Surge Engine on live results, then animate cards into their new grid positions. Sorting and near-term deadline filtering stay interactive.
- A visible 100-point score breakdown with match reasons and eligibility/deadline watchouts.
- Local demo listings, a transparent rules-based demo score, and a saved pipeline that work without an API key. Demo entries are references, not claims that a cycle is open.

## Deploy

`npm run deploy` lints, type-checks, builds, restarts the systemd service, and verifies the live page and CSS return 200 (building under a running server breaks its asset hashes, so the two steps run back to back).

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
# Add an OpenRouter key to .env.local to enable live discovery and ranking.
npm run dev
```

Open `http://localhost:3000`. Without a key, the reference list and demo scoring work; clicking **Scan the market** explains how to enable live search.

## Score model

Live match scores total 100 points: project fit (40), eligibility (25), application-effort fit (15) — all Surge Engine judgments —, and deadline runway (20, deterministic date calculation). Engine confidence is displayed as context, not treated as accuracy. Missing dates and effort are surfaced as unknowns instead of guessed. Every opportunity links to its source; founders should confirm current terms and eligibility before applying.

## API routes

- `POST /api/discover` — searches current opportunities using the OpenRouter web search server tool and returns source-linked records.
- `POST /api/rank` — sends the founder and shortlist to the Surge Engine (a typed decision model behind OpenRouter's Decisions API), then combines its judgments with code-owned deadline scoring.
