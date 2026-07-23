"use client";

import { useQuery } from "@tanstack/react-query";
import { medusaClient } from "@/lib/medusa-client";
import { queryKeys } from "./query-keys";

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders.lists(),
    queryFn: async () => {
      const { orders } = await medusaClient.store.order.list(
        {},
        { fields: "*items,*items.variant,*items.variant.product" },
      );
      return orders as any[];
    },
    staleTime: 30 * 1000,
    retry: 1,
  });
}
