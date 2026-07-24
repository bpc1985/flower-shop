# Red Team Plan Review — Bloom Wedding Implementation Plan

**Reviewed:** 2026-07-23
**Plan:** /plans/260723-1305-flower-shop/
**Verdict:** NOT APPROVED — 5 critical flaws, 12 high-severity issues, extensive gaps in security, operations, and realism. Do not begin implementation until criticals are resolved and estimates recalibrated.

## Critical Issues

### C1. Wrong Medusa 2 abstract class names — providers will break at compile time

**Phase 5 (line 15, 42), Phase 6 (line 14), Phase 9 (line 14, 33)**

The plan references `AbstractPaymentProvider`, `AbstractFulfillmentProviderService`, and `AbstractAuthModuleProvider`. In Medusa 2.x (tested against 2.17.2), these are:

- Payment: `AbstractPaymentProvider` — correct (verify exact import path from `@medusajs/framework`)
- Fulfillment: `AbstractFulfillmentProvider` — NOT `AbstractFulfillmentProviderService`. The `Service` suffix was Medusa 1.x naming. Medusa 2 dropped it.
- Auth: The class to extend for custom auth providers is NOT `AbstractAuthModuleProvider`. In Medusa 2.17.2, auth providers implement `IAuthProvider` or extend a base class from the auth module package. The exact interface must be verified against `@medusajs/auth` v2.17.2 source.

The `tech-stack.md` references the same wrong class names. If providers are coded against the wrong base class, every payment, shipping, and auth module will fail. This is a blocking issue — verify every provider's base class against actual Medusa 2.17.2 type definitions before writing a line of provider code.

### C2. Phase 8 admin widgets depend on features that don't exist in Phase 2

**Phase 8 (line 3, 55-60)**

Phase 8 lists `depends on: Phase 2 (Backend core)` but includes widgets for:

- `delivery-status-board` — requires the GHN delivery provider from Phase 6 to exist and have orders flowing through it
- `occasion-performance` — requires Phase 7 checkout to have generated real orders categorized by occasion

These widgets will have zero data to display if built alongside Phase 2. The dependency is wrong. Either:
- Reorder Phase 8 to depend on Phase 6+7, or
- Split Phase 8 into data entry (depends on 2) and admin widgets (depends on 7)

### C3. Tax rate is a question mark — core business logic undefined

**Phase 2 (line 17)**

The plan states "Set up tax rules for Vietnam (VAT 8%?)" with a literal question mark. Vietnamese tax law for goods (not services) is governed by Nghị định 15/2022/NĐ-CP. Key facts that MUST be researched before implementation:

- Standard VAT for goods in Vietnam is 10% (not 8%). The 8% rate was a temporary 2022-2023 reduction that may not be current.
- Flowers may qualify for the 5% rate as "agricultural products" under certain conditions (Thông tư 219/2013/TT-BTC, Điều 4).
- Tax display on consumer-facing prices is legally required (Nghị định 81/2018/NĐ-CP) — prices must show tax-inclusive or clearly note tax treatment.

A question mark on tax rate is a critical blocker. Do not configure the region until the actual rate is confirmed.

### C4. create-medusa-app monorepo vs pnpm+turborepo — conflicting scaffold approach

**Phase 1 (line 17-18)**

The plan says both: "Use `npx create-medusa-app@latest` with `--with-nextjs-starter` flag" AND "OR scaffold manually: copy backend structure from dts-starter." These produce incompatible directory structures:

- `create-medusa-app` generates its own monorepo layout with its own workspace configuration
- The plan's architecture diagram (plan.md lines 10-33) shows a custom monorepo structure that `create-medusa-app` will NOT produce
- `--with-nextjs-starter` is the deprecated approach the plan explicitly warns against ("Do NOT use deprecated nextjs-starter" — plan.md line 71)

Pick ONE approach. Given the plan's explicit constraint ("dts-starter is base"), start from the Medusa 2 application template and manually add the Next.js storefront. The scaffold phase estimate (2-3 hours) is realistic only if this ambiguity is resolved upfront.

### C5. All security hardening deferred to Phase 10 — shipped insecure by default

**Phase 5, Phase 6, vs Phase 10 (lines 95-102)**

Critical security measures listed as Phase 10 checkboxes that MUST be implemented in their respective phases:

| Security measure | Listed in | Belongs in |
|---|---|---|
| Payment webhook signature verification | Phase 10 checklist | Phase 5 — must be in every webhook route.ts |
| Rate limiting on auth endpoints | Phase 10 checklist | Phase 4 — must be in phone-otp provider |
| Input sanitization on all forms | Phase 10 checklist | Phase 3, 4, 7 — at time of form creation |
| CSRF protection | Phase 10 checklist | Phase 1 — as middleware |
| Content Security Policy headers | Phase 10 checklist | Phase 1 — in next.config.ts |
| API keys not exposed to client | Phase 10 checklist | Phase 1 — in SDK initialization |

If webhook signature verification is deferred to Phase 10, every payment confirmation between Phase 5 and Phase 10 can be spoofed. Fix: bake security into each phase's acceptance criteria.

## High-Severity Issues

### H1. Guest checkout vs auth-first flow — conflict

The plan requires auth (Phase 4) before checkout (Phase 7). But the design guidelines (docs/design-guidelines.md) and checkout flow both prominently feature COD — a payment method specifically valued by Vietnamese customers who do NOT want to create accounts. Research report (research-260723-1213-medusa-vn-stack-report.md) likely confirms guest COD is the dominant pattern in VN e-commerce. Forcing account creation before COD checkout will lose conversions. Add guest checkout as a first-class flow OR explicitly decide against it with justification.

### H2. Cart delivery fee calculation architecture is underspecified

Phase 3 creates `use-cart.ts` hooks. Phase 7 shows "Delivery fee line (calculated from GHN)" in the cart drawer (Phase 7 lines 13-17). But:

- GHN fee calculation requires: `to_district_id`, `to_ward_code`, `weight`, dimensions — address data that doesn't exist until checkout step 1
- Medusa's cart API doesn't natively support dynamic shipping fee line items from external providers before the fulfillment selection step
- "Show delivery fee in cart" implies a pre-checkout calculation that architecture doesn't support

The cart drawer cannot show accurate delivery fees until the user provides an address. This needs explicit design: either show "calculated at checkout" or implement a postcode-based pre-estimate with fallback.

### H3. Phase 9 complexity is NOT "Low" — severely underestimated

**Phase 9 (line 4, 64)**

Marked "Low" at "2-3 hours" to build:

- ZaloPay payment provider: HMAC SHA256 signing, two-step flow (create order -> get zp_trans_token -> redirect), QR code + deep link + web redirect support, callback handler
- GHTK fulfillment provider: entirely different API from GHN (different endpoints, different auth, different address code format), fee calculation, order creation, tracking, cancellation
- Frontend: carrier selection UI with price AND estimated delivery time comparison between GHN and GHTK

ZaloPay's sandbox environment has a separate registration process requiring business documents. GHTK's address code system differs from GHN's — they can't share the same `vn-address-codes.json`. This is Medium-High at minimum, 8-10 hours.

### H4. Phase 4 (Auth) effort is unrealistically low

**Phase 4 (line 119)**

Marked "Medium" at "4-5 hours" to build:

- Custom Medusa auth module provider (PhoneOTPAuthProvider) — a class that no public examples exist for, requiring reverse-engineering of Medusa 2's auth module internals
- Two SMS client implementations (ESMS + SpeedSMS) with failover logic
- OTP state management with Redis (5-min expiry, rate limiting) — requires integration with Medusa's auth state mechanism
- Full frontend: login dialog, email tab, phone tab, OTP input (6-box auto-advance), 60s resend countdown, Google button
- Auth context provider, protected routes middleware

This is 10-12 hours minimum. Custom Medusa auth providers are the least-documented extension point in Medusa 2. Budget for discovery.

### H5. Phase 8 (Admin & Products) is two massive phases crammed into one

**Phase 8 (line 102)**

Marked "Medium" at "5-6 hours" for BOTH:

- Data entry: 50-80 products x 6-8 images each x bilingual names + descriptions + care tips + variant pricing + SEO metadata = 400-640 individual images to source/process/upload, 50-80 sets of bilingual marketing copy, 150-240 price points to configure. This alone is 15-20 hours of content work.
- Admin customizations: 4 Vite-based admin widgets (flower-order-stats, occasion-performance, delivery-status-board, seasonal-promo-manager), plus custom UI routes for bulk occasion assignment and delivery zone mapping

Split into two phases: Phase 8a (product data enrichment, 12-15 hours) and Phase 8b (admin customizations, 6-8 hours). Reorder 8a before Phase 3 or merge it into Phase 2.

### H6. Phase 10 (i18n, Test, Polish, Deploy) is four phases masquerading as one

**Phase 10 (line 155)**

Marked "Medium" at "6-8 hours" for:

- Full next-intl i18n with route-based locale, bilingual translation files, language switcher, product content locale switching
- Unit tests for all custom providers (payment x3, shipping x2, auth x1 = 6 providers)
- Unit tests for Tanstack Query hooks
- Integration tests (auth flow, cart flow, payment flow)
- E2E tests (critical path, mobile responsive)
- Performance optimization (image, font, bundle, SSR/streaming)
- Error handling and polish (global error boundary, 404, loading skeletons, toast notifications, empty states, form validation)
- SEO (sitemap, robots.txt, structured data, meta audit, analytics)
- Security audit checklist
- Deployment preparation

This is 30-40 hours of work. Each sub-domain (i18n, testing, performance, deploy) is a standalone phase. Recommend: i18n setup in Phase 1/3 (foundational), testing per-phase (not deferred), performance and polish as continuous concerns.

### H7. VND amount multiplier inconsistency between payment providers

**Phase 5 (lines 33, 51)**

- VNPay: "vnp_Amount (VND x 100)" — VNPay expects amount in VND x 100 (so 100,000 VND = 10,000,000 in the param)
- Momo: documentation varies — some Momo API versions use VND directly, others use x1. No explicit multiplier in the Momo section

If Momo and VNPay handle amounts differently (x100 vs x1), a single order amount could produce a 100x overcharge or undercharge on one provider. The `types.ts` for each provider must document the multiplier explicitly. Add a test that converts the same Medusa cart total through both providers and verifies the resulting amounts match in real VND terms.

### H8. No database migration strategy for incremental phase development

No phase describes how database migrations are created, run, or rolled back. Each phase adds modules (auth, payment, fulfillment) that create new tables or modify schema (via MikroORM). Medusa 2 uses MikroORM's migration system. Questions that need answers:

- When Phase 4 adds the auth module with PhoneOTP provider, does it generate migrations? How are they applied?
- If Phase 5 adds payment providers, do they create separate tables or use Medusa's payment tables?
- How are migrations tracked across the team (shared migration files in git)?

Add a `migrations/` strategy to Phase 1 and a migration step to each phase that modifies the database.

### H9. Phone OTP provider architecture clashes with Medusa 2 auth module

**Phase 4 (lines 24-38)**

The plan describes `authenticate`, `validateCallback`, `register` methods on a provider that "stores OTP in auth state (expires 5 min)." Medusa 2's auth module manages identity creation, state lifecycle, and callback handling internally. The provider's role is more constrained than described:

- The auth module calls `authenticate` with a `AuthenticationInput` — the provider returns `AuthenticationResponse` (success/failure + redirect or callback URL)
- State management (OTP storage, expiry) may need to use the auth module's internal state mechanism or a custom Redis-backed store — can't just "store in auth state"
- `validateCallback` receives the callback from the OTP verification step, not the SMS send step

This needs a deep read of `@medusajs/auth` v2.17.2 source code before implementation. Budget 2-3 hours for discovery alone.

### H10. No webhook IP whitelisting or origin verification

All payment and shipping webhooks (VNPay IPN, Momo IPN, GHN status update, GHTK tracking, ZaloPay callback) are publicly accessible endpoints. The plan mentions signature verification (Phase 10) but not IP whitelisting. VNPay and Momo publish their IP ranges for IPN callbacks. Without IP verification, an attacker who obtains the webhook URL can flood it with fake requests. Even if signature verification passes, DDoS is a risk. Add IP whitelisting to every webhook route.ts.

### H11. Vietnamese data localization law (ND 53/2022/NĐ-CP) not addressed

As of 2026, Vietnam's data localization requirements mandate that personal data of Vietnamese users be stored on servers physically located in Vietnam. If the plan deploys on Vercel (US/EU regions) or non-VN hosting, this violates Vietnamese law. For the storefront (Next.js), this may be manageable since personal data flows through Medusa. But Medusa's PostgreSQL with customer data (names, phones, addresses) falls squarely under ND 53. Hosting Medusa outside Vietnam is a legal risk. Add a deployment constraint: Medusa + PostgreSQL must be hosted in Vietnam or on a cloud provider with VN regions (AWS ap-southeast-1 Singapore may not suffice; check with legal counsel).

### H12. COS reconciliation between GHN COD and Medusa order status is undefined

**Phase 6 (line 120-121)**

The plan correctly notes the risk: "COD + GHN integration: GHN collects COD, needs reconciliation with order status." But no solution is designed. The reconciliation problem:

1. Customer selects COD at checkout → order created in Medusa with payment_status = "pending"
2. GHN delivers, collects cash → GHN holds the money
3. GHN remits to shop on a settlement schedule (weekly/biweekly)
4. Medusa order never automatically transitions to "paid" because no payment webhook fires

Without reconciliation, Medusa shows these orders as unpaid indefinitely. Options: (a) GHN delivery webhook triggers a payment capture event in Medusa, (b) manual reconciliation via admin widget, (c) scheduled job comparing GHN settlement reports against Medusa orders. Design this flow before Phase 6 implementation.

## Medium-Severity Issues

### M1. Tanstack Query cache invalidation is cross-cutting but undefined

When payment completes (Phase 5/7), the cart should be cleared. When auth state changes (Phase 4), customer data should refresh. When an order is placed (Phase 7), order history should refetch. The plan lists per-hook invalidation but no cross-cutting invalidation strategy. Without `queryClient.invalidateQueries` calls at key transition points, stale data will persist. Add a cache invalidation matrix to the hooks architecture.

### M2. No SSR/SSG strategy for product pages

Phase 3 builds product listing and detail pages with client-side Tanstack Query fetching. Product pages are highly SEO-sensitive (flower shop relies on organic search). Client-side rendering means search engines see empty shells. Next.js 16 App Router supports Server Components — product pages should pre-render server-side with ISR (revalidate every 30 min). The plan never mentions RSC, `generateStaticParams`, or ISR.

### M3. No error boundary between payment redirect and return

VNPay and Momo (Phase 5) redirect the user to an external payment page. If the user closes the tab, loses connection, or the return redirect fails, Medusa has an order stuck in "awaiting payment." No timeout/cron job to cancel stale pending payments is designed. Payment gateways eventually time out their side (typically 15-30 minutes), but Medusa won't know. Add a scheduled job or workflow to cancel orders with `payment_status = "pending"` older than N minutes.

### M4. Address autocomplete UX risk — GHN API latency from VN

The address autocomplete component (Phase 6, line 96) calls GHN's address suggestion API on every keystroke. If the API is called from the browser (client-side), every keystroke generates a round-trip to GHN's servers. GHN API latency from Vietnam is typically 200-500ms. Without debounce (300ms minimum) and result caching, the address input will feel sluggish and may hit GHN rate limits. Add debounce and a local cache to the autocomplete design.

### M5. Tet traffic scaling strategy absent

The plan mentions Tet-specific products (Phase 2, line 63) and seasonal banners (Phase 7) but no scaling strategy for Tet traffic, which in Vietnam can be 5-10x normal e-commerce traffic. Considerations:

- Medusa API: can a single Node.js instance handle 10x load? Need horizontal scaling plan.
- PostgreSQL: connection pooling (PgBouncer) configured?
- Redis: cluster mode or single instance?
- GHN API rate limits: will GHN accept 10x shipping requests from a single shop_id during Tet?
- Image serving: MinIO/S3 bandwidth costs at 10x traffic

Add a scaling section to the deployment plan, even if initial launch doesn't implement it.

### M6. Phone number validation gaps

**Phase 4 (lines 62-63)**

Plan mentions "Phone input with Vietnam flag +84 prefix" but doesn't specify validation rules. Vietnamese phone numbers:
- Can be 10 or 11 digits (11-digit numbers are being phased out but still exist)
- Mobile prefixes: 03x, 05x, 07x, 08x, 09x (after migration from 01xx)
- Landline prefixes: 02x

The OTP form needs regex validation that accepts valid VN numbers and rejects invalid ones before calling ESMS (which charges per SMS). Add validation to the OTP form acceptance criteria.

### M7. Image optimization deferred to Phase 10

**Phase 10 (lines 65-66)**

The plan lists "Image optimization: next/image with WebP, lazy loading, blur placeholder" as Phase 10 work. Product listing pages (Phase 3) will have 20-30 product images with no optimization. The initial storefront will be slow. `next/image` with `priority`, `sizes`, `placeholder="blur"`, and WebP format should be configured in Phase 3 when the components are built, not retrofitted later.

### M8. The `medusa-config.ts` module registration pattern may be incompatible

**Phase 4 (lines 43-57), Phase 5 (lines 56-69)**

The plan shows modules configured directly in `medusa-config.ts` via `options.providers`. In Medusa 2.17.2, custom modules (like payment providers) are typically registered as separate module resolves, not nested inside the core module's options. Example:

```ts
// Plan shows:
modules: {
  payment: {
    resolve: "@medusajs/payment",
    options: {
      providers: [
        { resolve: "./src/modules/vnpay" },
      ],
    },
  },
}

// Medusa 2.17.2 typically expects:
modules: {
  payment: { resolve: "@medusajs/payment" },
  vnpayPayment: { resolve: "./src/modules/vnpay" },
}
```

The exact pattern depends on whether the custom providers are module providers (separate module) or loaded as service providers (nested options). Verify against Medusa 2.17.2 docs before implementing.

### M9. No scheduled job for ward/district code refresh

**Phase 6 (line 52-53)**

GHN's district/ward code data is stored as "static JSON." Vietnamese administrative boundaries change every 2-5 years (recent examples: TP Thủ Đức formation, district reorganizations in Hanoi). The plan acknowledges this risk but provides no refresh mechanism. A stale `vn-address-codes.json` means the GHN provider can't validate real customer addresses. Add a scheduled task (monthly) that fetches the latest codes from GHN's master data API and updates the local cache.

### M10. Car comparison (GHN vs GHTK) requires non-standard Medusa fulfillment logic

**Phase 9 (lines 49-52)**

The plan wants customers to "choose between GHN and GHTK" with price and delivery time comparison. Medusa 2's fulfillment module is designed for one active fulfillment provider per shipping option. Running two providers simultaneously and letting the user pick requires custom logic that bypasses Medusa's fulfillment selection. Options:

1. Register both as separate shipping options in Medusa (creates two shipping options per zone)
2. Pre-calculate both provider fees client-side and only create the fulfillment on the selected one
3. Build a custom "carrier comparison" service outside Medusa's fulfillment module

Design this flow before Phase 9. Option 2 is the safest — calculate fees via both providers' APIs from the storefront, display comparison, then create the fulfillment with the chosen provider at order time.

## Missing Phases/Features

The following are entirely absent from the plan and represent gaps that will be discovered during implementation:

| Gap | Impact | Where needed |
|---|---|---|
| Order notification system (SMS/email on status change) | Customers don't know delivery status | Phase 6 or new phase |
| Admin new-order notifications (push/email to florist) | Orders sit unprocessed | Phase 7-8 |
| Inventory management for perishable flowers | Over-selling seasonal flowers | Phase 2 |
| Refund/cancellation flow (UX) | No path for customer-initiated cancellation | Phase 7 |
| Wishlist/favorites | Missing gifting feature (send hint to partner) | Phase 7 optional |
| Delivery photo upload (proof of delivery) | GHN drivers take photos — where stored? | Phase 6 |
| Seasonal catalog toggle mechanism | Tet switches products on/off — how? | Phase 8 |
| HTTP caching headers for Medusa Store API | Repeated API calls hammer backend | Phase 2-3 |
| pnpm workspace dependency graph | Inter-package build order | Phase 1 |
| TypeScript path aliases | `@modules/vnpay` imports | Phase 1 |

## Dependency Graph Errors

The dependency graph (plan.md lines 53-64) has these errors:

1. **Phase 8 depends on Phase 7 for widget data** — delivery status and occasion performance widgets need orders and fulfillments. Either reorder Phase 8 after Phase 7 or split it.
2. **Phase 9 depends on Phase 7 for frontend carrier comparison** — the carrier selection UI lives in checkout (Phase 7). If Phase 9 adds GHTK, the checkout payment/shipping step needs modification. Phase 9 should depend on Phase 7, not just Phase 5 and 6.
3. **Phase 3 partially depends on Phase 4** — `use-cart.ts` and `use-customer.ts` hooks are created in Phase 3 but can't function without auth (cart auth token, customer session). These hooks will produce errors if called before Phase 4. Either stub them or move hook creation to Phase 4+7.

## Phase Ordering Recommendations

Current order: 1 → 2 → 3,4,5,6 → 7 → 8 → 9 → 10

Recommended order:

```
1 (Scaffold + i18n foundation + security middleware)
 → 2 (Backend + 50+ products now, not phase 8) 
   → 3 (Storefront core)
     → 4 (Auth with rate limiting built-in, not deferred)
       → 5 (Payment with webhook sig verification built-in)
         → 6 (Shipping with COD reconciliation designed)
           → 7 (Full storefront)
             → 8 (Admin widgets only — products already done in 2)
               → 9 (Extended payments/shipping)
                 → 10 (Testing, SEO, deploy — security already baked in)
```

Key changes:
- Merge product data entry from Phase 8 into Phase 2 (storefront needs real products from day 1)
- Set up i18n infrastructure in Phase 1, not Phase 10 (prevents rebuilding every component)
- Build security into each feature phase, not deferred to Phase 10
- Reserve Phase 8 for admin widgets only
- Reserve Phase 10 for testing, performance, SEO, deployment

## Effort Estimates — Reality Check

| Phase | Plan Estimate | Realistic Estimate | Delta |
|-------|--------------|-------------------|-------|
| Phase 1 | 2-3h | 3-4h | +50% |
| Phase 2 | 4-5h | 6-8h (with product data) | +60% |
| Phase 3 | 8-10h | 12-15h | +50% |
| Phase 4 | 4-5h | 10-12h | +150% |
| Phase 5 | 5-6h | 8-10h | +70% |
| Phase 6 | 5-6h | 10-12h | +100% |
| Phase 7 | 10-12h | 15-18h | +50% |
| Phase 8 | 5-6h | 18-25h (data entry + widgets) | +250% |
| Phase 9 | 2-3h | 8-10h | +250% |
| Phase 10 | 6-8h | 30-40h | +400% |
| **Total** | **51-64h** | **120-154h** | **~2.5x underestimate** |

## Summary

The plan has a strong architectural vision (occasion-first UX, isolated VN providers, Tanstack Query wrapping) and the wireframes/research provide solid UX direction. But it is NOT ready for implementation due to:

1. **Blocking technical errors** — wrong Medusa 2 class names, conflicting scaffold approach, auth provider architecture guessing
2. **Deferred security** — all hardening pushed to Phase 10
3. **Absurd effort estimates** — 2.5x underestimation, particularly Phase 8 and Phase 10
4. **Missing operational foundations** — no logging, monitoring, migration strategy, data residency compliance
5. **Architecture gaps** — cart delivery fee, COD reconciliation, carrier comparison, guest checkout

**Recommendation:** Revise the plan addressing all critical and high-severity issues. Recalibrate estimates using the realistic column above. Move security, i18n, and product data into earlier phases. Then proceed to Phase 1.
