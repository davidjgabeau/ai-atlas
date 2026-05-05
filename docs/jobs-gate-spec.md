# AI Atlas NYC Jobs Gate Spec

## 1. Goal

The `/jobs` page should be readable and crawlable while asking logged-out human
visitors to create a profile once they show meaningful intent. The gate protects
job listing interaction, not page discovery.

## 2. Gate state

The client-side gate state must use this shape:

```ts
type GateState = {
  scrollAccumulated: number;
  guardedClicks: number;
  triggered: boolean;
  triggeredAt: string | null;
};
```

## 3. Trigger rules

The gate applies only to logged-out human visitors on `/jobs`.

- The locked jobs board must include a visible sign-in CTA before any trigger
  fires, so users can unlock jobs without discovering the modal by scrolling or
  clicking Apply.
- Scrolling exactly 2 viewport heights must not trigger the gate.
- Scrolling 3 or more viewport heights must trigger the gate.
- Clicking a guarded job action, including Apply, must trigger the gate before
  navigation.
- Once triggered, the gate remains the required logged-out experience until the
  visitor signs in or uses a documented bypass mechanism.

## 4. Dismissal behavior

The modal may include a secondary "Just browsing?" action. Closing through that
action dismisses the modal only for the moment.

- Listings remain blurred.
- The next guarded click reopens the gate.
- Refreshing after the gate has triggered, while still logged out, must not
  silently bypass the gate. The gate should reopen on first interaction.

## 5. Sign-in behavior

Signing in through the gate dismisses the modal, clears gate localStorage, and
removes the listing blur.

If the gate was opened by an Apply action, the app must remember that pending
Apply action during auth and fire it automatically after login completes.

## 6. Bypass mechanisms

The gate must not fire for:

- Authenticated users (session cookie present)
- Crawlers and link previewers: detect `User-Agent` for Googlebot, Bingbot, Twitterbot, facebookexternalhit, LinkedInBot, Slackbot, Discordbot, and treat as bypassed. This preserves SEO and link unfurls.
- A `localStorage` debug flag `aiatlas_disable_gate=true` for QA. Document this in the codebase README.

No referral tokens. No URL-based bypass. Logged-out humans get the gated experience regardless of how they arrived.

## 7. Storage rules

Persist only the gate state needed to preserve triggered status and interaction
counts. Do not persist referral tokens, URL tokens, or any value that behaves as
a URL-based bypass.

The QA debug flag is intentionally separate from `GateState`:

```ts
localStorage.setItem("aiatlas_disable_gate", "true");
```

## 8. Verification

1. Logged-out user on `/jobs`: scroll exactly 2 viewport heights. Gate does not fire.
2. Logged-out user on `/jobs`: scroll 3+ viewport heights. Gate fires.
3. Logged-out user on `/jobs`: click Apply on the first visible role. Gate fires before navigation.
4. Logged-out user closes gate via "Just browsing?". Listings stay blurred. Next click reopens gate.
5. Logged-out user signs in via gate. Gate dismisses, blur removed, localStorage cleared.
6. Logged-out user signs in via Apply gate. After login, the original Apply action fires automatically.
7. Logged-in user on `/jobs`: gate never appears regardless of scroll or clicks.
8. Googlebot user-agent: gate never appears. Page renders fully.
9. `localStorage.setItem('aiatlas_disable_gate','true')`: gate never appears.
10. Refreshing after the gate has triggered, while still logged out: gate is open on first interaction, not silently bypassed.
11. Mobile viewport (375px): 3 swipes triggers; modal renders cleanly; body scroll locks.
