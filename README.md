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

## Documentation

- `docs/tech-stack.md` — Full technology choices and rationale
- `docs/design-guidelines.md` — Design tokens, typography, color system
- `docs/wireframe/` — Interactive HTML wireframes (homepage, category, product-detail, cart, checkout)

## Getting Started

TBD — Phase 1 will scaffold the monorepo and install dependencies.
