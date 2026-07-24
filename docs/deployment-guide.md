# Bloom Wedding — Deployment Guide

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose
- Domain: `bloomwedding.vn` (configured DNS)

## Infrastructure

| Service | Production | Development |
|---------|-----------|-------------|
| PostgreSQL 16 | Managed (VN DC) | Docker (`docker compose up -d`) |
| Redis 7 | Managed (VN DC) | Docker |
| MinIO / S3 | AWS S3 / VN provider | Docker |
| Backend | Docker container | `pnpm dev` |
| Storefront | Vercel / Docker | `pnpm dev` |

**Data residency:** PostgreSQL for VN customer data MUST be hosted in Vietnam (Nghị định 53/2022/NĐ-CP).

## Environment Variables

### Backend (`apps/backend/.env`)

```bash
# Database
DATABASE_URL=postgres://user:pass@host:5432/bloom
REDIS_URL=redis://host:6379

# Medusa
MEDUSA_ADMIN_CORS=http://localhost:9000
JWT_SECRET=<random-64-char>
COOKIE_SECRET=<random-64-char>

# Storage
MINIO_ENDPOINT=http://localhost:9001
MINIO_ACCESS_KEY=<key>
MINIO_SECRET_KEY=<secret>
MINIO_BUCKET=bloom-wedding

# Payment — VNPay
VNPAY_TMN_CODE=<code>
VNPAY_HASH_SECRET=<secret>

# Payment — Momo
MOMO_PARTNER_CODE=<code>
MOMO_ACCESS_KEY=<key>
MOMO_SECRET_KEY=<secret>

# Payment — ZaloPay
ZALOPAY_APP_ID=<id>
ZALOPAY_KEY1=<key1>
ZALOPAY_KEY2=<key2>

# Shipping — GHN
GHN_TOKEN=<token>
GHN_SHOP_ID=<id>
GHN_FROM_DISTRICT_ID=<district>
GHN_FROM_WARD_CODE=<ward>

# Optional: SMS OTP
ESMS_API_KEY=<key>
ESMS_SECRET_KEY=<secret>
SPEEDSMS_API_KEY=<key>
SPEEDSMS_USER_ID=<user>

# Optional: Google OAuth
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
```

### Storefront (`apps/storefront/.env`)

```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.bloomwedding.vn
NEXT_PUBLIC_MEDUSA_REGION_ID=reg_01...
NEXT_PUBLIC_SITE_URL=https://bloomwedding.vn
```

## Docker Deployment

### Backend Dockerfile

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile --prod

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY . .
RUN pnpm build --filter=@bloom/backend

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/backend/.medusa/server .medusa/server
COPY --from=deps /app/node_modules node_modules
COPY apps/backend/package.json apps/backend/

ENV NODE_ENV=production
EXPOSE 9000
CMD ["node", ".medusa/server/src/main.js"]
```

### Build & Run

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Copy .env files with production values
cp apps/backend/.env.example apps/backend/.env
# Edit with real credentials

# 3. Run database migrations
cd apps/backend
npx medusa db:migrate

# 4. Create admin user (first deploy only)
npx medusa user --email admin@bloomwedding.vn

# 5. Seed data (first deploy only)
npx medusa exec ./src/scripts/seed.ts

# 6. Build and start
docker compose -f docker-compose.prod.yml up -d --build
```

### Storefront (Vercel)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
cd apps/storefront
vercel --prod \
  -e NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.bloomwedding.vn \
  -e NEXT_PUBLIC_MEDUSA_REGION_ID=reg_01... \
  -e NEXT_PUBLIC_SITE_URL=https://bloomwedding.vn
```

## SSL / HTTPS

- Backend: Nginx reverse proxy with Let's Encrypt (certbot)
- Storefront: Vercel provides automatic HTTPS

### Nginx config example

```nginx
server {
    listen 443 ssl;
    server_name api.bloomwedding.vn;

    ssl_certificate /etc/letsencrypt/live/api.bloomwedding.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bloomwedding.vn/privkey.pem;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Webhook Configuration

Configure Medusa webhooks to point at production URLs:

| Provider | Webhook URL |
|----------|------------|
| VNPay | `https://api.bloomwedding.vn/api/hooks/vnpay` |
| Momo | `https://api.bloomwedding.vn/api/hooks/momo` |
| ZaloPay | `https://api.bloomwedding.vn/api/hooks/zalopay` |

Update `*_CALLBACK_URL` env vars in backend `.env` accordingly.

## Health Check

```bash
# Backend health
curl https://api.bloomwedding.vn/health

# Storefront
curl -I https://bloomwedding.vn
```

## Rollback

```bash
# Docker
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d <previous-tag>

# Vercel
vercel rollback
```

## Monitoring

- **Backend logs:** `docker compose logs -f backend`
- **DB health:** `docker compose exec postgres pg_isready`
- **Redis:** `docker compose exec redis redis-cli PING`
- **SSL expiry:** `certbot renew --dry-run` (auto-renew cron recommended)

## Security Checklist

- [ ] All env vars set, no defaults in production
- [ ] `JWT_SECRET` and `COOKIE_SECRET` are random 64-char strings
- [ ] CSP headers block `unsafe-eval` (production NODE_ENV)
- [ ] Webhook IP whitelisting configured for payment providers
- [ ] PostgreSQL not exposed to public internet
- [ ] Redis password set
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] `pnpm audit` shows 0 critical/high
