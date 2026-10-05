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

## 2026-10-04 — Fixed shipping and privacy presentation

- Approved shipping: Austria EUR 3.50/free from EUR 30; International USD 4/free from USD 34; Switzerland CHF 3.50/free from CHF 30. Both price levels share the rules; threshold is product subtotal after discounts. Catalog revision v5 rejects stale offers; previous captured amounts remain immutable.
- Removed beta-testing wording from the public privacy policy. Added localized Decline alongside Dismiss; the banner uses site-improvement wording. The policy explains that both choices close the informational notice and do not withdraw previously provided consent. No consent is inferred or stored by these buttons.
- Banner Decline, Dismiss and privacy-policy clicks emit separate privacy_notice_declined, privacy_notice_dismissed and privacy_notice_policy_click events through the existing collector. Event validation accepts these names; database, admin reports and funnel workflow remain unchanged. Prior invitation consent remains the basis for this private testing; no public consent launch implied.

## 2026-10-04 — Banner labels and provider wording

- Banner now shows Approve and Decline, localized as Zustimmen/Ablehnen and Akceptuję/Odrzuć. Approval emits privacy_notice_approved; legacy privacy_notice_dismissed remains accepted for already-open pages and historical records. Other analytics behavior is unchanged.
- Public site no longer names the company email provider; the policy still discloses email service providers.

## 2026-10-04 — Advertising randomizer

- Approved equal random assignment among all six versions per language at `/en/`, `/de/`, `/pl/`. Serve the canonical HTML internally with HTTP 200, preserve query parameters, and retain canonical assets/product links. No browser redirect and no reviewer-specific behavior.
- A validated first-party HttpOnly cookie remembers each language assignment for a fixed 90 days. Expired or invalid values are reassigned. Response is private/no-store with conditional asset headers removed to prevent cached assignments being shared. Workers runs first on all six entry-path spellings.
- Homepage and explicit version URLs remain deterministic; a return through an ad entry reuses the assignment. Different browsers or cleared cookies cannot be matched reliably. Ad routes stay out of the canonical sitemap.
- Analytics now attributes entry paths to their rendered version and language, extending existing funnels without double-counting views. Campaign/click IDs persist into product navigation and offer capture.

## 2026-10-05 — Google Ads base tag

- User supplied AW-18365157703 and deferred Meta. Installed the base tag behind explicit advertising approval; first-party analytics remains unchanged. Banner and privacy copy distinguish the two.
- Prepared Product ($0 USD) and Order click ($10 USD), once per page regardless of flavor/pack. Real Google conversion labels are still required; local dataLayer hooks must not be represented as active Ads conversions.
