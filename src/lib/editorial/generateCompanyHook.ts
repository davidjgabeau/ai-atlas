import { getCompanySourceHash } from "@/lib/editorial/hash";
import { inferCompanySignalLabel } from "@/lib/signals/companySignal";
import type {
  Company,
  GeneratedCompanyFields,
  GeneratedSignalLabel,
} from "@/types/market";

type CompanyHookInput = Omit<Company, "generated"> & {
  generated?: Company["generated"];
};

const bannedPhrases = [
  "ai-powered platform",
  "revolutionizing",
  "transforming",
  "cutting-edge",
];

const categoryTrendDimensions: Record<Company["category"], string[]> = {
  "Fintech & Trading AI": ["regulated buyers", "research workflows"],
  "Legal & Compliance AI": ["regulated buyers", "workflow automation"],
  "Media, Ads & Creative AI": ["creative workflow", "interface pattern"],
  "Health & Clinical AI": ["clinical operations", "workflow automation"],
  "AI-Native Consumer & Social": ["consumer interface", "memory behavior"],
  "Agent Infrastructure": ["agent infrastructure", "workflow reliability"],
  "Model Tools & Dev Platform": ["developer workflow", "production AI"],
  "Enterprise GTM & RevOps AI": ["enterprise operations", "workflow automation"],
  "Data & Memory Layer": ["data infrastructure", "retrieval context"],
};

export function generateCompanyHook(
  company: CompanyHookInput,
): GeneratedCompanyFields {
  const sourceHash = getCompanySourceHash(company);
  const combinedText = [
    company.name,
    company.category,
    company.stage,
    company.funding_round,
    company.funding_amount,
    company.total_raised,
    company.lead_investor,
    company.funding_note,
    company.short_description,
    company.one_line_thesis,
    company.why_it_matters,
    company.ai_usage_profile,
    company.openai_fit,
    company.recent_activity_text,
  ].join(" ");
  const text = combinedText.toLowerCase();

  const hook = enforceHookRules(inferHook(company, text));
  const signalLabel = inferSignalLabel(company, text);

  return {
    hook,
    signalLabel,
    signalReason: inferSignalReason(company, signalLabel),
    keywords: extractKeywords(company, text),
    trendDimensions: inferTrendDimensions(company, text),
    generatedAt: new Date().toISOString(),
    sourceHash,
  };
}

function inferHook(company: CompanyHookInput, text: string) {
  if (company.category === "Fintech & Trading AI") {
    if (
      matches(text, [
        "capital calls",
        "waterfall",
        "distributions",
        "fee calculations",
        "private fund management",
      ])
    ) {
      return "Fund operations workflows for private markets";
    }
    if (matches(text, ["contract", "invoice", "revenue"])) {
      return "Contract-to-cash workflows for finance teams";
    }
    if (matches(text, ["risk", "factor", "equity factor"])) {
      return "Custom risk analytics for investment teams";
    }
    if (matches(text, ["research", "filings", "transcripts", "due diligence"])) {
      return "Research workflows for financial teams";
    }
    return "Research workflows for financial teams";
  }

  if (company.category === "Legal & Compliance AI") {
    if (matches(text, ["policy", "laws", "regulation", "sanctions"])) {
      return "Turning policies into operational AI agents";
    }
    if (matches(text, ["kyc", "aml", "screening", "investigation"])) {
      return "Compliance reviews for regulated finance teams";
    }
    if (matches(text, ["contract", "legal", "attorney"])) {
      return "Legal workflows for startup and compliance teams";
    }
    return "Review workflows for legal and compliance teams";
  }

  if (company.category === "Media, Ads & Creative AI") {
    if (matches(text, ["video", "creator", "actors"])) {
      return "Consumer video creation with real distribution";
    }
    if (matches(text, ["ad", "brand", "campaign", "marketing"])) {
      return "Creative workflows for brands and agencies";
    }
    if (matches(text, ["simulated", "consumer", "research"])) {
      return "Synthetic consumer research for strategy teams";
    }
    return "Creative production workflows for AI-native teams";
  }

  if (company.category === "Health & Clinical AI") {
    if (matches(text, ["prior authorization", "payer", "health plan"])) {
      return "Automating clinical admin work for health plans";
    }
    if (matches(text, ["patient", "front-office", "communication"])) {
      return "Patient workflows for healthcare operators";
    }
    if (matches(text, ["claim", "payment", "eligibility"])) {
      return "Healthcare operations workflows for payers";
    }
    return "Clinical operations workflows for healthcare teams";
  }

  if (company.category === "AI-Native Consumer & Social") {
    if (matches(text, ["memory", "notes", "personal"])) {
      return "Personal memory workflows for everyday users";
    }
    if (matches(text, ["social", "relationship", "friends"])) {
      return "Social products built around AI-native behavior";
    }
    return "Consumer AI products built around repeated use";
  }

  if (company.category === "Agent Infrastructure") {
    if (matches(text, ["browser", "sandbox", "testing", "regression"])) {
      return "Testing infrastructure for autonomous agents";
    }
    if (matches(text, ["workflow", "orchestration", "runtime"])) {
      return "Agent workflow infrastructure for production teams";
    }
    return "Infrastructure for deploying reliable agents";
  }

  if (company.category === "Model Tools & Dev Platform") {
    if (matches(text, ["evaluation", "eval", "reliable", "prototype", "production"])) {
      return "Production tooling for LLM applications";
    }
    if (matches(text, ["developer", "platform", "llm"])) {
      return "Developer platform for AI applications";
    }
    return "Model tooling for production AI teams";
  }

  if (company.category === "Enterprise GTM & RevOps AI") {
    if (matches(text, ["sales", "pipeline", "gtm"])) {
      return "Sales workflows for revenue teams";
    }
    if (matches(text, ["support", "customer", "service"])) {
      return "Customer operations workflows for enterprises";
    }
    return "Revenue operations workflows for enterprise teams";
  }

  if (matches(text, ["document", "extract", "unstructured"])) {
    return "Turning messy documents into structured context";
  }
  if (matches(text, ["memory", "knowledge", "graph", "retrieval"])) {
    return "Memory and retrieval layers for AI products";
  }

  return cleanFallback(company.short_description || company.one_line_thesis);
}

function inferSignalLabel(
  company: CompanyHookInput,
  text: string,
): GeneratedSignalLabel {
  if (company.is_featured) {
    return "Featured";
  }

  if (
    company.category === "Agent Infrastructure" ||
    company.category === "Model Tools & Dev Platform" ||
    company.category === "Data & Memory Layer"
  ) {
    return "Infra signal";
  }

  if (company.category === "AI-Native Consumer & Social") {
    return "Consumer signal";
  }

  if (matches(text, ["app", "studio", "creator", "product", "workflow"])) {
    return "Workflow signal";
  }

  if (company.stage === "Pre-Seed" || company.stage === "Seed") {
    return "Recently added";
  }

  return inferCompanySignalLabel(company);
}

function inferSignalReason(
  company: CompanyHookInput,
  signalLabel: GeneratedSignalLabel,
) {
  if (signalLabel === "Featured") {
    return "Manually selected as an editorial pick.";
  }

  if (signalLabel === "Infra signal") {
    return "Infrastructure or data layer company with model workflow leverage.";
  }

  if (signalLabel === "Consumer signal") {
    return "Consumer-facing product where AI shapes the core experience.";
  }

  if (signalLabel === "Workflow signal") {
    return "Product motion appears tied to a concrete workflow or interface.";
  }

  if (signalLabel === "Clear buyer pull") {
    return "The product serves a clear buyer or high-intent workflow.";
  }

  if (signalLabel === "Recently added") {
    return "Early-stage company added to the curated map.";
  }

  if (signalLabel === "Funding signal") {
    return "Recent funding is a notable signal for the company.";
  }

  if (signalLabel === "Worth watching") {
    return "Notable company worth tracking in the NYC AI map.";
  }

  return "Enterprise buyer or operational workflow signal.";
}

function extractKeywords(company: CompanyHookInput, text: string) {
  const candidates = [
    ...company.category
      .replaceAll("&", " ")
      .replaceAll("/", " ")
      .split(/\s+/),
    company.stage,
    "agent",
    "research",
    "workflow",
    "compliance",
    "health",
    "finance",
    "creative",
    "consumer",
    "memory",
    "revenue",
    "documents",
    "operations",
  ];

  return Array.from(
    new Set(
      candidates
        .map((candidate) => candidate.toLowerCase().trim())
        .filter(
          (candidate) =>
            candidate.length > 3 &&
            (text.includes(candidate) ||
              company.category.toLowerCase().includes(candidate)),
        ),
    ),
  ).slice(0, 6);
}

function inferTrendDimensions(company: CompanyHookInput, text: string) {
  const dimensions = new Set(categoryTrendDimensions[company.category]);

  if (matches(text, ["agent", "autonomous", "workflow"])) {
    dimensions.add("agentic workflows");
  }
  if (matches(text, ["document", "knowledge", "retrieval", "memory"])) {
    dimensions.add("context layer");
  }
  if (matches(text, ["finance", "legal", "health", "compliance"])) {
    dimensions.add("regulated adoption");
  }
  if (matches(text, ["consumer", "creator", "social", "video"])) {
    dimensions.add("consumer behavior");
  }

  return Array.from(dimensions).slice(0, 5);
}

function enforceHookRules(value: string) {
  let hook = cleanFallback(value);

  for (const phrase of bannedPhrases) {
    hook = hook.replace(new RegExp(phrase, "gi"), "").trim();
  }

  hook = hook.replaceAll("—", "-").replace(/\s+/g, " ").trim();

  if (hook.length <= 72) {
    return hook;
  }

  return `${hook.slice(0, 69).replace(/\s+\S*$/, "").trim()}...`;
}

function cleanFallback(value: string) {
  return value
    .replace(/^.*?\b(?:is|are)\s+(?:an?|the)\s+/i, "")
    .replace(/^.*?\b(?:builds?|uses?|provides?|makes?)\s+/i, "")
    .replace(/\bAI-powered platform\b/gi, "")
    .replace(/\bplatform\b/gi, "product")
    .replace(/[.!?].*$/, "")
    .trim();
}

function matches(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}
