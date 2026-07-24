# Bloom Wedding — Architecture

## Overview

Bloom Wedding is a premium floral e-commerce platform for the Vietnamese market. Built on MedusaJS 2.x backend + Next.js 16 storefront, with Vietnamese payment/shipping gateway integrations.

## Repository Structure

```
bloom-wedding/
├── apps/
│   ├── backend/          MedusaJS 2.x headless commerce
│   └── storefront/       Next.js 16 App Router
├── packages/
│   └── shared-types/     Zod schemas + TypeScript types
├── docker-compose.yml    PostgreSQL 16, Redis 7, MinIO
└── turbo.json            Turborepo build pipeline
```

Monorepo managed by **pnpm** + **Turborepo**. Three workspace packages. All commands run via `pnpm` at root.

## Connection Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                   │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐  │
│  │  Storefront User  │  │  Admin User                          │  │
│  │  (next-intl SSR)  │  │  (Medusa Admin Dashboard)           │  │
│  └──────┬───────────┘  └──────────┬───────────────────────────┘  │
└─────────┼─────────────────────────┼──────────────────────────────┘
          │ HTTP (port 8000)        │ HTTP (port 9000/app)
          ▼                         ▼
┌─────────────────────┐   ┌─────────────────────────────────────────┐
│  Next.js 16          │   │  MedusaJS Backend (port 9000)           │
│  Server (SSR/SSG)    │   │                                         │
│                      │   │  ┌──────────────────────────────────┐   │
│  ┌────────────────┐  │   │  │  Medusa REST API                 │   │
│  │ API Routes     │  │   │  │  /store/* (storefront endpoints) │   │
│  │ (no custom)    │  │   │  │  /admin/* (admin endpoints)      │   │
│  └───────┬────────┘  │   │  │  /auth/* (auth endpoints)        │   │
│          │           │   │  └──────────┬───────────────────────┘   │
│  Medusa  │           │   │             │                           │
│  JS SDK  │           │   │  ┌──────────▼───────────────────────┐   │
│  (client │           │   │  │  Medusa Workflows / Services     │   │
│   calls) │           │   │  └──────────┬───────────────────────┘   │
└──────────┼───────────┘   │             │                           │
           │              ┌┼─────────────┼─────────────────────────┐  │
           │              ││             │                         │  │
           ▼              ▼▼             ▼                         ▼  │
┌─────────────────────────────────────────────────────────────────────┐
│                      Data Layer                                      │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  PostgreSQL 16 │  │  Redis 7     │  │  MinIO (S3 storage)     │  │
│  │  (medusa db)  │  │  (cache +    │  │  (product images,       │  │
│  │               │  │   event bus) │  │   file uploads)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │                         │
          ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      External Gateways                                │
│                                                                      │
│  VNPay ── HTTP ──> Momo ── HTTP ──> ZaloPay ── HTTP                 │
│  (QR/redirect)     (wallet/ATM)      (ZaloPay wallet)                │
│                                                                      │
│  GHN ── HTTP ──> GHTK ── HTTP                                       │
│  (shipping API)   (shipping API)                                     │
│                                                                      │
│  Google OAuth ── HTTP ──> SMS Providers ── HTTP                     │
│                    (ESMS / SpeedSMS / DevSMS)                        │
└─────────────────────────────────────────────────────────────────────┘
```

### How Pages Connect

| Surface | How It Reaches Medusa |
|---------|----------------------|
| **Storefront pages** (SSR) | Next.js server renders page, calls Medusa REST `/store/*` via `@medusajs/js-sdk` during `getServerSideProps` / server component `fetch` |
| **Storefront pages** (CSR) | Browser-side JS calls Medusa REST `/store/*` via `@medusajs/js-sdk` (auth token from localStorage) |
| **Admin dashboard** | Medusa Admin UI (React SPA) bundled into backend at `/app`. Browser calls Medusa REST `/admin/*` directly |
| **Payment gateways** | Backend calls external APIs (VNPay, Momo, ZaloPay). Gateways call back via IPN webhooks to backend |
| **Shipping providers** | Backend calls GHN/GHTK APIs for fee calculation, order creation, tracking |
| **Auth providers** | Google OAuth redirects through backend. SMS OTP calls external SMS APIs |

### Page Rendering Strategy

| Page | Strategy | How Medusa Is Called |
|------|----------|---------------------|
| Home `/` | SSR → hydrated | Server: `medusaClient.store.product.list()`. Client: none |
| Product list `/products` | SSR → hydrated | Server: `medusaClient.store.product.list()` |
| Product detail `/products/[handle]` | SSR → hydrated | Server: `medusaClient.store.product.retrieve()` |
| Category `/occasions/[slug]` | SSR → hydrated | Server: `medusaClient.store.category.list/retrieve()` |
| Cart drawer (global) | CSR | Browser: `medusaClient.store.cart.*()` |
| Checkout `/checkout` | SSR → hydrated | Server: initial load. Client: `medusaClient.store.cart.complete()` |
| Account `/account` | SSR → hydrated | Server: `medusaClient.store.customer.retrieve()` (with JWT cookie) |
| Sitemap `/sitemap.xml` | SSG at build | Build-time: `medusaClient.store.product.list()` (fails gracefully without backend) |
| Admin dashboard | Medusa SPA | Browser: directly calls `/admin/*` REST endpoints |

## Infrastructure (Docker)

Three services defined in `docker-compose.yml`:

| Service | Purpose | Port | Accessed By |
|---------|---------|------|-------------|
| PostgreSQL 16 | Primary database | 5432 | Medusa backend only |
| Redis 7 | Cache + event bus | 6379 | Medusa backend only |
| MinIO | S3-compatible object storage (product images) | 9002 (API), 9001 (Console) | Medusa backend (via `file-s3` provider) |

MinIO serves as a local S3 replacement. All three must be running before starting the backend.

## Backend (`apps/backend/`)

### Configuration

`medusa-config.ts` (CJS) uses `defineConfig` with conditional provider registration. Required env vars validated at startup by `src/lib/env.ts` (Zod schema with `parse`).

### Registered Modules

| Module | Provider | Purpose | Endpoints |
|--------|----------|---------|-----------|
| **Auth** | `emailpass` | Email/password login + register | `/auth/customer/emailpass/*` |
| | `emailpass` (admin) | Admin email/password | `/auth/user/emailpass/*` |
| | `google` (conditional) | Google OAuth login | `/auth/customer/google/*` |
| | `phone-otp` (custom) | Phone OTP with SMS fallback | `/auth/customer/phone-otp/*` |
| **Payment** | `vnpay` (conditional) | VNPay QR/redirect | Initiated by Medusa checkout flow |
| | `momo` (conditional) | Momo wallet/ATM | Initiated by Medusa checkout flow |
| | `zalopay` (conditional) | ZaloPay wallet | Initiated by Medusa checkout flow |
| **Fulfillment** | `ghn` (conditional) | GHN shipping | Initiated by Medusa fulfillment flow |
| | `ghtk` (conditional) | GHTK shipping | Initiated by Medusa fulfillment flow |
| **Cache** | Redis | Caching layer | Internal |
| **Event Bus** | Redis | Async events (e.g. order placed → fulfillment) | Internal |
| **File** | `file-s3` | File uploads to MinIO/S3 | `/uploads` |

Providers are spread into arrays — omitted when required env var is absent.

### Custom Modules (`src/modules/`)

Single-file (ESM loader limitation), each in own directory with `index.ts`:

| Module | Base Class | Medusa Integration | External Communication |
|--------|------------|--------------------|------------------------|
| `phone-otp/` | `AbstractAuthModuleProvider` | Medusa auth flow calls `validateCallback` | SMS via ESMS/SpeedSMS/DevSMS console fallback |
| `vnpay/` | `AbstractPaymentProvider` | Medusa payment session → `createPayment` → redirect URL | User redirected to VNPay. VNPay calls IPN webhook back to backend |
| `momo/` | `AbstractPaymentProvider` | Medusa payment session → `createPayment` → pay URL | User redirected to Momo. Momo calls IPN webhook. `verifyWebhook` validates HMAC |
| `zalopay/` | `AbstractPaymentProvider` | Medusa payment session → `createPayment` | ZaloPay API + callback |
| `ghn/` | `AbstractFulfillmentProviderService` | `canCalculate` / `calculatePrice` / `createFulfillment` / `cancelFulfillment` | HTTP calls to GHN API for shipping quotes, orders, tracking |
| `ghtk/` | `AbstractFulfillmentProviderService` | Same pattern as GHN | HTTP calls to GHTK API |

### External Webhook Flow (Payment)

```
User completes payment on VNPay/Momo site
         │
         ▼
External gateway calls backend IPN webhook URL
         │
         ▼
Backend validates signature (HMAC-SHA256 / SHA512)
         │
         ▼
Medusa payment session updated (authorized/captured)
         │
         ▼
Order status transitions: pending → processing → completed
```

## Storefront (`apps/storefront/`)

### Framework

Next.js 16 App Router with Turbopack. Internationalized routes via `next-intl` — all pages under `app/[locale]/`.

### Route Structure

| Route | Type | Description |
|-------|------|-------------|
| `/` | Dynamic | Home page |
| `/products` | Dynamic | Product listing |
| `/products/[handle]` | Dynamic | Product detail |
| `/occasions` | Dynamic | Occasion listing |
| `/occasions/[slug]` | Dynamic | Category/occasion page |
| `/checkout` | Dynamic | 3-step checkout |
| `/account` | Dynamic | Customer account |
| `/sitemap.xml` | Static | SEO sitemap |
| `/robots.txt` | Static | Robots |

i18n middleware (`proxy.ts`) strips locale prefix for Next.js internals. Default locale: `vi`.

### State Management

No `medusa-react`. Custom **Tanstack Query** hooks wrapping `@medusajs/js-sdk`:

| Hook Module | Key Queries/Mutations |
|-------------|----------------------|
| `use-auth.ts` | `useCustomer`, `useLogin`, `useRegister`, `useRequestOTP`, `useVerifyOTP`, `useLogout`, `useLoginWithGoogle` |
| `use-cart.ts` | `useCart`, `useCartCount`, `useAddToCart`, `useUpdateCartItem`, `useRemoveFromCart`, `useClearCart` |
| `use-checkout.ts` | `useCreateCheckout` |
| `use-products.ts` | Product list/detail |
| `use-categories.ts` | Category queries |
| `use-orders.ts` | Order history |

Query keys centralized in `query-keys.ts`.

### Auth Architecture

- Cart ID persisted in `localStorage` (`medusa_cart_id`)
- JWT stored in `localStorage` (`medusa_jwt`)
- `medusa-client.ts` re-injects stored JWT into SDK on init
- `auth-client.ts` wraps SDK auth methods + raw `fetch` for OTP callback (SDK limitation)

### i18n

8 namespaces (`common`, `home`, `product`, `category`, `auth`, `cart`, `checkout`, `account`), each with `vi`/`en` JSON. Loaded dynamically in `i18n/request.ts`.

### Security

CSP headers in `next.config.ts`:
- `default-src 'self'`
- Scripts: `'self' 'unsafe-inline'` (+ `'unsafe-eval'` dev only)
- Images: `self data: https:`
- Connect: `localhost:9000` (backend)

`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

### Design System

- **Fonts:** Playfair Display (headings) + DM Sans (UI)
- **Colors:** Cream `#FFF8F0`, Sage `#9CAF88`, Blush `#E8B4B8`, Burgundy `#6B2737`
- **Components:** Shadcn UI with custom CSS variables in `globals.css`
- **Radius:** 0.5rem
- **Formatting:** VND with dot-separated thousands (`100.000 d`)

## Shared Types (`packages/shared-types/`)

Zod schemas + TypeScript types shared between backend and storefront. Includes: product types, cart types, delivery zones, price tiers, VN phone validation, address schemas.

## Build Pipeline

```
pnpm build
  └── turbo build
        ├── @bloom/shared-types:build
        ├── @bloom/backend:build    (depends on shared-types)
        └── @bloom/storefront:build (depends on shared-types)
```

- Turborepo caches outputs per task
- `build` depends on `^build` (dependencies build first)
- Backend: `medusa build` — compiles TS + admin UI
- Storefront: `next build` — Turbopack + TypeScript check + static generation

## Deployed Architecture (Production)

```
                            CDN
                             │
              ┌──────────────┼──────────────┐
              ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│  Next.js Storefront      │   │  Medusa Backend          │
│  (Vercel / Node host)    │   │  (VN-hosted VPS)        │
│                          │   │                          │
│  SSR pages via SDK  ─────┼──>│  /store/* REST API       │
│  CSR pages via SDK  ─────┼──>│  (same as above)        │
│                          │   │  /admin/* REST API       │
│  Sitemap: SSG at build   │   │                          │
└─────────────────────────┘   └──────────┬───────────────┘
                                         │
                           ┌─────────────┼─────────────┐
                           ▼             ▼             ▼
                    ┌──────────┐  ┌──────────┐  ┌──────────┐
                    │ PostgreSQL│  │  Redis   │  │  S3      │
                    │ (VN-host) │  │ (VN-host)│  │ (cloud)  │
                    └──────────┘  └──────────┘  └──────────┘
                           │
                           ▼
                    ┌──────────────────────────────────┐
                    │  External Gateways                 │
                    │  (VNPay, Momo, ZaloPay, GHN,      │
                    │   GHTK, Google OAuth, SMS APIs)   │
                    └──────────────────────────────────┘
```

- **Browser → Next.js**: CDN-cached static assets, SSR/SSG pages
- **Next.js → Medusa**: Server-side calls via `@medusajs/js-sdk` for SSR pages; browser-side calls for CSR interactions (cart, checkout)
- **Browser → Medusa (admin)**: Admin users access Medusa Admin SPA directly at `/app`, calling `/admin/*` REST endpoints
- **Medusa → PostgreSQL/Redis/S3**: Direct connections from backend
- **Medusa → External**: HTTP calls to payment gateways, shipping APIs, SMS providers
- **External → Medusa**: Webhook callbacks (IPN) from payment gateways

Deployment notes:
- MinIO replaced by cloud S3 in production
- All VN customer data must stay in VN data centers (ND 53/2022/NĐ-CP)

## Phase Status

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Monorepo + Docker + i18n + Security | Complete |
| 2 | Backend Core + 50+ Products | Complete |
| 3 | Storefront Core + Design System | Complete |
| 4 | Auth (Email, Google, Phone OTP) | Complete |
| 5 | Payment (VNPay, Momo) | Complete |
| 6 | Shipping (GHN) | Complete |
| 7 | Storefront Cart + Checkout | In progress |
| 8 | Admin Widgets | Pending |
| 9 | ZaloPay + GHTK | Pending |
| 10 | Testing, SEO, Deploy | Pending |
