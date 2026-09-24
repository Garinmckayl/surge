export type OpportunityType = "Grant" | "Accelerator" | "Hackathon" | "Startup program";

export type FounderProfile = {
  name: string;
  location: string;
  stage: string;
  sectors: string;
  project: string;
  weeklyHours: number;
};

export type Opportunity = {
  id: string;
  name: string;
  type: OpportunityType;
  organizer: string;
  description: string;
  sourceUrl: string;
  location: string;
  eligibility: string;
  deadline: string | null;
  effortHours: number | null;
  funding: string | null;
  tags: string[];
  checkedAt?: string;
  demo?: boolean;
};

export type RankedOpportunity = Opportunity & {
  score: number;
  scoreLabel: string;
  reasons: string[];
  watchouts: string[];
  scoreSource: "Jev 1.13" | "Rules-based demo";
  confidence?: number;
  probability?: number;
};
