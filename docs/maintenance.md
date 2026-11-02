# Maintaining AI Atlas

The core product is an editorial directory of NYC AI companies through Series A.
Company facts, original addition dates, source-backed updates, and editorial
assessments must stay distinct.

## Before shipping

Use Node 24 LTS and run `npm ci` followed by `npm run check`. This runs regression
tests, TypeScript, lint/data validation, and the production build. GitHub runs
the same checks for pull requests and `main`.

Check the homepage, company search and sorting, a company profile and inspector,
categories, patterns, jobs, Ask Atlas, and the submission form on desktop and
mobile. Test invalid submissions without inserting dummy production records.

## Data and freshness

- “Profiles synced” reports company row updates, not an editorial generator run.
- Latest Additions keeps original creation dates and remains useful after a quiet
  week. “Added this week” uses a separate seven-day window.
- Latest Signals requires a dated company event within 30 days. Regenerating old
  prose does not make a signal current. The homepage, Ask context, and embed API
  use the same rule.
- Category counts come from the currently published directory. Pattern counts
  come from the actual pattern library.
- Only office coordinates on file become map pins. Unknown locations remain
  browsable in the list; category-based invented neighborhoods are not used.
- Model demand and architecture are editorial estimates, labeled as such.
- Narrow, sourced corrections to malformed imports live in
  `src/data/company-corrections.ts`; they preserve database IDs and addition dates.
  Probook's correction uses its official website and a16z's June 23 announcement.

## Scheduled ingestion

Vercel's existing schedules remain in `vercel.json`. Discovery sources run
concurrently with bounded workers and 45-second source budgets. Refresh work
has a 90-second collection budget and rotates company order. Search rotates
through its whole query pool instead of repeatedly checking only the first ten.
In-flight requests settle before a worker returns; database requests have an
eight-second deadline. A failed optional table does not discard other homepage data.

Discovery defaults to twelve extraction candidates. Auto-publication must honor
the approval switch, require a known eligible stage and a usable profile
description, and hold raw announcement excerpts for review. Series B and later
are outside the directory's scope. Failed discovery persistence is reported in
the run instead of appearing successful.

Do not enable social posting or run social dispatch as a side effect of routine
site maintenance. Those actions require their own user authorization.

Production credentials stay in Vercel. `.env.local` and `.vercel` are ignored.
Submissions return success only after the database accepts them; unconfigured
local environments return an explicit unavailable response.
