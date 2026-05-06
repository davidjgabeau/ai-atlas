import type { ConsumptionProfile } from "@/types/market";

export type PatternCompany = {
  company_slug: string;
  one_liner: string;
};

export type Pattern = {
  slug: string;
  title: string;
  framing: string;
  companies: PatternCompany[];
  related_consumption_profile?: ConsumptionProfile;
  updated_at: string;
};

const updatedAt = "2026-05-05T14:00:00.000Z";

export const patterns: Pattern[] = [
  {
    slug: "vertical-ai-skipped-saas",
    title: "Vertical AI targets operators who skipped SaaS.",
    framing:
      "A useful slice of the map is moving away from software buyers who already have mature tooling and toward operators who still run through phones, spreadsheets, inboxes, and local process memory. The interesting companies are not selling generic copilots; they are rebuilding specific work in food distribution, government services, insurance, healthcare front offices, and supply chain operations where software adoption has historically lagged.",
    related_consumption_profile: "agentic_loops",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "anchr",
        one_liner:
          "Anchr fits because food distributors still run critical ordering and inventory work through fragmented, offline processes.",
      },
      {
        company_slug: "cvector",
        one_liner:
          "CVector pushes AI into industrial facilities where operational data and real-world constraints matter more than generic chat.",
      },
      {
        company_slug: "polimorphic",
        one_liner:
          "Polimorphic brings AI into local government services, a buyer segment with painful workflows and clear service expectations.",
      },
      {
        company_slug: "kalepa",
        one_liner:
          "Kalepa shows the same pattern in commercial insurance underwriting, where email-heavy judgment work still dominates.",
      },
    ],
  },
  {
    slug: "finance-teams-contested-buyer",
    title: "Finance teams are the map's most contested buyer.",
    framing:
      "Finance remains the clearest buyer cluster because the work is high-value, document-heavy, and already budgeted. The range matters: some companies sell research copilots to investors, while others automate billing, accounting, fund operations, or trading decisions. That makes finance less like one category and more like the map's most competitive demand center for model-backed work.",
    related_consumption_profile: "batch_document_processing",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "hebbia",
        one_liner:
          "Hebbia fits the research end of the pattern, turning large document sets into cited investment and legal analysis.",
      },
      {
        company_slug: "brightwave",
        one_liner:
          "Brightwave turns filings, transcripts, and news into investment research for analysts and funds.",
      },
      {
        company_slug: "tabs",
        one_liner:
          "Tabs attacks finance operations directly through contract ingestion, invoicing, and revenue recognition.",
      },
      {
        company_slug: "dualentry",
        one_liner:
          "DualEntry shows the accounting side of the same buyer pull, using AI to modernize ERP and migration work.",
      },
    ],
  },
  {
    slug: "llm-tooling-build-vs-deploy",
    title: "LLM tooling splits at the build-vs-deploy seam.",
    framing:
      "The tooling layer is separating into two jobs: helping teams build AI applications faster and helping them operate those systems once they leave prototype mode. That split shows up across evals, app scaffolding, model deployment, agent orchestration, and enterprise context layers. The strongest companies are clear about which side of the seam they own.",
    related_consumption_profile: "code_generation",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "vellum",
        one_liner:
          "Vellum sits on the production side, helping teams evaluate, manage, and ship LLM applications reliably.",
      },
      {
        company_slug: "amika",
        one_liner:
          "Amika belongs on the build side, giving teams cloud sandboxes for coding agents and generated pull requests.",
      },
      {
        company_slug: "emergence-ai",
        one_liner:
          "Emergence AI fits because its agents coordinate other agents across enterprise workflows and data flows.",
      },
      {
        company_slug: "wallaroo",
        one_liner:
          "Wallaroo represents deployment infrastructure for teams trying to monitor and operate models in production.",
      },
    ],
  },
  {
    slug: "realtime-voice-back-office",
    title: "Real-time voice is moving into back-office workflows in healthcare and hospitality.",
    framing:
      "Voice is strongest where the phone is still the interface for the business. Healthcare offices, restaurants, and service operators need fast answers, scheduling, routing, and follow-up without adding staff. The pattern is less about synthetic voices as a novelty and more about taking repetitive phone work off overloaded teams.",
    related_consumption_profile: "realtime_voice",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "slang-ai",
        one_liner:
          "Slang.ai fits through restaurant and retail phone agents that handle reservations, appointments, and customer questions.",
      },
      {
        company_slug: "clarion",
        one_liner:
          "Clarion brings voice agents to healthcare calls around scheduling, billing, and prescription workflows.",
      },
      {
        company_slug: "valerie-health",
        one_liner:
          "Valerie Health points voice and communications automation at the independent doctor's office front desk.",
      },
      {
        company_slug: "rowflow",
        one_liner:
          "RowFlow fits the broader conversational intake shape by replacing static forms with structured conversations.",
      },
    ],
  },
  {
    slug: "agentic-loops-legal-compliance",
    title: "Agentic loops are reshaping high-stakes review work in legal and compliance.",
    framing:
      "Legal and compliance products are moving beyond single-pass drafting into repeat review loops: collect context, compare against rules, produce a decision, and leave an audit trail. The buyer is conservative, but the work is structured enough for agents when citations, policy grounding, and human oversight stay close to the product.",
    related_consumption_profile: "agentic_loops",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "norm-ai",
        one_liner:
          "Norm Ai fits because it turns regulations and policies into agents that perform repeat compliance reviews.",
      },
      {
        company_slug: "bretton-ai",
        one_liner:
          "Bretton AI applies long-horizon agents to KYC, sanctions screening, and AML investigations.",
      },
      {
        company_slug: "manifest-os",
        one_liner:
          "Manifest OS shows how AI-native legal services can be rebuilt around repeat intake, billing, and case workflows.",
      },
      {
        company_slug: "zerodrift",
        one_liner:
          "ZeroDrift fits through real-time policy monitoring and enforcement for regulated companies.",
      },
    ],
  },
  {
    slug: "consumer-companion-personal-graph",
    title: "Consumer companion apps are using personal-data graphs as the wedge.",
    framing:
      "The consumer side of the map is strongest when products remember enough context to become useful over time. Social graph, personal health data, relationship context, and household logistics all create a wedge for repeated use. The bet is that memory and graph structure matter more than a blank chat box.",
    related_consumption_profile: "consumer_inference",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "series",
        one_liner:
          "Series uses iMessage and social context to make warm introductions feel native to existing behavior.",
      },
      {
        company_slug: "cerca",
        one_liner:
          "Cerca fits by using friends-of-friends graph data to reduce stranger anxiety in dating.",
      },
      {
        company_slug: "222",
        one_liner:
          "222 turns matching into real-world plans, making social context and logistics part of the product.",
      },
      {
        company_slug: "tapestry",
        one_liner:
          "Tapestry supplies social graph infrastructure for consumer and agentic products.",
      },
      {
        company_slug: "nori",
        one_liner:
          "Nori uses personal health data and memory to make wellness guidance more continuous.",
      },
    ],
  },
  {
    slug: "nyc-fintech-rebuilding-analyst-workflows",
    title: "NYC fintech is rebuilding analyst workflows with frontier models.",
    framing:
      "The finance companies that feel most native to New York are rebuilding the analyst's workbench: finding information, structuring evidence, running diligence, and turning messy records into a decision. The pattern is not simply faster search; it is AI becoming the connective tissue between documents, models, and human judgment.",
    related_consumption_profile: "embeddings_semantic_search",
    updated_at: updatedAt,
    companies: [
      {
        company_slug: "hebbia",
        one_liner:
          "Hebbia is the clearest example of financial research moving from search to multi-document reasoning.",
      },
      {
        company_slug: "brightwave",
        one_liner:
          "Brightwave fits by building analyst-grade research from filings, transcripts, and market news.",
      },
      {
        company_slug: "standard-signal",
        one_liner:
          "Standard Signal stretches the pattern into AI-native trade research and execution.",
      },
      {
        company_slug: "trata",
        one_liner:
          "Trata turns buyside analyst conversations into a subscription research product for hedge funds.",
      },
      {
        company_slug: "meridian",
        one_liner:
          "Meridian fits the spreadsheet and modeling side of the analyst workflow.",
      },
    ],
  },
];

export function getPatternBySlug(slug: string) {
  return patterns.find((pattern) => pattern.slug === slug);
}

export function getPatternsForCompanySlug(companySlug: string) {
  return patterns.filter((pattern) =>
    pattern.companies.some((company) => company.company_slug === companySlug),
  );
}
