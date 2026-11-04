# Maintaining AI Atlas

The core product is an editorial directory of NYC AI companies at all stages.
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
description, and hold raw announcement excerpts for review. All funding stages, public companies, and acquired businesses with documented NYC operations are in scope. Deterministic article extraction stays in review; company domains must come from linked evidence. Failed discovery persistence is reported in
the run instead of appearing successful.

Do not enable social posting or run social dispatch as a side effect of routine
site maintenance. Those actions require their own user authorization.

Production credentials stay in Vercel. `.env.local` and `.vercel` are ignored.
Submissions return success only after the database accepts them; unconfigured
local environments return an explicit unavailable response.


## All-stage reporting release (November 2026)

The atlas now includes every funding stage, public companies, and acquired
businesses with a documented NYC presence. Headquarters and local offices are
distinct; historical acquired-company records retain their identity. Stage must
not cause automatic archival or reduce signal relevance.

`/research` and `/api/research` expose the public sourcebook. Reviewed facts live
in `src/data/reporting/`. Identity/product-only reviews do not certify the old
funding stage. Office evidence includes its source, original date where known,
review date, and caveats. Mailing addresses and unverified leads are excluded
from office counts and pins. Census coordinates are approximate street matches;
they are not rooftop or unit coordinates. Shared addresses use one map marker
that lists all associated companies. No citywide census or causal impact claim
can be inferred from this curated sample.

The existing refresh schedule now collects known-company sources four times a
day with bounded work and a broader rotation. News and hiring keep their daily
schedules. Undated website claims never become newly dated events. Legacy inferred events
are excluded from the reporting timeline and Ask/homepage signal summaries;
those use reviewed announcements and source-dated news with an identifiable
company subject. A generic word such as Series cannot attribute an article. Hiring is
public without login, limited to openings seen within 14 days, and capped at
1,000 records. Empty coverage is not evidence of no hiring. Company socials
remain dependent on external API access. This release does not dispatch posts.

To inspect reviewed database changes, run:

```sh
npx tsx scripts/import-reviewed-research.ts --backup-dir=/absolute/backup/path
```

Applying requires `--apply`, write credentials, and a backup directory. Existing
IDs and addition dates are preserved and updates check the prior row revision.
Article-fragment records are held as drafts, not deleted.

A deployment can explicitly select `ATLAS_IMPORT_REVIEWED=1` as a build-only
variable to import after a successful build using server-side credentials.
`ATLAS_REFRESH_SOURCES=1` additionally runs news, jobs, and known-company
collection. These flags are one-time operator choices, not persistent settings.
An optional `ATLAS_IMPORT_ONLY` restricts that operation to one reviewed slug.
An explicit `publication_review: publish` records a new inclusion decision for a
previously archived company; other draft/archive states are preserved.
No unauthenticated write endpoint is added. Local reviewed-registry coverage
remains usable if a database is unavailable; explicit database draft/archive
decisions take precedence.

The research desk's `view=comparison` compares the whole citywide directory,
independently of company filters. The shared coverage summary counts each
company once citywide and once per documented borough. Companies without
qualifying borough evidence stay in the citywide denominator; borough rows may
overlap. Williamsburg is a subset of Brooklyn. `/api/research` returns that
citywide `coverage` alongside the filtered `result_count`; `format=comparison`
exports the same unfiltered counting rules and counts as CSV. These are curated
coverage counts, not borough-wide business totals or a census of occupied space.

## Expanded office map and strict inclusion review (November 4, 2026)

The research desk opens on the interactive office map. Company search, stage,
category, borough, neighborhood and office-source filters apply to the company
finder and exports. Geography filters must match the same office. Shared
buildings retain all tenants, and a company may have more than one office.
GeoJSON uses longitude/latitude and includes the original evidence and geocode
provenance. Census and exact-name NYC Planning NYCPAD address points do not
establish suite, floor, entrance, employee count or present occupancy.

Only approved company arrays are imported from research batches. Discovery
pools and unresolved candidates are private working material, never company
listings. `src/data/reporting/exclusions.json` records source-backed holds for
closed/out-of-scope, duplicate or unresolved legacy identities. A hold does not
assert closure. The public scope guard also applies to jobs. The importer holds
matching database rows as drafts with backup and revision checks; it never
hard-deletes them. Renames use `previous_slug`, preserve database identity and
addition dates, and redirect old profile URLs.

`Industrial & Robotics AI` is a public category. Reviewed records can specify
`storage_category` for compatibility with older database category constraints;
public normalization always restores the canonical reviewed category. This does
not change database access rules. Expand the database CHECK through the normal
schema migration process before removing this compatibility field.

A current company review certifies only its stated scope. Existing funding
stages are not marked rechecked when the review covers AI identity and NYC
operations only. Source collection timestamps never become event dates.
