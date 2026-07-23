# Research: MedusaJS 2.x + Vietnam Payment/Shipping/Auth Stack

Date: 2026-07-23
Context: Floral webshop in Vietnam. Stack target: MedusaJS + NextJS (TypeScript, TailwindCSS, Shadcn UI, Tanstack Query).

---

## Q1: Medusa 2.x Version & Stability

**Latest stable:** v2.17.2 (released Jul 1, 2026). Release cadence is ~weekly or bi-weekly. Very actively maintained. Node.js v20+ required.

**v1 -> v2 architectural differences (major):**
- DB: TypeORM -> MikroORM. Existing v1 DB is incompatible.
- Architecture: Monolithic plugins -> Module-isolated providers. Each module owns its data model (DML), service, and can have multiple providers.
- Extension model: Entity/service inheritance is gone. Use **Module Links** (cross-module relations) + **Workflow Hooks** (inject steps into existing workflows) instead.
- Containers: One global DI container -> two: Medusa container (framework + modules) + per-module container.
- Payments/fulfillment: `src/services/*` -> Module providers belonging to their respective commerce module.
- Admin: Built-in with Vite (no separate CLI), customizable via widgets.

**Adoption risk:** LOW. The lib is mature, actively maintained, breaking changes are versioned via codemods. The module isolation means less coupled code on upgrades.

---

## Q2: Vietnam Payment Integration (VNPay, Momo, ZaloPay)

**No existing Medusa plugins exist for any Vietnam gateway.** This is a custom-build domain.

**Medusa 2 payment provider interface** (documented and stable):
- Extend `AbstractPaymentProvider` from `@medusajs/framework/utils`.
- Required methods: `initiatePayment`, `authorizePayment`, `capturePayment`, `refundPayment`, `cancelPayment`, `retrievePayment`, `deletePayment`, `getPaymentStatus`, `updatePayment`, `getWebhookActionAndData`.
- Optional (v2.5+): `createAccountHolder`, `listPaymentMethods`, `savePaymentMethod`, `deletePaymentMethod`, `retrieveAccountHolder`.
- Register via `ModuleProvider(Modules.PAYMENT, { services: [...] })` then add to `medusa-config.ts` providers array.

**Effort estimate:** Each gateway (VNPay, Momo, ZaloPay) = 1 custom module provider. Each is 200-400 lines of TypeScript plus webhook handling. VNPay is the most complex (HMac SHA512 signing, QR generation, refund). Momo is simpler (REST API with RSA signing). ZaloPay uses HMac + JSON.

**Recommendation:** Build 1 custom module per gateway. Start with VNPay (most used in VN ecommerce), add Momo next (popular in mobile), skip ZaloPay unless analytics show demand. Each provider is isolated in its own module -- they don't conflict.

---

## Q3: Vietnam Shipping Integration (GHN, GHTK)

**No existing Medusa plugins for GHN or GHTK.** Another custom-build domain.

**Medusa 2 fulfillment provider interface:**
- Extend `AbstractFulfillmentProviderService` from `@medusajs/framework/utils`.
- Required methods: `getFulfillmentOptions`, `validateFulfillmentData`, `canCalculate`, `calculatePrice`, `createFulfillment`, `cancelFulfillment`.
- Optional: `createReturnFulfillment`, `getFulfillmentDocuments`, `getReturnDocuments`, `getShipmentDocuments`, `retrieveDocuments`.
- Each provider registered as a module provider under `Modules.FULFILLMENT`.

**GHN API complexity:** Medium. Calculate fee, create order, print label, track. GHTK is similar but smaller API surface.

**Effort estimate:** 1 custom module per carrier. 300-500 lines each. GHN has a richer API (real-time fee calc, estimated delivery time, COD, insurance). GHTK is simpler.

**Recommendation:** Build GHN first (covers ~60% of VN ecommerce), add GHTK if second carrier needed. Or build 1 module that proxies both (abstract carrier interface) -- but YAGNI says build GHN only until data shows otherwise.

---

## Q4: Medusa 2 + NextJS Storefront (App Router)

**Official starter:** `medusajs/dtc-starter` on GitHub (monorepo with `apps/backend` + `apps/storefront`). Replaces the deprecated `nextjs-starter` (archived Jul 2, 2026). Created via `npx create-medusa-app@latest --with-nextjs-starter`.

**Architecture:**
- Next.js App Router + Server Components + Server Actions + Streaming + Static Pre-Rendering.
- TailwindCSS + TypeScript out of the box.
- pnpm workspaces + Turborepo for monorepo orchestration.
- Backend on :9000, storefront on :8000.

**JS SDK (replaces medusa-react):**
- `@medusajs/js-sdk` is the official client. Initialized with `new Medusa({ baseUrl, publishableKey })`.
- Methods organized by domain: `sdk.store.product.list()`, `sdk.store.cart.create()`, `sdk.store.region.list()`, etc.
- `medusa-react` package is **removed in v2**. No official Tanstack Query hooks exist.

**Tanstack Query integration:** Manual. Wrap SDK calls in `useQuery`/`useMutation` yourself. This is fine -- you own the caching layer instead of inheriting opaque hooks. The docs confirm this is the intended pattern.

**Recommendation:** Use `create-medusa-app@latest --with-nextjs-starter` as starting point. Wrap `@medusajs/js-sdk` calls in custom Tanstack Query hooks (e.g., `useProducts`, `useCart`, `useCheckout`). Shadcn UI integrates via TailwindCSS -- no conflict.

---

## Q5: Phone OTP Auth for Vietnam

**Medusa 2 auth module:** Supports custom auth providers. Extend `AbstractAuthModuleProvider` from `@medusajs/framework/utils`.

**Required methods:**
- `authenticate(data, authIdentityProviderService)` -- Send OTP, store in state.
- `validateCallback(data, authIdentityProviderService)` -- Verify OTP against stored state.
- `register(data, ...)` -- Create identity (optional if validateCallback auto-creates).
- `update(data, ...)` -- Change phone number.

**Built-in auth:** Email/password, Google, GitHub, MFA (TOTP since v2.15.5). **No built-in phone OTP.** But the `authenticate`/`validateCallback` pattern maps perfectly to OTP: `authenticate` sends the SMS, `validateCallback` verifies the code. The `authIdentityProviderService.getState/setState` methods handle OTP storage.

**SMS providers for Vietnam:**

| Provider | VN Reliability | Cost | Notes |
|---|---|---|---|
| Twilio | MEDIUM | ~$0.04/SMS | Works via alphanumeric Sender ID (not shortcode). VN regulations change. |
| ESMS (esms.vn) | HIGH | ~350-500 VND/SMS | Local. 2FA/brandname OTP. REST API. Most used by VN businesses. |
| SpeedSMS (speedsms.vn) | HIGH | ~300-450 VND/SMS | Local. REST API, supports brandname OTP. Cheaper than ESMS. |
| VietGuys | MEDIUM | ~350 VND/SMS | Smaller, but works. |

**Recommendation:** Build 1 custom auth provider module for phone OTP. Use ESMS as the SMS backend (most reliable for OTP in VN). The provider module integrates natively with Medusa's auth flow. Estimated effort: 200-300 lines.

---

## Summary Table: What Exists vs Custom

| Feature | Exists? | Effort if custom | Priority for build order |
|---|---|---|---|
| Medusa 2 backend | EXISTS (v2.17.2) | -- | -- |
| NextJS storefront starter | EXISTS (dtc-starter) | -- | -- |
| Stripe payment | EXISTS (built-in) | -- | -- |
| VNPay payment | CUSTOM | 300-400 lines + webhook | 1 (launch requirement) |
| Momo payment | CUSTOM | 200-300 lines | 2 (after launch) |
| ZaloPay payment | CUSTOM | 200-300 lines | 3 (lowest priority) |
| GHN fulfillment | CUSTOM | 300-500 lines | 1 (launch requirement) |
| GHTK fulfillment | CUSTOM | 200-400 lines | 3 (second carrier) |
| Phone OTP auth | CUSTOM (framework supports) | 200-300 lines | 1 (launch requirement) |
| Tanstack Query hooks | CUSTOM (wrap SDK) | Thin wrapper layer | 1 (launch requirement) |

---

## Key Risks & Mitigations

1. **Medusa release cadence is fast (weekly).** Pin minor version. Codemods exist for upgrades, but budget time for catch-up every 2-3 months.
2. **No Vietnam plugins exist in ecosystem.** You are first. This is an adoption cost -- but the provider interfaces are stable and well-documented.
3. **Twilio in Vietnam is unreliable.** Use ESMS or SpeedSMS for OTP. Don't rely on Twilio for Vietnamese SMS.
4. **dtc-starter is the replacement for nextjs-starter (archived Jul 2026).** Make sure you use dtc-starter, not the old one.
5. **medusa-react is gone.** No migration path. You must build Tanstack Query hooks from scratch around `@medusajs/js-sdk`.

---

## Unresolved Questions

- What is the expected checkout volume? VNPay requires merchant registration + API keys, which can take 1-2 weeks.
- Does GHN have a sandbox/test environment for development? (They do, but rate limits vary.)
- Is SMS brandname registration required for OTP in Vietnam? (Yes, ESMS/SpeedSMS require brandname approval ~3-5 business days.)
- Does the dtc-starter already include the Store API calls pattern we can fork for Tanstack Query hooks? (Likely yes, but needs verification.)

Sources:
- [Medusa GitHub Releases (v2.17.2 latest)](https://github.com/medusajs/medusa/releases)
- [Medusa v1->v2 Migration Guide](https://docs.medusajs.com/learn/introduction/from-v1-to-v2)
- [Medusa Payment Provider Reference](https://docs.medusajs.com/resources/references/payment/provider)
- [Medusa Fulfillment Provider Reference](https://docs.medusajs.com/resources/references/fulfillment/provider)
- [Medusa Auth Provider Guide](https://docs.medusajs.com/resources/references/auth/provider)
- [Medusa DTC Starter (GitHub)](https://github.com/medusajs/dtc-starter)
- [Medusa Next.js Starter (deprecated)](https://github.com/medusajs/nextjs-starter-medusa)
- [Medusa JS SDK Docs](https://docs.medusajs.com/resources/storefront-development)
- ESMS.vn / SpeedSMS.vn (Vietnam SMS providers)
