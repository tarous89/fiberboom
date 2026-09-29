# Fiberboom

English launch on Cloudflare. Light is the fixed homepage.

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
| `/` | Light (English) |
| `/psyllium/en/` | Scientific |
| `/light/en/` | Feel Light |
| `/boom/en/` | Fiber. Water. Boom. |
| `/privacy/en/` | Privacy policy |
| `/terms/en/` | Terms & conditions |
| `/checkout/en/` | Ordering-not-open notice |

Edit content under `site/`. Run `npm run build` to generate `dist/`.

All image URLs are content-addressed under `site/assets`, shared between versions, and served with immutable caching. PNG source assets are optimized WebP. Heroes use responsive image sizes; below-fold images are lazy-loaded. No image hotlinks depend on ChatGPT Sites.

This release includes custom beta analytics and a server-protected `/admin` dashboard. Activate the D1 binding and server secrets using [ANALYTICS-SETUP.md](ANALYTICS-SETUP.md). It does not implement signup, payments or randomized allocation. Beta consent is collected through invitations; the on-site notice is informational. Enable `contact@fiberboom.com` and `privacy@fiberboom.com` in your email provider.
