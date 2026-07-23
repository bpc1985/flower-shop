# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Bloom Wedding -- premium floral e-commerce for Vietnam. MedusaJS 2.x backend + Next.js 15 storefront. Occasion-first navigation, speed-based delivery, bilingual VN/EN.

## Commands

```bash
pnpm install              # Install all workspace deps
docker compose up -d      # Start PostgreSQL 16, Redis 7, MinIO (required for backend)
pnpm dev                  # Run backend (:9000) + storefront (:8000) via Turborepo
pnpm build                # Build all workspaces
pnpm lint                 # Lint all workspaces (ESLint)

# Backend only
cd apps/backend
npx medusa db:migrate     # Run MikroORM migrations
npx medusa develop        # Dev server with hot reload (port 9000)
npx medusa user --email admin@bloomwedding.vn  # Create admin user
npx medusa exec ./src/scripts/seed.ts  # Run seed script

# Storefront only
cd apps/storefront
npx next dev --port 8000  # Dev server
npx next build            # Production build
npx tsc --noEmit          # Type-check storefront
```

## Architecture

```
pnpm monorepo (Turborepo)
├── apps/backend/          Medusa 2.x -- @medusajs/medusa v2.17.2
│   └── src/
│       ├── lib/           env.ts (Zod), logger.ts (Winston)
│       ├── modules/       Custom providers -- phone-otp/ vnpay/ momo/ ghn/
│       ├── scripts/       Seed scripts
│       └── admin-widgets/ Phase 8
├── apps/storefront/       Next.js 15 App Router
│   └── src/
│       ├── app/[locale]/  i18n routes (vi/en, default vi) -- / /products /occasions /checkout /account
│       ├── components/    auth/ layout/ home/ product/ category/ cart/ checkout/
│       ├── hooks/         Tanstack Query wrappers: use-auth, use-cart, use-checkout, use-products, use-categories
│       ├── i18n/          next-intl config + 7 namespaces: common, home, product, category, auth, cart, checkout
│       ├── lib/           medusa-client.ts, auth-client.ts, guest-cart.ts, format-currency.ts, utils.ts, constants.ts, env.ts, occasion-calendar.ts
│       └── proxy.ts       Next.js rewrite proxy for i18n path stripping
└── packages/shared-types/ TypeScript types + Zod schemas
```

## Key Conventions

- **Medusa 2.x, NOT v1.** Admin bundled in `@medusajs/medusa`. `defineConfig`/`loadEnv` re-exported from `@medusajs/medusa`. Imports: types from `@medusajs/framework/types`, utilities from `@medusajs/framework/utils`.
- **medusa-config.ts uses CJS** (`require`/`module.exports`). Backend source uses ESM (`import`/`export`). Module providers use `ModuleProvider(Modules.FULFILLMENT, { services })` registration pattern.
- **Provider base classes (verified for Medusa 2.17):**
  - Auth: `AbstractAuthModuleProvider` from `@medusajs/framework/utils`. Register via `resolve: "@medusajs/medusa/auth"`.
  - Payment: `AbstractPaymentProvider` from `@medusajs/framework/utils`. Register via `resolve: "@medusajs/medusa/payment"`.
  - Fulfillment: `AbstractFulfillmentProviderService` from `@medusajs/framework/utils` (NOT `AbstractFulfillmentProvider`). Constructor takes `(cradle, options?)` -- `super()` takes zero args. Register via `resolve: "@medusajs/medusa/fulfillment"`.
- **Custom modules: single-file.** Medusa ESM loader cannot resolve cross-file TS imports for module providers. Keep all provider code in one `index.ts`.
- **No medusa-react.** Custom Tanstack Query hooks wrap `@medusajs/js-sdk`. Auth ops use `medusaClient.auth.login/register/logout`. OTP callback uses direct `fetch()` (SDK has no `validateCallback` method).
- **Kebab-case** for all JS/TS files. Descriptive long names preferred.
- **Zod env validation** in both apps. Backend: `envSchema.parse(process.env)` in `medusa-config.ts`. Storefront: `safeParse` in `lib/env.ts`, imported as side-effect. Auth/payment/shipping env vars are optional (`.optional()`).
- **CSP headers** in `next.config.ts`. `unsafe-eval` only in development.
- **Guest checkout** supported -- COD orders don't require login. Auth required only for account features.
- **No `pnpm typecheck`** top-level script. Run `npx tsc --noEmit` per workspace.

## Design System

- **Fonts:** Playfair Display (headings) + DM Sans (UI). DM Sans uses `latin` + `latin-ext` subsets.
- **Colors:** No pure white. `cream-100` (#FFF8F0) backgrounds. Sage (#9CAF88) primary CTAs. Blush (#E8B4B8) accents. Burgundy (#6B2737) text.
- **Shadcn UI** with custom CSS variables in `globals.css`. 0.5rem radius. Custom shadow tokens.
- **VND formatting:** `100000 -> 100.000 d`. Dot-separated thousands, no decimals.
- **Toasts:** `sonner` library. Cart mutation toasts show Vietnamese success/error messages.

## Auth System (Phase 4 -- Complete)

**Backend (medusa-config.ts):** Three provider types registered under `resolve: "@medusajs/medusa/auth"`:
- `@medusajs/medusa/auth-emailpass` (id: "emailpass") -- works out of the box
- `@medusajs/medusa/auth-google` (id: "google") -- conditionally registered when `GOOGLE_CLIENT_ID` is set
- `./src/modules/phone-otp` (id: "phone-otp") -- custom. DevSMS console-log fallback when no SMS API keys set. Rate limited: 3 req/5min, 60s cooldown, 5 attempts max.

**Storefront:** `hooks/use-auth.ts` exports `useCustomer`, `useLogin`, `useRegister`, `useRequestOTP`, `useVerifyOTP`, `useLoginWithGoogle`, `useLogout`. Auth UI in `components/auth/`. Auth client adapter in `lib/auth-client.ts`. The old stub `hooks/use-customer.ts` was deleted -- `useCustomer` lives only in `use-auth.ts`.

## Payment Providers (Phase 5 -- Complete)

**VNPay** (`apps/backend/src/modules/vnpay/index.ts`): `AbstractPaymentProvider`. QR/redirect from `vnp_Url`. SHA512 HMAC signing. Env: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`.

**Momo** (`apps/backend/src/modules/momo/index.ts`): `AbstractPaymentProvider`. HMAC-SHA256 signing. Includes `verifyWebhook` for IPN callbacks. Env: `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`.

Both use sandbox endpoints. Register payment providers conditionally in `medusa-config.ts` (only when credentials are set). Use spread syntax like auth providers.

## Shipping Provider (Phase 6 -- Complete)

**GHN** (`apps/backend/src/modules/ghn/index.ts`): `AbstractFulfillmentProviderService`. Constructor: `constructor(_cradle, options?)` with `super()` (zero args). Identifier: `"ghn"`. HCMC-only delivery zones (inner city: 90min free, extended: 120min 30k, suburban: 180min 50k). `canCalculate`, `calculatePrice`, `createFulfillment`, `cancelFulfillment`, `getFulfillmentDocuments`. Env: `GHN_TOKEN`, `GHN_SHOP_ID`, `GHN_FROM_DISTRICT_ID`, `GHN_FROM_WARD_CODE`.

## Cart + Checkout (Phase 7 -- In Progress)

**Guest cart** (`lib/guest-cart.ts`): Cart ID stored in `localStorage` under `medusa_cart_id`. Server-side cart auto-expires after 7 days. No `cart.delete` in Medusa JS SDK -- `clearCartId()` only removes localStorage.

**Cart hooks** (`hooks/use-cart.ts`): `useCart` (Tanstack Query, `staleTime: 0`), `useCartCount`, `useAddToCart` (auto-creates cart with `currency_code: "vnd"`), `useUpdateCartItem`, `useRemoveFromCart` (with undo toast), `useClearCart`.

**Cart UI** (`components/cart/`): `cart-drawer.tsx` (Shadcn Sheet), `cart-item.tsx` (quantity +/- with update/remove mutations). Cart drawer embedded in header replacing old checkout-link icon.

**Checkout** (`app/[locale]/checkout/page.tsx`): 3-step flow (shipping -> payment -> review). `useCreateCheckout` hook updates cart with shipping address + metadata, then calls `cart.complete`. COD completes immediately; gateway payments route via payment session.

**Checkout product page** (`components/product/product-info.tsx`): Wired `useAddToCart` mutation to the "Them vao gio hang" button via `selectedVariantId` state from `PriceTierSelector`.

## i18n Namespaces (7 total)

`common`, `home`, `product`, `category`, `auth`, `cart`, `checkout`. Registered in `i18n/request.ts`. Each has `vi` + `en` JSON files under `i18n/messages/`.

## Implementation Phases

| Phase | Status |
|-------|--------|
| 1: Scaffold + i18n + Security | Complete |
| 2: Backend Core + Products | Complete |
| 3: Storefront Core | Complete |
| 4: Auth (Email + Google + Phone OTP) | Complete |
| 5: Payment (VNPay + Momo) | Complete |
| 6: Shipping (GHN) | Complete |
| 7: Storefront Full (Cart + Checkout) | In progress |
| 8-10 | Pending |

Full plan: `plans/260723-1305-flower-shop/plan.md`.

## Critical Guardrails

1. **Discover before coding providers.** Read actual Medusa 2.17 types/packages before writing custom modules. Base class names and import paths vary by module type.
2. **Single-file custom modules.** ESM loader can't resolve cross-file TS imports. Consolidate providers into single `index.ts`.
3. **Conditional providers** in medusa-config.ts for anything needing external credentials. Use spread syntax to omit provider when env var missing.
4. **Provider constructor signatures vary.** Fulfillment: `super()` with zero args. Payment: check the actual base class before coding. Always verify against `node_modules/@medusajs/framework/dist/`.
5. **Security per-phase, not deferred.** Phase 4 has rate limiting. Phase 5 has webhook IPN verification. Phase 6 has zone validation.
6. **Product data: 50+ products with 6 images each** (Phase 2). Each product has tier variants (Standard/Premium/Deluxe). No white flowers in Tet collection.
7. **Cart delivery fee: "Calculated at checkout"** until address entered and GHN codes available. Hardcoded zones for HCMC only.
8. **Docs** in `docs/`. Plans/reports in `plans/`. No markdown outside those directories.
9. **Docker required** for backend. `docker compose up -d` must run before `pnpm dev`.
10. **i18n keys must exist** in both `vi` and `en` JSON files before using `t()` in components. Missing key crashes the page with `MISSING_MESSAGE`.
