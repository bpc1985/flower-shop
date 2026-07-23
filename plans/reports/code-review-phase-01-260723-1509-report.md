# Phase 1 Monorepo Scaffold — Code Review

**Date:** 2026-07-23 | **Reviewer:** code-reviewer | **Scope:** Phase 1 only

## Overall Assessment

The scaffold is structurally sound: `pnpm install` succeeds, `next build` passes, and file organization follows the plan. However, **the env validation acceptance criterion is not met** because `env.ts` is dead code in both apps — it's written but never imported, so Zod validation never executes. Logger.ts has the same problem.

---

## Critical Issues

### C1. `env.ts` dead code — Zod validation never executes

**Files:** `apps/backend/src/lib/env.ts`, `apps/storefront/src/lib/env.ts`

Both files define Zod schemas and call `envSchema.parse(process.env)` at module level, but neither file is ever imported. The `grep` for `import.*env` across all app source files returned zero results.

- `apps/backend/medusa-config.ts` uses `loadEnv()` from Medusa (dotenv loader), then accesses `process.env.*` directly — NOT `env.ts`.
- The storefront uses `process.env.NEXT_PUBLIC_*` in `medusa-client.ts` directly — NOT `env.ts`.

**Impact:** Acceptance criterion "Missing env var causes startup failure" fails. A missing `DATABASE_URL` or `JWT_SECRET` will not be caught at startup.

**Fix:** Import `env` from `./src/lib/env` in `medusa-config.ts` before `defineConfig()`, and in `apps/storefront/src/app/layout.tsx` or at the top-level middleware. For the backend, call `envSchema.parse(process.env)` after `loadEnv()` but before `defineConfig()`.

### C2. `logger.ts` never imported

**File:** `apps/backend/src/lib/logger.ts`

The Winston logger is configured but never used. No file imports it. This means structured JSON logging will never be emitted by the app — Medusa uses its own internal logger.

**Impact:** Acceptance criterion "Logger outputs structured JSON" is only technically met (the code exists). App logs won't use this logger.

**Fix:** Either delete (YAGNI — Medusa has built-in logging) or wire into `medusa-config.ts` by importing and using for startup logs. For Phase 1, deletion is the right call — no Medusa code yet references it.

---

## High Priority

### H1. `@bloom/shared-types` not declared as workspace dependency

**Files:** `apps/storefront/package.json`, `apps/backend/package.json`

The storefront tsconfig has path aliases to `@bloom/shared-types`, but neither app declares `"@bloom/shared-types": "workspace:*"` in `dependencies`. TS path resolution via `paths` in tsconfig works for type checking, but:

- pnpm won't symlink the package into `node_modules`
- **`next build` may fail** if the TS compiler can't resolve the module at build time without the workspace link
- Future tooling (eslint import resolver, bundler analysis) may fail to trace dependencies

**Fix:** Add `"@bloom/shared-types": "workspace:*"` to `dependencies` in both `apps/storefront/package.json` and `apps/backend/package.json`.

### H2. Missing Medusa dependencies from plan

**Plan lists deps that are missing from `apps/backend/package.json`:**

| Dependency | Plan | Actual | Risk |
|---|---|---|---|
| `@medusajs/framework` | `^2.17.0` | MISSING | `AbstractPaymentProvider`, `AbstractFulfillmentProvider` — needed in Phase 5/6 |
| `@medusajs/admin` | `^2.17.0` | MISSING | Admin UI plugin — needed for Medusa admin dashboard |

In Medusa 2.17, `@medusajs/framework` provides core provider base classes and utilities. If the plan explicitly calls this out as verified for 2.17, its absence means provider modules in later phases won't compile. `@medusajs/admin` provides the admin dashboard build and runtime.

**Fix:** Either add both deps or confirm via the Medusa 2.17 docs that `@medusajs/medusa` re-exports them (check with `node -e "console.log(require('@medusajs/medusa/package.json').dependencies)"`). If re-exported, note that in a comment in `medusa-config.ts`.

### H3. CSP: `unsafe-eval` in production security header

**File:** `apps/storefront/next.config.ts:23`

```ts
"script-src 'self' 'unsafe-inline' 'unsafe-eval';"
```

`'unsafe-eval'` allows `eval()`, `new Function()`, and related APIs. This is a legitimate XSS vector. It's needed for webpack HMR in Next.js dev mode but should be stripped in production.

**Fix:** Conditionally add `unsafe-eval` based on `NODE_ENV`:

```ts
const isDev = process.env.NODE_ENV === "development";
const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";
```

### H4. Storefront `env.ts` includes Phase 4/6 fields

**File:** `apps/storefront/src/lib/env.ts`

```ts
NEXT_PUBLIC_GHN_TOKEN: z.string().optional(),    // Phase 6 — shipping
NEXT_PUBLIC_GHN_SHOP_ID: z.string().optional(),  // Phase 6 — shipping
NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(), // Phase 4 — auth
```

Marked optional so they won't cause startup failure, but they're scope creep. Adding them now is harmless but violates the phase boundary.

**Fix:** Remove and add in Phases 4 and 6 respectively, or leave with a comment noting the belong-to phase.

---

## Medium Priority

### M1. Backend has no `.env` file

Neither app has a `.env` file. The root `.env.template` exists, plus per-app `.env.template` files. Without `apps/backend/.env`, the backend cannot start.

**Impact:** "`pnpm dev` runs backend" verification blocked without manual copy. Expected workflow: `cp .env.template .env` per-app, but should be documented.

**Fix:** Add a `postinstall` or `setup` script that copies templates, or document in README.

### M2. `medusa-client.ts` bypasses env validation

**File:** `apps/storefront/src/lib/medusa-client.ts:4-5`

```ts
baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
```

Direct `process.env` access with fallback — never goes through `env.ts` Zod validation. A missing `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` silently becomes empty string.

**Fix:** Import from `env.ts`:
```ts
import { env } from "./env";
const medusaClient = new Medusa({
  baseUrl: env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  publishableKey: env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  ...
});
```

### M3. No `.gitignore` in app directories

Per-app `.gitignore` files are recommended for Next.js and Medusa to exclude `.next`, `dist`, build artifacts per-app. Root `.gitignore` covers `node_modules` and `.next` globally, so this works, but per-app gitignores are conventional in monorepos for build outputs.

### M4. Extra Shadcn-friendly CSS variables

**File:** `apps/storefront/src/app/[locale]/globals.css`

Implementation adds 12 CSS custom properties (`--card`, `--primary`, `--secondary`, `--accent`, `--destructive`, etc.) not in the plan's globals.css. Useful for Shadcn UI later, but scope creep from Phase 1.

**Impact:** None. Beneficial scope creep; keeps later phases from needing to retrofit.

---

## Low Priority

### L1. Import order differs from plan in `next.config.ts`

Plan: `import type { NextConfig }` then `import createNextIntlPlugin`.  
Implementation: reversed. No functional impact; cosmetic only.

### L2. Content-Security-Policy in `next.config.ts` is a long string

Hard to read and audit. Consider extracting to a helper function or variable for clarity when the policy grows with more directives.

---

## Edge Cases Found During Scouting

1. **What happens when `pnpm dev` runs both apps concurrently via Turborepo?** Turborepo `dev` task is `persistent: true` and `cache: false` — correct. But the backend needs Docker services running (Postgres, Redis, MinIO). No health-check or startup ordering mechanism. `turbo.json` has no `dependsOn` for dev tasks, so both apps start simultaneously. This is fine as long as Docker is up.

2. **What if `NODE_ENV` is unset?** Medusa's `loadEnv()` defaults to `"development"` if unset — handled. But `winston` logger level defaults to `"info"` if `LOG_LEVEL` is unset — also handled.

3. **`phoneSchema` regex rejects valid Vietnamese prefixes** — The regex `[3|5|7|8|9]` uses pipe characters inside a character class, where pipes are literal (not alternation). Inside `[...]`, `|` matches a literal pipe. The actual character class is `[3|5|7|8|9]` which matches digits 3, 5, 7, 8, 9 AND the pipe character. This is technically wrong (pipes are not phone digits) but functionally correct (the digits all match). Minor regex hygiene issue.

4. **`POSTGRES_USER` and `POSTGRES_DB` differ from plan but match all other configs** — Docker uses `bloom` (matches `.env.template`), plan says `bloom`. Consistent.

---

## Positive Observations

- pnpm workspace `allowBuilds` correctly configured for native modules (esbuild, sharp, protobufjs, msgpackr-extract) — essential for Medusa builds.
- Next.js `font` loading with `display: "swap"` and `subsets: ["latin", "vietnamese"]` on Playfair Display — correct for Vietnamese text rendering.
- `next-intl` `localePrefix: "always"` — correct choice for `/vi` and `/en` routes as specified in acceptance criteria.
- `CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` all present — good security baseline.
- `docker-compose.yml` uses Alpine images and named volumes — correct for local dev.

---

## Recommended Actions

1. **Blocking:** Wire `env.ts` into both apps so Zod validation runs at startup (C1).
2. **Blocking:** Verify `@medusajs/framework` and `@medusajs/admin` are re-exported from `@medusajs/medusa` 2.17.2 or add them as dependencies (H2).
3. **High:** Add `"@bloom/shared-types": "workspace:*"` to both app `package.json` (H1).
4. **High:** Make CSP `'unsafe-eval'` dev-only (H3).
5. **Medium:** Have `medusa-client.ts` use `env.ts` instead of raw `process.env` (M2).
6. **Low:** Either delete `logger.ts` (YAGNI) or wire it into `medusa-config.ts` (C2).

---

## Metrics

| Metric | Value |
|---|---|
| Files in scope | ~25 source files (excluding node_modules, .next) |
| Dead code files | 3 (`env.ts` x2, `logger.ts`) |
| Missing workspace deps | 1 (`@bloom/shared-types`) |
| Missing Medusa deps (vs plan) | 2 (`@medusajs/framework`, `@medusajs/admin`) |
| CSP violations | 1 (`unsafe-eval` in production) |
| `pnpm install` | Passes |
| `next build` (storefront) | Passes |

---

## Unresolved Questions

1. Does `@medusajs/medusa` 2.17.2 re-export `defineConfig` and `loadEnv` from `@medusajs/framework`, making the explicit dep unnecessary? Can't verify without node_modules access (blocked by privacy hook). Verify by: `node -e "const m = require('@medusajs/medusa'); console.log(typeof m.defineConfig, typeof m.loadEnv)"` in the backend directory.
2. Should `logger.ts` be wired in now or deferred? Medusa has its own logger. YAGNI suggests deleting it until there's code that needs custom logging.
