import {
  categories,
  type Category,
  type CategoryMeta,
  type Company,
  type Founder,
  type GeneratedSignalLabel,
  type Submission,
} from "@/types/market";
import { generateCompanyHook } from "@/lib/editorial/generateCompanyHook";
import { generateInclusionReason } from "@/lib/agent/generateInclusionReason";
import { inferConsumptionProfile } from "@/lib/model-usage/consumptionProfile";

type SourceRecord = {
  company_name: string;
  website: string;
  founder_name: string;
  email: string;
  signal_label: GeneratedSignalLabel;
  description: string;
  category: Category;
};

type CompanyFunding = Pick<
  Company,
  | "funding_round"
  | "funding_amount"
  | "funding_date"
  | "total_raised"
  | "lead_investor"
  | "funding_note"
>;

type CompanyWithoutGenerated = Omit<Company, "generated">;

export const categoryMeta: CategoryMeta[] = [
  {
    name: "Fintech & Trading AI",
    slug: "fintech-trading-ai",
    description: "AI-native research, risk, fund operations, compliance, and trading workflows built for New York's financial ecosystem.",
    thesis: "NYC fintech AI matters because financial services buyers have dense document workflows, deep data needs, and high willingness to pay for trustworthy automation."
  },
  {
    name: "Legal & Compliance AI",
    slug: "legal-compliance-ai",
    description: "Legal, regulatory, KYC, AML, policy, and compliance products where AI handles high-stakes review work.",
    thesis: "New York creates unusually strong demand for legal and compliance AI because regulated firms need speed without losing auditability or expert oversight."
  },
  {
    name: "Cybersecurity AI",
    slug: "cybersecurity-ai",
    description: "AI-native security operations, threat detection, exposure management, and human-layer defense built in New York.",
    thesis: "Cybersecurity AI matters in New York because security buyers need fast triage across messy telemetry, identity systems, human risk, and regulated enterprise environments."
  },
  {
    name: "Media, Ads & Creative AI",
    slug: "media-ads-creative-ai",
    description: "AI creative tools, ad platforms, synthetic media products, brand agents, and consumer insight engines.",
    thesis: "NYC media and advertising companies are close to brands, agencies, creators, and buyers, making the city a natural proving ground for creative AI."
  },
  {
    name: "Health & Clinical AI",
    slug: "health-clinical-ai",
    description: "Clinical operations, payer workflows, patient communication, healthcare payments, and AI front-office products.",
    thesis: "Healthcare AI breaks out when it reduces administrative drag while keeping clinicians, payers, and patients inside trusted workflows."
  },
  {
    name: "Life Sciences AI",
    slug: "life-sciences-ai",
    description: "Drug discovery, computational biology, lab automation, and AI-native biotech infrastructure built in New York.",
    thesis: "Life sciences AI fits the map where New York teams use models to reason over biology, design medicines, and build infrastructure for lab and biotech workflows."
  },
  {
    name: "AI-Native Consumer & Social",
    slug: "ai-native-consumer-social",
    description: "Consumer products where AI shapes discovery, social connection, personalization, relationships, and everyday coordination.",
    thesis: "NYC is a useful testbed for consumer AI because dense offline networks, campuses, nightlife, and professional communities create fast feedback loops."
  },
  {
    name: "Agent Infrastructure",
    slug: "agent-infrastructure",
    description: "Runtime, orchestration, observability, browser automation, workflow agents, and developer infrastructure for agentic systems.",
    thesis: "Agent infrastructure becomes valuable when teams can reliably deploy, test, govern, and improve agents in production workflows."
  },
  {
    name: "Model Tools & Dev Platform",
    slug: "model-tools-dev-platform",
    description: "LLM application development, evaluation, prompt tooling, deployment workflows, and production AI engineering platforms.",
    thesis: "Model tooling matters when teams can reliably evaluate, ship, monitor, and improve AI applications beyond prototype stage."
  },
  {
    name: "Enterprise GTM & RevOps AI",
    slug: "enterprise-gtm-revops-ai",
    description: "AI products for sales, support, revenue operations, insurance distribution, customer communication, and go-to-market workflows.",
    thesis: "Enterprise GTM AI works when models create measurable pipeline, faster service, cleaner revenue operations, or better customer conversion."
  },
  {
    name: "Data & Memory Layer",
    slug: "data-memory-layer",
    description: "Data products, document intelligence, knowledge graphs, multimodal understanding, and memory layers for AI-native work.",
    thesis: "The AI application layer depends on better context, retrieval, structured data, and memory over messy enterprise information."
  }
];

const sourceCompanies: SourceRecord[] = [
  {
    company_name: "Hebbia",
    website: "https://www.hebbia.com",
    founder_name: "George Sivulka",
    email: "george@hebbia.com",
    signal_label: "Featured",
    description: "Hebbia is an AI-powered research and reasoning platform built for finance, law, and consulting. Its Matrix product lets asset managers, investment banks, and private equity firms run multi-step analyses across millions of documents with cited, auditable answers. Customers include Charlesbank, Oak Hill Advisors, and major Wall Street institutions.",
    category: "Fintech & Trading AI"
  },
  {
    company_name: "Bayesline",
    website: "https://bayesline.com",
    founder_name: "Sebastian Janisch",
    email: "sebastian@bayesline.com",
    signal_label: "Worth watching",
    description: "Bayesline builds GPU-powered, highly customizable financial analytics for hedge funds and asset managers, replacing rigid off-the-shelf risk models with cloud-deployed solutions that produce custom equity factor and risk models in seconds. Founded by ex-BlackRock and ex-Bloomberg quants, it serves institutional investors who previously waited weeks for similar analytics.",
    category: "Fintech & Trading AI"
  },
  {
    company_name: "Brightwave",
    website: "https://www.brightwave.io",
    founder_name: "Mike Conover",
    email: "mike@brightwave.io",
    signal_label: "Worth watching",
    description: "Brightwave is an AI-powered financial research platform that ingests SEC filings, earnings transcripts, breaking news, and proprietary documents into a knowledge graph to deliver analyst-grade investment research. Customers include hedge funds, advisory firms, and asset managers who use it to accelerate deal coverage and due diligence.",
    category: "Fintech & Trading AI"
  },
  {
    company_name: "Maybern",
    website: "https://www.maybern.com",
    founder_name: "Ross Mechanic",
    email: "ross@maybern.com",
    signal_label: "Clear buyer pull",
    description: "Maybern is the AI-enabled operating system for private fund management, automating capital calls, distributions, waterfalls, and fee calculations for private equity, credit, and real estate firms. It supports more than $80B in AUM across clients including Madison Realty Capital, Gauge Capital, and Town Lane.",
    category: "Fintech & Trading AI"
  },
  {
    company_name: "Tabs",
    website: "https://www.tabs.inc",
    founder_name: "Ali Hussain",
    email: "ali@tabs.inc",
    signal_label: "Clear buyer pull",
    description: "Tabs is an AI-native revenue automation platform purpose-built for B2B finance teams, using AI to extract contract terms, generate invoices, and run revenue recognition end-to-end. It serves CFO and accounting teams replacing manual contract-to-cash workflows with autonomous AI agents.",
    category: "Fintech & Trading AI"
  },
  {
    company_name: "Trata",
    website: "https://www.trytrata.com",
    founder_name: "Eric Cho",
    email: "eric@trytrata.com",
    signal_label: "Worth watching",
    description: "Trata is an AI-powered research desk for hedge funds, using agents to interview anonymous buyside analysts at top funds, produce unfiltered investment research, and distribute it via subscription. Targeted at long-short hedge funds seeking unbiased stock analysis. YC W25.",
    category: "Fintech & Trading AI"
  },
  {
    company_name: "Norm Ai",
    website: "https://www.norm.ai",
    founder_name: "John Nay",
    email: "john@norm.ai",
    signal_label: "Featured",
    description: "Norm Ai converts laws, regulations, and internal policies into AI agents that automate legal and compliance reviews for global financial institutions. Backed by Blackstone, Bain Capital, Coatue, and Vanguard, its clients collectively manage over $30 trillion in AUM and use Norm for sanctions, marketing, and regulatory workflows.",
    category: "Legal & Compliance AI"
  },
  {
    company_name: "Manifest OS",
    website: "https://www.manifestlaw.com",
    founder_name: "Dan Mishin",
    email: "dan@manifestlaw.com",
    signal_label: "Featured",
    description: "Manifest OS powers the next generation of AI-native law firms with outcomes-based fixed pricing, starting with business immigration. Its operating system handles client intake, business development, billing, and legal automation while attorneys focus on advocacy. Backed by Menlo Ventures and Kleiner Perkins at a $750M Series A valuation.",
    category: "Legal & Compliance AI"
  },
  {
    company_name: "Soxton",
    website: "https://www.soxton.com",
    founder_name: "Logan Brown",
    email: "logan@soxton.com",
    signal_label: "Worth watching",
    description: "Soxton is an AI-native legal platform for early-stage startups, offering 50+ ready-to-use contracts, an AI legal copilot trained on startup data, and human-in-the-loop attorney review. Founded by a Harvard JD and former Cooley LLP attorney, it has helped 270+ businesses with incorporation, equity, fundraising, and compliance.",
    category: "Legal & Compliance AI"
  },
  {
    company_name: "Bretton AI",
    website: "https://www.bretton.ai",
    founder_name: "Will Lawrence",
    email: "will@bretton.ai",
    signal_label: "Clear buyer pull",
    description: "Bretton AI (formerly Greenlite AI) builds long-horizon AI agents that automate KYC, sanctions screening, and complex anti-money-laundering investigations for banks and fintechs. Customers include Mercury, Ramp, Robinhood, and Lead Bank; backed by Sapphire Ventures and Greylock with a $75M Series B in early 2026.",
    category: "Legal & Compliance AI"
  },
  {
    company_name: "Alkymi",
    website: "https://www.alkymi.io",
    founder_name: "Harald Collet",
    email: "harald@alkymi.io",
    signal_label: "Worth watching",
    description: "Alkymi is an AI document data automation platform that extracts and structures data from emails, PDFs, and other unstructured sources for financial services compliance, operations, and reporting workflows. Founded in 2017 in NYC, it serves asset managers, banks, and insurers replacing manual document processing.",
    category: "Legal & Compliance AI"
  },
  {
    company_name: "ZeroDrift",
    website: "https://www.zerodrift.ai",
    founder_name: "ZeroDrift Founders",
    email: "team@zerodrift.ai",
    signal_label: "Worth watching",
    description: "ZeroDrift is an AI-driven compliance enforcement platform that helps regulated companies monitor and enforce policy adherence in real time. Raised a $2M pre-seed led by Andreessen Horowitz in early 2026 and serves financial services, healthcare, and other compliance-sensitive verticals.",
    category: "Legal & Compliance AI"
  },
  {
    company_name: "Mirage (formerly Captions)",
    website: "https://www.captions.ai",
    founder_name: "Gaurav Misra",
    email: "gaurav@captions.ai",
    signal_label: "Featured",
    description: "Mirage (originally Captions) is an AI video creation company offering consumer apps for creators plus Mirage Studio, an enterprise platform that generates AI actors and videos for marketing campaigns. Backed by Sequoia, Andreessen Horowitz, and Kleiner Perkins; one of the most successful consumer AI products globally.",
    category: "Media, Ads & Creative AI"
  },
  {
    company_name: "Agentio",
    website: "https://www.agentio.com",
    founder_name: "Arthur Leopold",
    email: "arthur@agentio.com",
    signal_label: "Featured",
    description: "Agentio is the AI-native ad platform for creator-led advertising, automating brand-creator matching, bidding, and campaign execution across YouTube, Meta, and beyond. Raised $40M Series B led by Forerunner at a $340M valuation; named to Forbes' Next Billion Dollar Startups 2025.",
    category: "Media, Ads & Creative AI"
  },
  {
    company_name: "Aaru",
    website: "https://www.aaru.com",
    founder_name: "Cameron Fink",
    email: "cameron@aaru.com",
    signal_label: "Featured",
    description: "Aaru is an AI research platform that deploys swarms of simulated agents to predict consumer and political behavior for brands, agencies, and political clients. Raised an $80M Series A led by Redpoint Ventures in 2026, bringing total funding to $88M.",
    category: "Media, Ads & Creative AI"
  },
  {
    company_name: "Icon",
    website: "https://www.icon.com",
    founder_name: "Kennan Davison",
    email: "kennan@icon.com",
    signal_label: "Clear buyer pull",
    description: "Icon bills itself as the 'AI Admaker'-a high-leverage SaaS that plans, generates, and A/B-tests thousands of ads end-to-end for DTC brands. Strategic angel funding from Founders Fund, an OpenAI exec, and NFL star Saquon Barkley; reportedly 2,200+ paying brands within months of launch.",
    category: "Media, Ads & Creative AI"
  },
  {
    company_name: "Tildei",
    website: "https://www.tildei.com",
    founder_name: "Tildei Founders",
    email: "team@tildei.com",
    signal_label: "Worth watching",
    description: "Tildei uses AI agents to activate brands across multiple channels, engaging customers directly to provide recommendations, collect reviews, and drive growth. Founded and operating in NYC with a small focused team building agentic brand experiences.",
    category: "Media, Ads & Creative AI"
  },
  {
    company_name: "Stewdio",
    website: "https://www.stewdio.com",
    founder_name: "Stewdio Team",
    email: "team@stewdio.com",
    signal_label: "Worth watching",
    description: "Stewdio is a collaborative platform for creative teams to use the latest image and video generation models in one place. Used by music video directors (Quavo, Loco), ad agencies, and architects to create rap videos, advertising storyboards, and architectural renderings. YC-backed, NYC-based.",
    category: "Media, Ads & Creative AI"
  },
  {
    company_name: "Absurd",
    website: "https://www.absurd.ai",
    founder_name: "Absurd Team",
    email: "team@absurd.ai",
    signal_label: "Worth watching",
    description: "Absurd makes AI brand and performance ads at scale. Their work for Kalshi (the 'Election Day' spot) hit 1M+ views, with average organic reach above 400K per video. YC-backed, building short-form viral ad creative for fast-moving brands.",
    category: "Media, Ads & Creative AI"
  },
  {
    company_name: "Anterior",
    website: "https://www.anterior.com",
    founder_name: "Abdel Mahmoud",
    email: "abdel@anterior.com",
    signal_label: "Featured",
    description: "Anterior automates clinical workflows for health plans, including prior authorization, payment integrity, and risk adjustment. With a 99.24% clinical accuracy rate (validated by KLAS), it supports payers covering 50M+ lives, including Geisinger Health Plan. Raised $40M in February 2026, bringing total to $64M; backed by Sequoia, NEA, FPV, and Kinnevik.",
    category: "Health & Clinical AI"
  },
  {
    company_name: "Valerie Health",
    website: "https://www.valeriehealth.com",
    founder_name: "Peter Shalek",
    email: "peter@valeriehealth.com",
    signal_label: "Clear buyer pull",
    description: "Valerie Health is an AI front office for independent doctors' offices, automating patient communications, scheduling, and the administrative space between patient and provider. Raised a $30M Series A led by Redpoint Ventures with participation from General Catalyst and Primary Ventures; total funding $39M.",
    category: "Health & Clinical AI"
  },
  {
    company_name: "Clarion",
    website: "https://www.clarion.health",
    founder_name: "Ryan Shaw",
    email: "ryan@clarion.health",
    signal_label: "Worth watching",
    description: "Clarion builds an AI communication layer for healthcare, with voice agents that handle inbound and outbound calls for clinics, scheduling, billing, prescription refills, and more. Already serving virtual care companies, health systems, and a $5B health insurance company; raised $5.4M from Accel, Y Combinator, and Sequoia (scout).",
    category: "Health & Clinical AI"
  },
  {
    company_name: "Sohar Health",
    website: "https://www.soharhealth.com",
    founder_name: "Sohar Health Team",
    email: "team@soharhealth.com",
    signal_label: "Worth watching",
    description: "Sohar Health is an AI-driven front-end revenue cycle management solution that automates insurance verification for healthcare providers with 95% automation, 6-second median latency, and 99% eligibility accuracy. Customers include outpatient clinics, specialty practices, and digital health platforms like Talkiatry. YC-backed.",
    category: "Health & Clinical AI"
  },
  {
    company_name: "Camber",
    website: "https://www.camber.com",
    founder_name: "Camber Founders",
    email: "team@camber.com",
    signal_label: "Clear buyer pull",
    description: "Camber is a healthtech startup transforming healthcare payments by reducing administrative burden on clinics and families. Its AI models streamline claims processing with 95% first-pass accuracy and have managed $2B in claims, supporting 100,000 patients across 40 states. Raised $30M Series B in 2025 from Andreessen Horowitz and Y Combinator.",
    category: "Health & Clinical AI"
  },
  {
    company_name: "Granted",
    website: "https://www.granted.health",
    founder_name: "Granted Team",
    email: "team@granted.health",
    signal_label: "Worth watching",
    description: "Granted provides AI-native healthcare solutions with autonomous, end-to-end agentic systems that reason over insurance and billing workflows for navigating health benefits, disputing denials, and helping consumers access care. NYC-based with hiring across engineering and product roles in Chelsea.",
    category: "Health & Clinical AI"
  },
  {
    company_name: "Series",
    website: "https://www.series.so",
    founder_name: "Nathaneo Johnson",
    email: "nate@series.so",
    signal_label: "Featured",
    description: "Series is an AI-powered social networking platform that operates entirely inside iMessage, using conversational AI to facilitate warm introductions across Gen Z and professional users. Active across 750+ college campuses with 82% Day-30 retention. Raised $5.1M pre-seed from Pear VC, Reddit CEO Steve Huffman, Venmo co-founder Iqram Magdon-Ismail, and GPTZero's Edward Tian.",
    category: "AI-Native Consumer & Social"
  },
  {
    company_name: "222",
    website: "https://www.two-two-two.com",
    founder_name: "Keyan Kazemian",
    email: "keyan@two-two-two.com",
    signal_label: "Clear buyer pull",
    description: "222 uses AI to engineer 'meet-cutes,' matching strangers for IRL dinners, hangouts, and dates in NYC and other major cities. The platform now plans follow-up hangs and full date logistics for users, evolving from one-time encounters into ongoing relationships. YC-backed; total funding $13.7M with offices in SoHo.",
    category: "AI-Native Consumer & Social"
  },
  {
    company_name: "Cerca",
    website: "https://www.cerca.app",
    founder_name: "Myles Slayton",
    email: "myles@cerca.app",
    signal_label: "Worth watching",
    description: "Cerca is a Gen Z dating app that uses social-graph AI to match users only with friends or friends-of-friends, eliminating stranger anxiety and rejection fear. ~60K users primarily in NYC and across universities; raised $1.6M seed and was selected for TechCrunch Disrupt 2025 Startup Battlefield.",
    category: "AI-Native Consumer & Social"
  },
  {
    company_name: "Remesh",
    website: "https://www.remesh.ai",
    founder_name: "Andrew Konya",
    email: "andrew@remesh.ai",
    signal_label: "Worth watching",
    description: "Remesh uses AI to engage live audiences in real-time conversations and surface insights at scale. Companies, political organizations, and researchers use Remesh to understand markets, improve products, and craft customer experiences in minutes rather than weeks.",
    category: "AI-Native Consumer & Social"
  },
  {
    company_name: "Loyalist",
    website: "https://www.loyalist.ai",
    founder_name: "Loyalist Founders",
    email: "team@loyalist.ai",
    signal_label: "Worth watching",
    description: "Loyalist is building an AI-powered revenue engine for restaurants and hospitality operators, partnering with 1,000+ restaurants ranging from Major Food Group and Le Bernardin to neighborhood spots like Jeju Noodle Bar. Backed by Lerer Hippeau, Bling Capital, and Floodgate; NYC-based.",
    category: "AI-Native Consumer & Social"
  },
  {
    company_name: "Nori",
    website: "https://www.nori.health",
    founder_name: "Nori Team",
    email: "team@nori.health",
    signal_label: "Worth watching",
    description: "Nori is a concierge-level AI health coach that aggregates Apple Health, medical records, wearables, and other personal health data into a personalized daily plan. YC-backed and based in NYC, targeting consumers seeking proactive AI-powered wellness coaching.",
    category: "AI-Native Consumer & Social"
  },
  {
    company_name: "Emergence AI",
    website: "https://www.emergence.ai",
    founder_name: "Satya Nitta",
    email: "satya@emergence.ai",
    signal_label: "Featured",
    description: "Emergence AI's 'Agents Creating Agents' framework chains and deploys swarms of autonomous agents that spin up new agents on the fly to orchestrate complex enterprise workflows. Its CRAFT self-serve platform gives business users no-code control over data-pipeline agents that interoperate with LangChain and Autogen. Raised a $97.2M Series A led by Learn Capital.",
    category: "Agent Infrastructure"
  },
  {
    company_name: "Channel3",
    website: "https://www.trychannel3.com",
    founder_name: "Alex Krause",
    email: "alex@trychannel3.com",
    signal_label: "Worth watching",
    description: "Channel3 is building a database of every product on the internet, giving developers and AI agents API access to a unified, semantically-matched product catalog. Powers AI shopping experiences, fashion stylists, and agentic commerce. YC-backed and headquartered in NYC.",
    category: "Agent Infrastructure"
  },
  {
    company_name: "Amika",
    website: "https://www.amika.ai",
    founder_name: "Amika Founders",
    email: "team@amika.ai",
    signal_label: "Worth watching",
    description: "Amika is infrastructure to build a software factory: sandboxed AI coding agents in the cloud accessible via web UI, CLI, Slack, or API. Customers plug in coding agents like Claude Code or Codex to autonomously ship PRs with live previews, mirroring infrastructure used internally at Ramp, Coinbase, and Stripe. YC-backed, NYC-based.",
    category: "Agent Infrastructure"
  },
  {
    company_name: "Kay.ai",
    website: "https://www.kay.ai",
    founder_name: "Vishal Rohra",
    email: "vishal@kay.ai",
    signal_label: "Worth watching",
    description: "Kay.ai accelerates data extraction workflows for enterprises using high-quality embeddings and fine-tuned LLMs, providing the context and retrieval layer that AI agents need to operate over enterprise documents. Founded by ex-Microsoft, Twitter, and Amazon ML engineers; backed by Wing VC.",
    category: "Agent Infrastructure"
  },
  {
    company_name: "Empromptu",
    website: "https://www.empromptu.ai",
    founder_name: "Empromptu Team",
    email: "team@empromptu.ai",
    signal_label: "Worth watching",
    description: "Empromptu helps enterprises build AI apps through chat; users describe what they want, and the platform turns the request into a working internal tool. Raised a $2M pre-seed in late 2025 to expand its enterprise AI app builder; NYC-based.",
    category: "Agent Infrastructure"
  },
  {
    company_name: "Vortexify AI",
    website: "https://www.vortexify.ai",
    founder_name: "Vortexify Founders",
    email: "team@vortexify.ai",
    signal_label: "Worth watching",
    description: "Vortexify AI is a platform for building fully operational AI workflows tailored to supply chain operations, deploying specialized AI bots that analyze millions of data rows and orchestrate complex, long-horizon processes. Each bot includes custom tools maintained through AI-powered code editors. YC-backed, NYC.",
    category: "Agent Infrastructure"
  },
  {
    company_name: "Kalepa",
    website: "https://www.kalepa.com",
    founder_name: "Paul Monasterio",
    email: "paul@kalepa.com",
    signal_label: "Clear buyer pull",
    description: "Kalepa is reimagining the trillion-dollar commercial insurance industry with AI-driven underwriting, leveraging machine learning to score and price commercial risks that have traditionally been managed manually in Outlook. NYC-based and backed by leading insurance and tech investors.",
    category: "Enterprise GTM & RevOps AI"
  },
  {
    company_name: "Slang.ai",
    website: "https://www.slang.ai",
    founder_name: "Alex Sambvani",
    email: "alex@slang.ai",
    signal_label: "Clear buyer pull",
    description: "Slang.ai builds voice AI agents that answer phone calls on behalf of restaurants and retail businesses, handling reservations, appointments, and customer questions 24/7. Founded by former Spotify data leaders Alex Sambvani and Gabriel Duncan; backed by Wing VC.",
    category: "Enterprise GTM & RevOps AI"
  },
  {
    company_name: "Concourse",
    website: "https://www.concourse.com",
    founder_name: "Concourse Founders",
    email: "team@concourse.com",
    signal_label: "Worth watching",
    description: "Concourse builds AI agents for corporate finance teams, working alongside finance staff to automate the most manual and time-consuming day-to-day operations like reconciliations, reporting, and variance analysis. YC-backed and NYC-based.",
    category: "Enterprise GTM & RevOps AI"
  },
  {
    company_name: "RowFlow",
    website: "https://www.rowflow.ai",
    founder_name: "RowFlow Team",
    email: "team@rowflow.ai",
    signal_label: "Worth watching",
    description: "RowFlow replaces clunky web forms with natural conversations over text, Slack, or chat, automatically converting any existing form into an AI-powered conversation. Targets client intake, registrations, compliance forms, feedback surveys, and other GTM/customer workflows. YC-backed.",
    category: "Enterprise GTM & RevOps AI"
  },
  {
    company_name: "Tofu",
    website: "https://www.tofuhq.com",
    founder_name: "Pranav Piyush",
    email: "pranav@tofuhq.com",
    signal_label: "Worth watching",
    description: "Tofu is an AI-native marketing platform that personalizes outbound campaigns and content across email, web, and ads at the account and persona level. Targets B2B revenue teams looking to consolidate fragmented martech stacks; backed by Index Ventures and others.",
    category: "Enterprise GTM & RevOps AI"
  },
  {
    company_name: "Standard Signal",
    website: "https://www.standardsignal.com",
    founder_name: "Standard Signal Founders",
    email: "team@standardsignal.com",
    signal_label: "Worth watching",
    description: "Standard Signal is the first hedge fund that researches and executes trades purely with AI. Its custom models discover and trade on new fundamental truths before humans can. YC-backed and NYC-based, building AI-native trading infrastructure for the hedge-fund-as-software thesis.",
    category: "Fintech & Trading AI"
  },
  {
    company_name: "Carbon Arc",
    website: "https://www.carbonarc.co",
    founder_name: "Carbon Arc Founders",
    email: "team@carbonarc.co",
    signal_label: "Worth watching",
    description: "Carbon Arc operates an AI-ready data marketplace, giving companies the licensed data resources they need to train more effective AI models and make better decisions. NYC-based and serving enterprises building proprietary AI capabilities; raised significant Series A funding to scale its data exchange.",
    category: "Data & Memory Layer"
  },
  {
    company_name: "Wallaroo",
    website: "https://www.wallaroo.ai",
    founder_name: "Vid Jain",
    email: "vid@wallaroo.ai",
    signal_label: "Worth watching",
    description: "Wallaroo provides an enterprise AI/ML production platform that enables clients to deploy machine learning and analytics projects into production at scale, with model observability, monitoring, and inference orchestration. NYC-based, serving large enterprises operationalizing ML.",
    category: "Data & Memory Layer"
  },
  {
    company_name: "Canoe Intelligence",
    website: "https://www.canoeintelligence.com",
    founder_name: "Seth Brotman",
    email: "seth@canoeintelligence.com",
    signal_label: "Clear buyer pull",
    description: "Canoe uses AI to automate alternative-investment data collection, extraction, and reconciliation for allocators, family offices, and wealth managers. Its document-extraction engine processes capital-call notices, K-1s, and statements that traditionally required armies of analysts. NYC-based.",
    category: "Data & Memory Layer"
  },
  {
    company_name: "Hyperscience",
    website: "https://www.hyperscience.com",
    founder_name: "Peter Brodsky",
    email: "peter@hyperscience.com",
    signal_label: "Clear buyer pull",
    description: "Hyperscience offers an AI software platform that turns unstructured documents into structured, machine-readable data with high accuracy. Used by Fortune 500s, government agencies, and financial institutions to automate document-heavy workflows. NYC-based.",
    category: "Data & Memory Layer"
  },
  {
    company_name: "Datagrid",
    website: "https://www.datagrid.com",
    founder_name: "Datagrid Team",
    email: "team@datagrid.com",
    signal_label: "Worth watching",
    description: "Datagrid is building enterprise AI agents that connect, normalize, and reason over fragmented business data, providing a unified context layer for AI-driven workflows in sales, finance, and operations. NYC-based and backed by leading enterprise SaaS investors.",
    category: "Data & Memory Layer"
  },
  {
    company_name: "Aspect",
    website: "https://www.aspect.ai",
    founder_name: "Aspect Team",
    email: "team@aspect.ai",
    signal_label: "Worth watching",
    description: "Aspect's visual understanding engine processes dense multimodal datasets, providing tools for segmentation, QC, and structured-schema extraction over images, video, and other non-text data. Where Glean and Notion serve text corpuses, Aspect targets the multimodal data layer. YC-backed, NYC.",
    category: "Data & Memory Layer"
  },
  {
    company_name: "Artemis",
    website: "https://goartemis.ai",
    founder_name: "Shachar Hirshberg; Dan Shiebler",
    email: "team@goartemis.ai",
    signal_label: "Funding signal",
    description: "Artemis is an AI-native SOC platform that correlates telemetry across cloud, identity, network, and endpoints to detect and respond to AI-powered attacks at machine speed. The New York company raised $70M across seed and Series A financing in April 2026, led by Felicis with participation from First Round Capital, Theory VC, and Lockstep.",
    category: "Cybersecurity AI"
  },
  {
    company_name: "Astelia",
    website: "https://astelia.io",
    founder_name: "Alon Noy; Nadav Ostrovsky; Roy Rajwan",
    email: "team@astelia.io",
    signal_label: "Funding signal",
    description: "Astelia builds an AI-native exposure management platform that maps real network topology and uses agentic AI to surface the small share of vulnerabilities that are genuinely reachable and exploitable. Headquartered at 488 Madison Ave in New York, Astelia raised $35M across seed and Series A financing in February 2026 from Index Ventures, Team8, and Holly Ventures.",
    category: "Cybersecurity AI"
  },
  {
    company_name: "GhostEye",
    website: "https://ghosteye.ai",
    founder_name: "Mohammad Eshan; Charles Antoine Malenfant",
    email: "team@ghosteye.ai",
    signal_label: "Workflow signal",
    description: "GhostEye builds an AI-powered human pentesting platform that uses offensive agents to generate personalized phishing, voice, SMS, and deepfake campaigns from each employee's public OSINT exposure. The YC-backed pre-seed company is based in New York and focuses on human-layer defense.",
    category: "Cybersecurity AI"
  },
  {
    company_name: "Proxima Bio",
    website: "https://proximabio.com",
    founder_name: "Zachary Carpenter; Luca Naef",
    email: "team@proximabio.com",
    signal_label: "Funding signal",
    description: "Proxima Bio, formerly VantAI, is an AI-native platform for proximity-based drug discovery, mapping protein-protein interactions to design medicines that reshape protein networks rather than inhibit single targets. The New York company raised an $80M seed round in January 2026 led by DCVC with participation from NVentures, Roivant, Braidwell, and AIX Ventures.",
    category: "Life Sciences AI"
  },
  {
    company_name: "Output Biosciences",
    website: "https://outputbio.com",
    founder_name: "Adi Mashiach; Mirella Mashiach",
    email: "team@outputbio.com",
    signal_label: "Infra signal",
    description: "Output Biosciences is building Large Biological Models, generative AI architectures designed to handle the long, nonlinear, fragmented data of biological systems across molecules, cells, and organisms. The YC S21 seed-stage company is headquartered in New York's Union Square and currently operates in stealth.",
    category: "Life Sciences AI"
  },
  {
    company_name: "Serinus Biosciences",
    website: "https://serinus.bio",
    founder_name: "Maxwell Sherman; Adam Yaari",
    email: "team@serinus.bio",
    signal_label: "Workflow signal",
    description: "Serinus Biosciences uses a knowledge-primed AI engine to design cancer combination therapies by mapping how tumor cells evolve treatment resistance and identifying molecules that override resistance escape routes. The seed-stage New York company is based at 430 E 29th St.",
    category: "Life Sciences AI"
  }
];

const companyAddressesByWebsite: Record<string, string> = {
  "https://www.hebbia.com": "110 Greene St, Suite 1200, New York, NY 10012",
  "https://www.norm.ai": "7 World Trade Center, 39th Floor, New York, NY 10007",
  "https://www.manifestlaw.com": "333 Park Avenue South, Suite 3C, New York, NY 10010",
  "https://astelia.io": "488 Madison Ave, New York, NY 10022",
  "https://www.agentio.com": "295 Fifth Ave, 11th Floor, New York, NY 10016",
  "https://www.anterior.com": "169 Madison Ave, Suite 2408, New York, NY 10016",
  "https://outputbio.com": "Union Square, New York, NY",
  "https://serinus.bio": "430 E 29th St, New York, NY 10016",
  "https://www.emergence.ai": "8 W 40th St, Floor 20, New York, NY 10018",
  "https://www.kalepa.com": "920 Broadway, New York, NY 10010",
  "https://www.hyperscience.com": "285 Fulton Street, 88th Floor (One World Trade Center), New York, NY 10007",
};

const companyFundingByName: Record<string, CompanyFunding> = {
  "Hebbia": {
    funding_round: "Series B",
    funding_amount: "$130M",
    funding_date: "July 2024",
    total_raised: "$161M",
    lead_investor: "Andreessen Horowitz",
    funding_note: "",
  },
  "Bayesline": {
    funding_round: "Seed",
    funding_amount: "$500K",
    funding_date: "2024",
    total_raised: "~$2.5M",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "Brightwave": {
    funding_round: "Series A",
    funding_amount: "$15M",
    funding_date: "October 2024",
    total_raised: "$21M",
    lead_investor: "Decibel Partners",
    funding_note: "HEADQUARTERED IN BOULDER, CO - not NYC. Review before including.",
  },
  "Maybern": {
    funding_round: "Series B",
    funding_amount: "$50M",
    funding_date: "November 2025",
    total_raised: "$76M",
    lead_investor: "Battery Ventures",
    funding_note: "",
  },
  "Tabs": {
    funding_round: "Series B",
    funding_amount: "$55M",
    funding_date: "September 2025",
    total_raised: "$91M",
    lead_investor: "Lightspeed Venture Partners",
    funding_note: "",
  },
  "Trata": {
    funding_round: "Seed (YC W25)",
    funding_amount: "Undisclosed",
    funding_date: "2025",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "Standard Signal": {
    funding_round: "Seed (YC-backed)",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "Norm Ai": {
    funding_round: "Series A (+ Blackstone Growth)",
    funding_amount: "$50M (Blackstone growth, Nov 2025) + $48M Series A (Mar 2025) + $27M Series A (2024)",
    funding_date: "November 2025",
    total_raised: "$140M+",
    lead_investor: "Blackstone (growth); Coatue (Series A)",
    funding_note: "",
  },
  "Manifest OS": {
    funding_round: "Series A",
    funding_amount: "$60M",
    funding_date: "April 2026",
    total_raised: "$60M",
    lead_investor: "Menlo Ventures / Kleiner Perkins",
    funding_note: "",
  },
  "Soxton": {
    funding_round: "Pre-seed",
    funding_amount: "$2.5M",
    funding_date: "December 2025",
    total_raised: "$2.5M",
    lead_investor: "Undisclosed",
    funding_note: "",
  },
  "Bretton AI": {
    funding_round: "Series B",
    funding_amount: "$75M",
    funding_date: "February 2026",
    total_raised: "$95M",
    lead_investor: "Sapphire Ventures",
    funding_note: "HEADQUARTERED IN SAN FRANCISCO - not NYC. Review before including.",
  },
  "Alkymi": {
    funding_round: "Series A",
    funding_amount: "$21M",
    funding_date: "October 2022",
    total_raised: "$35M+",
    lead_investor: "Intel Capital",
    funding_note: "",
  },
  "ZeroDrift": {
    funding_round: "Pre-seed",
    funding_amount: "$2M",
    funding_date: "Early 2026",
    total_raised: "$2M",
    lead_investor: "Andreessen Horowitz",
    funding_note: "",
  },
  "Artemis": {
    funding_round: "Series A",
    funding_amount: "$70M",
    funding_date: "April 2026",
    total_raised: "$70M",
    lead_investor: "Felicis",
    funding_note: "Combined seed and Series A financing with participation from First Round Capital, Theory VC, and Lockstep.",
  },
  "Astelia": {
    funding_round: "Series A",
    funding_amount: "$35M",
    funding_date: "February 2026",
    total_raised: "$35M",
    lead_investor: "Index Ventures / Team8",
    funding_note: "Combined seed and Series A financing with participation from Holly Ventures.",
  },
  "GhostEye": {
    funding_round: "Pre-seed (YC-backed)",
    funding_amount: "Undisclosed",
    funding_date: "2026",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "Mirage (formerly Captions)": {
    funding_round: "Series B",
    funding_amount: "$60M",
    funding_date: "2023",
    total_raised: "$90M+",
    lead_investor: "Sequoia / Andreessen Horowitz / Kleiner Perkins",
    funding_note: "",
  },
  "Agentio": {
    funding_round: "Series B",
    funding_amount: "$40M",
    funding_date: "November 2025",
    total_raised: "$56M",
    lead_investor: "Forerunner Ventures",
    funding_note: "",
  },
  "Aaru": {
    funding_round: "Series A",
    funding_amount: "$50M+ (multi-tier, $1B headline valuation)",
    funding_date: "December 2025",
    total_raised: "~$60M+",
    lead_investor: "Redpoint Ventures",
    funding_note: "",
  },
  "Icon": {
    funding_round: "Angel / Seed",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Founders Fund (strategic angel)",
    funding_note: "",
  },
  "Tildei": {
    funding_round: "Seed",
    funding_amount: "Undisclosed",
    funding_date: "Undisclosed",
    total_raised: "Undisclosed",
    lead_investor: "Undisclosed",
    funding_note: "Limited public funding data - verify independently",
  },
  "Stewdio": {
    funding_round: "Seed (YC-backed)",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "Absurd": {
    funding_round: "Seed (YC-backed)",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "Anterior": {
    funding_round: "Series B",
    funding_amount: "$40M",
    funding_date: "February 2026",
    total_raised: "$64M",
    lead_investor: "NEA / Sequoia Capital",
    funding_note: "",
  },
  "Valerie Health": {
    funding_round: "Series A",
    funding_amount: "$30M",
    funding_date: "December 2025",
    total_raised: "$39M",
    lead_investor: "Redpoint Ventures",
    funding_note: "HEADQUARTERED IN LAFAYETTE, CA - verify NYC presence before including",
  },
  "Clarion": {
    funding_round: "Seed",
    funding_amount: "$5.4M",
    funding_date: "2024",
    total_raised: "$5.4M",
    lead_investor: "Accel / Y Combinator",
    funding_note: "",
  },
  "Sohar Health": {
    funding_round: "Seed",
    funding_amount: "$3.8M",
    funding_date: "March 2025",
    total_raised: "$4.3M",
    lead_investor: "Kindred Capital",
    funding_note: "",
  },
  "Camber": {
    funding_round: "Series B",
    funding_amount: "$30M",
    funding_date: "2025",
    total_raised: "$45M+",
    lead_investor: "Andreessen Horowitz",
    funding_note: "",
  },
  "Granted": {
    funding_round: "Seed",
    funding_amount: "Undisclosed",
    funding_date: "Undisclosed",
    total_raised: "Undisclosed",
    lead_investor: "Undisclosed",
    funding_note: "Limited public funding data - verify independently",
  },
  "Proxima Bio": {
    funding_round: "Seed",
    funding_amount: "$80M",
    funding_date: "January 2026",
    total_raised: "$80M",
    lead_investor: "DCVC",
    funding_note: "Participation from NVentures, Roivant, Braidwell, and AIX Ventures.",
  },
  "Output Biosciences": {
    funding_round: "Seed (YC S21)",
    funding_amount: "Undisclosed",
    funding_date: "Undisclosed",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "Company is currently operating in stealth.",
  },
  "Serinus Biosciences": {
    funding_round: "Seed",
    funding_amount: "",
    funding_date: "",
    total_raised: "",
    lead_investor: "",
    funding_note: "",
  },
  "Series": {
    funding_round: "Pre-seed",
    funding_amount: "$5.1M",
    funding_date: "April 2026",
    total_raised: "$5.1M",
    lead_investor: "Pear VC",
    funding_note: "",
  },
  "222": {
    funding_round: "Series A",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "$13.7M",
    lead_investor: "Y Combinator + undisclosed institutional",
    funding_note: "",
  },
  "Cerca": {
    funding_round: "Seed",
    funding_amount: "$1.6M",
    funding_date: "2024",
    total_raised: "$1.6M",
    lead_investor: "Undisclosed seed investors",
    funding_note: "",
  },
  "Remesh": {
    funding_round: "Series B",
    funding_amount: "Undisclosed",
    funding_date: "2021",
    total_raised: "$26M+",
    lead_investor: "Two Sigma Ventures",
    funding_note: "",
  },
  "Loyalist": {
    funding_round: "Seed",
    funding_amount: "Undisclosed",
    funding_date: "2023-2024",
    total_raised: "Undisclosed",
    lead_investor: "Lerer Hippeau / Bling Capital",
    funding_note: "",
  },
  "Nori": {
    funding_round: "Seed (YC-backed)",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "Emergence AI": {
    funding_round: "Series A",
    funding_amount: "$97.2M",
    funding_date: "June 2024",
    total_raised: "$97.2M",
    lead_investor: "Learn Capital",
    funding_note: "",
  },
  "Channel3": {
    funding_round: "Seed (YC-backed)",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "Amika": {
    funding_round: "Seed (YC-backed)",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "Kay.ai": {
    funding_round: "Seed / Series A",
    funding_amount: "Undisclosed",
    funding_date: "2023-2024",
    total_raised: "Undisclosed",
    lead_investor: "Wing VC",
    funding_note: "",
  },
  "Empromptu": {
    funding_round: "Pre-seed",
    funding_amount: "$2M",
    funding_date: "Late 2025",
    total_raised: "$2M",
    lead_investor: "Undisclosed",
    funding_note: "",
  },
  "Vortexify AI": {
    funding_round: "Seed (YC-backed)",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "Kalepa": {
    funding_round: "Series A",
    funding_amount: "Undisclosed",
    funding_date: "2022-2023",
    total_raised: "$14M+",
    lead_investor: "Undisclosed",
    funding_note: "Limited public funding data - verify independently",
  },
  "Slang.ai": {
    funding_round: "Series A",
    funding_amount: "$20M",
    funding_date: "2023",
    total_raised: "$26M+",
    lead_investor: "Wing VC",
    funding_note: "",
  },
  "Concourse": {
    funding_round: "Seed (YC-backed)",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "RowFlow": {
    funding_round: "Seed (YC-backed)",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
  "Tofu": {
    funding_round: "Series A",
    funding_amount: "$12M",
    funding_date: "2023",
    total_raised: "$19M",
    lead_investor: "Index Ventures",
    funding_note: "",
  },
  "Carbon Arc": {
    funding_round: "Series A",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Undisclosed",
    funding_note: "Limited public funding data - verify independently",
  },
  "Wallaroo": {
    funding_round: "Series B",
    funding_amount: "$25M",
    funding_date: "2022",
    total_raised: "$40M+",
    lead_investor: "Andreessen Horowitz",
    funding_note: "",
  },
  "Canoe Intelligence": {
    funding_round: "Series C",
    funding_amount: "$36M",
    funding_date: "July 2024",
    total_raised: "$72.8M",
    lead_investor: "Goldman Sachs Asset Management",
    funding_note: "SERIES C - EXCEEDS YOUR SERIES B CAP. Consider removing from the directory.",
  },
  "Hyperscience": {
    funding_round: "Series E",
    funding_amount: "$100M (Series E)",
    funding_date: "December 2021",
    total_raised: "$299M",
    lead_investor: "Tiger Global Management",
    funding_note: "SERIES E - FAR EXCEEDS YOUR SERIES B CAP. Consider removing from the directory.",
  },
  "Datagrid": {
    funding_round: "Seed",
    funding_amount: "Undisclosed",
    funding_date: "Undisclosed",
    total_raised: "Undisclosed",
    lead_investor: "Undisclosed",
    funding_note: "Limited public funding data - verify independently",
  },
  "Aspect": {
    funding_round: "Seed (YC-backed)",
    funding_amount: "Undisclosed",
    funding_date: "2024-2025",
    total_raised: "Undisclosed",
    lead_investor: "Y Combinator",
    funding_note: "",
  },
};

const aiUsageProfiles: Record<Category, string> = {
  "Fintech & Trading AI": "Model-heavy workflows for research synthesis, document analysis, financial analytics, extraction, and agent-assisted decisions across high-value finance work.",
  "Legal & Compliance AI": "LLM and agent workflows for policy interpretation, structured review, KYC/AML analysis, legal drafting, document extraction, and auditable compliance decisions.",
  "Cybersecurity AI": "Agentic analysis across security telemetry, exposure graphs, identity systems, human-layer risk, and response workflows.",
  "Media, Ads & Creative AI": "Generative and analytical AI for creative ideation, ad production, synthetic media, audience simulation, brand activation, and campaign optimization.",
  "Health & Clinical AI": "AI used for clinical administration, patient communication, payer workflows, claims processing, eligibility checks, and safe summarization around care operations.",
  "Life Sciences AI": "AI used for biological modeling, drug discovery, protein interaction mapping, lab data reasoning, and biotech infrastructure workflows.",
  "AI-Native Consumer & Social": "AI used for personalization, matching, recommendations, conversation, memory, social graph reasoning, and coordination across consumer workflows.",
  "Agent Infrastructure": "Infrastructure for long-running agents, workflow orchestration, browser automation, evaluation, permissions, and operational control planes.",
  "Model Tools & Dev Platform": "Developer and product workflows for building, evaluating, deploying, and operating LLM applications in production.",
  "Enterprise GTM & RevOps AI": "AI agents and workflow automation for sales, support, revenue operations, insurance workflows, customer qualification, and campaign execution.",
  "Data & Memory Layer": "Retrieval, structured extraction, knowledge graphs, document intelligence, multimodal understanding, and data infrastructure that make AI systems more context-aware."
};

const openAiFits: Record<Category, string> = {
  "Fintech & Trading AI": "Strong fit for reasoning models, embeddings, structured outputs, retrieval, document understanding, and agentic analysis across financial workflows.",
  "Legal & Compliance AI": "Strong fit for retrieval, citations, structured extraction, policy reasoning, human-in-the-loop review, and workflow agents with clear audit trails.",
  "Cybersecurity AI": "Strong fit for tool-calling agents, retrieval over telemetry, structured triage, adversarial reasoning, and response workflows.",
  "Media, Ads & Creative AI": "Strong fit for multimodal generation, campaign copy, image and video ideation, brand memory, structured creative variants, and agentic production workflows.",
  "Health & Clinical AI": "Good fit for careful summarization, structured extraction, voice workflows, patient communication, administrative automation, and safety-aware reasoning.",
  "Life Sciences AI": "Strong fit for multimodal reasoning, biological data retrieval, molecule and protein analysis, structured extraction, and research copilots.",
  "AI-Native Consumer & Social": "Good fit for personalization, conversational UX, recommendation loops, memory, multimodal understanding, and safe action-taking in consumer contexts.",
  "Agent Infrastructure": "Strong platform fit for tool-calling, evals, computer-use workflows, structured outputs, agent orchestration, and developer-facing reliability layers.",
  "Model Tools & Dev Platform": "Strong fit for evals, structured outputs, prompt/version management, model routing, observability, and production LLM app workflows.",
  "Enterprise GTM & RevOps AI": "Strong fit for sales and support agents, workflow automation, structured CRM outputs, call summarization, account research, and revenue operations copilots.",
  "Data & Memory Layer": "Strong fit for embeddings, retrieval, extraction, document intelligence, multimodal parsing, and persistent context layers for AI applications."
};

const featuredNames = new Set([
  "Hebbia",
  "Norm Ai",
  "Mirage (formerly Captions)",
  "Agentio",
  "Anterior",
  "Series",
  "Emergence AI",
  "Kalepa",
  "Canoe Intelligence"
]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanCopy(value: string) {
  return value
    .replace(/\bAI-powered AI\b/gi, "AI")
    .replace(/\bAI-driven AI\b/gi, "AI")
    .replace(/\binterface-users\b/gi, "interface; users")
    .replace(/\bbusinesses-handling\b/gi, "businesses, handling")
    .replace(/\bclinics-scheduling\b/gi, "clinics, scheduling")
    .replace(/\bworkflows-navigating\b/gi, "workflows for navigating")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(description: string) {
  const cleanDescription = cleanCopy(description);
  const match = cleanDescription.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : cleanDescription;
}

function getShortDescription(description: string) {
  return firstSentence(description);
}

function inferStage(record: SourceRecord) {
  const text = `${record.description} ${record.signal_label}`;

  if (/Series\s+B/i.test(text)) return "Series B";
  if (/Series\s+A/i.test(text)) return "Series A";
  if (/pre[-\s]?seed/i.test(text)) return "Pre-Seed";
  if (/\bseed\b/i.test(text)) return "Seed";
  if (/YC[-\s]?backed|Y Combinator/i.test(text)) return "Seed";
  if (/total funding|valuation|Forbes|50M\+|\$80B|\$30 trillion/i.test(text)) {
    return "Growth";
  }

  return "Early Stage";
}

function getRecentActivity(record: SourceRecord) {
  const description = cleanCopy(record.description);
  const raised = description.match(
    /raised\s+(?:an?\s+)?(\$[0-9]+(?:\.[0-9]+)?\s?(?:[KMB]|thousand|million|billion)?)/i,
  );
  if (raised) return `Raised ${raised[1].replace(/\s+/g, "")}`;

  const backed = description.match(/Backed by\s+([^.;]+)/i);
  if (backed) return `Backed by ${backed[1].trim()}`;

  const customers = description.match(/Customers include\s+([^.;]+)/i);
  if (customers) return `Customers include ${customers[1].trim()}`;

  const serves = description.match(/serves\s+([^.;]+)/i);
  if (serves) return `Serves ${serves[1].trim()}`;

  if (/YC[-\s]?backed/i.test(description)) return "YC-backed NYC company";

  const founder = description.match(/Founded by\s+([^.;]+)/i);
  if (founder) return `Founded by ${founder[1].trim()}`;

  return "Added to NYC AI tracker";
}

function getRecentActivityDate(index: number) {
  const date = new Date(Date.UTC(2026, 3, 28, 18, 0, 0));
  date.setUTCDate(date.getUTCDate() - (index % 24));
  return date.toISOString();
}

function getCreatedAt(index: number) {
  const date = new Date(Date.UTC(2025, 10, 5, 14, 0, 0));
  date.setUTCDate(date.getUTCDate() + index * 2);
  return date.toISOString();
}

const verifiedFoundersByName: Record<string, Founder[]> = {
  "Proxima Bio": [
    { name: "Zachary Carpenter", title: "Co-founder & CEO" },
    { name: "Luca Naef", title: "Co-founder & CTO" },
  ],
  "Output Biosciences": [
    { name: "Adi Mashiach, MD", title: "Co-founder" },
    { name: "Mirella Mashiach", title: "Co-founder" },
  ],
  "Serinus Biosciences": [
    { name: "Maxwell Sherman", title: "Co-founder" },
    { name: "Adam Yaari", title: "Co-founder" },
  ],
  "Artemis": [
    { name: "Shachar Hirshberg", title: "Co-founder & CEO" },
    { name: "Dan Shiebler", title: "Co-founder & CTO" },
  ],
  "Astelia": [
    { name: "Alon Noy", title: "Co-founder & CEO" },
    { name: "Nadav Ostrovsky", title: "Co-founder & CTO" },
    { name: "Roy Rajwan", title: "Co-founder & CPO" },
  ],
  "GhostEye": [
    { name: "Mohammad Eshan", title: "Founder & CEO" },
    { name: "Charles Antoine Malenfant", title: "Co-founder & CTO" },
  ],
};

function getFounders(record: SourceRecord): Founder[] {
  const verified = verifiedFoundersByName[record.company_name];
  if (verified) return verified;

  return record.founder_name
    .split(/;|\band\b/)
    .map((name) => name.trim())
    .filter((name) => {
      const lowered = name.toLowerCase();
      return (
        name.length > 0 &&
        !lowered.includes("team") &&
        !lowered.includes("founders")
      );
    })
    .slice(0, 4)
    .map((name) => ({ name, title: "Co-founder" }));
}

export const companies: Company[] = sourceCompanies.map((record, index) => {
  const activityDate = getRecentActivityDate(index);
  const funding = companyFundingByName[record.company_name] ?? {
    funding_round: "",
    funding_amount: "",
    funding_date: "",
    total_raised: "",
    lead_investor: "",
    funding_note: "",
  };
  const id = `cmp_${String(index + 1).padStart(3, "0")}`;
  const baseConsumption = inferConsumptionProfile({
    name: record.company_name,
    category: record.category,
    stage: inferStage(record),
    short_description: getShortDescription(record.description),
    one_line_thesis: firstSentence(record.description),
    why_it_matters: cleanCopy(record.description),
    ai_usage_profile: aiUsageProfiles[record.category],
  });

  const company = {
    id,
    name: record.company_name,
    slug: slugify(record.company_name),
    logo_url: `/logos/${slugify(record.company_name)}.svg`,
    website_url: record.website,
    x_handle: "",
    x_user_id: "",
    founder_name: record.founder_name,
    office_address: companyAddressesByWebsite[record.website] ?? "",
    funding_round: funding.funding_round,
    funding_amount: funding.funding_amount,
    funding_date: funding.funding_date,
    total_raised: funding.total_raised,
    lead_investor: funding.lead_investor,
    funding_note: funding.funding_note,
    category: record.category,
    stage: inferStage(record),
    short_description: getShortDescription(record.description),
    one_line_thesis: firstSentence(record.description),
    why_it_matters: cleanCopy(record.description),
    ai_usage_profile: aiUsageProfiles[record.category],
    openai_fit: openAiFits[record.category],
    founders: getFounders(record),
    ...baseConsumption,
    recent_activity_text: getRecentActivity(record),
    recent_activity_date: activityDate,
    is_featured: featuredNames.has(record.company_name),
    is_breakout: featuredNames.has(record.company_name),
    status: "published",
    created_at: getCreatedAt(index),
    updated_at: activityDate,
    discoveryReason: {
      trigger: "profile_import",
      sourceEventIds: [],
      sourceUrls: [record.website].filter(Boolean),
      confidence: "medium",
      notes: "Imported from the static AI Atlas seed dataset.",
    },
  } satisfies CompanyWithoutGenerated;
  const generated = generateCompanyHook(company);

  return {
    ...company,
    generated,
    inclusionReason: generateInclusionReason({
      company: {
        ...company,
        generated,
      },
    }),
  };
});

export const submissions: Submission[] = sourceCompanies.slice(0, 6).map((record, index) => ({
  id: `sub_${String(index + 1).padStart(3, "0")}`,
  company_name: record.company_name,
  website_url: record.website,
  founder_name: record.founder_name,
  email: record.email,
  description: cleanCopy(record.description),
  status: index < 2 ? "accepted" : index === 2 ? "rejected" : "new",
  created_at: getRecentActivityDate(index + 3),
}));

export const publishedCompanies = companies.filter(
  (company) => company.status === "published",
);

export const marketMapCompanies = companies;

export const featuredCompanies = marketMapCompanies.filter(
  (company) => company.is_featured,
);

export const breakoutCompanies = marketMapCompanies.filter(
  (company) => company.is_breakout,
);

export function getCategoryBySlug(slug: string) {
  return categoryMeta.find((category) => category.slug === slug);
}

export function getCategorySlug(category: Category) {
  return (
    categoryMeta.find((item) => item.name === category)?.slug ??
    category.toLowerCase().replaceAll(" ", "-").replaceAll("/", "")
  );
}

export function getCompaniesByCategory(category: Category) {
  return marketMapCompanies.filter((company) => company.category === category);
}

export function getCompanyBySlug(slug: string) {
  return marketMapCompanies.find((company) => company.slug === slug);
}

export function getAllStages(data: Company[] = marketMapCompanies) {
  return Array.from(new Set(data.map((company) => company.stage))).sort();
}

export function getCategoryCounts(data: Company[] = marketMapCompanies) {
  const emptyCounts = Object.fromEntries(
    categories.map((category) => [category, 0]),
  ) as Record<Category, number>;

  return data.reduce<Record<Category, number>>((counts, company) => {
    counts[company.category] += 1;
    return counts;
  }, emptyCounts);
}
