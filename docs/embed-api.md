# AI Atlas Embed API

AI Atlas exposes a small public API for external sites that want to surface the
map, key company/category details, and an Ask Atlas modal without copying data
or exposing model provider keys.

## Endpoints

### Map Data

```http
GET https://aiatlas.nyc/api/embed/atlas
GET https://aiatlas.nyc/api/embed/atlas?limit=12
GET https://aiatlas.nyc/api/embed/atlas?limit=all
GET https://aiatlas.nyc/api/embed/atlas?limit=6&companySort=featured
```

By default, `companies` is ordered by newest map entries first using AI Atlas'
curated map-entry freshness, not raw database insertion order. Use
`companySort=featured` for the older featured-first sample list.

The response is public, read-only JSON:

```ts
type AtlasEmbedResponse = {
  version: 1;
  generatedAt: string;
  source: {
    name: "AI Atlas NYC";
    url: string;
    mapUrl: string;
    askUrl: string;
  };
  map: {
    endpoint: string;
    coordinateSystem: "normalized-0-1";
    description: string;
  };
  stats: {
    totalCompanies: number;
    totalCategories: number;
    newCompanyCount: number;
    recentlyAddedCount: number;
    lastUpdatedAt?: string;
    lastUpdatedLabel: string;
  };
  ask: {
    endpoint: string;
    method: "POST";
    streamFormat: "application/x-ndjson";
    maxQueryLength: number;
    requestShape: {
      query: "string";
      history: string;
    };
    events: Array<"delta" | "companies" | "error" | "done">;
    exampleQuestions: string[];
  };
  collections: {
    defaultCompanySort: "newest" | "featured";
    // newest entries in the map, using curated map-entry freshness
    newCompanies: AtlasEmbedCompany[];
    // high-signal/featured companies for compact showcase widgets
    featuredCompanies: AtlasEmbedCompany[];
    // only companies created inside the current recent-addition window
    recentCompanies: AtlasEmbedCompany[];
  };
  categories: Array<{
    name: string;
    slug: string;
    href: string;
    description: string;
    thesis: string;
    companyCount: number;
    representativeCompanies: Array<{
      name: string;
      slug: string;
      href: string;
      hook: string;
      signalLabel: string;
    }>;
  }>;
  companies: AtlasEmbedCompany[];
  patterns: Array<{
    slug: string;
    title: string;
    framing: string;
    href: string;
    updatedAt: string;
    companies: Array<{
      name: string;
      slug: string;
      href: string;
      note: string;
    }>;
  }>;
  latestSignals: Array<{
    title: string;
    body: string;
    label: string;
    category?: string;
    occurredAt?: string;
    company?: {
      name: string;
      slug: string;
      href: string;
    };
  }>;
};

type AtlasEmbedCompany = {
  id: string;
  name: string;
  slug: string;
  href: string;
  logoUrl: string;
  websiteUrl: string;
  xHandle: string;
  officeAddress: string;
  category: string;
  stage: string;
  hook: string;
  description: string;
  thesis: string;
  signalLabel: string;
  views: number;
  isFeatured: boolean;
  isBreakout: boolean;
  founders: Array<{ name: string; title: string }>;
  createdAt: string;
  updatedAt: string;
};
```

### Map Layout

```http
GET https://aiatlas.nyc/api/embed/map
```

Use this when an external site needs to render the AI Atlas map itself. The
endpoint returns the same deterministic layout used by the AI Atlas static map
preview: company positions are projected into normalized `0-1` coordinates.

```ts
type AtlasMapEmbedResponse = {
  version: 1;
  generatedAt: string;
  source: {
    name: "AI Atlas NYC";
    url: string;
    mapUrl: string;
  };
  layout: {
    type: "ai-atlas-nyc-normalized-map";
    coordinateSystem: "normalized-0-1";
    origin: "top-left";
    xAxis: "west-to-east";
    yAxis: "north-to-south";
    bounds: {
      minLng: number;
      maxLng: number;
      minLat: number;
      maxLat: number;
    };
    note: string;
  };
  stats: {
    totalCompanies: number;
    totalCategories: number;
    recentlyAddedCount: number;
    lastUpdatedAt?: string;
    lastUpdatedLabel: string;
  };
  categories: Array<{
    name: string;
    slug: string;
    href: string;
    color: string;
    companyCount: number;
    cx: number;
    cy: number;
    description: string;
  }>;
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    href: string;
    logoUrl: string;
    websiteUrl: string;
    category: string;
    categorySlug: string;
    stage: string;
    hook: string;
    signalLabel: string;
    views: number;
    isFeatured: boolean;
    isBreakout: boolean;
    color: string;
    confidence: "confirmed" | "estimated";
    neighborhood: string;
    lat: number;
    lng: number;
    x: number;
    y: number;
    radius: number;
  }>;
};
```

For SVG or canvas rendering:

```ts
const map = await fetch("https://aiatlas.nyc/api/embed/map").then((res) =>
  res.json(),
);

const x = company.x * width;
const y = company.y * height;
const radius = company.radius * Math.min(width, height);
```

### Ask Atlas Stream

```http
POST https://aiatlas.nyc/api/ask
Content-Type: application/json

{
  "query": "I'm a seed investor focused on infrastructure. What should I be watching?",
  "history": [
    { "role": "user", "content": "Previous user message" },
    { "role": "assistant", "content": "Previous Ask Atlas answer" }
  ]
}
```

The response is newline-delimited JSON:

```ts
type AskAtlasEvent =
  | { type: "delta"; text: string }
  | {
      type: "companies";
      companies: Array<{
        id: string;
        name: string;
        slug: string;
        category: string;
        stage: string;
        hook: string;
        description: string;
        logoUrl: string;
        websiteUrl: string;
        signalLabel: string;
        views: number;
      }>;
    }
  | { type: "error"; message: string }
  | { type: "done" };
```

Ask Atlas is server-backed. Your website should call AI Atlas directly from the
browser, but it should never receive `ANTHROPIC_API_KEY`.

## Origin Access

The read-only map endpoint is intentionally public.

The Ask endpoint only allows browser calls from configured origins. Set this in
Vercel for production if your personal site uses a domain other than the built-in
defaults:

```bash
AI_ATLAS_EMBED_ORIGINS=https://your-site.com,https://www.your-site.com
```

The default allowed origins include:

- `https://aiatlas.nyc`
- `https://www.aiatlas.nyc`
- `https://davidgabeau.com`
- `https://www.davidgabeau.com`
- local development origins on ports `3000`, `3001`, and `5173`

Use `AI_ATLAS_EMBED_ORIGINS=*` only for a temporary demo. That makes the Ask
stream callable from any website.

## Minimal Personal-Site Integration

This is the smallest version: render a few map details and open a simple Ask
modal. Replace the element IDs with whatever your personal site uses.

```html
<section id="ai-atlas-map"></section>

<dialog id="ask-atlas-modal">
  <form method="dialog">
    <button aria-label="Close Ask Atlas">x</button>
  </form>
  <h2>Ask Atlas</h2>
  <textarea
    id="ask-atlas-query"
    rows="3"
    placeholder="Ask about NYC AI companies, categories, or patterns"
  ></textarea>
  <button id="ask-atlas-submit">Ask</button>
  <div id="ask-atlas-answer"></div>
  <div id="ask-atlas-companies"></div>
</dialog>
```

```js
const atlas = await fetch("https://aiatlas.nyc/api/embed/atlas?limit=6").then(
  (response) => response.json(),
);

const companiesToShow = atlas.collections.newCompanies.length
  ? atlas.collections.newCompanies.slice(0, 3)
  : atlas.companies.slice(0, 3);

document.querySelector("#ai-atlas-map").innerHTML = `
  <p>${atlas.stats.totalCompanies} companies · ${atlas.stats.totalCategories} categories · Updated ${atlas.stats.lastUpdatedLabel}</p>
  <button id="ask-atlas-open">Ask Atlas</button>
  <ul>
    ${companiesToShow
      .map(
        (company) => `
          <li>
            <a href="${company.href}">
              <strong>${company.name}</strong>
              <span>${company.category}</span>
              <p>${company.hook}</p>
            </a>
          </li>
        `,
      )
      .join("")}
  </ul>
`;

const modal = document.querySelector("#ask-atlas-modal");
document.querySelector("#ask-atlas-open").addEventListener("click", () => {
  modal.showModal();
});

document
  .querySelector("#ask-atlas-submit")
  .addEventListener("click", async () => {
    const query = document.querySelector("#ask-atlas-query").value.trim();
    if (!query) return;

    const answer = document.querySelector("#ask-atlas-answer");
    const companies = document.querySelector("#ask-atlas-companies");
    answer.textContent = "";
    companies.innerHTML = "";

    const response = await fetch(atlas.ask.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);

        if (event.type === "delta") {
          answer.textContent += event.text;
        }

        if (event.type === "companies") {
          companies.innerHTML = event.companies
            .map(
              (company) => `
                <a href="https://aiatlas.nyc/companies/${company.slug}">
                  ${company.name} - ${company.hook}
                </a>
              `,
            )
            .join("");
        }

        if (event.type === "error") {
          answer.textContent += `\n${event.message}`;
        }
      }
    }
  });
```

## Suggested Website Copy

Use simple language on the personal site:

> AI Atlas NYC is my open-source market map of early-stage AI companies in New
> York. Browse the live map, then ask Atlas what patterns, categories, or
> companies are worth inspecting.
