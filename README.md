# Bloom Wedding — Flower Shop

Premium floral e-commerce platform for Vietnam market. Built with MedusaJS headless commerce + Next.js storefront.

## Stack

- **Backend:** MedusaJS 2.x (headless commerce), PostgreSQL, Redis, MinIO
- **Storefront:** Next.js 15 (App Router), TypeScript, TailwindCSS, Shadcn UI, Tanstack Query
- **Payments:** VNPay, Momo, ZaloPay (custom Medusa providers)
- **Shipping:** GHN, GHTK (custom Medusa fulfillment providers)
- **Auth:** Email/Password + Google OAuth + Phone OTP (ESMS/SpeedSMS)
- **Monorepo:** pnpm workspaces + Turborepo

## Key Design Decisions

1. **Occasion-first, not product-first.** Navigation by life event. Product types are secondary.
2. **Speed-based delivery.** ASAP/Today/Tomorrow/Date, not calendar picker.
3. **Elegant aesthetic.** Playfair Display + DM Sans. Cream/sage/blush/burgundy. Never pure white.
4. **Vietnam integrations are custom Medusa providers.** No existing plugins. Each is an isolated module (200-500 lines).
5. **No medusa-react.** Wrap @medusajs/js-sdk in Tanstack Query hooks.

## Getting Started

```bash
pnpm install
docker compose up -d    # PostgreSQL + Redis + MinIO
cp .env.template .env   # Edit with your values
pnpm dev                # Backend :9000, Storefront :8000
```

### First-time setup

```bash
# Run Medusa migrations
cd apps/backend
npx medusa db:migrate

# Create admin user
npx medusa user --email admin@bloomwedding.vn --password use-a-strong-password
```

### Storefront only (backend must be running)

```bash
cd apps/storefront
cp .env.template .env.local
npx next dev --port 8000
```

## Architecture

```
├── apps/
│   ├── backend/          Medusa 2.x — custom modules for VN payments/shipping/auth
│   └── storefront/       Next.js 15 App Router — [locale] routing (vi/en)
├── packages/
│   └── shared-types/     TypeScript types + Zod schemas
├── docs/                 Design guidelines, tech stack, wireframes
└── plans/                Implementation plan (10 phases)
```

## Documentation

- `docs/tech-stack.md` — Full technology choices and rationale
- `docs/design-guidelines.md` — Design tokens, typography, color system
- `docs/wireframe/` — Interactive HTML wireframes
- `CLAUDE.md` — AI coding guidance

## Implementation Status

| Phase | Status |
|-------|--------|
| Phase 1: Monorepo Scaffold + i18n + Security | ✅ Complete |
| Phase 2: Backend Core + 50 Products | Pending |
| Phases 3-10 | Pending |

Full plan: `plans/260723-1305-flower-shop/plan.md`
