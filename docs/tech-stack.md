# Tech Stack

## Backend

| Layer | Choice | Version | Reason |
|-------|--------|---------|--------|
| Headless Commerce | MedusaJS | ^2.17 | Module-isolated architecture, custom provider support |
| Database | PostgreSQL | 16+ | Medusa 2 requirement (MikroORM) |
| Cache | Redis | 7+ | Medusa event bus, session store, job queue |
| Storage | MinIO / S3 | — | Product images, compatible with S3 API |
| Runtime | Node.js | 20+ | Medusa requirement |

## Frontend (Storefront)

| Layer | Choice | Version | Reason |
|-------|--------|---------|--------|
| Framework | Next.js | 15+ | App Router, Server Components, Streaming |
| Language | TypeScript | ^5 | Full-stack type safety |
| Styling | TailwindCSS | ^3.4 | Utility-first, design token friendly |
| Components | Shadcn UI | latest | Tailwind-native, customizable |
| Data Fetching | Tanstack Query | ^5 | Client-side cache, SDK wrapper |
| SDK | @medusajs/js-sdk | ^2 | Official Medusa client (replaces medusa-react) |
| Forms | React Hook Form | ^7 | Checkout forms, validation |
| Validation | Zod | ^3 | Schema validation for forms + API |
| Icons | Lucide React | latest | Shadcn dependency, consistent icon set |
| Font: Headings | Playfair Display | — | Google Fonts, elegant serif |
| Font: UI | DM Sans | — | Google Fonts, clean geometric sans-serif |
| Monorepo | Turborepo | ^2 | Parallel builds, caching |

## Admin

| Layer | Choice | Reason |
|-------|--------|--------|
| Dashboard | Medusa Admin (built-in) | Vite-based, widget-customizable |
| Custom Extensions | Widgets + UI Routes | Light flower-specific customization |

## Payment (Vietnam)

| Provider | Phase | Type |
|----------|-------|------|
| VNPay | Phase 5 | Bank transfer, QR, international cards |
| Momo | Phase 5 | Mobile e-wallet |
| ZaloPay | Phase 9 | E-wallet, Zalo mini-app |

All built as custom Medusa payment module providers (`AbstractPaymentProvider`).

## Shipping (Vietnam)

| Provider | Phase | Type |
|----------|-------|------|
| GHN | Phase 6 | Shipment creation, tracking, COD |
| GHTK | Phase 9 | Second carrier, urban delivery |

Built as custom Medusa fulfillment module providers (`AbstractFulfillmentProvider` — note: NO "Service" suffix, that was Medusa 1.x).

## Auth

| Method | Phase | Type |
|--------|-------|------|
| Email/Password | Phase 4 | Medusa built-in |
| Google OAuth | Phase 4 | Medusa built-in |
| Phone OTP | Phase 4 | Custom provider, ESMS/SpeedSMS backend |

## DevOps

| Layer | Choice | Status |
|-------|--------|--------|
| Package Manager | pnpm | Workspaces support |
| Deployment | TBD (Vercel / VPS / Docker) | Later phase |

## Key Architecture Decisions

1. **All Vietnam integrations are custom module providers.** No existing plugins. Each payment/shipping/auth provider is an isolated Medusa module (200-500 lines each). Stable, documented interfaces.

2. **No medusa-react.** v2 dropped it. Wrap `@medusajs/js-sdk` in custom Tanstack Query hooks. This is the documented pattern.

3. **dts-starter as base.** Official Medusa 2 monorepo starter with Next.js App Router. Do NOT use deprecated `nextjs-starter`.

4. **Shadcn UI over custom components.** Use Shadcn primitives with floral theme tokens. Customize border radius, shadows, colors via CSS variables — not by forking components.

5. **ESMS/SpeedSMS for OTP.** Twilio unreliable in Vietnam. Local SMS providers.

6. **Tet-first seasonal design.** Product catalog and promotions must support seasonal switching (Tet, Women's Day, Valentine's).
