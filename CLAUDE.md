# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Bloom Wedding — premium floral e-commerce for Vietnam. MedusaJS 2.x backend + Next.js 15 storefront. Occasion-first navigation, speed-based delivery, bilingual VN/EN.

## Commands

```bash
pnpm install              # Install all workspace deps
docker compose up -d      # Start PostgreSQL 16, Redis 7, MinIO (required for backend)
pnpm dev                  # Run backend (:9000) + storefront (:8000) via Turborepo
pnpm build                # Build all workspaces
pnpm lint                 # Lint all workspaces (ESLint)
pnpm typecheck            # NOT a top-level script — run per workspace

# Backend only
cd apps/backend
npx medusa db:migrate     # Run MikroORM migrations
npx medusa develop        # Dev server with hot reload (port 9000)
npx medusa build          # Production build
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
├── apps/backend/          Medusa 2.x — @medusajs/medusa v2.17.2
│   └── src/
│       ├── lib/           env.ts (Zod), logger.ts (Winston)
│       ├── modules/       Custom providers — phone-otp/
│       ├── scripts/       Seed scripts
│       └── admin-widgets/ Phase 8
├── apps/storefront/       Next.js 15 App Router
│   └── src/
│       ├── app/[locale]/  i18n routes (vi/en, default vi)
│       ├── components/    auth/ layout/ home/ product/ category/ cart/ checkout/ account/ search/ seasonal/ providers/
│       ├── hooks/         Tanstack Query wrappers around @medusajs/js-sdk
│       ├── i18n/          next-intl config + messages (5 namespaces: common, home, product, category, auth)
│       ├── lib/           medusa-client.ts, auth-client.ts, format-currency.ts, utils.ts, constants.ts, env.ts, occasion-calendar.ts
│       └── middleware.ts  i18n locale routing
└── packages/shared-types/ TypeScript types (Product, Cart, DeliveryZone) + Zod schemas
```

## Key Conventions

- **Medusa 2.x, NOT v1.** Admin bundled in `@medusajs/medusa`. `defineConfig`/`loadEnv` re-exported from `@medusajs/medusa`. No `@medusajs/framework` standalone — import from `@medusajs/framework/utils` and `@medusajs/framework/types`.
- **medusa-config.ts uses CJS** (`require`/`module.exports`). Backend source uses ESM (`import`/`export`). Medusa loads TS files with ESM loader at build time.
- **Custom auth providers extend `AbstractAuthModuleProvider`** from `@medusajs/framework/utils`. Types (`AuthenticationInput`, `AuthenticationResponse`, `AuthIdentityProviderService`) from `@medusajs/framework/types`. Auth module registered via `resolve: "@medusajs/medusa/auth"` (NOT `@medusajs/auth`), with provider array in options.
- **Custom modules: single-file.** Medusa ESM loader cannot resolve cross-file TS imports for module providers. Keep all provider code in one `index.ts`. Register with `ModuleProvider(Modules.AUTH, { services })`.
- **No medusa-react.** Custom Tanstack Query hooks wrap `@medusajs/js-sdk`. Auth operations use `medusaClient.auth.login/register/logout`. OTP callback uses direct `fetch()` (SDK has no `validateCallback` method).
- **Kebab-case** for all JS/TS files. Descriptive long names preferred.
- **Zod env validation** in both apps. Backend: `envSchema.parse(process.env)` in `medusa-config.ts`. Storefront: `safeParse` in `lib/env.ts`, imported as side-effect. Backend auth env vars are optional (`.optional()`).
- **CSP headers** in `next.config.ts`. `unsafe-eval` only in development.
- **Guest checkout** supported — COD orders don't require login. Auth required only for account features.
- **No `pnpm typecheck`** top-level script. Run `npx tsc --noEmit` per workspace.

## Design System

- **Fonts:** Playfair Display (headings) + DM Sans (UI). DM Sans uses `latin` + `latin-ext` subsets.
- **Colors:** No pure white. `cream-100` (#FFF8F0) backgrounds. Sage (#9CAF88) primary CTAs. Blush (#E8B4B8) accents. Burgundy (#6B2737) text.
- **Shadcn UI** with custom CSS variables in `globals.css`. 0.5rem radius. Custom shadow tokens.
- **VND formatting:** `100000 → 100.000 ₫`. Dot-separated thousands, no decimals.
- **Forms:** `react-hook-form` + `zod` + `@hookform/resolvers` for validation. Replaces raw `useState` forms.

## Auth System (Phase 4 — Complete)

**Backend (medusa-config.ts):**
```js
resolve: "@medusajs/medusa/auth",
providers: [
  { resolve: "@medusajs/medusa/auth-emailpass", id: "emailpass" },
  // Google: conditionally registered only when GOOGLE_CLIENT_ID env is set
  ...(process.env.GOOGLE_CLIENT_ID ? [{ resolve: "@medusajs/medusa/auth-google", id: "google", options: {...} }] : []),
  { resolve: "./src/modules/phone-otp", id: "phone-otp" }
]
```

**Phone OTP provider** (`apps/backend/src/modules/phone-otp/index.ts`):
- Extends `AbstractAuthModuleProvider`. Implements `authenticate` (send OTP), `validateCallback` (verify OTP), `register`.
- SMS providers: ESMS > SpeedSMS > DevSMS (console log). DevSMS auto-activates when no API keys set.
- Rate limiting: 3 requests per 5-min window, 60s resend cooldown, 5 max attempts per code.
- OTP state persisted via `authIdentityProviderService.setState/getState`.

**Storefront auth hooks** (`hooks/use-auth.ts`): `useCustomer` (session check), `useLogin`, `useRegister`, `useRequestOTP`, `useVerifyOTP`, `useLoginWithGoogle`, `useLogout`.

**Auth UI** (`components/auth/`): `login-dialog.tsx` (Sheet with email/phone tabs + mode toggle), `email-login-form.tsx`, `register-form.tsx`, `phone-otp-form.tsx`, `otp-input.tsx` (6-digit paste-friendly), `google-signin-button.tsx`.

**i18n:** `auth` namespace (19 keys per locale) registered in `i18n/request.ts`.

**Env vars (all optional):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ESMS_API_KEY`, `ESMS_SECRET_KEY`, `SPEEDSMS_API_KEY`, `SPEEDSMS_SENDER_ID`.

## Implementation Phases

| Phase | Status |
|-------|--------|
| 1: Scaffold + i18n + Security | ✅ Complete |
| 2: Backend Core + Products | ✅ Complete |
| 3: Storefront Core | ✅ Complete |
| 4: Auth (Email + Google + Phone OTP) | ✅ Complete |
| 5-10 | Pending |

Full plan: `plans/260723-1305-flower-shop/plan.md`.

## Critical Guardrails

1. **Discover before coding providers.** Read actual Medusa 2.17 types/packages before writing custom modules. Base classes and import paths vary.
2. **Single-file custom modules.** ESM loader can't resolve cross-file TS imports. Consolidate auth/shipping/payment providers into single `index.ts`.
3. **Security per-phase, not deferred.** Phase 4 has rate limiting. Phase 5/6 will have webhook signature verification.
4. **Product data: 50+ products with 6 images each** (Phase 2). Each product has 3 tier variants (Standard/Premium/Deluxe) with stem counts. No white flowers in Tet collection.
5. **Cart delivery fee: "Calculated at checkout"** until address entered and GHN codes available.
6. **Docs** in `docs/`. Plans/reports in `plans/`. No markdown outside those directories.
7. **Docker required** for backend. `docker compose up -d` must run before `pnpm dev`.
8. **Conditional providers** in medusa-config.ts for anything needing external credentials (Google, SMS). Use spread syntax to omit provider when env var missing.
