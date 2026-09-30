# German storefront

Routes: `/{light,psyllium,boom}/de/` and `/{light,psyllium,boom}/de/product/`, including the restock dialog on each product page. Germany and EUR are the default; `?market=PL` remains an explicit override.

## Research and editorial approach

Reviewed German storefront wording and German consumer discussions on 30 September 2026. These are language references, not evidence for FiberBoom efficacy or conversion performance:

- KoRo, German Flohsamenschalen product listing: https://www.korodrogerie.de/bio-flohsamenschalen-99-reinheit-500-g — familiar ingredient naming and taste-led food vocabulary.
- nucao, German chocolate-bar collection: https://www.the-nu-company.com/collections/schokoriegel-1 — short, direct product language and familiar shopping labels.
- mybacs, German Blähbauch article: https://mybacs.com/blogs/gesundheit-wohlbefinden/how-to-debloat — everyday wording for bloating and feeling lighter. Health recommendations from the article were not imported.
- r/FitnessDE, Flohsamenschalen discussion: https://www.reddit.com/r/FitnessDE/comments/1qcxsm0/flohsamenschalen/ — conversational language about texture, mixing and the difficulty of enjoying loose powder. Anecdotes and advice were not treated as scientific evidence.
- ARD GESUND / NDR YouTube search descriptions were also checked for accessible explanatory vocabulary. No claim to have reviewed full video transcripts.

Workflow: identify each English section’s intent; draft German directly from English; review continuity and idioms; translate dynamic UI and scientific captions; inspect built pages and checkout-interest flows on desktop/mobile.

## Voice by version

| Version | English intent | German adaptation |
|---|---|---|
| Light | Reassurance, everyday relief, simple explanation | “Fühl dich leicht. Jeden Tag.”; “Blähbauch”; “Manchmal läuft alles wie immer. Nur die Verdauung nicht.” |
| Psyllium | Ingredient-led, clear and scientific without academic marketing language | “Flohsamenschalen. Jetzt richtig lecker.”; precise study numbers, populations and caveats retained |
| Boom | Blunt bathroom humour, short beats, playful reversals | “BALLASTSTOFFE. WASSER. BOOM.”; “Ein Klogang sollte wirklich keine Höchstleistung sein.”; coffee as a “Verhandlungsangebot” |

Consistent informal lowercase “du”. “Ballaststoffe”, not a literal “Faser”. Flavours: Zartbitter, Dattel & Nuss, Pistazie. CTAs: “FiberBoom kaufen”, “Sorten entdecken”, “Jetzt bestellen”, “30 % Rabatt sichern”. Restock headline: “Oh, Mist. Alles weg.”

No new health claims or shipping promises were added. The original scientific limitations and ingredient-verification notes remain. Research does not establish which German wording will convert best; the experiment remains the source of that evidence.

## Implementation and market behaviour

- `site/i18n/de.json`: 491 manually authored translations mapped to original English strings.
- `scripts/german.mjs`: generates six static German HTML pages, localized interactive scripts and a product catalog during the normal build. Shared images remain optimized and use the original packaging artwork.
- German headings support intentional compound-word breaks. Long ingredient names retain readable mobile layouts.
- Direct DE routes default to Germany even after a saved Poland preference. Explicit query parameters override the default. Country selection chooses its published preferred language; language can also be changed independently.
- Existing German prices, DHL delivery copy, €3.50 delivery / free from €30, card/PayPal/Klarna/wallet/SEPA/transfer options are reused from the market catalog. This does not enable actual payment collection.
- Language switching preserves product selection and campaign tags. Order-interest records and analytics persist `de`; `/admin` includes German in the language filter.
- Privacy and terms remain the existing English documents and are labelled EN.

## Verification

- All three German landing-to-product journeys, changing flavours/packs, opening the popup, saving an optional email against the same immutable offer, and deduplication.
- D1 records retain German language, Germany market, EUR price and linked email; separate EN/PL/DE dashboard filtering.
- Language/country switching and UTM preservation; previous PL preference does not override a direct DE URL.
- Desktop/mobile visual review, including compound headings, product selectors and popup form width.
- Existing backend/collector tests plus German-language tests pass.

When the English templates change, add corresponding translations and audit the generated German pages. Do not edit `dist` directly.
