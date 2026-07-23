# Phase 10: Testing, SEO, Performance, Deployment Prep

**Estimate:** 15-20h | **Depends on:** All phases

## 10.1 Testing (Vitest + Playwright)

### apps/backend/vitest.config.ts
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

### Unit tests: apps/backend/src/modules/vnpay/vnpay-client.test.ts
```ts
import { describe, it, expect } from "vitest";
import { VNPayClient } from "../vnpay-client";

const config = {
  tmnCode: "TEST_TMN",
  hashSecret: "TEST_SECRET",
  vnpUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  vnpApiUrl: "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
  returnUrl: "http://localhost:8000/payment/return",
  ipnUrl: "http://localhost:8000/api/payment/vnpay/ipn",
};

describe("VNPayClient", () => {
  const client = new VNPayClient(config);

  it("generates consistent HMAC SHA512 signature", () => {
    const params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: "TEST_TMN",
      vnp_Amount: 10000000,
      vnp_CreateDate: "20260723120000",
      vnp_CurrCode: "VND",
      vnp_IpAddr: "127.0.0.1",
      vnp_Locale: "vn",
      vnp_OrderInfo: "Test order",
      vnp_OrderType: "fashion",
      vnp_ReturnUrl: config.returnUrl,
      vnp_TxnRef: "test_txn_123",
    };
    const sig1 = client.sign(params);
    const sig2 = client.sign(params);
    expect(sig1).toBe(sig2);          // Deterministic
    expect(sig1).toHaveLength(128);   // SHA512 → 128 hex chars
    expect(sig1).toMatch(/^[A-F0-9]+$/);
  });

  it("verifies valid return params", () => {
    const txnData = {
      vnp_Amount: "10000000",
      vnp_BankCode: "NCB",
      vnp_BankTranNo: "123456",
      vnp_CardType: "ATM",
      vnp_OrderInfo: "Test order",
      vnp_PayDate: "20260723120100",
      vnp_ResponseCode: "00",
      vnp_TmnCode: "TEST_TMN",
      vnp_TransactionNo: "789012",
      vnp_TransactionStatus: "00",
      vnp_TxnRef: "test_txn_123",
      vnp_SecureHash: "",
    };
    const hash = client.sign(txnData as any);
    txnData.vnp_SecureHash = hash;

    expect(client.verify(txnData as any)).toBe(true);
  });

  it("rejects tampered amount", () => {
    const txnData = {
      vnp_Amount: "10000000",
      vnp_BankCode: "NCB",
      vnp_BankTranNo: "123456",
      vnp_CardType: "ATM",
      vnp_OrderInfo: "Test order",
      vnp_PayDate: "20260723120100",
      vnp_ResponseCode: "00",
      vnp_TmnCode: "TEST_TMN",
      vnp_TransactionNo: "789012",
      vnp_TransactionStatus: "00",
      vnp_TxnRef: "test_txn_123",
      vnp_SecureHash: "",
    };
    const hash = client.sign(txnData as any);
    txnData.vnp_SecureHash = hash;
    txnData.vnp_Amount = "1"; // Tampered!

    expect(client.verify(txnData as any)).toBe(false);
  });
});
```

### Unit tests: apps/backend/src/modules/phone-otp/provider.test.ts
```ts
// Test OTP generation, rate limiting logic, SMS failover
// Mock authIdentityService with in-memory state store
```

### Unit tests: apps/storefront/src/lib/delivery-zones.test.ts
```ts
import { describe, it, expect } from "vitest";
import { getZoneByDistrict, generateTimeSlots } from "../delivery-zones";

describe("delivery-zones", () => {
  it("returns zone 1 for Q3 (districtId 1444)", () => {
    const zone = getZoneByDistrict(1444);
    expect(zone?.id).toBe("zone-1");
    expect(zone?.fee).toBe(0);
  });

  it("returns undefined for unsupported district", () => {
    expect(getZoneByDistrict(9999)).toBeUndefined();
  });

  it("generates time slots that filter past times (today)", () => {
    const zone = getZoneByDistrict(1442)!;
    const slots = generateTimeSlots(zone, true);
    expect(slots.length).toBe(7);
    // At least some slots should be available
    expect(slots.some(s => s.available)).toBe(true);
  });
});
```

### Unit tests: apps/storefront/src/lib/format-currency.test.ts
```ts
import { describe, it, expect } from "vitest";
import { formatVND, formatVNDRange } from "../format-currency";

describe("formatVND", () => {
  it("formats 350000 as 350.000 ₫", () => {
    expect(formatVND(350000)).toContain("350");
    expect(formatVND(350000)).toContain("₫");
  });

  it("shows 0 decimals", () => {
    expect(formatVND(350000)).not.toContain(",");
    expect(formatVND(350000)).not.toContain(".0");
  });
});

describe("formatVNDRange", () => {
  it("shows range when min !== max", () => {
    const result = formatVNDRange(350000, 880000);
    expect(result).toContain("—");
  });

  it("shows single price when min === max", () => {
    const result = formatVNDRange(500000, 500000);
    expect(result).not.toContain("—");
  });
});
```

### Integration tests: app (Vitest with MSW)
```ts
// Test: Cart flow — create → add items → checkout (mocked Medusa API)
// Test: Auth flow — login → session → logout
// Test: Payment webhook — VNPay IPN → verify signature → order updated
```

### E2E (Playwright): apps/storefront/e2e/critical-path.spec.ts
```ts
import { test, expect } from "@playwright/test";

test("complete guest checkout with COD", async ({ page }) => {
  // Homepage → occasion grid → product detail → add to cart → checkout
  await page.goto("/vi");
  await expect(page.locator("h1")).toContainText("Gửi Trao Yêu Thương");

  // Click first occasion
  await page.locator('a[href^="/occasions/"]').first().click();
  await expect(page.locator("h1")).toBeVisible();

  // Click first product
  await page.locator('a[href^="/products/"]').first().click();
  await expect(page.locator("text=Thêm vào giỏ hàng")).toBeVisible();

  // Select tier and add to cart
  await page.locator("button:has-text('Standard')").click();
  await page.locator("text=Thêm vào giỏ hàng").click();

  // Cart drawer opens
  await expect(page.locator("text=Tiến hành thanh toán")).toBeVisible();
  await page.locator("text=Tiến hành thanh toán").click();

  // Checkout page
  await expect(page.locator("h1")).toContainText("Thanh toán");

  // Fill delivery details
  await page.fill('input[placeholder*="người gửi"]', "Nguyen Van A");
  await page.fill('input[placeholder*="SĐT người gửi"]', "0909123456");
  await page.fill('input[type="email"]', "test@bloomwedding.vn");
  // ... complete checkout flow
});
```

## 10.2 Performance Optimization

### Next.js Config (Update next.config.ts)
```ts
images: {
  formats: ["image/avif", "image/webp"],
  deviceSizes: [375, 640, 768, 1024, 1280, 1536],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
},
experimental: {
  optimizePackageImports: [
    "@medusajs/js-sdk",
    "lucide-react",
    "@tanstack/react-query",
  ],
},
```

### Font Optimization (Already in layout.tsx from Phase 1)
```tsx
const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  display: "swap",
  preload: true,
});
```

### Tanstack Query Tuning
```ts
// In query-provider.tsx
defaultOptions: {
  queries: {
    staleTime: 5 * 60 * 1000,     // Products: 5 min
    gcTime: 30 * 60 * 1000,        // Garbage collect after 30 min
    retry: 1,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: 0,
  },
},
```

### Image Strategy
- All product images: WebP format, 4:5 ratio, `sizes` attribute per layout
- Blur placeholder: `placeholder="blur"` with base64 thumbnail or dominant color
- Priority loading for hero + first 2 product cards (above fold)

### Bundle Analysis
```bash
pnpm add -D @next/bundle-analyzer
# Run: ANALYZE=true pnpm build
```

### Lighthouse Targets
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 100

## 10.3 SEO

### apps/storefront/src/app/[locale]/sitemap.ts
```ts
import { MetadataRoute } from "next";
import { medusaClient } from "@/lib/medusa-client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://bloomwedding.vn";

  // Static pages
  const staticPages = [
    { url: `${baseUrl}/vi`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1 },
    { url: `${baseUrl}/en`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1 },
  ];

  // Product pages
  const { products } = await medusaClient.store.product.list({ fields: "handle,updated_at" });
  const productPages = (products || []).map((p: any) => ({
    url: `${baseUrl}/vi/products/${p.handle}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
    alternates: {
      languages: { en: `${baseUrl}/en/products/${p.handle}` },
    },
  }));

  // Category pages
  const { product_categories } = await medusaClient.store.category.list();
  const categoryPages = (product_categories || []).map((c: any) => ({
    url: `${baseUrl}/vi/occasions/${c.handle}`,
    lastModified: new Date(c.updated_at || Date.now()),
    changeFrequency: "weekly" as const,
    priority: 0.7,
    alternates: {
      languages: { en: `${baseUrl}/en/occasions/${c.handle}` },
    },
  }));

  return [...staticPages, ...productPages, ...categoryPages];
}
```

### Structured Data (Product Detail Page)
```tsx
// In products/[handle]/page.tsx, add:
function productStructuredData(product: Product) {
  const minPrice = Math.min(...product.variants.map(v => v.prices?.[0]?.amount ?? Infinity));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images?.[0]?.url,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "VND",
      lowPrice: minPrice,
      highPrice: Math.max(...product.variants.map(v => v.prices?.[0]?.amount ?? 0)),
      availability: "https://schema.org/InStock",
    },
    category: product.categories?.map((c: any) => c.name).join(", "),
  };
}

// In page component:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData(product)) }}
/>
```

### apps/storefront/src/app/robots.ts
```ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account/", "/checkout/"] },
    sitemap: "https://bloomwedding.vn/sitemap.xml",
  };
}
```

## 10.4 Security Audit Checklist

Run these checks:
```bash
# No env vars leaked to client bundle
grep -r "process.env" apps/storefront/.next/static --include="*.js" | grep -v "NEXT_PUBLIC_"

# Dependencies audit
pnpm audit --audit-level=high

# Check all webhook routes have signature verification
grep -l "verify\|signature\|secureHash\|mac\|RSA" apps/backend/src/modules/*/webhook/route.ts

# CSP: no inline scripts in production
curl -sI http://localhost:8000 | grep -i content-security-policy

# API keys: verifier server-only
grep -r "NEXT_PUBLIC_" apps/backend --include=".env*"
```

Fix any findings before deployment.

## 10.5 Deployment Preparation

### docs/deployment-guide.md
```markdown
# Bloom Wedding — Deployment Guide

## Prerequisites
- Node.js 20+, pnpm 9+, Docker
- PostgreSQL 16, Redis 7
- Domain: bloomwedding.vn
- SSL certificate (Let's Encrypt or CloudFlare)

## Environment Variables

All env vars listed in `.env.production.template`. Send to admin before deploy.

## Production Build

```bash
pnpm install --frozen-lockfile
pnpm build

# Backend
cd apps/backend
npx medusa db:migrate
npx medusa user --email admin@bloomwedding.vn

# Start with PM2 or Docker
pm2 start dist/main.js --name bloom-backend
pm2 start "next start apps/storefront" --name bloom-storefront
```

## Docker Deploy

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Health Checks
- Backend: GET /health → 200
- Storefront: GET / → 200

## Database Backup
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
# Cron: 0 2 * * * pg_dump ...
```

## Webhook URLs (for VNPay, Momo, ZaloPay, GHN, GHTK)
- Must be publicly accessible
- Must have HTTPS
- Register in provider dashboards after deploy

## Post-Deploy Checklist
- [ ] All health checks pass
- [ ] Payment sandbox tests pass
- [ ] Order fulfillment works (GHN)
- [ ] SSL valid
- [ ] CSP headers present
- [ ] Sitemap accessible
- [ ] Google Search Console registered
```

### GitHub Actions CI
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

## Acceptance Criteria

- [ ] VNPay client unit tests: signing + verification + tamper detection pass
- [ ] Delivery zone logic tests pass
- [ ] Currency formatting tests pass
- [ ] E2E critical path: guest COD checkout passes
- [ ] Lighthouse: Performance 90+, Accessibility 95+, Best Practices 90+, SEO 100
- [ ] Bundle analyzer: no unused Shadcn components, all routes < 200KB JS
- [ ] Sitemap generated with VN + EN URLs
- [ ] Product structured data validates in Google Rich Results Test
- [ ] CSP headers block inline scripts in production
- [ ] `grep` check: no server env vars in client bundle
- [ ] `pnpm audit` shows 0 critical/high vulnerabilities
- [ ] Webhook signature verification on ALL provider webhooks
- [ ] Deployment guide tested (someone can follow it)
- [ ] Docker build succeeds for both apps
- [ ] CI pipeline: typecheck → lint → test → build passes
