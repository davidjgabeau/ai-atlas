# AI Atlas NYC

AI Atlas NYC is an open-source editorial market map for early-stage AI companies in New York City. It combines a curated company directory, category intelligence, market patterns, news links, company posts, jobs, and profile surfaces into a single product built for founders, investors, operators, and people tracking where NYC AI is forming.

Created by [David Gabeau](https://github.com/davidjgabeau).

- Production: [aiatlas.nyc](https://aiatlas.nyc)
- Repository: [github.com/davidjgabeau/ai-atlas](https://github.com/davidjgabeau/ai-atlas)
- License: [MIT](./LICENSE)

## Why This Exists

New York has a dense early-stage AI market, but the useful context is scattered across product launches, investor conversations, founder posts, hiring signals, and category-specific momentum. AI Atlas NYC turns that scattered surface area into a readable, structured map.

The project is intentionally editorial and data-driven:

- It focuses on Series A and earlier NYC AI companies.
- It favors verified company facts over broad claims.
- It keeps category boundaries visible so readers can understand how the market is clustering.
- It presents short, decision-useful notes instead of generic startup-directory copy.
- It treats the homepage as a front page, not a dashboard.

The goal is not to rank companies or predict winners. The goal is to make the market easier to scan, revisit, and understand.

## Core Product Surfaces

### Company Directory

The `/companies` surface is the primary startup directory. It supports browsing, search, company profile links, category metadata, view counts, saved-state UI, and editorial hooks that explain each company's product wedge.

### Company Profiles

Each company page presents the available public record in an editorial profile format: name, logo, hook, category, stage, location, founders, website, description, related patterns, and other contextual surfaces when data exists. Missing optional data is hidden rather than filled with unsupported claims.

### Categories

The `/categories` surface groups companies by the existing AI Atlas taxonomy. Category pages help readers understand which startups define each cluster and how the market is distributed across areas like healthcare, infrastructure, finance, consumer, legal, cybersecurity, life sciences, and more.

### Patterns

The `/patterns` surface contains editorial market patterns drawn from the company corpus. Patterns are meant to answer questions like "what behavior is repeating across different startups?" and "which company clusters are pointing at the same buyer, workflow, or platform shift?"

### Newsfeed

The `/feed` and `/newsfeed` surfaces bring together external news links and official company posts from mapped companies. The page is designed as a curated news front page for early-stage NYC AI, with source labels, timestamps, company attribution, and external-link affordances.

### Ask And Embeds

The `/ask` surface lets readers ask questions over the curated AI Atlas company, category, pattern, and signal data. External sites can also use the public embed API at `/api/embed/atlas` plus the guarded Ask stream at `/api/ask` to show the map and an Ask Atlas modal without exposing model provider keys. See [docs/embed-api.md](./docs/embed-api.md).

### Jobs And Highlights

The jobs and highlights surfaces provide additional market context. Jobs help show where companies are hiring and what functions they are investing in. Highlights provide a saved or featured view of companies worth revisiting.

### Homepage

The homepage is the editorial front page for the map. It combines the hero, category snapshot, representative company rows, patterns, current read, recent additions, and news surfaces into a premium consumer-facing entry point.

## Technical Stack

AI Atlas NYC is a modern Next.js application with a small, explicit data layer and deployment path.

- Framework: [Next.js](https://nextjs.org) App Router
- UI: React 19, TypeScript, Tailwind CSS v4
- Components: Radix UI, shadcn-compatible primitives, lucide-react icons
- Data: local structured data plus Supabase-backed live data
- Maps: Google Maps JavaScript API
- Editorial utilities: TypeScript scripts for data validation, news refreshes, company profiles, logos, jobs, social content, and generated editorial surfaces
- Deployment: Vercel

The app is intentionally built with a clear separation between public UI, typed data models, validation scripts, and external service integrations. That makes the project understandable as an open-source codebase while still supporting a polished production product.

## Local Development

### Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project if you want live database-backed behavior
- A Google Maps API key if you want map rendering

### Install

```bash
git clone https://github.com/davidjgabeau/ai-atlas.git
cd ai-atlas
npm install
```

### Configure Environment Variables

Start from the example environment file:

```bash
cp .env.example .env.local
```

The app can run locally with the checked-in data, but production-like behavior uses the environment variables below. Never commit real secret values.

Public browser variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=
```

Server-only variables:

```bash
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_AGENT_WRITE_SECRET=
CRON_SECRET=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

Editorial and model configuration:

```bash
ANTHROPIC_ASK_MODEL=
ANTHROPIC_EDITORIAL_MODEL=
ANTHROPIC_SOCIAL_MODEL=
ANTHROPIC_COMPANY_BRIEF_MODEL=
ANTHROPIC_DISCOVERY_MODEL=
```

News and social integrations:

```bash
NEWS_FEED_URLS=
ENABLE_GDELT_NEWS=
NEWS_ITEMS_PER_SOURCE=
NEWS_MAX_STORED_ITEMS=
X_CLIENT_ID=
X_CLIENT_SECRET=
X_ACCESS_TOKEN=
X_REFRESH_TOKEN=
X_BEARER_TOKEN=
TWITTER_BEARER_TOKEN=
X_ACCOUNT_USERNAME=
SOCIAL_AUTO_POST=
SOCIAL_ENGAGEMENT_ENABLED=
SOCIAL_KILL_SWITCH=
SOCIAL_TIMEZONE=
```

Admin and feature controls:

```bash
AI_ATLAS_ADMIN_EMAILS=
AI_ATLAS_ADMIN_ENABLED=
AI_ATLAS_EMBED_ORIGINS=
```

`AI_ATLAS_EMBED_ORIGINS` is optional and only affects browser access to the Ask
Atlas streaming endpoint from external websites. Use comma-separated origins,
such as `https://davidgabeau.com,https://www.davidgabeau.com`.

For more deployment-specific notes, see [docs/deployment.md](./docs/deployment.md).

### Run The App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If port 3000 is already in use, Next.js will offer another local port.

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
npm run data:validate
npm run seo:audit
```

Additional scripts support data refreshes, logo updates, jobs updates, news updates, profile briefs, social content, and editorial surface generation. Review `package.json` before running scripts that call external services or write production data.

## Project Structure

```text
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

## Data And Editorial Standards

AI Atlas NYC is only useful if the data stays credible. Contributions should follow these rules:

- Do not fabricate company, founder, funding, customer, hiring, or traction facts.
- If public verification is unavailable, leave the field empty or mark it for human review.
- Keep descriptions specific, restrained, and useful to a reader scanning the market.
- Avoid generic AI hype and unsupported claims.
- Preserve the existing category taxonomy unless a change is clearly intentional and reviewed.
- Keep public copy editorial, precise, and NYC/early-stage focused.
- Do not expose secrets, private tokens, or service keys in code, docs, screenshots, issues, or pull requests.

Good company hooks are short, plain-English descriptions of the product surface:

- "Testing infrastructure for autonomous agents"
- "Personal memory workflows for everyday users"
- "Automating clinical admin work for health plans"
- "Production tooling for LLM applications"

Weak hooks usually sound like generic marketing:

- "AI-powered platform for businesses"
- "Revolutionizing healthcare with AI"
- "Unlocking productivity for teams"
- "Cutting-edge tools for enterprises"

## QA Notes

The `/jobs` gate can be disabled for QA in a browser session with:

```js
localStorage.setItem("aiatlas_disable_gate", "true");
```

Clear it with:

```js
localStorage.removeItem("aiatlas_disable_gate");
```

This is a local QA flag only. The jobs gate must not support referral tokens or URL-based bypasses.

## Validation Before Shipping

Run the core checks before opening a pull request or pushing production-facing changes:

```bash
npm run lint
npm run build
npm run data:validate
```

For UI work, also test the affected pages in desktop and mobile viewports. The product is designed to feel editorial and consumer-grade, so visual QA matters as much as passing compilation.

## Deployment

The production site is deployed on Vercel at [aiatlas.nyc](https://aiatlas.nyc).

Typical deployment flow:

1. Commit changes with a clear message.
2. Push to GitHub.
3. Let Vercel build the project from the pushed branch.
4. Verify the production URL and key routes after deployment.

Documentation-only changes, such as README updates, do not require a Vercel production deploy.

## Contributing

AI Atlas NYC is open source and welcomes thoughtful contributions.

Good contributions include:

- Fixing broken links, malformed URLs, or stale company metadata
- Improving validation around company and category data
- Tightening copy without adding unsupported claims
- Improving accessibility, responsiveness, and interaction quality
- Adding tests or scripts that make the map harder to break
- Improving documentation for contributors and reviewers

Before submitting a change, please run:

```bash
npm run lint
npm run build
npm run data:validate
```

If your contribution touches company data, include a short note describing the public source or reasoning behind the change.

## Author

AI Atlas NYC is an open-source project by [David Gabeau](https://github.com/davidjgabeau).

## License

This project is released under the [MIT License](./LICENSE).
