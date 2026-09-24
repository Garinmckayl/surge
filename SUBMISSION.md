# AWS Builder Center — submission draft

## Project

**Surge — Find the next opportunity worth your time**

**Category:** Commercial Potential  
**Lane:** Startup  
**Tags:** `#commercial-potential` `#startup`

**Live demo:** https://35-166-228-8.sslip.io

![Surge dashboard preview](docs/surge-dashboard.png)

## Short description

Founders don't need another opportunity list; they need to know which application is worth their limited time. Surge discovers grants, accelerators, and hackathons, links every result to its cited official source, and ranks the shortlist with Jev's structured eligibility, project-fit, and effort judgments plus deterministic deadline scoring.

## Full project story

Early-stage founders spend scarce hours searching scattered grant, accelerator, and hackathon pages. A prestigious program can still be a bad next move if its geography, eligibility, project focus, deadline, or application workload does not fit the team.

Surge turns that hunt into a decision pipeline. A founder describes their location, stage, project, focus areas, and weekly application capacity. Surge searches the web by opportunity category, requires a matching source citation, rejects past deadlines, and surfaces open or confirmed upcoming options. Each result links to its official source and shows why it ranks where it does. Jev supplies typed eligibility choices and project/effort scores; code handles deadline runway and combines the points transparently. Unknowns stay visible instead of being presented as facts.

Surge is being built for the AWS Builder Center Zero to Shipped challenge itself: a founder-tool built and hosted on AWS, with its own active build opportunity visible in the reference pipeline.

## 90-second demo outline

1. Start with the founder profile: location, stage, project, and weekly application time.
2. Select **Find live opportunities** and show the scan checking grants, accelerators, and hackathons separately.
3. Open a result's source; point out the source-backed status and published deadline.
4. Show the Jev eligibility choice and project/effort scores, then the code-calculated deadline points and total.
5. Save the strongest result to the pipeline and explain which missing requirement the founder should verify next.

## Development process

Codex CLI helped shape the product, implement and test the Next.js app, and deploy it to EC2 using the machine's configured AWS CLI credentials. The agent inspected the existing instance and network rules, configured a restartable service and Nginx HTTPS proxy, then verified the live public URL.

## Technical notes

- Next.js app deployed on an AWS EC2 instance; Nginx terminates HTTPS and proxies to a systemd-managed Next.js service.
- OpenRouter web search supplies current opportunity research; the app accepts only matching URL-citation annotations and checks that the cited hostname plausibly belongs to the named organizer.
- Jev 1.13 provides typed eligibility `choice` and project/effort `score` judgments. Deadline points are calculated in application code.
- OpenRouter credentials remain server-side in an ignored, mode-600 runtime file. The browser never receives the key.
- Demo/reference rows are labelled, and current-cycle details must be verified at the linked source.

