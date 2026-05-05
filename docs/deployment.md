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
```

`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` is optional unless you create a custom Google
Maps cloud style.

`SUPABASE_SECRET_KEY` is server-only. It lets the server read admin data and
write submissions without exposing elevated privileges to the browser.

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
