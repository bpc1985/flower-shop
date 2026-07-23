import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Text } from "@medusajs/ui";

// ponytail: placeholder for order-by-occasion chart. Add chart.js or recharts
// when there is real order data to visualize. Currently shows empty state.

declare const __BACKEND_URL__: string;

const OccasionAnalyticsWidget = () => {
  // ponytail: no real admin analytics endpoint yet in Medusa 2.17.
  // Widget skeleton ready — query /admin/orders with occasion metadata filter when available.
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Don hang theo dip</Heading>
      </div>
      <div className="px-6 py-8 text-center">
        <Text className="text-ui-fg-subtle">
          Du lieu phan tich dip se hien thi khi co don hang.
        </Text>
        <Text size="small" className="text-ui-fg-muted mt-1">
          Orders grouped by occasion (sinh nhat, ky niem, tet, ...) will appear here.
        </Text>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.list.after",
  id: "bloom:occasion-analytics-widget",
});

export default OccasionAnalyticsWidget;
