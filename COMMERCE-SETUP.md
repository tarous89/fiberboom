# Commerce preview

English routes: `/{light|psyllium|boom}/en/product/` and `/checkout/` under the same variant/language prefix. Root remains the Light landing page. `/product` opens Light product; the legacy `/checkout/en/` renders Light checkout.

Edit `site/commerce/catalog.json` to add product information, flavor images, pack sizes, markets, currencies, planned delivery services and payment labels. Variant copy is in `versions`. All product information and Polish pricing are illustrative. Ordering is disabled. Changing `orderingEnabled` alone does not enable payment processing.

Selections and UTM parameters travel in URLs. Contact/address inputs remain in the browser; no order API or payment provider is called. The checkout form prevents native submission even if the module fails. Existing first-party analytics receive commerce events, never the contact/address fields.

## Stripe activation work still required

Before taking orders, replace sample ingredients, allergens and nutrition with verified data; supply real prices, tax treatment, inventory, shipping rates, dispatch estimates and returns terms. Confirm eligible payment methods in the Danish merchant's Stripe account. Labels currently describe planned options, not enabled merchant capabilities.

Implement a Worker POST endpoint that validates product ID, pack and destination, and calculates all prices and shipping server-side. Never trust URL amounts. Create a Stripe Checkout Session using server-owned price IDs and dynamic payment methods; restrict currency and destination appropriately. Use EUR for Germany and PLN for Poland (BLIK requires PLN). Enable eligible cards/wallets, PayPal, Klarna, BLIK, Przelewy24 and SEPA Direct Debit in Stripe. Bank transfer may need a separate supported invoice/customer-balance flow. Do not assume every method is eligible for every account, currency or purchase.

Keep STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Worker runtime secrets, never the public catalog or build output. Verify webhook signatures; persist orders and idempotent event IDs in D1; distinguish unpaid, processing, paid and refunded orders. Fulfill only after payment confirmation, including delayed-payment events. Add success/cancel pages and payment-failure recovery. Connect InPost locker selection and delivery booking before offering actual locker shipments. Verify the full flow in Stripe test mode before enabling real charges.
