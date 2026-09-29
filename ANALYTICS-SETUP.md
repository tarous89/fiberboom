# Activate Fiberboom beta analytics

The Worker implements first-party event collection and a server-protected `/admin` dashboard. No PostHog subscription or credentials are required. Tracking relies on consent obtained through beta invitations before participation. The banner only informs; it does not enable, disable or record consent. Keep invitation consent records and arrange withdrawal requests through privacy@fiberboom.com. Before opening to non-consenting/public visitors, implement a public consent workflow.

## Cloudflare setup

1. In Storage & databases → D1, create `fiberboom-analytics`. Copy its database UUID.
2. In fiberboom → Settings → Builds, add **build environment variable** `FIBERBOOM_DATABASE_ID` with that UUID. `npm run build` writes the persistent `DB` D1 binding into the Worker configuration used by the deploy command. This is a build variable, not a runtime secret. Alternatively, commit the D1 `DB` binding and database UUID directly in `wrangler.worker.jsonc`.
3. In the Worker runtime Variables and Secrets, add a **secret** `ADMIN_PIN` with the requested PIN. Add a **secret** `SESSION_SECRET` with a cryptographically random string of at least 32 characters (for example, generate using `openssl rand -hex 32`). Do not commit either secret.
4. Deploy the latest GitHub commit. Keep build command `npm run build` and deploy command `npx wrangler deploy --config wrangler.worker.jsonc`.
5. Tables and indexes initialize automatically on the first API request. No SQL console steps are needed. Verify the deployed Worker has the `DB` binding.
6. Visit a public page, scroll and select a product, wait 15 seconds, then open `/admin`. Sign in and refresh. Confirm events appear. A page load with no database binding is not saved retroactively.

## Behavior

- All generated public HTML pages include `/analytics.js`; admin pages and APIs do not.
- Random browser ID: rolling 90-day local-storage expiry. Shared browser session: 30-minute inactivity timeout. Each page load gets its own page ID.
- Events: page view, scroll milestones every 10%, active-time milestones (15/30/45/60 seconds then every 30 seconds to 600), visibility changes, page exit, CTA clicks, flavour and pack choices, checkout intent, routine steps.
- Active means tab visible, not proof of attention. Hidden time is excluded. Timing is approximate due to browser timer scheduling; background suspension is capped per tick.
- In-memory batches flush every 15 seconds and on key interactions/exits with keepalive fetch. Event UUIDs prevent duplicates on retries. Network loss, abrupt closure and blocking can still lose events; this is not guaranteed delivery. Buffer is bounded to 120 events.
- No raw IPs, input contents, names, emails, payment details or session recordings are collected by this analytics implementation. Allowed UTM fields and referrer hostnames are stored; do not put personal information into campaign tags.
- Same-browser repeat visits only; cookies/storage deletion, browser changes and incognito break continuity. If storage is unavailable, identity lasts one page only.
- Dashboard: 1/7/30/90-day UTC reports, variant filters, page metrics, depth distribution, event totals, traffic sources, daily counts, latest 100 browser journeys. Journey drilldown includes up to 2,000 retained events across all variants and the full 90-day history. JSON report export contains the displayed report, not all raw events.
- Admin session lasts 8 hours, with signed HttpOnly Secure SameSite=Strict cookie. Login is limited to 5 attempts per IP per 15-minute bucket plus a global cap of 100. PIN is a server secret. A four-digit PIN remains weak; for wider release use stronger authentication.
- Authenticated read APIs enforce server-side authorization and no-store caching. Login/logout and ingestion check request origin. Ingestion has size, route, field, batch and rate limits. Analytics events are browser-submitted, not trusted payment/conversion evidence.
- Daily cleanup at 03:17 UTC removes events older than 90 days and expired rate-limit buckets. Provider backups may persist according to Cloudflare policy.
- Missing DB/secrets leave the website working, collector unavailable and admin closed. The setup notice at `/admin` is public, but analytics data is never public.

## Verification

`npm run build`

`node --test tests/*.test.mjs` (Node 22.13+ for the local SQLite test adapter).
