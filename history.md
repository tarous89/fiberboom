# Decisions and tradeoffs

## 2026-10-04 — Two price levels and conversion funnels

- Approved X suffix without hyphen: lightx, boomx, psylliumx, for every language. Existing 18 routes retained, 18 X routes added. Root is identical to English Light X.
- X EUR totals 7/14/30: 15.50 / 28.90 / 54.90; X PLN: 69 / 125 / 249. Standard prices and delivery rules retained. Same product, assets and copy; X tests price only.
- Single country selector preserves concept/price level and changes market/currency/language. No additional checkout pages; retain the restock-interest dialog.
- Dashboard funnels count unique browsers within a matching session/version/language, with separate product and offer tables for direct traffic and selected variations. Backend-saved emails are authoritative; old incomplete click/offer-view history is not fabricated.
- Sitemap lists all landing/product routes plus the shared homepage/legal routes. Existing beta noindex behavior retained; this is not a public-indexing launch.

## 2026-10-04 — International, Austria and Switzerland

- Approved five country choices: International/en/USD, Germany/de/EUR, Austria/de/EUR, Switzerland/de/CHF, Poland/pl/PLN. No new canonical pages; AT/CH use German routes with explicit market parameters.
- Direct English routes and root default to International even with a saved domestic preference. Root stays identical to English Light X. Explicit market parameters take priority; country switches preserve price level, pack/flavor and UTM tags.
- USD standard totals 7/14/30: 15.90 / 28.90 / 57.90; X: 19.50 / 36.50 / 68.90. Each is at least 25% above the EUR number. CHF uses EUR numerical totals in both price levels; these are fixed market prices, not FX conversion.
- New destinations use shipping calculated by destination until rates are supplied. Record shipping and total as null with pending status; never infer zero delivery. Existing DE/PL fees retained. English shipping copy includes Switzerland; German copy follows AT/CH destination.
- Storefront market filter added to analytics, separate from network visitor country. Offers/funnels preserve market, currency and displayed price; old records remain immutable.
