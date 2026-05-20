import type { ConsumptionProfile } from "@/types/market";

export type PatternCompany = {
  company_slug: string;
  one_liner: string;
};

export type Pattern = {
  slug: string;
  title: string;
  framing: string;
  body: [string, string];
  cta: string;
  companies: PatternCompany[];
  related_consumption_profile?: ConsumptionProfile;
  updated_at: string;
};

const updatedAt = "2026-05-05T14:00:00.000Z";

function definePattern(pattern: Omit<Pattern, "framing">): Pattern {
  return {
    ...pattern,
    framing: pattern.body.join(" "),
  };
}

export const patterns: Pattern[] = [
  definePattern({
    slug: "vertical-ai-skipped-saas",
    title: "Food, government, and insurance teams are replacing phone work.",
    body: [
      "A group of NYC AI companies is selling to teams that still handle core work through calls, email, spreadsheets, and local know-how. The buyer is not a software admin; it is the person responsible for orders, permits, underwriting files, field operations, or customer follow-up.",
      "The work includes restaurant distributors taking orders by phone, local governments handling resident requests and permit backlogs, commercial insurers reviewing submission packets, and industrial teams tracking facility issues. This matters now because modern models can read messy messages and records well enough to help teams that never had clean software systems.",
    ],
    cta: "Inspect the phone, permit, insurance, and field-ops examples",
    related_consumption_profile: "agentic_loops",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "anchr",
        one_liner:
          "Food distributors: phone orders, inventory questions, and customer follow-up.",
      },
      {
        company_slug: "cvector",
        one_liner:
          "Industrial facilities: operating data, task handoffs, and field-team coordination.",
      },
      {
        company_slug: "polimorphic",
        one_liner:
          "Local governments: resident requests, service questions, and permit-style backlogs.",
      },
      {
        company_slug: "kalepa",
        one_liner:
          "Commercial insurance: underwriting packets, broker emails, and risk review.",
      },
    ],
  }),
  definePattern({
    slug: "finance-teams-contested-buyer",
    title: "Finance teams want AI inside research, billing, and accounting.",
    body: [
      "The most crowded buyer in the map is the finance team: investors, revenue leaders, accounting teams, and fund operators. They all spend hours turning documents, contracts, invoices, spreadsheets, and market records into decisions.",
      "The examples range from analysts reviewing filings and transcripts, to finance teams reading contracts for invoices and revenue recognition, to accountants migrating ERP data, to funds organizing diligence work. It matters now because the data is already digital, the cost of mistakes is high, and teams will pay for faster answers they can check.",
    ],
    cta: "Compare the research, billing, and accounting companies",
    related_consumption_profile: "batch_document_processing",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "hebbia",
        one_liner:
          "Investment and legal analysts: cited answers across long document sets.",
      },
      {
        company_slug: "brightwave",
        one_liner:
          "Investors: filings, transcripts, and news turned into research briefs.",
      },
      {
        company_slug: "tabs",
        one_liner:
          "Finance teams: contracts, invoices, and revenue recognition.",
      },
      {
        company_slug: "dualentry",
        one_liner:
          "Accounting teams: ERP migration, close work, and finance records.",
      },
    ],
  }),
  definePattern({
    slug: "llm-tooling-build-vs-deploy",
    title: "Engineering teams need tools for prompts after prototype.",
    body: [
      "Engineering and product teams are moving from demos to production LLM features, and the work gets harder once users depend on the output. The buyer is the team shipping AI into an app, not the person casually testing a chatbot.",
      "The work includes testing prompts before release, tracking versions, running evals, giving coding agents safe cloud sandboxes, orchestrating multiple agents, and monitoring models in production. It matters now because failures are quieter than normal software bugs: the feature can still run while the answer gets worse.",
    ],
    cta: "See the eval, sandbox, agent, and model-ops companies",
    related_consumption_profile: "code_generation",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "vellum",
        one_liner:
          "Product teams: prompt tests, evals, and release management for LLM apps.",
      },
      {
        company_slug: "amika",
        one_liner:
          "Engineering teams: cloud sandboxes for coding agents and generated pull requests.",
      },
      {
        company_slug: "emergence-ai",
        one_liner:
          "Enterprise teams: agents that coordinate work across apps and data.",
      },
      {
        company_slug: "wallaroo",
        one_liner:
          "Model teams: deployment, monitoring, and production operations.",
      },
    ],
  }),
  definePattern({
    slug: "realtime-voice-back-office",
    title: "Front desks are handing routine calls to voice agents.",
    body: [
      "Voice products are strongest where the phone is still the front door for the business. The buyer is the restaurant manager, clinic administrator, or service operator who needs every call answered without adding another person to the desk.",
      "The work includes taking reservations, answering store questions, scheduling medical visits, routing billing calls, checking prescription status, and turning intake conversations into structured records. It matters now because speech latency and reliability have improved enough for repetitive calls, while staffing pressure has not gone away.",
    ],
    cta: "Review the restaurant, healthcare, and intake examples",
    related_consumption_profile: "realtime_voice",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "slang-ai",
        one_liner:
          "Restaurants and retail: reservations, appointments, and customer questions.",
      },
      {
        company_slug: "clarion",
        one_liner:
          "Healthcare offices: scheduling, billing calls, and prescription questions.",
      },
      {
        company_slug: "valerie-health",
        one_liner:
          "Independent doctor's offices: front-desk calls and patient follow-up.",
      },
      {
        company_slug: "rowflow",
        one_liner:
          "Service teams: intake conversations that become structured records.",
      },
    ],
  }),
  definePattern({
    slug: "agentic-loops-legal-compliance",
    title: "Legal and compliance teams are automating repeat reviews.",
    body: [
      "Legal, risk, and compliance teams are using AI where the same review happens again and again. The buyer needs a clear recommendation, citations, and a record of what was checked, not a loose draft.",
      "The work includes KYC and sanctions investigations, AML case review, marketing and policy compliance checks, legal intake, contract review, billing review, and real-time policy monitoring. It matters now because the rules are written down, the evidence is spread across systems, and regulated teams need help without losing the audit trail.",
    ],
    cta: "Inspect the KYC, policy, legal intake, and monitoring examples",
    related_consumption_profile: "agentic_loops",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "norm-ai",
        one_liner:
          "Compliance teams: regulations and policies checked against repeat business decisions.",
      },
      {
        company_slug: "bretton-ai",
        one_liner:
          "Financial institutions: KYC, sanctions screening, and AML investigations.",
      },
      {
        company_slug: "manifest-os",
        one_liner:
          "Legal teams: repeat intake, billing review, and case preparation.",
      },
      {
        company_slug: "zerodrift",
        one_liner:
          "Regulated companies: policy monitoring and enforcement before issues spread.",
      },
    ],
  }),
  definePattern({
    slug: "consumer-companion-personal-graph",
    title: "Consumer apps are becoming useful by remembering context.",
    body: [
      "The strongest consumer companies in the map are not asking people to start from a blank chat box every day. They are building for users who want help with introductions, dating, plans, wellness, household logistics, and personal notes.",
      "The work includes finding warm introductions inside iMessage, using friends-of-friends context in dating, turning social matching into real-world plans, remembering health signals, and organizing everyday notes. It matters now because personal context is the reason someone comes back; without memory, most consumer AI feels interchangeable.",
    ],
    cta: "Look at the social, wellness, and memory examples",
    related_consumption_profile: "consumer_inference",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "series",
        one_liner:
          "People making introductions: iMessage and social context for warm paths.",
      },
      {
        company_slug: "cerca",
        one_liner:
          "Daters: friends-of-friends context to make meeting strangers feel safer.",
      },
      {
        company_slug: "222",
        one_liner:
          "Social users: matching that turns into real-world plans.",
      },
      {
        company_slug: "tapestry",
        one_liner:
          "Product teams: social graph data for consumer and assistant-style products.",
      },
      {
        company_slug: "nori",
        one_liner:
          "Wellness users: personal health context and memory over time.",
      },
    ],
  }),
  definePattern({
    slug: "nyc-fintech-rebuilding-analyst-workflows",
    title: "Investors and analysts are getting AI for the whole research desk.",
    body: [
      "NYC's finance roots show up in companies building for analysts, hedge funds, and investment teams. The buyer needs sourced answers across filings, transcripts, news, expert calls, spreadsheets, and private-market records.",
      "The work includes finding evidence across long documents, turning market news into research briefs, organizing analyst conversations, updating models, and supporting trade research. It matters now because the research pile keeps growing while investment teams still need answers they can defend in a meeting.",
    ],
    cta: "Study the document, expert-call, model, and trade-research examples",
    related_consumption_profile: "embeddings_semantic_search",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "hebbia",
        one_liner:
          "Analysts: cited answers from large sets of financial and legal documents.",
      },
      {
        company_slug: "brightwave",
        one_liner:
          "Investors: filings, transcripts, and market news turned into research.",
      },
      {
        company_slug: "standard-signal",
        one_liner:
          "Traders: research and execution support for market decisions.",
      },
      {
        company_slug: "trata",
        one_liner:
          "Hedge funds: analyst conversations packaged as reusable research.",
      },
      {
        company_slug: "meridian",
        one_liner:
          "Finance teams: spreadsheets and models for repeat analysis.",
      },
    ],
  }),
];

export function getPatternBySlug(slug: string) {
  return patterns.find((pattern) => pattern.slug === slug);
}

export function getPatternsForCompanySlug(companySlug: string) {
  return patterns.filter((pattern) =>
    pattern.companies.some((company) => company.company_slug === companySlug),
  );
}
