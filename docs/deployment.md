# AI Atlas NYC Deployment

## Required Accounts

- Supabase project
- Google Cloud project with Maps JavaScript API enabled
- Vercel project connected to this repository

## Environment Variables

Add these to `.env.local` and to Vercel Production/Preview:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=
ANTHROPIC_API_KEY=
ANTHROPIC_ASK_MODEL=
AI_ATLAS_EMBED_ORIGINS=
X_CLIENT_ID=
X_CLIENT_SECRET=
X_ACCESS_TOKEN=
X_REFRESH_TOKEN=
X_BEARER_TOKEN=
SOCIAL_AUTO_POST=false
SOCIAL_ENGAGEMENT_ENABLED=false
SOCIAL_KILL_SWITCH=false
SOCIAL_DAILY_POST_LIMIT=12
SOCIAL_MIN_MINUTES_BETWEEN_POSTS=25
SOCIAL_MAX_POSTS_PER_HOUR=3
SOCIAL_TIMEZONE=America/New_York
```

`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` is optional unless you create a custom Google
Maps cloud style.

`SUPABASE_SECRET_KEY` is server-only. It lets the server read admin data and
write submissions without exposing elevated privileges to the browser.

Keep `SOCIAL_AUTO_POST=false` and `SOCIAL_ENGAGEMENT_ENABLED=false` for launch
until the generated drafts in `/admin` look right.

`ANTHROPIC_ASK_MODEL` is optional. If it is unset, Ask Atlas uses the editorial
model setting and then the app default.

`AI_ATLAS_EMBED_ORIGINS` is optional. It controls which external websites can
call the Ask Atlas stream from a browser. Use a comma-separated list of origins,
for example `https://davidgabeau.com,https://www.davidgabeau.com`. The read-only
embed data endpoint remains public.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/20260503130000_initial_ai_atlas_schema.sql` in the
   Supabase SQL Editor.
3. Run `npm run generate:supabase-seed`.
4. Run the generated `supabase/seed.sql` in the Supabase SQL Editor.

The app falls back to local data when Supabase env vars are missing, so local
development still works before the project is connected.

## Google Maps Setup

1. Enable Maps JavaScript API in Google Cloud.
2. Create a browser API key.
3. Restrict the key to:
   - `http://localhost:3000/*`
   - your Vercel preview domain
   - `https://aiatlas.nyc/*`
   - `https://www.aiatlas.nyc/*`
4. Add the key as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

## Vercel Setup

1. Connect the repo to Vercel.
2. Add the environment variables above.
3. Deploy with `vercel --prod` or through the Vercel Git integration.
4. Add custom domains:
   - `aiatlas.nyc`
   - `www.aiatlas.nyc`

## X Automation Setup

See `docs/x-automation.md` for the first-run checklist, safe launch defaults,
manual X Developer Portal setup, and local smoke-test commands.
