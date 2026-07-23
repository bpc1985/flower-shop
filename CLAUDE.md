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
pnpm typecheck            # Type-check all workspaces
pnpm lint                 # Lint all workspaces

# Backend only
cd apps/backend
npx medusa db:migrate     # Run MikroORM migrations
npx medusa develop        # Dev server with hot reload
npx medusa user --email admin@bloomwedding.vn  # Create admin user

# Storefront only
cd apps/storefront
npx next dev --port 8000  # Dev server
npx next build            # Production build
```

## Architecture

```
pnpm monorepo (Turborepo)
├── apps/backend/          Medusa 2.x — @medusajs/medusa v2.17.2
│   └── src/
│       ├── lib/           env.ts (Zod validation), logger.ts (Winston)
│       ├── modules/        Custom providers (Phase 4-9)
│       ├── scripts/        Seed scripts (Phase 2)
│       └── admin-widgets/  Admin dashboard widgets (Phase 8)
├── apps/storefront/       Next.js 15 App Router
│   └── src/
│       ├── app/[locale]/  i18n routes (vi/en, default vi)
│       ├── components/    layout/ home/ product/ category/ cart/ checkout/ auth/ account/
│       ├── hooks/         Tanstack Query wrappers around @medusajs/js-sdk
│       ├── i18n/          next-intl config + message files
│       └── lib/           medusa-client.ts, format-currency.ts, env.ts
└── packages/shared-types/ TypeScript types (Product, Cart, DeliveryZone) + Zod schemas
```

## Key Conventions

- **Medusa 2.x, NOT v1.** Admin bundled in `@medusajs/medusa` — no separate `@medusajs/admin` package. `defineConfig`/`loadEnv` re-exported from `@medusajs/medusa`. No `@medusajs/framework` standalone package exists.
- **AbstractFulfillmentProvider** — NO "Service" suffix (that was Medusa 1.x). Always verify actual base class names from `node_modules/@medusajs/*/dist/` before coding providers.
- **No medusa-react.** Wrapping `@medusajs/js-sdk` in custom Tanstack Query hooks (`useQuery`/`useMutation`). Centralized query keys in `hooks/query-keys.ts`.
- **Kebab-case** for all JS/TS files. Descriptive long names preferred.
- **Zod env validation** in both apps. Backend: imported in `medusa-config.ts`. Storefront: imported in `medusa-client.ts` via side-effect import. Fails fast on missing vars.
- **CSP headers** in `next.config.ts`. `unsafe-eval` only in development.
- **Guest checkout** supported — COD orders don't require login. Auth required only for account features.

## Design System

- **Fonts:** Playfair Display (headings) + DM Sans (UI). DM Sans uses `latin` + `latin-ext` subsets (no `vietnamese` subset available).
- **Colors:** Never pure white. `cream-100` (#FFF8F0) backgrounds. Sage (#9CAF88) primary CTAs. Blush (#E8B4B8) accents. Burgundy (#6B2737) text. Warm (#2D2420/#1A1410) body/headings.
- **Shadcn UI** with custom CSS variables in `globals.css`. 0.5rem radius. Custom shadow tokens.
- **VND formatting:** `100000 → 100.000 ₫`. Dot-separated thousands, no decimals.

## Implementation Phases

10 phases, 98-122h total. Phase 1 (monorepo scaffold) complete. Current state:

| Phase | Status |
|-------|--------|
| 1: Scaffold + i18n + Security | ✅ Complete |
| 2: Backend + 50 Products | Pending |
| 3: Storefront Core | Pending |
| 4-10 | Pending |

Full plan: `plans/260723-1305-flower-shop/plan.md`, phase details in `phase-XX-*.md`.

## Critical Guardrails

1. **Each provider phase starts with discovery spike** — verify actual Medusa 2.17 base class names and method signatures before writing code. Don't trust docs; read types.
2. **Security per-phase, not deferred.** Phase 1 has CSP + env validation. Phase 4 has rate limiting. Phase 5/6 have webhook signature verification. No bulk hardening in Phase 10.
3. **Product data is 50+ products with 6 images each** (Phase 2). Each product has 3 tier variants (Standard/Premium/Deluxe) with stem counts. No white flowers in Tet collection.
4. **Cart delivery fee shows "Calculated at checkout"** until address entered and GHN codes available. Fee added as shipping line item before payment step.
5. **Docs** go in `docs/`. Plans/reports in `plans/`. No markdown files outside these dirs.
6. **Docker required** for backend. `docker compose up -d` must run before `pnpm dev`.
