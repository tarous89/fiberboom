# Decisions and tradeoffs

## 2026-10-04 — Two price levels and conversion funnels

- Approved X suffix without hyphen: lightx, boomx, psylliumx, for every language. Existing 18 routes retained, 18 X routes added. Root is identical to English Light X.
- X EUR totals 7/14/30: 15.50 / 28.90 / 54.90; X PLN: 69 / 125 / 249. Standard prices and delivery rules retained. Same product, assets and copy; X tests price only.
- Single country selector preserves concept/price level and changes market/currency/language. No additional checkout pages; retain the restock-interest dialog.
- Dashboard funnels count unique browsers within a matching session/version/language, with separate product and offer tables for direct traffic and selected variations. Backend-saved emails are authoritative; old incomplete click/offer-view history is not fabricated.
- Sitemap lists all landing/product routes plus the shared homepage/legal routes. Existing beta noindex behavior retained; this is not a public-indexing launch.
