import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Text, StatusBadge } from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";

// ponytail: GHN delivery status dashboard. Shows fulfillment status counts
// for today's orders. Add GHN API polling when webhooks are configured.

declare const __BACKEND_URL__: string;

interface Order {
  id: string;
  display_id: number;
  fulfillment_status: string;
  shipping_methods?: Array<{ name: string }>;
}

const DeliveryDashboardWidget = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-delivery"],
    queryFn: async () => {
      const resp = await fetch(`${__BACKEND_URL__}/admin/orders?limit=100&fulfillment_status=not_fulfilled,partially_fulfilled`, {
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Failed to fetch orders");
      const json = await resp.json();
      return (json.orders || []) as Order[];
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Container><Text>Loading...</Text></Container>;

  const orders = data || [];
  const notFulfilled = orders.filter((o) => o.fulfillment_status === "not_fulfilled");
  const partiallyFulfilled = orders.filter((o) => o.fulfillment_status === "partially_fulfilled");
  const ghnOrders = orders.filter(
    (o) => o.shipping_methods?.some((m) => m.name?.toLowerCase().includes("ghn"))
  );

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Giao hang GHN</Heading>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4">
        <StatusCard
          label="Cho giao"
          count={notFulfilled.length}
          color="orange"
        />
        <StatusCard
          label="Dang giao"
          count={partiallyFulfilled.length}
          color="blue"
        />
        <StatusCard
          label="Don GHN"
          count={ghnOrders.length}
          color="green"
        />
      </div>
      <div className="px-6 py-4">
        <Heading level="h3" className="mb-3">Don cho xu ly</Heading>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ui-border-base text-left">
                <th className="py-2 font-medium text-ui-fg-subtle">Ma don</th>
                <th className="py-2 font-medium text-ui-fg-subtle">Trang thai</th>
                <th className="py-2 font-medium text-ui-fg-subtle">Van chuyen</th>
              </tr>
            </thead>
            <tbody>
              {notFulfilled.slice(0, 10).map((order) => (
                <tr key={order.id} className="border-b border-ui-border-base last:border-0">
                  <td className="py-2">#{order.display_id}</td>
                  <td className="py-2">
                    <StatusBadge color="orange">Cho giao</StatusBadge>
                  </td>
                  <td className="py-2">
                    {order.shipping_methods?.map((m) => m.name).join(", ") || "—"}
                  </td>
                </tr>
              ))}
              {notFulfilled.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-ui-fg-subtle">
                    Khong co don cho giao
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

function StatusCard({ label, count, color = "grey" }: { label: string; count: number; color?: string }) {
  const colorMap: Record<string, string> = {
    green: "border-l-green-500",
    orange: "border-l-orange-500",
    blue: "border-l-blue-500",
    red: "border-l-red-500",
    grey: "border-l-gray-300",
  };
  return (
    <div className={`border-l-4 ${colorMap[color] || colorMap.grey} rounded-lg border border-ui-border-base p-4`}>
      <Text size="small" className="text-ui-fg-subtle mb-1">{label}</Text>
      <Text size="xlarge" className="font-bold">{count}</Text>
    </div>
  );
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
  id: "bloom:delivery-dashboard-widget",
});

export default DeliveryDashboardWidget;
