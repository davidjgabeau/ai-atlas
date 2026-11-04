# AI Atlas NYC

**An open-source editorial market map for AI companies in New York City.**

AI Atlas NYC combines a curated company directory, category intelligence, market patterns, news links, company posts, jobs, and profile surfaces into a single product built for founders, investors, operators, and anyone tracking where NYC AI is forming.

Built and maintained by [David Gabeau](https://github.com/davidjgabeau) as sole developer.

- Production: [aiatlas.nyc](https://aiatlas.nyc)
- Repository: [github.com/davidjgabeau/ai-atlas](https://github.com/davidjgabeau/ai-atlas)
- License: [MIT](./LICENSE)

---

## Why It Exists

New York has a dense early-stage AI market, but the useful context is scattered across product launches, investor conversations, founder posts, hiring signals, and category-specific momentum. AI Atlas NYC turns that scattered surface area into a readable, structured map.

The project is intentionally editorial and data-driven:

- It covers NYC AI companies at all stages, with headquarters and office presence distinguished
- It favors verified company facts over broad claims
- It keeps category boundaries visible so readers can understand how the market is clustering
- It presents short, decision-useful notes instead of generic startup-directory copy
- It treats the homepage as a front page, not a dashboard

The goal is not to rank companies or predict winners. The goal is to make the market easier to scan, revisit, and understand.

---

## Product Surfaces

### Company Directory
The `/companies` surface is the primary startup directory. It supports browsing, search, company profile links, category metadata, view counts, saved-state UI, and editorial hooks that explain each company's product wedge.

### Company Profiles
Each company page presents the available public record in an editorial profile format: name, logo, hook, category, stage, location, founders, website, description, related patterns, and contextual surfaces when data exists. Missing optional data is hidden rather than filled with unsupported claims.

### Categories
The `/categories` surface groups companies by the AI Atlas taxonomy. Category pages help readers understand which startups define each cluster and how the market is distributed across healthcare, infrastructure, finance, consumer, legal, cybersecurity, life sciences, and more.

### Patterns
The `/patterns` surface contains editorial market patterns drawn from the company corpus, answering questions like "what behavior is repeating across different startups?" and "which clusters are pointing at the same buyer, workflow, or platform shift?"

### Newsfeed
The `/feed` and `/newsfeed` surfaces bring together external news links and official company posts from mapped companies. Designed as a curated news front page for NYC AI, with source labels, timestamps, company attribution, and external-link affordances.

### Ask Atlas
The `/ask` surface lets readers ask questions over the curated AI Atlas company, category, pattern, and signal data. External sites can embed the map and Ask Atlas modal via the public embed API at `/api/embed/atlas`. See [docs/embed-api.md](./docs/embed-api.md).

### Jobs and Highlights
Jobs show where mapped companies are hiring and what functions they are investing in. Highlights provide a saved or featured view of companies worth revisiting.

### Homepage
The editorial front page combines the hero, category snapshot, representative company rows, patterns, current read, recent additions, and news into a premium consumer-facing entry point.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) App Router |
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Components | Radix UI, shadcn-compatible primitives, lucide-react |
| Data | Local structured data + [Supabase](https://supabase.com)-backed live data |
| Maps | Google Maps JavaScript API |
| AI | [Anthropic API](https://docs.anthropic.com) (Claude) for Ask Atlas and editorial generation |
| Deployment | [Vercel](https://vercel.com) |

---

## Local Development

### Prerequisites

- Node.js 24 LTS
- npm
- A Supabase project for live database-backed behavior
- A Google Maps API key for map rendering

### Install

```bash
git clone https://github.com/davidjgabeau/ai-atlas.git
cd ai-atlas
npm install
```

### Configure Environment Variables

```bash
cp .env.example .env.local
```

**Public browser variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=
```

**Server-only variables:**
```bash
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_AGENT_WRITE_SECRET=
CRON_SECRET=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

**Model configuration:**
```bash
ANTHROPIC_ASK_MODEL=
ANTHROPIC_EDITORIAL_MODEL=
ANTHROPIC_SOCIAL_MODEL=
ANTHROPIC_COMPANY_BRIEF_MODEL=
ANTHROPIC_DISCOVERY_MODEL=
```

**News and social integrations:**
```bash
NEWS_FEED_URLS=
X_CLIENT_ID=
X_CLIENT_SECRET=
X_ACCESS_TOKEN=
X_REFRESH_TOKEN=
X_BEARER_TOKEN=
SOCIAL_AUTO_POST=
```

**Admin and feature controls:**
```bash
AI_ATLAS_ADMIN_EMAILS=
AI_ATLAS_EMBED_ORIGINS=    # Comma-separated origins for the Ask Atlas embed endpoint
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Useful Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint
npm run data:validate # Validate company and category data
npm run seo:audit     # SEO audit
npm run check         # Regression tests, TypeScript, lint/data checks, production build
npm run smoke:site -- https://aiatlas.nyc  # Read-only route/search checks; invalid form payload only
```

Additional scripts handle data refreshes, logo updates, jobs, news, profile briefs, social content, and editorial surface generation. Review `package.json` before running scripts that call external services or write production data.

---

## Project Structure

```
src/
  app/                  Next.js routes, pages, layouts, and API handlers
  components/           Shared UI and product components
  data/                 Local company, category, pattern, and editorial data
  lib/                  Data access, formatting, validation, integrations, utilities
  types/                Shared TypeScript types
scripts/                Data, editorial, validation, social, jobs, and news utilities
docs/                   Deployment notes and system documentation
public/                 Static assets and sprites
```

---

## Data and Editorial Standards

AI Atlas NYC is only useful if the data stays credible. All contributions should follow these rules:

- Do not fabricate company, founder, funding, customer, hiring, or traction facts
- If public verification is unavailable, leave the field empty or mark it for human review
- Keep descriptions specific, restrained, and useful to a reader scanning the market
- Avoid generic AI hype and unsupported claims
- Preserve the existing category taxonomy unless a change is clearly intentional
- Do not expose secrets, private tokens, or service keys in code, docs, or pull requests

**Good company hooks** are short, plain-English product descriptions:
- "Testing infrastructure for autonomous agents"
- "Personal memory workflows for everyday users"
- "Automating clinical admin work for health plans"

**Weak hooks** sound like generic marketing:
- "AI-powered platform for businesses"
- "Revolutionizing healthcare with AI"

---

## Validation Before Shipping

Run core checks before pushing production-facing changes:

```bash
npm run lint
npm run build
npm run data:validate
```

For UI work, test affected pages in desktop and mobile viewports. The product is designed to feel editorial and consumer-grade.

Freshness rules, safe ingestion, source corrections, and maintenance checks are
documented in [docs/maintenance.md](./docs/maintenance.md).

---

## Deployment

The production site is deployed on Vercel at [aiatlas.nyc](https://aiatlas.nyc).

1. Commit changes with a clear message
2. Push to `main` on GitHub
3. Vercel builds and deploys automatically
4. Verify production URL and key routes after deployment

---

## Contributing

AI Atlas NYC is open source and welcomes thoughtful contributions:

- Fixing broken links, stale metadata, or malformed URLs
- Improving data validation scripts
- Tightening copy without adding unsupported claims
- Improving accessibility, responsiveness, and interaction quality
- Adding tests that make the map harder to break

Before submitting, run lint + build + data:validate and include a brief note on the source behind any company data changes.

---

## License

[MIT](./LICENSE)

---

## Author

AI Atlas NYC is designed, built, and maintained by **[David Gabeau](https://github.com/davidjgabeau)** as a solo project.
