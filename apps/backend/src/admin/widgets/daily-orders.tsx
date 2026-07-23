import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Text, StatusBadge } from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";

// ponytail: admin SDK has no useAdminCustomQuery. Use tanstack-query + fetch directly.
// __BACKEND_URL__ is injected by Vite at build time from admin bundler.

declare const __BACKEND_URL__: string;

interface Order {
  id: string;
  display_id: number;
  total: number;
  fulfillment_status: string;
  payment_status: string;
  shipping_address?: { first_name?: string; last_name?: string };
  created_at: string;
}

const DailyOrdersWidget = () => {
  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", today],
    queryFn: async () => {
      const resp = await fetch(
        `${__BACKEND_URL__}/admin/orders?created_at[$gte]=${today}&limit=50`,
        { credentials: "include" },
      );
      if (!resp.ok) throw new Error("Failed to fetch orders");
      const json = await resp.json();
      return (json.orders || []) as Order[];
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Container><Text>Loading...</Text></Container>;

  const orders = data || [];
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pending = orders.filter((o) => o.fulfillment_status === "not_fulfilled");
  const delivering = orders.filter((o) => o.fulfillment_status === "partially_fulfilled");
  const completed = orders.filter((o) => o.fulfillment_status === "fulfilled");
  const codOrders = orders.filter((o) => o.payment_status === "pending");

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Don hang hom nay</Heading>
        <Text size="small" className="text-ui-fg-subtle">{today}</Text>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4">
        <StatBox label="Tong don" value={orders.length.toString()} />
        <StatBox label="Doanh thu" value={`${(totalRevenue / 1000).toFixed(0)}k d`} />
        <StatBox label="Cho giao" value={pending.length.toString()} color="orange" />
        <StatBox label="Da giao" value={completed.length.toString()} color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4">
        <StatBox label="Dang giao" value={delivering.length.toString()} color="blue" />
        <StatBox label="COD chua thu" value={codOrders.length.toString()} color="red" />
        <StatBox
          label="Gia tri COD"
          value={`${(codOrders.reduce((s, o) => s + o.total, 0) / 1000).toFixed(0)}k d`}
          color="red"
        />
      </div>

      <div className="px-6 py-4">
        <Heading level="h3" className="mb-3">Don gan day</Heading>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ui-border-base text-left">
                <th className="py-2 font-medium text-ui-fg-subtle">Ma don</th>
                <th className="py-2 font-medium text-ui-fg-subtle">Khach</th>
                <th className="py-2 font-medium text-ui-fg-subtle">Tong</th>
                <th className="py-2 font-medium text-ui-fg-subtle">Trang thai</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="border-b border-ui-border-base last:border-0">
                  <td className="py-2">#{order.display_id}</td>
                  <td className="py-2">{order.shipping_address?.first_name || "Khach"}</td>
                  <td className="py-2">{((order.total || 0) / 1000).toFixed(0)}k d</td>
                  <td className="py-2">
                    <StatusBadge
                      color={
                        order.fulfillment_status === "fulfilled" ? "green"
                        : order.fulfillment_status === "partially_fulfilled" ? "blue"
                        : order.fulfillment_status === "not_fulfilled" ? "orange"
                        : "grey"
                      }
                    >
                      {order.fulfillment_status || "pending"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-ui-fg-subtle">
                    Chua co don hang nao hom nay
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Container>
  );
};

function StatBox({ label, value, color = "grey" }: { label: string; value: string; color?: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-ui-tag-green-bg text-ui-tag-green-text",
    red: "bg-ui-tag-red-bg text-ui-tag-red-text",
    blue: "bg-ui-tag-blue-bg text-ui-tag-blue-text",
    orange: "bg-ui-tag-orange-bg text-ui-tag-orange-text",
    grey: "bg-ui-bg-subtle text-ui-fg-subtle",
  };

  return (
    <div className="rounded-lg border border-ui-border-base p-4">
      <Text size="small" className="text-ui-fg-subtle mb-1">{label}</Text>
      <Text size="large" className="font-semibold">{value}</Text>
    </div>
  );
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
  id: "bloom:daily-orders-widget",
});

export default DailyOrdersWidget;
