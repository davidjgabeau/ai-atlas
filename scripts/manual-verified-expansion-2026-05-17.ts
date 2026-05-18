import { pathToFileURL } from "node:url";

import { toAgentCompanies } from "@/lib/agent/companyAdapter";
import { createContentHash, createId } from "@/lib/agent/hash";
import { loadPublishedCompaniesForAgent } from "@/lib/agent/loadCompanies";
import { publishDiscoveredCompanies } from "@/lib/agent/publishDiscoveredCompanies";
import type { DiscoveredCandidateProfile } from "@/lib/agent/discoveryProfiles";
import type { AgentCompany, Confidence, RawSourceRecord } from "@/types/agent";

type VerifiedExpansionCompany = {
  name: string;
  website: string;
  location?: string;
  locationConfidence?: AgentCompany["locationConfidence"];
  stage: AgentCompany["stage"];
  category: AgentCompany["category"];
  description: string;
  hook: string;
  funding?: AgentCompany["funding"];
  founders?: AgentCompany["founders"];
  investors?: string[];
  sourceUrls: string[];
  sourceTitle: string;
  evidence: string;
};

export const verifiedCompanies: VerifiedExpansionCompany[] = [
  {
    name: "Artemis",
    website: "https://artemissecurity.com/",
    stage: "Series A",
    category: "Cybersecurity AI",
    description:
      "AI-native security platform that builds customer-specific telemetry models and autonomously investigates security signals.",
    hook: "Autonomous investigation for enterprise security teams",
    funding: {
      latestRound: "Seed + Series A",
      latestRoundAmount: "$70M",
      latestRoundDate: "2026-04-21",
      leadInvestors: ["Felicis"],
    },
    investors: ["Felicis", "First Round Capital", "Brightmind Partners"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/04/artemis-ai-native-security-siem-replacement-autonomous-threat-detection-platform-shachar-hirshberg/",
    ],
    sourceTitle:
      "Artemis Raises $55M to Cut Security Response Times by 94% Through Autonomous Investigation",
    evidence:
      "AlleyWatch describes Artemis as an AI-native protection platform and reports a funding announcement that includes seed and Series A rounds led by Felicis.",
  },
  {
    name: "Daytona",
    website: "https://www.daytona.io/",
    stage: "Series A",
    category: "Agent Infrastructure",
    description:
      "Composable sandbox infrastructure for AI agents that need fast, stateful execution environments.",
    hook: "Sandbox infrastructure for AI agents",
    funding: {
      latestRound: "Series A",
      latestRoundAmount: "$24M",
      latestRoundDate: "2026-02-24",
      leadInvestors: ["FirstMark Capital"],
    },
    investors: ["FirstMark Capital", "Pace Capital", "Upfront Ventures", "E2VC"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/02/daytona-ai-agent-infrastructure-sandbox-computing-developer-tools-ivan-burazin/",
    ],
    sourceTitle:
      "Daytona Raises $24M to Replace Cloud Infrastructure Built for Humans With One Built for Agents",
    evidence:
      "AlleyWatch reports a $24M Series A led by FirstMark Capital for Daytona's agent sandbox infrastructure.",
  },
  {
    name: "ORION Security",
    website: "https://orionsecurity.com/",
    stage: "Series A",
    category: "Cybersecurity AI",
    description:
      "AI data-loss prevention platform that uses agents to interpret data movement and block risky transfers.",
    hook: "AI agents for data-loss prevention",
    funding: {
      latestRound: "Series A",
      latestRoundAmount: "$32M",
      latestRoundDate: "2026-02-03",
      leadInvestors: ["Norwest"],
    },
    investors: ["Norwest", "IBM", "PICO Venture Partners"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/02/orion-security-ata-loss-prevention-autonomous-dlp-contextual-security-policy-free-nitay-milner/",
    ],
    sourceTitle:
      "ORION Security Raises $32M for its AI-Powered Platform That Prevents Data Leaks Without Policies",
    evidence:
      "AlleyWatch reports a $32M Series A for ORION Security and describes its five-agent DLP platform.",
  },
  {
    name: "Flock AI",
    website: "https://www.flockshop.ai/",
    stage: "Seed",
    category: "Media, Ads & Creative AI",
    description:
      "Generative product-imagery platform for fashion and retail brands that need representative creative at scale.",
    hook: "Generative product imagery for commerce teams",
    funding: {
      latestRound: "Seed",
      latestRoundAmount: "$6M",
      latestRoundDate: "2026-02-05",
      leadInvestors: ["Work-Bench"],
    },
    investors: ["Work-Bench", "January Ventures", "Red Bike Capital"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/02/flock-ai-ai-visual-commerce-personalized-product-imagery-conversion-optimization-manvitha-mallela/",
    ],
    sourceTitle:
      "Flock AI Raises $6M for AI Platform Generating Diverse Product Imagery Across Every Body Type",
    evidence:
      "AlleyWatch reports a $6M seed round led by Work-Bench and describes Flock AI's brand-trained product-imagery models.",
  },
  {
    name: "Protege",
    website: "https://withprotege.ai/",
    stage: "Series A",
    category: "Data & Memory Layer",
    description:
      "Data licensing platform that helps AI builders access governed real-world datasets from data holders.",
    hook: "Licensed real-world data for AI builders",
    funding: {
      latestRound: "Series A1",
      latestRoundAmount: "$30M",
      latestRoundDate: "2026-01-08",
      leadInvestors: ["Andreessen Horowitz"],
    },
    investors: ["Andreessen Horowitz", "Footwork", "CRV", "Bloomberg Beta"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/01/protege-ai-training-data-licensing-real-world-data-bobby-samuels/",
    ],
    sourceTitle:
      "Protege Raises $30M to Solve AI Development's Biggest Bottleneck Through Licensed Real-World Data",
    evidence:
      "AlleyWatch reports Protege's $30M Series A1 and describes its platform for licensed real-world AI training data.",
  },
  {
    name: "MOTHER.Tech",
    website: "https://mother.tech/",
    location: "Brooklyn, NY",
    stage: "Seed",
    category: "Media, Ads & Creative AI",
    description:
      "One-tap creative AI app for producing polished social and creator content without prompt engineering.",
    hook: "Prompt-free creative AI for consumer content",
    funding: {
      latestRound: "Pre-seed / Seed",
      latestRoundAmount: "$15M",
      latestRoundDate: "2026-05-05",
      leadInvestors: ["Google Ventures"],
    },
    investors: ["Google Ventures", "Lerer Hippeau", "BoxGroup", "Shine Capital"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/05/degen-mother-tech-ai-creative-app-prompt-free-ai-content-meme-generator-creator-economy-platform-kelsey-falter/",
    ],
    sourceTitle:
      "MOTHER.Tech Raises $15M to Launch Degen, an AI App That Creates Professional Content Without Prompt Engineering",
    evidence:
      "AlleyWatch calls MOTHER.Tech Brooklyn-based and reports $15M in pre-seed/seed funding for its AI creative app Degen.",
  },
  {
    name: "Thoughtly",
    website: "https://thoughtly.com/",
    stage: "Seed",
    category: "Enterprise GTM & RevOps AI",
    description:
      "AI CRM agents that call, text, and email every inbound lead as soon as interest is expressed.",
    hook: "AI voice agents for lead coverage",
    funding: {
      latestRound: "Seed",
      latestRoundAmount: "$5.5M",
      latestRoundDate: "2026-04-30",
      leadInvestors: ["Armory Square Ventures"],
    },
    investors: ["Armory Square Ventures", "nvp capital"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/04/thoughtly-ai-voice-agents-crm-conversational-engagement-platform-revenue-team-automation-torrey-leonard/",
    ],
    sourceTitle:
      "Thoughtly Raises $5.5M to Close the Lead Coverage Gap with AI-Powered CRM Agents",
    evidence:
      "AlleyWatch reports Thoughtly's $5.5M seed round and describes AI agents embedded into CRM workflows.",
  },
  {
    name: "Qualitate",
    website: "https://www.qualitate.ai/",
    stage: "Seed",
    category: "Data & Memory Layer",
    description:
      "AI-native primary intelligence platform that runs structured expert discussions and turns them into research data.",
    hook: "AI-moderated expert research at scale",
    funding: {
      latestRound: "Seed",
      latestRoundAmount: "$7M",
      latestRoundDate: "2026-04-23",
      leadInvestors: ["IA Ventures", "Crew Capital"],
    },
    investors: ["IA Ventures", "Crew Capital"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/04/qualitate-ai-moderator-primary-research-ai-expert-intelligence-network-alternative-platform-sagar-kadakia/",
    ],
    sourceTitle:
      "Qualitate Raises $7M to Deliver Expert Intelligence in Days Instead of Weeks at One-Third the Cost",
    evidence:
      "AlleyWatch reports Qualitate's $7M seed round and describes its AI Moderator for primary research.",
  },
  {
    name: "Joyful Health",
    website: "https://www.joyfulhealth.com/",
    stage: "Series A",
    category: "Health & Clinical AI",
    description:
      "Healthcare revenue platform that connects claim data and applies AI to denial and underpayment recovery.",
    hook: "AI revenue recovery for healthcare providers",
    funding: {
      latestRound: "Series A",
      latestRoundAmount: "$17M",
      latestRoundDate: "2026-05-07",
      leadInvestors: ["CRV"],
    },
    investors: ["CRV"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/05/joyful-health-healthcare-revenue-recovery-ai-revenue-cycle-management-financial-infrastructure-denied-claims-platform-eliana-berger/",
    ],
    sourceTitle:
      "Joyful Health Raises $17M to Recover the $125B Providers Lose Each Year to Denied and Underpaid Claims",
    evidence:
      "AlleyWatch reports Joyful Health's $17M Series A and describes AI for claim denial and underpayment recovery.",
  },
  {
    name: "Amperos Health",
    website: "https://www.amperos.com/",
    stage: "Series A",
    category: "Health & Clinical AI",
    description:
      "AI-native denial and collections workflow platform for healthcare revenue cycle teams.",
    hook: "AI denial management for healthcare providers",
    funding: {
      latestRound: "Series A",
      latestRoundAmount: "$16M",
      latestRoundDate: "2026-04-28",
      leadInvestors: ["Bessemer Venture Partners"],
    },
    investors: ["Bessemer Venture Partners", "Uncork Capital"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/04/amperos-health-healthcare-billing-denial-revenue-cycle-insurance-claims-recovery-rcm-automation-michal-miernowski/",
    ],
    sourceTitle:
      "Amperos Health Raises $16M to Automate Insurance Denial Management for Healthcare Providers",
    evidence:
      "AlleyWatch reports Amperos Health's $16M Series A and describes its AI-native denial and collections platform.",
  },
  {
    name: "Chamelio",
    website: "https://chamelio.ai/",
    stage: "Seed",
    category: "Legal & Compliance AI",
    description:
      "Legal intelligence platform that converts contracts and legal content into structured institutional knowledge.",
    hook: "Legal intelligence for in-house teams",
    funding: {
      latestRound: "Seed",
      latestRoundAmount: "$10M",
      latestRoundDate: "2026-02-04",
      leadInvestors: ["Work-Bench"],
    },
    investors: ["Work-Bench", "Emerge"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/02/chamelio-in-house-legal-intelligence-contract-automation-workflow-ai-platform-alex-zilberman/",
    ],
    sourceTitle:
      "Chamelio Raises $10M to Turn Legal Documents into Strategic Intelligence",
    evidence:
      "AlleyWatch reports Chamelio's seed round bringing funding to $10M and describes legal intelligence for in-house teams.",
  },
  {
    name: "Teleskope",
    website: "https://www.teleskope.ai/",
    stage: "Series A",
    category: "Cybersecurity AI",
    description:
      "Agentic data security platform that discovers, classifies, protects, and remediates sensitive data risk.",
    hook: "Agentic remediation for data security teams",
    funding: {
      latestRound: "Series A",
      latestRoundAmount: "$25M",
      latestRoundDate: "2026-01-28",
      leadInvestors: ["M13"],
    },
    investors: ["M13", "Primary Venture Partners", "Lerer Hippeau"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/01/teleskope-agentic-data-security-platform-remediation-automation-dspm-elizabeth-nammour/",
    ],
    sourceTitle:
      "Teleskope Raises $25M to Address Enterprise Data Security with Agentic Automation",
    evidence:
      "AlleyWatch reports Teleskope's $25M Series A and describes its agentic data security and remediation platform.",
  },
  {
    name: "GovWell",
    website: "https://govwell.com/",
    stage: "Series A",
    category: "Enterprise GTM & RevOps AI",
    description:
      "AI operating system for local governments that automates permitting, licensing, and administrative workflows.",
    hook: "AI workflows for local government operations",
    funding: {
      latestRound: "Series A",
      latestRoundAmount: "$25M",
      latestRoundDate: "2026-05-15",
      leadInvestors: ["Insight Partners"],
    },
    investors: ["Insight Partners"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/05/the-alleywatch-startup-daily-funding-report-5-15-2026/",
    ],
    sourceTitle: "The AlleyWatch Startup Daily Funding Report: 5/15/2026",
    evidence:
      "AlleyWatch reports GovWell's $25M Series A and describes its AI operating system for permitting, licensing, and administrative workflows.",
  },
  {
    name: "Didero",
    website: "https://www.didero.ai/",
    stage: "Series A",
    category: "Enterprise GTM & RevOps AI",
    description:
      "AI procurement agent for automating routine sourcing and purchasing workflows in mid-market manufacturing.",
    hook: "AI procurement agents for manufacturers",
    funding: {
      latestRound: "Series A",
      latestRoundAmount: "$30M",
      latestRoundDate: "2026-02-12",
      leadInvestors: ["Chemistry", "Headline"],
    },
    investors: ["Chemistry", "Headline"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/02/the-alleywatch-startup-daily-funding-report-2-12-2026/",
    ],
    sourceTitle: "The AlleyWatch Startup Daily Funding Report: 2/12/2026",
    evidence:
      "AlleyWatch reports Didero's $30M Series A and describes its AI agent for routine procurement processes.",
  },
  {
    name: "Rebar",
    website: "https://www.rebar.ai/",
    stage: "Series A",
    category: "Enterprise GTM & RevOps AI",
    description:
      "AI estimation and quoting platform for HVAC suppliers and contractors.",
    hook: "AI quoting workflows for HVAC suppliers",
    funding: {
      latestRound: "Series A",
      latestRoundAmount: "$14M",
      latestRoundDate: "2026-03-10",
      leadInvestors: ["Prudence"],
    },
    investors: ["Prudence"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/03/the-alleywatch-startup-daily-funding-report-3-10-2026/",
    ],
    sourceTitle: "The AlleyWatch Startup Daily Funding Report: 3/10/2026",
    evidence:
      "AlleyWatch reports Rebar's $14M Series A and describes its AI-powered estimation and quoting platform for HVAC suppliers and contractors.",
  },
  {
    name: "Sandbar",
    website: "https://www.sandbar.com/",
    stage: "Series A",
    category: "AI-Native Consumer & Social",
    description:
      "AI-powered voice-controlled smart ring for ambient personal computing.",
    hook: "Voice-first AI wearable for everyday computing",
    funding: {
      latestRound: "Series A",
      latestRoundAmount: "$23M",
      latestRoundDate: "2026-03-10",
      leadInvestors: ["Adjacent", "Kindred Ventures"],
    },
    investors: ["Adjacent", "Kindred Ventures"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/03/the-alleywatch-startup-daily-funding-report-3-10-2026/",
    ],
    sourceTitle: "The AlleyWatch Startup Daily Funding Report: 3/10/2026",
    evidence:
      "AlleyWatch reports Sandbar's $23M Series A and describes its AI-powered voice-controlled smart ring.",
  },
  {
    name: "Avantos",
    website: "https://avantos.ai/",
    stage: "Series A",
    category: "Fintech & Trading AI",
    description:
      "AI-native operating system for financial services client onboarding and servicing workflows.",
    hook: "AI client servicing for financial institutions",
    funding: {
      latestRound: "Series A",
      latestRoundAmount: "$25M",
      latestRoundDate: "2026-02-18",
      leadInvestors: ["Bessemer Venture Partners"],
    },
    investors: ["Bessemer Venture Partners", "Guardian", "SEI", "Vanguard"],
    sourceUrls: [
      "https://www.businesswire.com/news/home/20260218815049/en/Avantos-Raises-%2435-Million-to-Power-the-Future-of-Client-Servicing-in-Financial-Services",
    ],
    sourceTitle:
      "Avantos Raises $35 Million to Power the Future of Client Servicing in Financial Services",
    evidence:
      "Business Wire reports Avantos as a New York AI-native operating system for financial services and says it completed a $25M Series A.",
  },
  {
    name: "Vibranium Labs",
    website: "https://vibraniumlabs.ai/",
    stage: "Seed",
    category: "Agent Infrastructure",
    description:
      "AI incident-management platform that monitors, triages, and resolves infrastructure issues for SRE teams.",
    hook: "AI SRE for incident response teams",
    funding: {
      latestRound: "Seed",
      latestRoundAmount: "$4.6M",
      latestRoundDate: "2025-09-18",
      leadInvestors: ["Calibrate Ventures", "Mirae Asset"],
    },
    investors: ["Calibrate Ventures", "Mirae Asset", "a16z", "Franklin Templeton"],
    sourceUrls: [
      "https://www.citybiz.co/article/747173/vibranium-labs-raises-4-6m-in-seed-funding-led-by-calibrate-ventures/",
      "https://www.finsmes.com/2025/09/vibranium-labs-raises-4-6m-in-seed-funding.html",
    ],
    sourceTitle:
      "Vibranium Labs Raises $4.6M In Seed Funding Led by Calibrate Ventures",
    evidence:
      "citybiz and FinSMEs report Vibranium Labs as New York City-based and describe $4.6M seed funding for its AI Site Reliability Engineer.",
  },
  {
    name: "Mega",
    website: "https://www.mega.ai/",
    stage: "Series A",
    category: "Media, Ads & Creative AI",
    description:
      "AI platform for SEO and paid ads management for startups and small businesses.",
    hook: "AI SEO and paid ads management for SMBs",
    funding: {
      latestRound: "Series A",
      latestRoundAmount: "$11.5M",
      latestRoundDate: "2026-03-10",
      leadInvestors: ["Goodwater Capital"],
    },
    investors: ["Goodwater Capital"],
    sourceUrls: [
      "https://www.alleywatch.com/2026/03/the-alleywatch-startup-daily-funding-report-3-10-2026/",
    ],
    sourceTitle: "The AlleyWatch Startup Daily Funding Report: 3/10/2026",
    evidence:
      "AlleyWatch reports Mega's $11.5M Series A and describes its AI-powered SEO and paid ads management platform.",
  },
];

async function main() {
  const existingCompanies = toAgentCompanies(await loadPublishedCompaniesForAgent());
  const profiles = createVerifiedExpansionProfiles(existingCompanies);

  if (process.argv.includes("--dry-run")) {
    console.log(
      JSON.stringify(
        {
          existing: existingCompanies.length,
          candidates: profiles.map((profile) => profile.candidateCompanyName),
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await publishDiscoveredCompanies({
    profiles,
    existingCompanies,
    autoApprove: true,
  });

  console.log(
    JSON.stringify(
      {
        attempted: profiles.length,
        published: result.published,
        errors: result.errors,
      },
      null,
      2,
    ),
  );
}

export function createVerifiedExpansionProfiles(existingCompanies: AgentCompany[]) {
  const existingNames = new Set(existingCompanies.map((company) => company.name.toLowerCase()));
  const existingSlugs = new Set(existingCompanies.map((company) => company.slug));

  return verifiedCompanies
    .filter((company) => {
      return !existingNames.has(company.name.toLowerCase()) && !existingSlugs.has(slugify(company.name));
    })
    .map(toProfile);
}

export function toProfile(company: VerifiedExpansionCompany): DiscoveredCandidateProfile {
  const contentHash = createContentHash({
    name: company.name,
    sources: company.sourceUrls,
    evidence: company.evidence,
  });
  const now = new Date().toISOString();
  const rawRecord: RawSourceRecord = {
    id: createId("raw", contentHash),
    sourceType: "press",
    candidateCompanyName: company.name,
    url: company.sourceUrls[0],
    title: company.sourceTitle,
    text: [
      company.evidence,
      company.description,
      company.hook,
      company.website,
      ...company.sourceUrls,
    ].join("\n"),
    discoveredAt: now,
    contentHash,
  };
  const confidence: Confidence = "high";

  return {
    rawRecord,
    candidateCompanyName: company.name,
    sourceUrls: company.sourceUrls,
    confidence,
    reason: company.evidence,
    autoPublishEligible: true,
    proposedUpdate: {
      name: company.name,
      slug: slugify(company.name),
      website: company.website,
      location: company.location ?? "New York, NY",
      locationConfidence: company.locationConfidence ?? "high",
      stage: company.stage,
      category: company.category,
      description: company.description,
      oneSentenceDescription: company.hook,
      founders: company.founders,
      investors: company.investors,
      funding: company.funding,
      tags: [company.category, company.stage],
      sourceUrls: company.sourceUrls,
      verifiedAt: now,
      discoveryReason: {
        trigger: "manual",
        sourceEventIds: [],
        sourceUrls: company.sourceUrls,
        confidence,
        notes: company.evidence,
      },
    },
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
