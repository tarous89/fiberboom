# Product and restock flow

English product routes: `/{light|psyllium|boom}/en/product/`. Root remains the Light landing page. Old checkout links redirect to their variant's product page. No checkout or payment page is used.

Edit `site/commerce/catalog.json` for flavor content, imagery, packs, market pricing and version copy. Increment `revision` whenever offer pricing changes. The server validates the displayed amount, currency and revision against the same catalog before accepting an interest record; it never silently records a different price. Nutrition and ingredients remain illustrative.

Checkout opens the shared restock dialog and POSTs `/api/checkout-intent`. A single D1 row stores the immutable offer, original price in minor currency units, variant, flavor, count, market, campaign and visit identifiers. Its email is initially empty. Signup updates that same row with email, consent timestamp and copy version. A random per-intent capability token is required for updates and only its HMAC is stored. Duplicate requests and reopening the same selection in one page do not create duplicate records. A new selected offer creates a new record. There is one corresponding checkout_intent analytics event, without an email payload.

The /admin dashboard shows selected offers and optional email addresses, with period, variant and campaign filtering; JSON report export includes them. The table displays up to the latest 1,000 matching rows. Both interest records and their events expire after 90 days. The site does not send notification emails automatically; staff use the list for the restock notification and 30% first-order offer. Honor unsubscribe/removal requests sent to privacy@fiberboom.com before contacting the list.

Payment marks are locally served SVGs from activemerchant/payment_icons (see payments/LICENSE.txt). Labels explicitly state these are planned payment methods, not currently enabled methods.

## Stripe activation work still required

Before taking orders, replace sample ingredients, allergens and nutrition with verified data; supply real prices, tax treatment, inventory, shipping rates, dispatch estimates and returns terms. Confirm eligible payment methods in the Danish merchant's Stripe account. Labels currently describe planned options, not enabled merchant capabilities.

Implement a Worker POST endpoint that validates product ID, pack and destination, and calculates all prices and shipping server-side. Never trust URL amounts. Create a Stripe Checkout Session using server-owned price IDs and dynamic payment methods; restrict currency and destination appropriately. Use EUR for Germany and PLN for Poland (BLIK requires PLN). Enable eligible cards/wallets, PayPal, Klarna, BLIK, Przelewy24 and SEPA Direct Debit in Stripe. Bank transfer may need a separate supported invoice/customer-balance flow. Do not assume every method is eligible for every account, currency or purchase.

Keep STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Worker runtime secrets, never the public catalog or build output. Verify webhook signatures; persist orders and idempotent event IDs in D1; distinguish unpaid, processing, paid and refunded orders. Fulfill only after payment confirmation, including delayed-payment events. Add success/cancel pages and payment-failure recovery. Connect InPost locker selection and delivery booking before offering actual locker shipments. Verify the full flow in Stripe test mode before enabling real charges.

## Shared storefront and country preferences

`scripts/shared.mjs` applies the same footer, favicon and header country selector to generated public pages. `/market.js` owns the country preference (`fb_market` in local storage). An explicit `?market=DE|PL` wins over the saved choice; otherwise the default is Germany. Country changes update homepage prices, product prices, payment marks and delivery text. Product links carry the country alongside pack, flavor and campaign parameters.

Languages remain English for now. `localization.publishedLanguages` is the allowlist, with each market's `preferredLanguage` defining its future default. Add translated routes and content first, then publish the language in that allowlist. Country selection can then route to the available language for the same variant/page. Do not mark a language published before its routes exist. Use language-specific catalogs/content when translations are introduced.
