# Bloom Wedding — Flower Shop

Premium floral e-commerce platform for Vietnam market. Built with MedusaJS headless commerce + Next.js storefront.

## Stack

- **Backend:** MedusaJS 2.x (headless commerce), PostgreSQL, Redis, MinIO
- **Storefront:** Next.js 15 (App Router), TypeScript, TailwindCSS, Shadcn UI, Tanstack Query
- **Payments:** VNPay, Momo, ZaloPay (custom Medusa providers) — Phase 5/9
- **Shipping:** GHN, GHTK (custom Medusa fulfillment providers) — Phase 6/9
- **Auth:** Email/Password + Google OAuth + Phone OTP (ESMS/SpeedSMS, dev-mode console log)
- **Monorepo:** pnpm workspaces + Turborepo

## Key Design Decisions

1. **Occasion-first, not product-first.** Navigation by life event. Product types are secondary.
2. **Speed-based delivery.** ASAP/Today/Tomorrow/Date, not calendar picker.
3. **Elegant aesthetic.** Playfair Display + DM Sans. Cream/sage/blush/burgundy. Never pure white.
4. **Vietnam integrations are custom Medusa providers.** No existing plugins. Each is an isolated module.
5. **No medusa-react.** Wrap @medusajs/js-sdk in Tanstack Query hooks.
6. **Guest checkout.** COD orders don't require login. Auth required only for account features.

## Getting Started

```bash
pnpm install
docker compose up -d    # PostgreSQL 16 + Redis 7 + MinIO
pnpm dev                # Backend :9000, Storefront :8000
```

### First-time setup

```bash
cd apps/backend

# Configure environment
cp .env.template .env   # Edit DATABASE_URL, JWT_SECRET, COOKIE_SECRET

# Run migrations
npx medusa db:migrate

# Create admin user
npx medusa user --email admin@bloomwedding.vn

# Seed 50+ products, categories, region
npx medusa exec ./src/scripts/seed.ts
```

### Auth credentials (optional)

All auth env vars are optional. Without them:
- **Email/password:** Works immediately — no credentials needed.
- **Phone OTP:** OTP codes logged to backend console (DevSMS). Set `ESMS_API_KEY` + `ESMS_SECRET_KEY` or `SPEEDSMS_API_KEY` + `SPEEDSMS_SENDER_ID` for real SMS.
- **Google OAuth:** Provider auto-disabled when `GOOGLE_CLIENT_ID` is not set. Add it to `.env` to enable.

## Architecture

```
├── apps/
│   ├── backend/          Medusa 2.x — custom modules for auth, VN payments/shipping
│   │   └── src/
│   │       ├── modules/  phone-otp/ (custom auth provider)
│   │       ├── lib/      env.ts, logger.ts
│   │       └── scripts/  seed suites
│   └── storefront/       Next.js 15 App Router — [locale] routing (vi/en, default vi)
│       └── src/
│           ├── components/  auth/ layout/ home/ product/ category/ cart/ checkout/
│           ├── hooks/       Tanstack Query wrappers
│           ├── i18n/        messages (vi+en, 5 namespaces)
│           └── lib/         medusa-client, auth-client, utils, env
├── packages/
│   └── shared-types/     TypeScript types + Zod schemas
├── docs/                 Design guidelines, tech stack
└── plans/                Implementation plan (10 phases)
```

## Auth (Phase 4 — Complete)

Three provider types registered in `medusa-config.ts`:

| Provider | Package | Status |
|----------|---------|--------|
| Email/Password | `@medusajs/medusa/auth-emailpass` | Works out of the box |
| Google OAuth | `@medusajs/medusa/auth-google` | Needs `GOOGLE_CLIENT_ID` in env |
| Phone OTP | `./src/modules/phone-otp` | DevSMS (console log) by default |

Auth hooks in `hooks/use-auth.ts`: `useCustomer`, `useLogin`, `useRegister`, `useRequestOTP`, `useVerifyOTP`, `useLoginWithGoogle`, `useLogout`.

## Documentation

- `CLAUDE.md` — AI coding guidance (architecture, conventions, patterns)
- `docs/design-guidelines.md` — Design tokens, typography, color system
- `plans/260723-1305-flower-shop/plan.md` — Full implementation plan
- `plans/260723-1305-flower-shop/phase-*.md` — Per-phase details

## Implementation Status

| Phase | Status |
|-------|--------|
| 1: Monorepo Scaffold + i18n + Security | ✅ Complete |
| 2: Backend Core + 50 Products | ✅ Complete |
| 3: Storefront Core | ✅ Complete |
| 4: Auth (Email + Google + Phone OTP) | ✅ Complete |
| 5-10 | Pending |
