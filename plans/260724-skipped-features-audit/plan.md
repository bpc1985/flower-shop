# Skipped Features Audit — All Phases (1-10)

**Date:** 2026-07-24 | **Request:** List all features planned but skipped/deferred, with code-level detail

## Context

After completing all 10 phases, cross-referenced phase plan docs against actual source code. This report lists every skipped/deferred/stubbed feature with exact file:line references and the specific code that needs to be written.

---

## Priority: HIGH (bugs or missing coverage that blocks production)

### ✅ H1: GHTK shipping module — no unit tests ~~COMPLETED~~

**Phase:** P9 | **Effort:** 2h  
**File:** `apps/backend/src/modules/ghtk/index.ts` (281 lines, single file) | **Test file:** `apps/backend/src/modules/ghtk/__tests__/delivery-zones.test.ts`  
**Status:** ~~No `__tests__/` directory exists.~~ **Done.** 24 tests: 12 zone matching, 6 config resolution, 6 fulfillment options. 106 total tests across all 6 modules.

Code that needs tests:

```typescript
// GHTKClient class (lines 34-131) — 3 HTTP methods:
calculateFee(toDistrictId, toWardCode, weight?)    // line 97: POST /shipment/fee
createOrder(payload)                                 // line 115: POST /shipment/create
cancelOrder(trackingCode)                            // line 128: POST /shipment/cancel

// getZone helper (lines 173-181):
//   Returns zone object from hardcoded ZONES map. Duplicated from GHN.
//   Tests needed: valid district returns zone, unknown district returns null,
//   zone fee/correctness, no district overlap

// GHTKFulfillmentProvider class (lines 189-276) — 8 methods:
validateConnection()                                 // line 219
canCalculateFulfillmentOptions()                     // line 237
calculateFulfillmentOptions(optionData)              // line 241
createFulfillment(data)                              // line 248
cancelFulfillment(fulfillmentData)                   // line 259
getFulfillmentDocuments(fulfillmentData)             // line 271
createReturnFulfillment(_data)                       // line 275
retrieveDocuments(_data)                             // line 276
```

**Config/env vars:** `GHTK_TOKEN`, `GHTK_PICK_PROVINCE`, `GHTK_PICK_DISTRICT`, `GHTK_PICK_WARD`, `GHTK_PICK_ADDRESS`, `GHTK_SANDBOX`

**Pattern to follow:** `apps/backend/src/modules/ghn/__tests__/delivery-zones.test.ts` — inline logic, Vitest, 12 tests

---

### ✅ H2: ~~OTP uses Math.random()~~ — VERIFIED CORRECT

**File:** `apps/backend/src/modules/phone-otp/index.ts:2,147-149`  
**Actual code:**
```typescript
import { randomInt } from "node:crypto";
function generateOTP(): string {
  return randomInt(100000, 1000000).toString();
}
```
OTP generation already uses `crypto.randomInt()` — cryptographically secure. No change needed. **False alarm — marked complete.**

---

## Priority: MEDIUM (functional gaps visible to end users)

### ✅ M1: Search bar — UI only, no search logic ~~COMPLETED~~

**Phase:** P3 | **Effort:** 4h  
**File:** `apps/storefront/src/components/search/search-bar.tsx`  
**Status:** ~~UI shell only.~~ **Done.** Full debounced Medusa search with `useQuery`, results dropdown with thumbnails+links, Cmd+K shortcut, loading/empty/error states, bilingual i18n. Files: `search-bar.tsx` (rewritten), `vi/common.json`, `en/common.json`.

---

### ✅ M2: Filter sidebar — UI only, no filtering ~~COMPLETED~~

**Phase:** P3 | **Effort:** 3h  
**Files:** `filter-sidebar.tsx` (rewritten), `filter-sidebar-suspense.tsx` (new), `product-grid.tsx`, `products/page.tsx`, `occasions/[slug]/page.tsx`, `vi/category.json`, `en/category.json`  
**Status:** ~~UI only.~~ **Done.** `useSearchParams`-driven: occasion checkboxes with multi-select, price range inputs, live filter badges with remove (x), "Clear all" button. `useMemo` client-side filtering on product title/description keyword match + variant price range. Suspense wrapper for CSR boundary.

---

### M3: Occasion analytics chart — empty skeleton

**Phase:** P8 | **Effort:** 3h  
**File:** `apps/backend/src/admin/widgets/occasion-analytics.tsx:4,11,13-26`

**Current state:**
- `line 4`: `// ponytail: placeholder for order-by-occasion chart. Add chart.js or recharts`
- `line 11`: `// ponytail: no real admin analytics endpoint yet in Medusa 2.17`
- `lines 13-26`: Renders two `<Text>` placeholder messages, no data fetching, no chart

**What needs to be built:**
1. `useQuery` hook calling `GET /admin/orders` with occasion metadata filter
2. Aggregation logic grouping orders by occasion (sinh nhật, kỷ niệm, tết...)
3. Bar chart component using `recharts` (lighter than chart.js for React)
4. Install `recharts` as dependency
5. Empty/loading/error states (current placeholder can become empty state)

**Files to modify:** `apps/backend/src/admin/widgets/occasion-analytics.tsx`  
**New dep:** `recharts` (add to `apps/backend/package.json`)

---

### M4: Seasonal promo toggle — saves state, nothing consumes it

**Phase:** P8 | **Effort:** 4h  
**File:** `apps/backend/src/admin/widgets/seasonal-promo-toggle.tsx:6,51-57,33-36`

**Current state:**
- `line 6`: `// Stores state in Medusa app_metadata. Add proper settings module later.`
- `lines 53-57`: `POST /admin/store` writes promo state to `metadata.seasonal_promos`
- `lines 33-36`: `GET /admin/store` reads from `metadata.seasonal_promos`
- **Missing:** Nothing on the storefront consumes this data. Products have no seasonal tags. No homepage banner logic checks active promos.

**What needs to be built:**
1. Storefront fetches store metadata to check active promos (e.g., `GET /store/metadata`)
2. Product tagging for seasonal promotions (e.g., tag `promo-tet` on products)
3. Homepage banner logic: if Tet promo active, boost Tet products, show banner
4. Product query filtering by promo tags

**Files to modify:**
- `apps/backend/src/admin/widgets/seasonal-promo-toggle.tsx` (save logic)
- `apps/storefront/src/components/home/hero-section.tsx` (banner logic)
- `apps/storefront/src/hooks/use-products.ts` (filter by promo)
- New: `apps/storefront/src/hooks/use-store-metadata.ts`

---

### M5: Admin daily-orders widget — raw fetch, no admin SDK

**Phase:** P8 | **Effort:** 2h  
**File:** `apps/backend/src/admin/widgets/daily-orders.tsx:5`

**Current state:**
- `line 5`: `// ponytail: admin SDK has no useAdminCustomQuery. Use tanstack-query + fetch directly.`
- Uses `useQuery` from `@tanstack/react-query` with raw `fetch()` to `/admin/orders`

**What needs to be done:**
1. Verify whether Medusa 2.17+ admin SDK now has `useAdminCustomQuery` (check `@medusajs/admin-sdk` exports)
2. If available: migrate from raw fetch to SDK hook
3. If not: keep current approach, remove ponytail comment (it's the right approach)

**Files to modify:** `apps/backend/src/admin/widgets/daily-orders.tsx`

---

### M6: Placeholder flower image — FILE DOES NOT EXIST

**Phase:** P3 | **Effort:** 1h  
**Files:**

| File | Line | Code |
|------|------|------|
| `apps/storefront/src/components/product/product-gallery.tsx` | 13 | `images.length > 0 ? images : ["/placeholder-flower.jpg"]` |
| `apps/storefront/src/components/product/product-card.tsx` | 30 | `product.thumbnail \|\| "/placeholder-flower.jpg"` |
| `apps/storefront/src/components/cart/cart-item.tsx` | 20 | `item.thumbnail \|\| item.variant?.product?.thumbnail \|\| "/placeholder-flower.jpg"` |

**Status:** `/placeholder-flower.jpg` does NOT exist anywhere in the project. All 3 components render broken images when real images are missing. `find` + `ls` confirmed the file was never created.

**What needs to be done:**
1. Create `apps/storefront/public/placeholder-flower.jpg` — a static flower silhouette/default image
2. Alternative: replace with inline SVG or CSS gradient placeholder (no file dependency, no broken image)

**Files to modify:** Create `apps/storefront/public/placeholder-flower.jpg` or change fallback in 3 components

---

## Priority: LOW (infrastructure / hardening / ops)

### L1: GHN/GHTK delivery zones hardcoded

**Phase:** P6/P9 | **Effort:** 6h  
**Files:**
- `apps/backend/src/modules/ghn/index.ts:19-25`
- `apps/backend/src/modules/ghtk/index.ts:20-24`

**Exact hardcoded structure (identical in both modules):**
```typescript
// ponytail: hardcoded delivery zones for initial launch.
// Add admin-configurable zones when expanding beyond HCMC.
const ZONES = {
  innerCity:    { id: "zone-1", districtIds: [1442, 1444, 1446, 1447], maxMinutes: 90,  fee: 0 },
  extendedCity: { id: "zone-2", districtIds: [1443, 1448, 1454, 1455], maxMinutes: 120, fee: 30000 },
  suburban:     { id: "zone-3", districtIds: [1449, 1456, 1457],          maxMinutes: 180, fee: 50000 },
};
```

**What needs to be built:**
1. Database table `delivery_zone` with columns: id, name, district_ids (jsonb), max_minutes, fee
2. Migration to populate initial HCMC zones
3. Admin CRUD endpoint `/admin/delivery-zones`
4. Replace `const ZONES` in both modules with async DB/API query
5. Admin widget to manage zones

**Files to modify:** `apps/backend/src/modules/ghn/index.ts`, `apps/backend/src/modules/ghtk/index.ts`, new migration + admin route

---

### L2: OTP rate limiting — DB-backed, not Redis

**Phase:** P4 | **Effort:** 3h (if Redis upgrade desired) — or 0h (current is production-ready)  
**File:** `apps/backend/src/modules/phone-otp/index.ts:186-208`

**Current state:**
- Uses `authIdentityProviderService.getState()`/`setState()` — Medusa's built-in state mechanism backed by PostgreSQL
- Persists across server restarts (not in-memory)
- Rate limit window: 3 requests per 5 min (`maxRequestsPerWindow`)
- Resend cooldown: 60 seconds (`resendCooldownSeconds`)
- Max attempts: 5 per OTP (`maxAttempts`)
- 19 tests already cover this logic at `__tests__/otp-rate-limit.test.ts`

**What's missing (optional hardening):**
1. Redis-backed sliding window for distributed deployments
2. Per-IP rate limiting in addition to per-phone
3. TTL-based cleanup of expired OTP states

**Conclusion:** Current implementation is database-backed and production-viable. Redis upgrade is a scale optimization, not a bug.

---

### L3: VAT rate hardcoded 10%

**Phase:** P2 | **Effort:** 2h  
**Source:** `phase-02-backend-core.md` line 60: "For launch, use 10% — adjustable later without code changes"

**Current state:** VAT is a Medusa tax region configuration, not in application code. Changing it requires Medusa admin or API call — no code change needed. This item is ops/config, not code debt.

**What needs to be done:** Configure agricultural product tax tiers (0%/5%) in Medusa tax region when business requirements dictate.

---

### L4: ESMS brand name not pre-registered

**Phase:** P4 | **Effort:** Ops, no code  
**Source:** `phase-04-auth.md` line 284: "Brandname: 'BloomWedding' — Must be registered with ESMS"

**Status:** Operational prerequisite for production SMS. ESMS requires brand name pre-registration before sending. The code in `phone-otp/index.ts:97-100` handles ESMS API correctly — will fail gracefully with ESMS error response until brand is registered.

---

### L5: GHN API fallback — no circuit breaker

**Phase:** P6 | **Effort:** 2h  
**File:** `apps/backend/src/modules/ghn/index.ts:415` *(plan reference)*  
**Current state:** Falls back to hardcoded zone fee when GHN API call fails. No retry logic multiplier, no exponential backoff.

**What needs to be built:** Simple retry wrapper with 3 attempts + exponential backoff around GHN API calls.

---

### L6: Bundle analyzer not automated

**Phase:** P10 | **Effort:** 1h  
**Source:** `phase-10-i18n-test-polish.md` section 10.2: `ANALYZE=true pnpm build`

**What needs to be done:**
1. Install `@next/bundle-analyzer` (storefront only)
2. Add `ANALYZE=true` check in `next.config.ts`
3. Add CI check: build with analyzer, enforce route budget < 200KB JS

---

### L7: `pnpm audit` — 6 transitive vulnerabilities

**Phase:** P10 | **Effort:** Upstream (Medusa)  
**Findings:**
- `lodash`: Code injection via `_.template` (HIGH)
- `vite`: `server.fs.deny` bypass on Windows (HIGH)
- `OpenTelemetry`: DoS vulnerability (HIGH)
- `lodash`: Prototype pollution (MODERATE)
- `vite`: Path traversal in optimized deps (MODERATE)
- `postcss`: XSS via CSS injection (MODERATE)

All are transitive dependencies of Medusa packages. Not fixable at project level — requires Medusa upstream version bumps.

---

### L8: Backend has no lint script or ESLint config

**Phase:** P1 | **Effort:** 0.5h  
**File:** `apps/backend/package.json`

**Current state:** Zero lint dependencies exist in `devDependencies` or `dependencies`. No `eslint.config.*`, no `.eslintrc*`. Scripts include `typecheck` and `test` but no `lint`.

**What needs to be done:**
1. Add `lint` script to `package.json`
2. Install: `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
3. Create `eslint.config.mjs` (flat config) matching storefront conventions
4. Add `lint` to Turborepo pipeline

**Files to create:** `apps/backend/eslint.config.mjs`  
**Files to modify:** `apps/backend/package.json`

---

### L9: Post-purchase account creation prompt

**Phase:** P4 | **Effort:** 3h  
**Source:** `phase-04-auth.md` line 747: "Optional account creation after order: 'Tạo tài khoản để theo dõi đơn hàng?'"

**Status:** Design concept only — no code exists. Checkout confirmation page shows order details but offers no account creation flow.

**What needs to be built:**
1. UI on order confirmation page showing account creation prompt
2. API: create account from order data (phone/email from checkout)
3. Link order to newly created account

**Files to modify:** `apps/storefront/src/app/[locale]/checkout/page.tsx` (confirmation step)

---

### L10: E2E tests — written, not executed

**Phase:** P10 | **Effort:** 2h  
**File:** `e2e/critical-paths.spec.ts` — 8 tests written  
**Config:** `playwright.config.ts` — auto-starts dev server

**Status:** Tests exist but need running dev server. CI workflow has no E2E job. Playwright `webServer` config handles auto-start for local runs.

**What needs to be done:**
1. Add E2E job to `.github/workflows/ci.yml` using Playwright GitHub Action
2. Run locally: `npx playwright test`

---

## Already Resolved (was stub/skip, now implemented)

| # | Item | Resolved |
|---|------|----------|
| R1 | Cart hook: empty-array stub → real `useCart` | Phase 7 |
| R2 | Customer hook: null stub → real `useCustomer` | Phase 4 |
| R3 | Payment providers: `[]` → VNPay + Momo + ZaloPay | Phase 5, 9 |
| R4 | Fulfillment providers: `[]` → GHN + GHTK | Phase 6, 9 |
| R5 | "Add to cart" button: `console.log` → `useAddToCart` | Phase 7 |
| R6 | Delivery speed selector: UI-only → GHN zone connected | Phase 6/7 |
| R7 | Header cart badge: `count=0` → `useCartCount()` | Phase 7 |
| R8 | OTP tests: plan comment placeholder → 19 real tests | Phase 10 |
| R9 | Integration tests: plan skeleton → 8 Playwright E2E tests | Phase 10 |
| R10 | CI workflow: spec-only → `.github/workflows/ci.yml` | Phase 10 |
| R11 | Admin `@medusajs/ui` missing → dep added, builds clean | Phase 10 |
| R12 | ZaloPay `verifyMAC` bug → excludes `mac` from signing | Phase 10 |
| R13 | COD reconciliation: cron stub → implemented | Phase 6 |

---

## Summary

| Priority | Count | Real Effort | Items |
|----------|-------|-------------|-------|
| HIGH | 1 | 2h | GHTK tests (OTP crypto was false alarm) |
| MEDIUM | 6 | 17h | Search, filter, analytics chart, promo toggle, admin fetch, placeholder image |
| LOW | 10 | 15.5h | Zones, rate limit, VAT, ESMS, fallback, bundle, audit, lint, post-order, E2E |
| POST-DEPLOY | 5 | manual | Webhook reg, Search Console, prod compose, Lighthouse, security scan |
| **Total** | **22** | **~34.5h** | |

## Verification

- [x] `pnpm typecheck` — passes both workspaces
- [x] `pnpm test` — 91/91 pass (82 backend, 9 storefront)
- [x] `pnpm build` — both apps compile (frontend 8.55s, backend 1.23s)
- [ ] `pnpm audit` — 6 known transitive (Medusa upstream)
