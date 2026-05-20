# AI Atlas NYC MCP Server

AI Atlas NYC includes a local, read-only MCP server for assistants that need structured access to the public market map. It uses the same public helpers as the app, primarily `getPublishedCompanies()`, category metadata from `src/data/market.ts`, editorial patterns from `src/data/patterns.ts`, and the existing public jobs helper.

## What It Exposes

The server registers these read-only tools:

- `search_companies`: search published companies by query, category, stage, hook, description, slug, or founder name.
- `get_company`: return one published company profile by slug.
- `list_categories`: list category metadata, company counts, and optional representative companies.
- `get_category`: return one category and its published companies.
- `list_patterns`: list editorial market patterns and related published companies.
- `get_pattern`: return one pattern with related published companies and one-liners.
- `search_jobs`: search public open jobs when the app's public jobs helper can load them.

Every company, category, and pattern response includes canonical `https://aiatlas.nyc` URLs. Result limits are capped at 25.

## What It Does Not Expose

The MCP server does not create write tools and does not expose:

- admin company management data
- auth profiles, sessions, or private user data
- submissions or submitter contact details
- raw source records, raw job payloads, agent runs, or internal automation data
- Supabase keys, service-role keys, cron secrets, or agent write secrets
- Ask Atlas LLM calls or private prompt context

Missing optional fields are omitted instead of filled with guesses.

## Run Locally

From the repo root:

```bash
npm run mcp:server
```

For MCP clients, prefer silent npm mode so stdio stays valid JSON-RPC:

```bash
npm --prefix /Users/davidgabeau/Documents/Codex/2026-04-28/files-mentioned-by-the-user-ai run --silent mcp:server
```

No new environment variables are required. If the app already has public Supabase configuration, the server can use the existing public data helpers. Without Supabase configuration, it falls back to local public market data where the existing helpers do.

## Claude Desktop Config

Add an entry like this to your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "ai-atlas-nyc": {
      "command": "npm",
      "args": [
        "--prefix",
        "/Users/davidgabeau/Documents/Codex/2026-04-28/files-mentioned-by-the-user-ai",
        "run",
        "--silent",
        "mcp:server"
      ]
    }
  }
}
```

## Codex MCP Config

Add an entry like this to your Codex MCP config:

```toml
[mcp_servers.ai-atlas-nyc]
command = "npm"
args = [
  "--prefix",
  "/Users/davidgabeau/Documents/Codex/2026-04-28/files-mentioned-by-the-user-ai",
  "run",
  "--silent",
  "mcp:server"
]
```

## Example Tool Calls

```json
{
  "tool": "search_companies",
  "arguments": {
    "query": "financial research",
    "category": "fintech-trading-ai",
    "limit": 5
  }
}
```

```json
{
  "tool": "get_company",
  "arguments": {
    "slug": "hebbia"
  }
}
```

```json
{
  "tool": "list_categories",
  "arguments": {
    "includeCompanies": true
  }
}
```

```json
{
  "tool": "get_pattern",
  "arguments": {
    "slug": "finance-teams-contested-buyer"
  }
}
```

```json
{
  "tool": "search_jobs",
  "arguments": {
    "category": "agent-infrastructure",
    "limit": 10
  }
}
```
