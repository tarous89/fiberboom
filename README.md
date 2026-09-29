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

This release has no signup database, analytics collector, tracking cookies, payment processor or randomized traffic allocation. Product dialogs preserve the current ordering-not-open state. Legal pages describe that actual release. Enable `contact@fiberboom.com` and `privacy@fiberboom.com` in the email provider; publishing mailto links does not create mailboxes. Before accepting orders, complete business registration details, sales and delivery terms, checkout and data-processing configuration.

Source snapshots: psyllium `86bdc12f66b2bef9158325f201705838c52b0838`; light `d441f588d307ee146758c157fca890e1b0c92aa3`; boom `a53805faf8011ab08150e4d5de8d3a6f8cfb5a37`.
