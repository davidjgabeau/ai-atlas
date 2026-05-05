# Agentic Editorial System

AI Atlas uses three layers:

1. Stable company profiles in Supabase.
2. Time-stamped company events in `company_events` and `data/company-events.json`.
3. Stored editorial surfaces in `editorial_surfaces` and `data/editorial-surfaces.json`.

The homepage reads stored surfaces and snapshots. It does not call external APIs or LLMs during render.

## Local Commands

```bash
npm run agent:refresh
npm run agent:discover
npm run agent:editorial
npm run agent:all
npm run social:generate
npm run social:dispatch
npm run social:engagement
```

Manual sources can be pasted into:

```text
data/inbox/raw-sources.json
```

Example:

```json
[
  {
    "sourceType": "press",
    "companySlug": "vellum",
    "url": "https://example.com/vellum-news",
    "title": "Vellum launches production AI workflow feature",
    "text": "Vellum announced...",
    "publishedAt": "2026-05-04T12:00:00.000Z"
  }
]
```

## Vercel Cron

`vercel.json` includes:

- `/api/cron/agent-refresh` every 3 hours
- `/api/cron/agent-discover` every 12 hours
- `/api/cron/agent-editorial` once per day
- `/api/cron/social-generate` every 15 minutes
- `/api/cron/social-dispatch` every 10 minutes
- `/api/cron/social-engagement` every 30 minutes
- `/api/cron/social-handles-verify` daily

For durable writes from Vercel cron, set:

```text
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

Without the service role key, local JSON generation still works and the app falls back safely, but Vercel serverless writes will not persist as the canonical editorial store.

Social automation writes to `atlas_social_posts`, `atlas_social_runs`, and
`atlas_social_engagement_actions`. It uses the same cron auth pattern and stays
draft-only unless `SOCIAL_AUTO_POST=true`.
