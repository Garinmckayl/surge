# AWS Builder Center — submission

## Project

**Surge — Analyze the whole opportunity market. Act on the few that fit.**

**Category:** Commercial Potential  
**Lane:** Startup  
**Tags:** `#commercial-potential` `#startup`

**Challenge:** [AWS Builder Center Zero to Shipped](https://builder.aws.com/build/hackathons/e83e84e5-4f4c-383b-bbe9-4a15ac195d55)  
**Deadline:** October 2, 2026, 11:59 p.m. PT  
**Live app:** https://surge.arcumet.com (public URL on AWS EC2)  
**Recorded walkthrough:** [40-second live demo](docs/surge-demo.mp4)

![Surge dashboard](docs/surge-dashboard.png)

## One-line pitch

Surge scores **10,000 grants, accelerators and hackathons against your startup in about nine seconds**, then turns the few that fit into a scheduled four-week application plan — every rank with a source and a reason.

## The problem

Funding and acceleration are not scarce; *attention* is. A founder with eight hours a week cannot read thousands of program pages, and the founders who lose most are the ones outside the well-networked hubs: a climate founder in Nairobi, a fintech founder in Bengaluru. Every misdirected application burns 8–40 hours that could have gone into the product. Directories list what exists. Nobody tells a founder **what to do this week**.

## What Surge does

1. **Analyzes the market at scale.** The Surge Engine scores every record on project fit, eligibility, application effort and deadline runway. It is not a search box over a list — it is a decision for every record.
2. **Personalizes instantly.** Switch the founder — Climate · Kenya, Fintech · India, Health · UK, AI SaaS · US — and the whole ranking rearranges: cards animate to new positions with `▲/▼` rank and score-delta chips. The same 10,000-record catalog produces a different top five for each founder.
3. **Explains every rank.** A 100-point composition (project fit 40, eligibility 25, effort 15, deadline 20), match reasons, and eligibility/deadline watch-outs, with a link to the organizer's source.
4. **Turns ranking into action.** A deterministic scheduler places the best fits into the founder's real weekly hours, in deadline order, spanning weeks when a task is larger than one — and says what it left out and why.
5. **Discovers live.** "Scan the market" searches official organizer pages, keeps only citation-verified results (third-party directories and social sites are rejected), and ranks them on arrival.

## Measured on the live deployment

| Test | Result |
| --- | --- |
| 10,000 records scored | ≈ 9 s (≈ 1,000 records/s), 500 engine batches |
| 1,000 records, single API call | 3.6 s, 50 batches |
| Marginal model cost | Below the provider's billing granularity in our tests |
| Hand-review equivalent (assumes 12 min/record) | ≈ 2,000 hours |

The scale benchmark runs on a **clearly labelled synthetic catalog** so throughput can be measured without hammering real program websites. Real, source-cited programs come from the live scan and from the real sample scan (captured Sep 29, 2026) that loads on first visit. We do not present benchmark records as real programs.

## Why it can win as a business (Commercial Potential)

- **Wedge:** founders pay in time, so the first product is free-to-try with a Pro tier for continuous monitoring, deadline alerts and calendar sync (calendar and CSV export already ship).
- **Distribution loop:** accelerators, funders and ecosystems want *qualified* applicants. Surge's fit score is a routing layer they can sponsor, and the same engine sits behind a program-side dashboard.
- **Moat:** the compounding asset is a maintained, verified catalog plus outcome data on which founders got in — something no static directory collects.
- **Global by design:** eligibility and location are first-class inputs, so the value is highest exactly where discovery is hardest.

## Architecture

- **Next.js on AWS EC2**, Nginx terminating HTTPS in front of a systemd-managed service; `npm run deploy` lints, builds, restarts and verifies the live page.
- **Surge Engine** — a structured, typed decision model served through OpenRouter's Decisions API. Records are scored in 20-record batches, four in parallel; each request accepts up to 1,000 records, and the UI streams larger runs as concurrent chunks. Deadline runway is deterministic code, not a model guess.
- **Live discovery** uses OpenRouter web search; results are accepted only when a matching URL citation exists and the host plausibly belongs to the named organizer.
- **Guardrails:** per-client and daily budgets, server-side payload clamping, a six-hour cache for identical scans, and credentials that never reach the browser.

## Development process

The app was built with an AI coding agent working against AWS: the agent inspected the EC2 instance and network rules, configured the restartable service and HTTPS proxy, and verified the public URL. Later iterations added the scale engine, application planner, rebrand, sidebar/typography redesign, and hardening, each verified with automated browser tests against the live site.

## Demo outline (40 seconds)

1. Open Surge: a real scan is already ranked for the default founder.
2. Run **10,000 opportunities** — watch the counter, throughput and fit distribution fill live.
3. Switch to **Fintech · India** and run again — a different top five.
4. Jump to the grid: switch to **Climate · Kenya** and watch the cards re-rank with `▲/▼` chips.
5. Scroll to the plan: **Health · UK** reschedules the four weeks around a new best-fit list.
