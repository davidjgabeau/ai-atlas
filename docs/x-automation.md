# AI Atlas NYC X Automation

AI Atlas X automation generates draft posts from company updates, jobs, news,
category movement, and evergreen company spotlights. Publishing and engagement
are off by default.

Official account: https://x.com/AiAtlasNYC

## Safe Launch Defaults

```bash
SOCIAL_AUTO_POST=false
SOCIAL_ENGAGEMENT_ENABLED=false
SOCIAL_KILL_SWITCH=false
```

With those defaults, the system can generate and store drafts, but it will not
publish or engage publicly.

## Required Environment Variables

```bash
ANTHROPIC_API_KEY=
ANTHROPIC_SOCIAL_MODEL=
X_CLIENT_ID=
X_CLIENT_SECRET=
X_ACCESS_TOKEN=
X_REFRESH_TOKEN=
X_BEARER_TOKEN=
X_ACCOUNT_USERNAME=AiAtlasNYC

SOCIAL_AUTO_POST=false
SOCIAL_ENGAGEMENT_ENABLED=false
SOCIAL_KILL_SWITCH=false
SOCIAL_DAILY_POST_LIMIT=12
SOCIAL_MIN_MINUTES_BETWEEN_POSTS=25
SOCIAL_MAX_POSTS_PER_HOUR=3
SOCIAL_TIMEZONE=America/New_York
```

`ANTHROPIC_SOCIAL_MODEL` is optional. If it is unset, the social writer falls
back to the editorial model env var and then the built-in Claude Sonnet default.

## X Developer Portal Checklist

1. Confirm the app is attached to the AI Atlas X account.
2. Enable OAuth 2.0 user-context auth for the app.
3. Set app permissions to read and write.
4. Request scopes for `tweet.read`, `tweet.write`, `users.read`, `like.read`,
   `like.write`, and `offline.access`.
5. Store the app client ID and client secret in the env vars above.
6. Generate or complete the OAuth flow for the AI Atlas account, then store the
   user access token and refresh token.
7. Store the bearer token for public read lookups.
8. Keep `SOCIAL_AUTO_POST=false` until drafts look good in `/admin`.
9. Turn on `SOCIAL_ENGAGEMENT_ENABLED=true` only after posting behavior is
   already working.

V1 does not rotate `X_REFRESH_TOKEN` automatically. Rotate and update it
manually if the X access token expires.

## Local Smoke Tests

Generate drafts without posting publicly:

```bash
npm run social:generate
```

Confirm dispatch is safely disabled:

```bash
npm run social:dispatch
```

With `SOCIAL_AUTO_POST=false`, dispatch should return a skipped result and
publish nothing.

Confirm engagement is safely disabled:

```bash
npm run social:engagement
```

With `SOCIAL_ENGAGEMENT_ENABLED=false`, engagement should return a skipped
result and take no X action.

Verify a small batch of stored company handles:

```bash
npm run social:verify-handles
```

Use `/admin` and the X queue tab to inspect recent drafts, skipped decisions,
run logs, and X auth health.

## Admin And Cron Routes

Admin/debug routes are protected by the existing admin auth helper:

- `GET /api/social/queue`
- `GET /api/social/logs`
- `GET /api/social/x/health`
- `POST /api/social/events/generate`
- `POST /api/social/posts/draft`
- `POST /api/social/posts/[postId]/skip`
- `POST /api/social/posts/[postId]/publish-now`
- `POST /api/social/engagements/run`
- `POST /api/social/handles/verify`
- `POST /api/social/pause`
- `POST /api/social/resume`

Cron routes use the existing `CRON_SECRET` pattern:

- `GET /api/cron/social-generate`
- `GET /api/cron/social-dispatch`
- `GET /api/cron/social-engagement`
- `GET /api/cron/social-handles-verify`

`publish-now` still respects `SOCIAL_KILL_SWITCH` and `SOCIAL_AUTO_POST`, so it
will not post publicly with the safe launch defaults.
