# Polish storefront

Published routes: `/{light,psyllium,boom}/pl/` and `/{light,psyllium,boom}/pl/product/`. Each product has a translated restock dialog. Existing English routes remain available.

## Voice and intent

- Light: reassuring, everyday language. “Poczuj ulgę. I lekkość. Każdego dnia.” Avoid academic wording in the emotional sections.
- Psyllium: clear explanations, faithful doses, study populations and limitations. “Łuska babki jajowatej. Teraz naprawdę smakuje.” Psyllium husk is **łuska babki jajowatej**, not babka płesznik.
- Boom: conversational bathroom humour, short lines and playful reversals. “BŁONNIK. WODA. BOOM.” The restock message starts “No i klops. Wszystko poszło.”
- Conversion actions: “Kup FiberBoom”, “Poznaj smaki”, “Zamów teraz”, “Odbierz 30% rabatu”. No claim of guaranteed conversion improvement.

## Implementation

`site/i18n/pl.json` contains manually authored translations. `scripts/polish.mjs` builds six static HTML pages from the English templates after shared header/footer injection, localizes the legacy interactive scripts, and creates a localized product catalog and script. Images use the same optimized assets. The packaging artwork remains unchanged. Keep translated data-flavour/data-choice/data-taste values aligned with the generated legacy script keys. Do not translate immutable API flavor IDs.

A direct Polish URL defaults to Poland even if an earlier visit saved Germany. An explicit `?market=DE` overrides this. Country selection picks the available preferred language; the separate language control allows English + Poland or Polish + Germany. Product selections and UTM tags survive language changes.

Prices, delivery thresholds and payment options come from the existing market catalog. Language is not inferred from market in analytics: Polish routes and checkout offers persist `pl`. Admin reports provide a language filter and a language column for offers. The signed signup token and immutable offer protection also cover language.

Privacy policy and terms remain English and are explicitly labelled “(EN)” on Polish pages. Scientific qualifications and the existing ingredient-verification notes remain translated. This release does not enable payment collection.

## Validation completed

- All three Polish landing-to-product journeys, interactive flavors, order-interest popup and email update against the actual Worker with an in-memory D1 adapter.
- PL default with previous DE preference; explicit country and language switching; selection/UTM preservation.
- Desktop and 390px mobile review, including longer headings, chart labels and popup form fit.
- Backend tests cover Polish events, immutable language on offers and independent EN/PL report filtering.

When English copy changes, add its Polish equivalent and recheck the built pages for English text. Generated `dist` files should not be edited directly.
