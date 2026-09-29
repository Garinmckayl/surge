import type { Opportunity } from "@/lib/types";

// Real, citation-verified results captured from a live Surge scan. Shown on first visit so the
// Surge re-ranking demo works instantly; the "Scan the market" button always fetches fresh results.
export const SAMPLE_SCAN_DATE = "Sep 29, 2026";

export const sampleScan: Opportunity[] = [
  {
    "id": "sample-live-grant-america-s-seed-fund-nsf-sbir-sttr-2",
    "name": "America's Seed Fund – NSF SBIR/STTR",
    "type": "Grant",
    "status": "open",
    "organizer": "National Science Foundation (NSF)",
    "description": "Provides seed capital for early stage product development with no equity taken, supporting startups in AI and other deep tech areas.",
    "sourceUrl": "https://seedfund.nsf.gov/",
    "location": "United States (national)",
    "eligibility": "Startups across nearly all technology areas including AI, with focus on deep technologies",
    "deadline": null,
    "effortHours": null,
    "funding": "Up to $2 million in seed funding, no equity taken",
    "tags": [
      "seed funding",
      "deep tech",
      "AI",
      "startup",
      "United States"
    ],
    "checkedAt": "2026-09-29T12:00:00.000Z"
  },
  {
    "id": "sample-live-accelerator-oregon-ai-accelerator-1",
    "name": "Oregon AI Accelerator",
    "type": "Accelerator",
    "status": "open",
    "organizer": "Oregon AI Accelerator",
    "description": "A 3-month hybrid accelerator program designed to fast-track early-stage AI startups to investment readiness with in-person and virtual sessions.",
    "sourceUrl": "https://oregonaiaccelerator.com/program",
    "location": "Portland, Oregon, United States (hybrid)",
    "eligibility": "Early-stage AI startups, pre-seed or seed-stage",
    "deadline": null,
    "effortHours": null,
    "funding": "cloud credits, software, and in-kind services",
    "tags": [
      "AI",
      "early-stage",
      "pre-seed",
      "seed",
      "hybrid accelerator"
    ],
    "checkedAt": "2026-09-29T12:00:00.000Z"
  },
  {
    "id": "sample-live-accelerator-wild-beta-season-4-ai-founders-fall-2026-3",
    "name": "Wild Beta Season 4: AI Founders, Fall 2026",
    "type": "Accelerator",
    "status": "open",
    "organizer": "Wild Accelerator",
    "description": "A 12-week in-person accelerator for AI founders with early traction, focusing on customer development and fundraising strategy.",
    "sourceUrl": "https://www.wildaccelerator.org/wild-beta-current-season",
    "location": "Louisville, KY, United States (in-person)",
    "eligibility": "AI founders with launched MVP/product and real traction",
    "deadline": null,
    "effortHours": null,
    "funding": null,
    "tags": [
      "AI",
      "growth accelerator",
      "traction",
      "MVP",
      "in-person"
    ],
    "checkedAt": "2026-09-29T12:00:00.000Z"
  },
  {
    "id": "sample-live-accelerator-the-residency-the-open-accelerator-toa-4",
    "name": "The Residency | The Open Accelerator (TOA)",
    "type": "Accelerator",
    "status": "open",
    "organizer": "The Open Accelerator",
    "description": "A 16-week in-person AI accelerator in Boston focused on bridging pilots to paid customers, with no equity taken and optional IBM Ventures investment.",
    "sourceUrl": "https://the-open-accelerator.com/residency/",
    "location": "Boston, Massachusetts, United States (in-person)",
    "eligibility": "Early-stage AI companies building AI for business customers, pre-scale zone",
    "deadline": "2026-10-25",
    "effortHours": null,
    "funding": "free participation, optional investment consideration by IBM Ventures",
    "tags": [
      "AI",
      "enterprise",
      "early-stage",
      "pre-scale",
      "no equity"
    ],
    "checkedAt": "2026-09-29T12:00:00.000Z"
  },
  {
    "id": "sample-live-hackathon-junction-2026-0",
    "name": "Junction 2026",
    "type": "Hackathon",
    "status": "open",
    "organizer": "Junction",
    "description": "Europe's biggest hackathon with 2,000 builders, 48 hours of building, and €100,000 in prizes, featuring AI and agent projects, software, and physical AI challenges.",
    "sourceUrl": "https://2026.hackjunction.com/",
    "location": "Espoo, Finland",
    "eligibility": "Anyone who builds, mainly 18 and over, including students, working professionals, and self-taught individuals",
    "deadline": "2026-10-25",
    "effortHours": null,
    "funding": "€100,000 in prizes",
    "tags": [
      "AI",
      "software",
      "hardware",
      "robotics",
      "embedded"
    ],
    "checkedAt": "2026-09-29T12:00:00.000Z"
  },
  {
    "id": "sample-live-accelerator-proof-ai-accelerator-cohort-1-0",
    "name": "PROOF AI Accelerator Cohort 1",
    "type": "Accelerator",
    "status": "open",
    "organizer": "PROOF AI Accelerator",
    "description": "Accelerator for AI startups with cohorts including a Proof Track closing April 24, 2026, and an Ignite Track accepting rolling applications.",
    "sourceUrl": "https://proofaiaccelerator.com/apply",
    "location": "unknown",
    "eligibility": "Technical founders with AI/ML experience, coding ability; commitment to 10 weeks of focused work",
    "deadline": null,
    "effortHours": null,
    "funding": null,
    "tags": [
      "AI",
      "developer tools",
      "SaaS",
      "technical founders",
      "coding"
    ],
    "checkedAt": "2026-09-29T12:00:00.000Z"
  },
  {
    "id": "sample-live-grant-timbuktoo-launchpad-for-greentech-startups-1",
    "name": "timbuktoo Launchpad for GreenTech Startups",
    "type": "Grant",
    "status": "open",
    "organizer": "United Nations Development Programme (UNDP) Kenya",
    "description": "Venture building program supporting GreenTech startups with incubation, mentorship, investor readiness, and access to a continental network.",
    "sourceUrl": "https://www.undp.org/kenya/news/call-applications-join-timbuktoo-launchpad-greentech-startups",
    "location": "Africa (Kenya-based startups eligible)",
    "eligibility": "Startups based in Africa with prototype/MVP, committed founding team, addressing climate action, clean energy, or environmental sustainability",
    "deadline": null,
    "effortHours": null,
    "funding": null,
    "tags": [
      "cleantech",
      "green technology",
      "climate resilience",
      "clean energy",
      "Africa"
    ],
    "checkedAt": "2026-09-29T12:00:00.000Z"
  },
  {
    "id": "sample-live-grant-mott-foundation-phase-2-closing-the-opportunity-gap-4",
    "name": "Mott Foundation Phase 2 - Closing the Opportunity Gap",
    "type": "Grant",
    "status": "upcoming",
    "organizer": "Ashoka East Africa with Charles Stewart Mott Foundation and E4Impact",
    "description": "6-month program combining capacity building, mentorship, ecosystem connections, and seed funding to scale DRE solutions for smallholder farmers.",
    "sourceUrl": "https://til.e4impactkenya.org/",
    "location": "East Africa",
    "eligibility": "Social entrepreneurs with tested and functional prototype or pilot in distributed renewable energy and agriculture",
    "deadline": null,
    "effortHours": null,
    "funding": "competitive seed funding available",
    "tags": [
      "renewable energy",
      "agriculture",
      "social entrepreneurship",
      "East Africa"
    ],
    "checkedAt": "2026-09-29T12:00:00.000Z"
  },
  {
    "id": "sample-live-hackathon-climate-hackathon-2026-at-international-energy-and-sustainability-summit-3",
    "name": "Climate Hackathon 2026 at International Energy and Sustainability Summit",
    "type": "Hackathon",
    "status": "upcoming",
    "organizer": "International Energy and Sustainability Summit (IESS)",
    "description": "A three-day hackathon to develop scalable prototypes addressing climate challenges including climate-smart agriculture and renewable energy.",
    "sourceUrl": "https://iess.co.ke/climate-hackathon/",
    "location": "Nairobi, Kenya",
    "eligibility": "Students, climate technologists, developers, researchers, entrepreneurs, industry experts",
    "deadline": null,
    "effortHours": null,
    "funding": null,
    "tags": [
      "climate",
      "sustainability",
      "green energy",
      "agriculture",
      "renewable energy"
    ],
    "checkedAt": "2026-09-29T12:00:00.000Z"
  },
  {
    "id": "sample-live-grant-fincluvation-india-post-payments-bank-1",
    "name": "Fincluvation™ - India Post Payments Bank",
    "type": "Grant",
    "status": "open",
    "organizer": "India Post Payments Bank (IPPB) and Department of Post (DoP)",
    "description": "A program inviting startups to develop technology-led solutions for financial inclusion, including instant paperless micro credit and integration of digital payments with money order services.",
    "sourceUrl": "https://www.ippbonline.com/web/ippb/fincluvation",
    "location": "India",
    "eligibility": "Startups registered on Startup India portal with scalable technology solutions for financial inclusion",
    "deadline": null,
    "effortHours": null,
    "funding": null,
    "tags": [
      "fintech",
      "financial inclusion",
      "micro credit",
      "digital payments",
      "India"
    ],
    "checkedAt": "2026-09-29T12:00:00.000Z"
  }
];
