import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Terminal } from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { PixelSiteIcon } from "@/components/site/pixel-site-icon";
import { PublicShell } from "@/components/site/public-shell";
import { Button } from "@/components/ui/button";
import {
  absoluteUrl,
  createShareMetadata,
  getShareImageUrl,
} from "@/lib/seo/shareMetadata";

export const metadata: Metadata = createShareMetadata({
  title: "AI Atlas NYC MCP Server",
  description:
    "Use AI Atlas NYC as a read-only MCP server for structured public data about early-stage NYC AI companies, categories, patterns, and public jobs.",
  path: "/mcp",
  image: getShareImageUrl({ page: "mcp" }),
});

const tools = [
  {
    name: "search_companies",
    body: "Search published companies by query, category, stage, hook, description, slug, or founder.",
  },
  {
    name: "get_company",
    body: "Return one public company profile by slug, including Atlas URL, website, category, stage, founders, funding fields when public, and related patterns.",
  },
  {
    name: "list_categories",
    body: "List category metadata, thesis notes, company counts, and optional representative companies.",
  },
  {
    name: "get_category",
    body: "Return one category with its public published companies.",
  },
  {
    name: "list_patterns",
    body: "List editorial market patterns with framing and related companies.",
  },
  {
    name: "get_pattern",
    body: "Return one pattern with related public companies and one-liners.",
  },
  {
    name: "search_jobs",
    body: "Search public open jobs when available, returning role metadata and source URLs only.",
  },
];

const excludedData = [
  "Admin company management data",
  "Auth profiles, sessions, or private user data",
  "Submissions or submitter contact details",
  "Raw source records, job payloads, agent runs, and automation logs",
  "Supabase keys, service-role keys, cron secrets, or agent write secrets",
  "Ask Atlas LLM calls or private prompt context",
];

const examplePrompts = [
  "Find NYC AI companies building for finance teams.",
  "Compare companies in Agent Infrastructure and Model Tools.",
  "Show the patterns involving Hebbia.",
  "Which AI Atlas categories have the clearest enterprise buyer pull?",
];

const claudeConfig = `{
  "mcpServers": {
    "ai-atlas-nyc": {
      "command": "npm",
      "args": [
        "--prefix",
        "/path/to/ai-atlas-nyc",
        "run",
        "--silent",
        "mcp:server"
      ]
    }
  }
}`;

const codexConfig = `[mcp_servers.ai-atlas-nyc]
command = "npm"
args = [
  "--prefix",
  "/path/to/ai-atlas-nyc",
  "run",
  "--silent",
  "mcp:server"
]`;

export default function McpPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "AI Atlas NYC MCP Server",
          description:
            "Read-only MCP access to public AI Atlas NYC market-map data for AI assistants.",
          url: absoluteUrl("/mcp"),
          mainEntity: {
            "@type": "SoftwareApplication",
            name: "AI Atlas NYC MCP Server",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Node.js",
            url: absoluteUrl("/mcp"),
            isAccessibleForFree: true,
          },
        }}
      />
      <PublicShell>
        <section className="border-b border-[#E7E1D8] bg-section">
          <div className="editorial-container !max-w-[1180px] py-10 md:py-14 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.45fr)] lg:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-md border border-[#E7E1D8] bg-[#FBFAF7] text-[#9A3D2B]">
                    <PixelSiteIcon name="grid" size="xs" />
                  </span>
                  <p className="editorial-label">MCP Server</p>
                </div>
                <h1 className="mt-5 max-w-[820px] font-heading text-[clamp(46px,7vw,78px)] font-medium leading-[0.94] tracking-[0] text-[#111111]">
                  Use AI Atlas NYC inside your AI assistant.
                </h1>
                <p className="mt-5 max-w-[700px] text-[17px] leading-[1.6] text-[#5F5A52] md:text-[19px]">
                  Query the public market map as structured data from Claude,
                  Codex, and other MCP-compatible tools. The server is
                  read-only, local-first, and scoped to published AI Atlas data.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="app-primary-button">
                    <a href="#run-local">
                      <Terminal className="size-4" />
                      Run locally
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href="#tools">
                      View tools
                      <ArrowRight className="size-4" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-[#E7E1D8] rounded-[14px] border border-[#E7E1D8] bg-[rgb(251_250_247_/_0.65)]">
                <McpStat label="Mode" value="Read-only" />
                <McpStat label="Scope" value="Public" />
                <McpStat label="Tools" value="7" />
              </div>
            </div>
          </div>
        </section>

        <section id="tools" className="bg-section">
          <div className="editorial-container !max-w-[1180px] py-10 md:py-12">
            <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div>
                <p className="editorial-label">Tools</p>
                <h2 className="mt-3 editorial-section-title">
                  Structured access to the map.
                </h2>
                <p className="mt-4 text-sm leading-6 text-[#5F5A52]">
                  All tools return concise JSON and canonical AI Atlas URLs.
                  Limits are capped at 25 results.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {tools.map((tool) => (
                  <article
                    key={tool.name}
                    className="rounded-md bg-[var(--app-surface)] p-5 app-card-border"
                  >
                    <code className="font-mono text-sm font-semibold text-[#111111]">
                      {tool.name}
                    </code>
                    <p className="mt-3 text-sm leading-6 text-[#5F5A52]">
                      {tool.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E7E1D8] bg-[var(--app-surface)]">
          <div className="editorial-container !max-w-[1180px] py-10 md:py-12">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-md bg-[#FBFAF7] p-6 app-card-border">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-[#3F6F55]" />
                  <h2 className="text-lg font-semibold tracking-[0] text-[#111111]">
                    What it exposes
                  </h2>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#5F5A52]">
                  Published company profiles, category metadata, editorial
                  patterns, public profile URLs, website URLs, public funding
                  fields when present, and public open jobs when available.
                </p>
              </div>
              <div className="rounded-md bg-[#FBFAF7] p-6 app-card-border">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-[#9A3D2B]" />
                  <h2 className="text-lg font-semibold tracking-[0] text-[#111111]">
                    What stays private
                  </h2>
                </div>
                <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#5F5A52]">
                  {excludedData.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[#9A3D2B]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="run-local" className="bg-section">
          <div className="editorial-container !max-w-[1180px] py-10 md:py-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
              <div>
                <p className="editorial-label">Run locally</p>
                <h2 className="mt-3 editorial-section-title">
                  Connect Claude, Codex, or another MCP client.
                </h2>
                <p className="mt-4 text-sm leading-6 text-[#5F5A52]">
                  The server uses stdio transport and needs no new secrets. In
                  MCP client configs, use silent npm mode so stdout remains
                  valid JSON-RPC.
                </p>
                <pre className="mt-5 overflow-x-auto rounded-md border border-[#E7E1D8] bg-[#111111] p-4 text-sm leading-6 text-[#F8F6F1]">
                  <code>{`npm run mcp:server`}</code>
                </pre>
              </div>

              <div className="grid gap-4">
                <ConfigBlock title="Claude Desktop" value={claudeConfig} />
                <ConfigBlock title="Codex" value={codexConfig} />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[#E7E1D8] bg-[var(--app-surface)]">
          <div className="editorial-container !max-w-[1180px] py-10 md:py-12">
            <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div>
                <p className="editorial-label">Try asking</p>
                <h2 className="mt-3 editorial-section-title">
                  Prompts that work well.
                </h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {examplePrompts.map((prompt) => (
                  <div
                    key={prompt}
                    className="rounded-md bg-[#FBFAF7] p-5 text-sm leading-6 text-[#181818] app-card-border"
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 border-t border-[#E7E1D8] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-[#5F5A52]">
                Prefer a browser surface? Ask Atlas answers natural-language
                questions over the same public map.
              </p>
              <Button asChild variant="outline">
                <Link href="/ask">
                  Open Ask Atlas
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </PublicShell>
    </>
  );
}

function McpStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 md:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#9A3D2B]">
        {label}
      </p>
      <p className="mt-2 break-words font-heading text-[28px] font-medium leading-none text-[#111111] md:text-[34px]">
        {value}
      </p>
    </div>
  );
}

function ConfigBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--app-surface)] p-4 app-card-border">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
        {title}
      </p>
      <pre className="mt-3 max-h-[280px] overflow-auto rounded-md border border-[#E7E1D8] bg-[#111111] p-4 text-xs leading-5 text-[#F8F6F1]">
        <code>{value}</code>
      </pre>
    </div>
  );
}
