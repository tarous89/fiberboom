# Fiberboom

English, German and Polish storefront on Cloudflare. English Light X is the homepage.

## Cloudflare Pages

- Repository: `tarous89/fiberboom`, production branch `main`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root
- Custom domains: `fiberboom.com` and `www.fiberboom.com`

If the existing Cloudflare app was created as a **Worker** instead of Pages, use build command `npm run build` and deploy command `npx wrangler deploy --config wrangler.worker.jsonc`. Attach the custom domains to that Worker.

## Routes

| Route | Content |
| --- | --- |
| `/` | Light X (English) |
| `/psyllium/en/` | Scientific |
| `/light/en/` | Feel Light |
| `/boom/en/` | Fiber. Water. Boom. |
| `/privacy/en/` | Privacy policy |
| `/terms/en/` | Terms & conditions |
| `/checkout/en/` | Redirect to English Light X product |

Edit content under `site/`. Run `npm run build` to generate `dist/`.

All image URLs are content-addressed under `site/assets`, shared between versions, and served with immutable caching. PNG source assets are optimized WebP. Heroes use responsive image sizes; below-fold images are lazy-loaded. No image hotlinks depend on ChatGPT Sites.

This release includes custom beta analytics and a server-protected `/admin` dashboard. Activate the D1 binding and server secrets using [ANALYTICS-SETUP.md](ANALYTICS-SETUP.md). It does not implement signup, payments or randomized allocation. Beta consent is collected through invitations; the on-site notice is informational; Approve and Decline close it without changing the prior invitation consent or analytics. Enable `contact@fiberboom.com` and `privacy@fiberboom.com` in your email provider.

## Current storefront (October 4)

There are 36 landing/product routes: `/{light,boom,psyllium,lightx,boomx,psylliumx}/{en,de,pl}/` and the corresponding `product/` pages. `/` is identical to `/lightx/en/` and shares its canonical URL. X changes pricing only; design, copy and translations match the original concept. A single country selector changes market, currency and language while preserving the price variant and product selection.

Standard EUR packs (7/14/30): 12.50 / 22.90 / 45.90; X: 15.50 / 28.90 / 54.90. Standard PLN: 55 / 99 / 199; X: 69 / 125 / 249. `catalog.json` owns both price levels; the Worker independently validates the version-specific price. `scripts/price-variants.mjs` generates X pages, the root, localized alternate links and the full sitemap after translation. Edit sources, not `dist`.

The analytics dashboard shows landing, product-page and selected-offer conversion funnels alongside time/scroll metrics. See `ANALYTICS-SETUP.md`. Run `npm run build` and `node --test tests/*.test.mjs` before deploying through the production Cloudflare Git build.

Country defaults: English/root → International/USD, German → Germany/EUR, Polish → Poland/PLN. Selector options Austria/EUR and Switzerland/CHF share German routes with their explicit market parameter. USD standard 7/14/30: 15.90/28.90/57.90; X: 19.50/36.50/68.90. CHF amounts match EUR numerical prices. Shipping: AT EUR 3.50/free from 30; CH CHF 3.50/free from 30; INT USD 4/free from 34. The dashboard includes a storefront-country filter.
