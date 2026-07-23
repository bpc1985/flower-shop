# Testing Phase 8 — Admin Widgets

4 widgets at `src/admin/widgets/`. Auto-discovered by Medusa admin bundler — no `medusa-config.ts` changes needed.

## Prerequisites

```bash
docker compose up -d
cd apps/backend
npx medusa db:migrate
npx medusa develop
```

## 1. Verify Admin Panel Loads

```bash
open http://localhost:9000/app
```

Login with admin credentials. If you haven't created one:

```bash
npx medusa user --email admin@bloomwedding.vn
```

Set password through the terminal prompt.

## 2. Verify TypeScript + Build

```bash
npx tsc --noEmit --pretty
# Should be clean — 0 errors

npx medusa build
# Widgets bundled into admin Vite build
```

## 3. Check Widgets by Zone

| Widget | Zone | Where to find it |
|--------|------|-----------------|
| Daily Orders | `order.list.before` | Orders page — above the order table |
| Seasonal Promo | `product.list.before` | Products page — above the product table |
| Occasion Analytics | `product.list.after` | Products page — below the product table |
| Delivery Dashboard | `order.details.after` | Click any order → below order details |

## 4. Widget-Specific Checks

### Daily Orders (`/app/orders`)

- [ ] Shows "Đơn hàng hôm nay" heading with today's date
- [ ] 4 stat boxes: Tổng đơn, Doanh thu, Chờ giao, Đã giao
- [ ] 3 COD stat boxes: Đang giao, COD chưa thu, Giá trị COD
- [ ] Recent orders table showing last 5 orders with display_id, customer name, total, fulfillment status
- [ ] Empty state: "Chưa có đơn hàng nào hôm nay" when no orders exist

Data fetching uses `@tanstack/react-query` + direct `fetch` to `/admin/orders` with `credentials: "include"` for admin session cookie. Falls back gracefully to empty state.

### Seasonal Promo (`/app/products`)

- [ ] 6 promo toggles with emoji icons and Vietnamese descriptions:
  - 🎋 Tết 2027 — Ấp Tết collection
  - 💝 Valentine — 14/2 collection
  - 🌸 8/3 — Women's Day special
  - 💐 Mother's Day — Ngày của Mẹ
  - 🌹 20/10 — Vietnam Women's Day
  - 🎄 Christmas — Noel collection
- [ ] Switch toggles flip ON/OFF state
- [ ] Green "ON" badge appears when a promo is active
- [ ] Footer text: "Active promotions show on homepage and product pages"
- [ ] All toggles default to OFF on first load

Promo state persisted via `/admin/store` metadata. Falls back to default `PROMOS` array when store metadata is unavailable.

### Occasion Analytics (`/app/products`)

- [ ] Placeholder state visible
- [ ] Text: "Dữ liệu phân tích dịp sẽ hiển thị khi có đơn hàng"
- [ ] Subtitle: "Orders grouped by occasion (sinh nhật, kỷ niệm, tết, ...) will appear here"

Placeholder widget — ready for Phase 10 analytics when order metadata includes occasion classification.

### Delivery Dashboard (click any order → below details)

- [ ] 3 GHN delivery status cards with colored left borders:
  - Chờ giao (orange border) — count of `not_fulfilled` orders
  - Đang giao (blue border) — count of `partially_fulfilled` orders
  - Đơn GHN (green border) — count of orders with GHN shipping method
- [ ] Pending fulfillment table (up to 10 rows): order display_id, status badge, shipping method name
- [ ] Empty state: "Không có đơn chờ giao" when nothing pending

Queries `/admin/orders` filtered by `fulfillment_status=not_fulfilled,partially_fulfilled`. Auto-refreshes every 60 seconds.

## 5. Widget Architecture

All 4 widgets follow the same Medusa 2.17 admin widget pattern:

```tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Text, StatusBadge } from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";

const MyWidget = () => {
  // useQuery + fetch to __BACKEND_URL__/admin/...
  return <Container>...</Container>;
};

export const config = defineWidgetConfig({
  zone: "order.list.before",
  id: "bloom:my-widget",
});

export default MyWidget;
```

Key details:
- Files live under `src/admin/widgets/` — auto-discovered, no config registration needed
- `__BACKEND_URL__` injected by Vite at build time from admin bundler
- No `useAdminCustomQuery` — use `@tanstack/react-query` v5 + direct `fetch`
- Admin session cookie sent via `credentials: "include"`
- `@medusajs/ui` provides Container, Heading, Text, StatusBadge, Badge, Switch, Button

## 6. With Real Data

To see actual data, place orders through the storefront first:

```bash
cd apps/storefront && npx next dev --port 8000
# Navigate to a product → add to cart → complete checkout
```

After placing orders:
- Daily Orders widget shows real counts and revenue
- Delivery Dashboard shows pending orders in the fulfillment queue
- Occasion Analytics remains placeholder (needs Phase 10)

## 7. Smoke Test Script

```bash
#!/bin/bash
echo "=== TypeScript ==="
npx tsc --noEmit --pretty 2>&1 | grep "^src/admin" | head -5 || echo "PASS: 0 errors"

echo "=== Medusa Build ==="
MEDUSA_WORKER_MODE=server npx medusa build 2>&1 | grep -i "error\|completed" | tail -3

echo "=== Widget Files ==="
for f in daily-orders occasion-analytics delivery-dashboard seasonal-promo-toggle; do
  [ -f "src/admin/widgets/$f.tsx" ] && echo "PASS: $f.tsx" || echo "MISSING: $f.tsx"
done

echo "=== Done ==="
```

## 8. Known Limitations

| Widget | Limitation | Workaround |
|--------|-----------|------------|
| Daily Orders | Queries `/admin/orders` via fetch — needs admin session cookie. Doesn't use SDK. | Admin panel already has cookie from login. Works in browser context. |
| Occasion Analytics | Placeholder only. Medusa 2.17 has no `occasion` field on orders. | Needs custom metadata field on orders or Phase 10 analytics endpoint. |
| Delivery Dashboard | Shows fulfillment status but not live GHN tracking or tracking URLs. | Needs GHN webhook integration to update fulfillment status. |
| Seasonal Promo | Saves to `/admin/store` metadata. Update may fail if POST not supported on that endpoint. | Add proper settings API if `/admin/store` POST is rejected. Falls back to in-memory defaults. |
| No admin config in medusa-config | Widgets auto-discovered from `src/admin/widgets/`. No way to disable individual widgets without removing the file. | Remove the `.tsx` file to disable a widget. |
