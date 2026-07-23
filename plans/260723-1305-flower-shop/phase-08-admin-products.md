# Phase 8: Admin Widgets

**Estimate:** 6-8h | **Depends on:** Phase 7 (real order/customer/delivery data)

## 8.1 Medusa Admin Widget Configuration

### apps/backend/medusa-config.ts (ADD)
```ts
admin: {
  backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  widgets: [
    {
      Component: "./src/admin-widgets/daily-orders",
      zone: "order.list.before",
    },
    {
      Component: "./src/admin-widgets/occasion-analytics",
      zone: "product.list.after",
    },
    {
      Component: "./src/admin-widgets/delivery-dashboard",
      zone: "order.details.after",
    },
    {
      Component: "./src/admin-widgets/seasonal-promo-toggle",
      zone: "product.list.before",
    },
  ],
},
```

## 8.2 Daily Orders Widget

### apps/backend/src/admin-widgets/daily-orders/index.tsx
```tsx
import { Container, Heading, Text, Table, StatusBadge } from "@medusajs/ui";
import { useAdminCustomQuery } from "medusa-react"; // Check actual Medusa 2 admin hooks

// ponytail: Widget displays today's orders summary.
// Admin widgets use Vite + React. Exact SDK hooks depend on Medusa 2 admin package.
// Verify hook imports from @medusajs/admin-sdk or similar during implementation.

export default function DailyOrdersWidget() {
  // Fetch today's orders via admin API
  const { data, isLoading } = useAdminCustomQuery("/admin/orders", {
    created_at: { $gte: new Date().toISOString().split("T")[0] },
  });

  if (isLoading) return <Text>Đang tải...</Text>;

  const orders = data?.orders || [];
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + o.total, 0);
  const pending = orders.filter((o: any) => o.fulfillment_status === "not_fulfilled");
  const delivering = orders.filter((o: any) => o.fulfillment_status === "partially_fulfilled");
  const completed = orders.filter((o: any) => o.fulfillment_status === "fulfilled");
  const codOrders = orders.filter((o: any) => o.payment_status === "pending");

  return (
    <Container className="p-6">
      <Heading level="h2" className="mb-4">
        📊 Đơn hàng hôm nay
      </Heading>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tổng đơn" value={orders.length.toString()} />
        <StatCard label="Doanh thu" value={`${(totalRevenue / 1000).toFixed(0)}k ₫`} />
        <StatCard label="Chờ giao" value={pending.length.toString()} color="orange" />
        <StatCard label="Đã giao" value={completed.length.toString()} color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <StatCard label="Đang giao" value={delivering.length.toString()} color="blue" />
        <StatCard label="COD chưa thu" value={codOrders.length.toString()} color="red" />
        <StatCard label="Giá trị COD" value={`${(codOrders.reduce((s: number, o: any) => s + o.total, 0) / 1000).toFixed(0)}k ₫`} color="red" />
      </div>

      {/* Recent orders table */}
      <Heading level="h3" className="mb-3">Đơn hàng gần đây</Heading>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Mã đơn</Table.HeaderCell>
            <Table.HeaderCell>Khách hàng</Table.HeaderCell>
            <Table.HeaderCell>Tổng tiền</Table.HeaderCell>
            <Table.HeaderCell>Trạng thái</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {orders.slice(0, 5).map((order: any) => (
            <Table.Row key={order.id}>
              <Table.Cell>#{order.display_id}</Table.Cell>
              <Table.Cell>{order.shipping_address?.first_name}</Table.Cell>
              <Table.Cell>{(order.total / 1000).toFixed(0)}k ₫</Table.Cell>
              <Table.Cell>
                <StatusBadge
                  color={
                    order.fulfillment_status === "fulfilled"
                      ? "green"
                      : order.fulfillment_status === "partially_fulfilled"
                        ? "blue"
                        : "orange"
                  }
                >
                  {order.fulfillment_status}
                </StatusBadge>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  );
}

function StatCard({ label, value, color = "neutral" }: { label: string; value: string; color?: string }) {
  const colorMap: Record<string, string> = {
    green: "text-emerald-600",
    red: "text-rose-600",
    orange: "text-amber-600",
    blue: "text-blue-600",
    neutral: "text-gray-900",
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <Text className="text-sm text-gray-500 mb-1">{label}</Text>
      <Text className={`text-2xl font-bold ${colorMap[color]}`}>{value}</Text>
    </div>
  );
}
```

## 8.3 Occasion Analytics Widget

### apps/backend/src/admin-widgets/occasion-analytics/index.tsx
```tsx
import { Container, Heading, Text } from "@medusajs/ui";
import { useEffect, useState } from "react";

// ponytail: Simple bar chart of orders by occasion.
// Using table display — add Recharts when visualization complexity warrants it.

export default function OccasionAnalyticsWidget() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Fetch orders grouped by occasion category (metadata field)
    fetch("/admin/orders?fields=metadata&limit=500")
      .then((r) => r.json())
      .then((d) => {
        const occasionCounts: Record<string, number> = {};
        d.orders?.forEach((o: any) => {
          const occ = o.metadata?.occasion || "other";
          occasionCounts[occ] = (occasionCounts[occ] || 0) + 1;
        });
        setData(
          Object.entries(occasionCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
        );
      });
  }, []);

  const maxCount = Math.max(...data.map(([, c]) => c), 1);

  return (
    <Container className="p-6">
      <Heading level="h2" className="mb-4">
        🌸 Đơn hàng theo Dịp
      </Heading>

      <div className="space-y-3">
        {data.map(([occasion, count]) => (
          <div key={occasion} className="flex items-center gap-3">
            <Text className="w-32 text-sm text-right shrink-0 capitalize">
              {occasion.replace(/-/g, " ")}
            </Text>
            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <Text className="w-10 text-sm font-medium">{count}</Text>
          </div>
        ))}
        {data.length === 0 && <Text className="text-gray-400">Chưa có dữ liệu</Text>}
      </div>
    </Container>
  );
}
```

## 8.4 Delivery Dashboard Widget

### apps/backend/src/admin-widgets/delivery-dashboard/index.tsx
```tsx
import { Container, Heading, Text } from "@medusajs/ui";
import { useState, useEffect } from "react";

const GHN_STATUS_MAP: Record<string, { label: string; color: string }> = {
  ready_to_pick: { label: "Chờ lấy hàng", color: "bg-amber-400" },
  picking: { label: "Đang lấy hàng", color: "bg-blue-400" },
  delivering: { label: "Đang giao", color: "bg-indigo-400" },
  delivered: { label: "Đã giao", color: "bg-emerald-500" },
  return: { label: "Hoàn hàng", color: "bg-rose-500" },
  cancel: { label: "Đã hủy", color: "bg-gray-400" },
};

export default function DeliveryDashboardWidget() {
  const [deliveries, setDeliveries] = useState<any[]>([]);

  useEffect(() => {
    // Get fulfillment data from orders, query GHN for tracking status
    fetch("/admin/orders?fulfillment_status=not_fulfilled,partially_fulfilled&fields=*fulfillments")
      .then((r) => r.json())
      .then((d) => {
        const withTracking = d.orders?.filter(
          (o: any) => o.fulfillments?.[0]?.data?.tracking_code
        ) || [];
        setDeliveries(withTracking);
      });
  }, []);

  const statusCounts: Record<string, number> = {};
  deliveries.forEach((d) => {
    const status = d.fulfillments?.[0]?.data?.ghn_status || "unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  return (
    <Container className="p-6">
      <Heading level="h2" className="mb-4">
        🚚 Bảng điều khiển Giao hàng
      </Heading>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(GHN_STATUS_MAP).map(([key, { label, color }]) => (
          <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <div>
              <Text className="text-xs text-gray-500">{label}</Text>
              <Text className="text-lg font-bold">{statusCounts[key] || 0}</Text>
            </div>
          </div>
        ))}
      </div>

      <Text className="text-sm text-gray-500">
        Tổng đơn đang giao: {deliveries.length}
      </Text>
    </Container>
  );
}
```

## 8.5 Seasonal Promo Toggle Widget

### apps/backend/src/admin-widgets/seasonal-promo-toggle/index.tsx
```tsx
import { Container, Heading, Text, Button, Switch, Input, Label } from "@medusajs/ui";
import { useState, useEffect } from "react";

interface SeasonalPromo {
  occasion: string;
  active: boolean;
  bannerText: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
}

export default function SeasonalPromoToggleWidget() {
  const [promos, setPromos] = useState<SeasonalPromo[]>([
    {
      occasion: "Tet 2027",
      active: false,
      bannerText: "🧧 Tết đang đến! Đặt hoa sớm — giảm 15%",
      discountPercent: 15,
      startDate: "2027-01-15",
      endDate: "2027-02-10",
    },
    {
      occasion: "Valentine 14/2",
      active: false,
      bannerText: "💝 Valentine — Tặng hoa tặng yêu thương",
      discountPercent: 10,
      startDate: "2027-02-07",
      endDate: "2027-02-14",
    },
    {
      occasion: "Quốc tế Phụ nữ 8/3",
      active: false,
      bannerText: "🌸 Mừng ngày Quốc tế Phụ nữ — Giảm 10%",
      discountPercent: 10,
      startDate: "2027-03-01",
      endDate: "2027-03-08",
    },
  ]);

  const togglePromo = (index: number) => {
    const updated = [...promos];
    updated[index].active = !updated[index].active;
    setPromos(updated);
    // Save to store metadata
    fetch("/admin/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: { seasonal_promos: updated } }),
    });
  };

  return (
    <Container className="p-6">
      <Heading level="h2" className="mb-4">🎯 Quản lý Khuyến mãi Mùa</Heading>

      <div className="space-y-4">
        {promos.map((promo, i) => (
          <div
            key={promo.occasion}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              promo.active ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Switch checked={promo.active} onCheckedChange={() => togglePromo(i)} />
                <div>
                  <Text className="font-medium">{promo.occasion}</Text>
                  <Text className="text-sm text-gray-500">{promo.bannerText}</Text>
                  <Text className="text-xs text-gray-400 mt-1">
                    {promo.startDate} → {promo.endDate} • Giảm {promo.discountPercent}%
                  </Text>
                </div>
              </div>
            </div>
            <StatusBadge color={promo.active ? "green" : "grey"}>
              {promo.active ? "Đang chạy" : "Tắt"}
            </StatusBadge>
          </div>
        ))}
      </div>
    </Container>
  );
}
```

## Acceptance Criteria

- [ ] Daily orders widget shows today's orders with counts + revenue
- [ ] Occasion analytics shows bar chart of orders by occasion
- [ ] Delivery dashboard shows GHN status breakdown
- [ ] Seasonal promo toggle activates/deactivates seasonal promotions
- [ ] All widgets render in Medusa admin panel at configured zones
