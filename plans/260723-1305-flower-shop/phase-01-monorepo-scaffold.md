# Phase 1: Monorepo Scaffold + i18n + Security Foundations

**Estimate:** 4-5h | **Depends on:** —

## 1.1 Root Monorepo Setup

### pnpm-workspace.yaml
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### package.json (root)
```json
{
  "name": "bloom-wedding",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "clean": { "cache": false }
  }
}
```

### tsconfig.json (base)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### .npmrc
```
auto-install-peers=true
strict-peer-dependencies=false
```

## 1.2 Docker Compose (Local Dev)

### docker-compose.yml
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: bloom
      POSTGRES_PASSWORD: bloom_dev
      POSTGRES_DB: bloom_medusa
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9002:9000", "9001:9001"]
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  miniodata:
```

## 1.3 Backend (Medusa 2.x)

### apps/backend/package.json
```json
{
  "name": "@bloom/backend",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "medusa develop",
    "build": "medusa build",
    "start": "medusa start",
    "seed": "medusa exec ./src/scripts/seed.ts",
    "migration:generate": "medusa db:generate",
    "migration:run": "medusa db:migrate"
  },
  "dependencies": {
    "@medusajs/medusa": "^2.17.0",
    "@medusajs/framework": "^2.17.0",
    "@medusajs/admin": "^2.17.0",
    "@medusajs/auth": "^2.17.0",
    "@medusajs/payment": "^2.17.0",
    "@medusajs/fulfillment": "^2.17.0",
    "@medusajs/file": "^2.17.0",
    "@medusajs/cache-redis": "^2.17.0",
    "@medusajs/event-bus-redis": "^2.17.0",
    "@medusajs/file-s3": "^2.17.0",
    "pg": "^8.13.0",
    "zod": "^3.23.0",
    "winston": "^3.14.0"
  },
  "devDependencies": {
    "@types/pg": "^8.11.0",
    "typescript": "^5.5.0"
  }
}
```

### apps/backend/tsconfig.json
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

### apps/backend/medusa-config.ts
```ts
import { defineConfig, loadEnv } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    { resolve: "@medusajs/medusa/cache-redis" },
    { resolve: "@medusajs/medusa/event-bus-redis" },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
            },
          },
        ],
      },
    },
    // Payment, fulfillment, auth modules — added in later phases
  ],
});
```

### apps/backend/src/lib/env.ts
```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  STORE_CORS: z.string(),
  ADMIN_CORS: z.string(),
  AUTH_CORS: z.string(),
  JWT_SECRET: z.string().min(1),
  COOKIE_SECRET: z.string().min(1),
  S3_FILE_URL: z.string().url(),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

### apps/backend/src/lib/logger.ts
```ts
import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});
```

## 1.4 Storefront (Next.js 15)

### apps/storefront/package.json
```json
{
  "name": "@bloom/storefront",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 8000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@medusajs/js-sdk": "^2.17.0",
    "@tanstack/react-query": "^5.60.0",
    "@tanstack/react-query-devtools": "^5.60.0",
    "next-intl": "^3.24.0",
    "zod": "^3.23.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "lucide-react": "^0.460.0",
    "sonner": "^1.7.0",
    "tailwind-merge": "^2.6.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.5.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### apps/storefront/next.config.ts
```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.medusajs.com" },
      { protocol: "https", hostname: "**.unsplash.com" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: https:; " +
              "font-src 'self' data: https://fonts.gstatic.com; " +
              "connect-src 'self' http://localhost:9000 https:; " +
              "frame-src 'self' https:;",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(config);
```

### apps/storefront/tailwind.config.ts
```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FFFBF5",
          100: "#FFF8F0",
          200: "#FFF2E0",
          300: "#FFE8CC",
        },
        sage: {
          300: "#C5D1B8",
          400: "#B1C1A0",
          500: "#9CAF88",
          600: "#7D9468",
          700: "#637A4F",
        },
        blush: {
          200: "#F5D9DC",
          300: "#EEC8CC",
          400: "#E8B4B8",
          500: "#D9959A",
          600: "#C7787E",
        },
        burgundy: {
          400: "#8B3A4A",
          500: "#7A3341",
          600: "#6B2737",
          700: "#5A1F2D",
          800: "#4A1824",
        },
        warm: {
          800: "#2D2420",
          900: "#1A1410",
        },
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "Georgia", "serif"],
        ui: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### apps/storefront/src/app/[locale]/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #FFF8F0;
  --foreground: #1A1410;
  --card: #FFFBF5;
  --card-foreground: #1A1410;
  --primary: #9CAF88;
  --primary-foreground: #FFFBF5;
  --secondary: #FFF2E0;
  --secondary-foreground: #2D2420;
  --muted: #FFF2E0;
  --muted-foreground: #7D9468;
  --accent: #E8B4B8;
  --accent-foreground: #2D2420;
  --destructive: #C7787E;
  --border: #FFE8CC;
  --input: #FFE8CC;
  --ring: #9CAF88;
  --radius: 0.5rem;

  --shadow-card: 0 2px 12px rgba(107, 39, 55, 0.06);
  --shadow-elevated: 0 8px 32px rgba(107, 39, 55, 0.08);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### apps/storefront/src/app/[locale]/layout.tsx
```tsx
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { routing } from "@/i18n/routing";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bloom Wedding — Cửa Hàng Hoa Tươi Cao Cấp",
  description: "Hoa tươi cao cấp giao trong 90 phút tại TP.HCM. Đảm bảo 90% giống hình.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "vi" | "en")) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${playfair.variable} ${dmSans.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            {children}
            <Toaster position="top-center" richColors />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### apps/storefront/src/i18n/routing.ts
```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["vi", "en"],
  defaultLocale: "vi",
  localePrefix: "always",
});
```

### apps/storefront/src/i18n/request.ts
```ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "vi" | "en")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`./messages/${locale}/common.json`)).default,
  };
});
```

### apps/storefront/src/middleware.ts
```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

### apps/storefront/src/lib/medusa-client.ts
```ts
import Medusa from "@medusajs/js-sdk";

const medusaClient = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
  debug: process.env.NODE_ENV === "development",
});

export { medusaClient };
```

### apps/storefront/src/lib/env.ts
```ts
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_MEDUSA_BACKEND_URL: z.string().url(),
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_GHN_TOKEN: z.string().optional(),
  NEXT_PUBLIC_GHN_SHOP_ID: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_MEDUSA_BACKEND_URL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  NEXT_PUBLIC_GHN_TOKEN: process.env.NEXT_PUBLIC_GHN_TOKEN,
  NEXT_PUBLIC_GHN_SHOP_ID: process.env.NEXT_PUBLIC_GHN_SHOP_ID,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
});
```

### apps/storefront/src/components/providers/query-provider.tsx
```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### i18n Messages — apps/storefront/src/i18n/messages/vi/common.json
```json
{
  "site": {
    "title": "Bloom Wedding",
    "tagline": "Cửa Hàng Hoa Tươi Cao Cấp",
    "description": "Hoa tươi cao cấp giao trong 90 phút tại TP.HCM"
  },
  "nav": {
    "occasions": "Dịp",
    "shop": "Cửa hàng",
    "search": "Tìm kiếm",
    "cart": "Giỏ hàng",
    "account": "Tài khoản",
    "login": "Đăng nhập"
  },
  "home": {
    "hero": "Gửi Trao Yêu Thương\nQua Từng Bông Hoa",
    "heroSub": "Bó hoa tươi cao cấp, giao trong 90 phút",
    "shopOccasions": "Mua Theo Dịp",
    "featured": "Nổi bật",
    "trust": "Cam kết"
  }
}
```

### i18n Messages — apps/storefront/src/i18n/messages/en/common.json
```json
{
  "site": {
    "title": "Bloom Wedding",
    "tagline": "Premium Fresh Flower Shop",
    "description": "Premium flowers delivered in 90 minutes in Ho Chi Minh City"
  },
  "nav": {
    "occasions": "Occasions",
    "shop": "Shop",
    "search": "Search",
    "cart": "Cart",
    "account": "Account",
    "login": "Login"
  },
  "home": {
    "hero": "Sending Love\nThrough Every Bloom",
    "heroSub": "Premium fresh bouquets, delivered in 90 minutes",
    "shopOccasions": "Shop by Occasion",
    "featured": "Featured",
    "trust": "Our Promise"
  }
}
```

### packages/shared-types/package.json
```json
{
  "name": "@bloom/shared-types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schemas": "./src/schemas.ts"
  },
  "dependencies": {
    "zod": "^3.23.0"
  }
}
```

### packages/shared-types/src/types.ts
```ts
export interface ProductOption {
  id: string;
  title: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  prices: { amount: number; currency_code: string }[];
  options: Record<string, string>;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  thumbnail: string;
  images: string[];
  categories: { id: string; name: string }[];
  options: ProductOption[];
  variants: ProductVariant[];
  metadata: Record<string, unknown>;
}

export interface CartItem {
  id: string;
  quantity: number;
  unit_price: number;
  title: string;
  thumbnail: string;
  variant: ProductVariant;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  shipping_total: number;
  total: number;
  region: { currency_code: string };
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  maxMinutes: number;
  districtCodes: number[];
}

export type Locale = "vi" | "en";
export type PriceTier = "standard" | "premium" | "deluxe";
export type DeliverySpeed = "asap" | "today" | "tomorrow" | "date";
```

### packages/shared-types/src/schemas.ts
```ts
import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^(0|\+84)[3|5|7|8|9]\d{8}$/, "Số điện thoại không hợp lệ");

export const vietnamPhoneSchema = phoneSchema;

export const cardMessageSchema = z
  .string()
  .max(100, "Lời nhắn tối đa 100 ký tự")
  .optional();

export const addressSchema = z.object({
  province: z.string().min(1, "Chọn tỉnh/thành phố"),
  district: z.string().min(1, "Chọn quận/huyện"),
  ward: z.string().min(1, "Chọn phường/xã"),
  street: z.string().min(1, "Nhập địa chỉ"),
  ghnDistrictCode: z.number().optional(),
  ghnWardCode: z.string().optional(),
});

export type PhoneInput = z.infer<typeof phoneSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
```

### packages/shared-types/src/index.ts
```ts
export * from "./types";
export * from "./schemas";
```

### .env.template (root)
```bash
# Backend
DATABASE_URL=postgresql://bloom:bloom_dev@localhost:5432/bloom_medusa
REDIS_URL=redis://localhost:6379
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:8000,http://localhost:9000
JWT_SECRET=change-me-in-production
COOKIE_SECRET=change-me-in-production

# S3 / MinIO
S3_FILE_URL=http://localhost:9002/bloom
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_REGION=us-east-1
S3_BUCKET=bloom
S3_ENDPOINT=http://localhost:9002

# Storefront
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_xxx
```

## Acceptance Criteria

- [ ] `pnpm install` succeeds across all workspaces
- [ ] `docker compose up -d` starts PostgreSQL, Redis, MinIO
- [ ] `pnpm dev` runs backend (:9000) + storefront (:8000)
- [ ] Medusa admin accessible, migrations run, admin user exists
- [ ] Storefront renders with Playfair Display + DM Sans, cream background
- [ ] `/vi` shows Vietnamese, `/en` shows English
- [ ] Language switcher toggles locale without full reload
- [ ] Missing env var causes startup failure (Zod validation)
- [ ] CSP headers present in response
- [ ] Logger outputs structured JSON
