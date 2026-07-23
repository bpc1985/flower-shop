# Research Report: Medusa 2.17 Admin Widget API

Date: 2026-07-24
Project: /Users/hungho/Code/study/flower-shop
Backend: apps/backend (Medusa 2.17.2)

---

## 1. Export Pattern

Each widget file goes in `src/admin/widgets/`. Must have two exports:

- **Default export**: React arrow-function component
- **Named export `config`**: result of `defineWidgetConfig()` from `@medusajs/admin-sdk`

```tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading } from "@medusajs/ui"

const ProductWidget = () => {
  return (
    <Container className="divide-y p-0">
      <Heading level="h2">Widget Title</Heading>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductWidget
```

The `defineWidgetConfig` helper stamps `Symbol.for("react.memo")` on the config object to prevent HMR issues (verified from `admin-sdk/dist/index.mjs` source).

---

## 2. What `@medusajs/admin-sdk` Exports

Three functions + three types:

| Export | Purpose |
|---|---|
| `defineWidgetConfig(config)` | Widget injection config. `config.zone`: string or string[]. Optional `config.id`: stable identifier |
| `defineRouteConfig(config)` | UI route config. `config.label`, `config.icon`, `config.nested`, `config.rank` |
| `defineLayoutConfig(config)` | Custom layout config. `config.id`, `config.sections` |
| `WidgetConfig` | Type for `defineWidgetConfig` |
| `RouteConfig` | Type for `defineRouteConfig` |
| `LayoutConfig` | Type for `defineLayoutConfig` |

Source: `@medusajs/admin-sdk@2.17.2 dist/index.d.ts`

Routes follow a separate pattern under `src/admin/routes/` -- not covered in this report.

---

## 3. Data Fetching (No `useAdminCustomQuery`)

There is **no** `useAdminCustomQuery` hook exported from `@medusajs/admin-sdk`. The dashboard and plugins use:

- **`useQuery` / `useMutation` / `useInfiniteQuery`** from `@tanstack/react-query` (v5.64.2, included as a dashboard dependency)
- **`@medusajs/js-sdk`** (Medusa client) for all API calls

Pattern confirmed from the draft-order plugin's compiled admin bundle:

```tsx
import { useQuery } from "@tanstack/react-query"
import Medusa from "@medusajs/js-sdk"

// SDK is typically created at module level (or in a shared hook file)
const sdk = new Medusa({
  baseUrl: __BACKEND_URL__ ?? "/",
  auth: {
    type: __AUTH_TYPE__ ?? "session",
    jwtTokenStorageKey: __JWT_TOKEN_STORAGE_KEY__,
  },
})

// Then in your component or custom hook:
const { data, ...rest } = useQuery({
  queryKey: ["orders", id],
  queryFn: () => sdk.admin.order.retrieve(id),
})
```

Template variables `__BACKEND_URL__`, `__AUTH_TYPE__`, `__JWT_TOKEN_STORAGE_KEY__` are injected at build time by the admin bundler.

**Available SDK admin methods** (from draft-order usage):
- `sdk.admin.customer.list(query)` / `.retrieve(id, query)`
- `sdk.admin.order.retrieve(id, query)` / `.listChanges(id, query)` / `.retrievePreview(id, query)`
- `sdk.admin.orderEdit.request(id)`
- `sdk.admin.shippingOption.list(query)`
- `sdk.admin.draftOrder.list(query)` / `.retrieve(id, query)` / `.create(payload)` / `.update(id, payload)` / `.delete(id)`
- `sdk.admin.draftOrder.convertToOrder(id)` / `.addItems(id, payload)` / `.addPromotions(id, payload)`
- `sdk.admin.region.list(query)` / `.retrieve(id, query)`
- `sdk.admin.salesChannel.list(query)`
- `sdk.admin.user.retrieve(id, query)`
- `sdk.admin.productVariant.list(query)`
- `sdk.admin.promotion.list(query)`
- `sdk.client.fetch(url, options)` -- for custom admin API endpoints

**Admin API URL pattern**: All admin endpoints are under `/admin/`. The base URL is the Medusa backend URL.

---

## 4. `@medusajs/ui` Components (v4.1.19)

Confirmed from the draft-order plugin bundle as the complete set of imported components:

| Category | Components |
|---|---|
| Layout | `Container`, `Divider` |
| Typography | `Heading`, `Text`, `Label`, `Hint`, `Kbd`, `clx` |
| Input | `Input`, `Switch`, `Select`, `CurrencyInput`, `Copy` |
| Buttons | `Button`, `IconButton` |
| Data | `Badge`, `StatusBadge`, `Skeleton`, `Avatar` |
| Dialog | `Drawer`, `FocusModal`, `Prompt`, `DropdownMenu`, `Tooltip` |
| Table | `Table`, `DataTable`, `useDataTable`, `createDataTableColumnHelper`, `createDataTableFilterHelper` |
| Feedback | `toast`, `usePrompt` |

---

## 5. Injection Zones (247 total)

Key zones relevant to a flower shop:

| Zone String | Page Section |
|---|---|
| `product.details.before` | Top of product detail page |
| `product.details.after` | Bottom of product detail page |
| `product.details.side.before` | Top of product detail sidebar |
| `product.details.side.after` | Bottom of product detail sidebar |
| `product.details.side` | Product detail sidebar |
| `product.list.before` | Top of product list page |
| `product.list.after` | Bottom of product list page |
| `order.details.before` | Top of order detail page |
| `order.details.after` | Bottom of order detail page |
| `order.details.side.before` | Top of order detail sidebar |
| `order.details.side.after` | Bottom of order detail sidebar |
| `order.details.side` | Order detail sidebar |
| `order.list.before` | Top of order list page |
| `order.list.after` | Bottom of order list page |
| `customer.details.before` | Top of customer detail page |
| `customer.details.after` | Bottom of customer detail page |
| `customer.details.side` | Customer detail sidebar |
| `customer.list.before` | Top of customer list |
| `customer.list.after` | Bottom of customer list |
| `draft_order.details.before` | Top of draft order detail |
| `draft_order.details.after` | Bottom of draft order detail |
| `draft_order.list.before` | Top of draft order list |
| `draft_order.list.after` | Bottom of draft order list |
| `topbar` | Admin top bar (v2.17.2+) |
| `workflow.list.before` / `.after` | Workflow list page |
| `workflow.details.before` / `.after` | Workflow details page |

Source: `@medusajs/admin-shared@2.17.2 INJECTION_ZONES` constant.

---

## 6. Available Icons from `@medusajs/icons`

Complete set found in the draft-order bundle: EllipsisHorizontal, XMark, InformationCircleSolid, XMarkMini, TrianglesMini, CheckMini, EllipseMiniSolid, PlusMini, ExclamationCircleSolid, ArrowPath, FlyingBox, CurrencyDollar, Envelope, Channels, Trash, ArrowUpRightOnBox, TriangleDownMini, Check, SquareTwoStack, Photo, TriangleRightMini, Shopping, Buildings, TruckFast, Plus, ReceiptPercent, Minus, PencilSquare, EllipsisVertical, ArrowUpMini, ArrowDownMini.

---

## 7. Widget Registration in `medusa-config.ts`

**No config key is required.** The admin bundler automatically discovers `src/admin/` as the source directory. The constant `ADMIN_SOURCE_DIR = "src/admin"` is defined in `@medusajs/medusa/dist/utils/admin-consts.js`.

The admin loader (`dist/loaders/admin.js`) reads `configModule.admin` which accepts optional:
- `disable: boolean` -- turn off admin dashboard
- `path: string` -- admin route path (default `/app`)
- `sources: string[]` -- additional source directories (used by local plugins)
- `plugins: string[]` -- plugin admin paths

For a simple project widget, no `admin` key is needed. The current `medusa-config.ts` confirms this -- it has no `admin` key.

---

## 8. Unresolved Questions

- `DetailWidgetProps<T>` / `ListWidgetProps<T>` types from `@medusajs/framework/types`: The docs reference them via `import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"`, but resolution into the types was blocked by `node_modules`/`dist` access controls. The actual draft-order plugin does NOT use these types -- it uses inline custom hooks. Use the `data` prop pattern if the zone provides it; otherwise, use the SDK directly in a `useQuery` call. Production-quality approach: write a custom hook file per concern.

- The `@medusajs/dashboard` package has a Hooks API in `src/hooks/api/` (files found: `api-keys.tsx`, `auth.tsx`, `campaigns.tsx`), but these are internal to the dashboard, not exported for plugin/widget use.

---

## 9. Complete Working Template

For the flower shop, to add an admin widget that fetches and displays data:

```tsx
// src/admin/widgets/flower-inventory-widget.tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, StatusBadge } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import Medusa from "@medusajs/js-sdk"

const sdk = new Medusa({
  baseUrl: __BACKEND_URL__ ?? "/",
  auth: { type: __AUTH_TYPE__ ?? "session" },
})

const InventoryWidget = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "low-stock"],
    queryFn: () => sdk.admin.productVariant.list({ limit: 5 }),
  })

  if (isLoading) return <Container><Text>Loading...</Text></Container>

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Low Inventory Alert</Heading>
      </div>
      <div className="px-6 py-4">
        {data?.variants?.map((v) => (
          <div key={v.id} className="flex justify-between py-2">
            <Text>{v.title}</Text>
            <StatusBadge color="red">{v.inventory_quantity} left</StatusBadge>
          </div>
        ))}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
  id: "bloom:low-inventory-widget",
})

export default InventoryWidget
```
