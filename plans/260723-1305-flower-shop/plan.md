# Bloom Wedding — Implementation Plan (v2)

**Status:** Planning
**Created:** 2026-07-23 | **Revised:** 2026-07-23 (red team review)
**Stack:** MedusaJS 2.x + Next.js 16, TypeScript, TailwindCSS, Shadcn UI, Tanstack Query

## Architecture

```
monorepo (pnpm + Turborepo)
├── apps/
│   ├── backend/          # MedusaJS 2.x headless commerce
│   │   ├── src/
│   │   │   ├── modules/  # Custom providers
│   │   │   │   ├── vnpay/       # Phase 5
│   │   │   │   ├── momo/        # Phase 5
│   │   │   │   ├── zalopay/     # Phase 9
│   │   │   │   ├── ghn/         # Phase 6
│   │   │   │   ├── ghtk/        # Phase 9
│   │   │   │   └── phone-otp/   # Phase 4
│   │   │   ├── workflows/       # Custom workflow hooks
│   │   │   ├── admin-widgets/   # Phase 8
│   │   │   └── jobs/            # Scheduled jobs (address codes, payment cleanup)
│   │   └── medusa-config.ts
│   └── storefront/       # Next.js 16 App Router
│       ├── src/
│       │   ├── app/[locale]/  # i18n from Phase 1
│       │   ├── components/
│       │   ├── hooks/         # Tanstack Query wrappers
│       │   ├── lib/           # SDK client, utils
│       │   └── i18n/          # Translation files
│       └── next.config.ts
└── packages/
    └── shared-types/     # Shared TypeScript types
```

## Phases (Revised)

| # | Phase | Depends On | Complexity | Ships |
|---|-------|------------|------------|-------|
| 1 | Monorepo Scaffold + Foundations | — | Medium | Monorepo, Docker, i18n, security middleware, migrations |
| 2 | Backend Core + Products | 1 | High | Medusa running, 50+ products, categories, tax config |
| 3 | Storefront Core | 1,2 | High | Design system, i18n layout, product browsing |
| 4 | Auth | 1,2 | High | Email + Google + Phone OTP (with rate limiting) |
| 5 | Payment | 2 | High | VNPay + Momo (with webhook security) |
| 6 | Shipping | 2 | High | GHN provider, COD reconciliation, address autocomplete |
| 7 | Storefront Full | 3,4,5,6 | High | Cart, checkout (guest + auth), all UX patterns |
| 8 | Admin Widgets | 7 | Medium | Admin customizations with real order data |
| 9 | Extended Payments & Shipping | 5,6,7 | Medium-High | ZaloPay + GHTK + carrier comparison |
| 10 | Testing, SEO, Deploy | All | Medium | Test suite, perf audit, deployment | Complete |

## Dependency Graph (Fixed)

```
Phase 1 (Scaffold + i18n + Security foundations)
  ├── Phase 2 (Backend + Products)  ← 50+ products here, not Phase 8
  │     ├── Phase 4 (Auth)          ← rate limiting built-in
  │     ├── Phase 5 (Payment)       ← webhook security built-in
  │     └── Phase 6 (Shipping)      ← COD reconciliation designed
  └── Phase 3 (Storefront shell)    ← i18n routes from Phase 1
        └── Phase 7 (Full Storefront) ← needs 3 + 4 + 5 + 6
              ├── Phase 8 (Admin Widgets) ← depends on 7 for data
              └── Phase 9 (ZaloPay + GHTK)
                    └── Phase 10 (Testing, SEO, Deploy)
```

## Security: Built-In, Not Deferred

| Measure | Implemented In |
|---------|---------------|
| CSP headers, CSRF middleware | Phase 1 |
| API keys server-only, env validation | Phase 1 |
| Payment webhook signature verification + IP whitelisting | Phase 5, 6, 9 |
| Auth rate limiting (OTP, login) | Phase 4 |
| Input sanitization (Zod schemas) | Phase 3, 4, 7 |
| HTTPS enforcement | Phase 10 (deploy) |

## Key Design Decisions

- **Typography:** Playfair Display (headings) + DM Sans (UI)
- **Colors:** Cream (#FFF8F0), Sage (#9CAF88), Blush (#E8B4B8), Burgundy (#6B2737)
- **Navigation:** Occasion-first (16+ life events), not product-type
- **Delivery:** Speed-based selector (ASAP/Today/Tomorrow/Date), not calendar picker
- **Custom providers:** Each VN gateway is 200-500 line isolated Medusa module
- **Provid base classes (verified for Medusa 2.17):** `AbstractPaymentProvider`, `AbstractFulfillmentProvider` (NOT Service suffix), auth interface TBD via discovery spike
- **No medusa-react:** Wrap @medusajs/js-sdk in Tanstack Query hooks
- **Guest checkout:** COD orders do NOT require account. Auth required only for account features (order history, saved addresses)
- **VAT:** Default 10% for goods, confirm agricultural rate during Phase 2 research
- **Data residency:** PostgreSQL for VN customer data must be hosted in VN (ND 53/2022/NĐ-CP)

## Cart Delivery Fee Architecture

- Cart drawer shows "Delivery calculated at checkout" until address is provided
- After checkout step 1 (address entry), GHN fee is calculated and displayed
- Fee is added as a shipping line item in Medusa cart before payment step

## Effort Estimates (Realistic)

| Phase | Estimate |
|-------|----------|
| Phase 1 | 4-5h |
| Phase 2 | 10-12h |
| Phase 3 | 12-15h |
| Phase 4 | 10-12h |
| Phase 5 | 8-10h |
| Phase 6 | 10-12h |
| Phase 7 | 15-18h |
| Phase 8 | 6-8h |
| Phase 9 | 8-10h |
| Phase 10 | 15-20h |
| **Total** | **98-122h** |

## Verification

Each phase: `pnpm dev` runs both apps, new functionality works end-to-end.
Phase 10: Full test suite + Lighthouse 90+ audit + security scan.
