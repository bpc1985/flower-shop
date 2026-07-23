"use client";

import { useQuery } from "@tanstack/react-query";
import { medusaClient } from "@/lib/medusa-client";
import { queryKeys } from "./query-keys";

export interface ProductFilters {
  categoryHandle?: string;
  occasionHandle?: string;
  minPrice?: number;
  maxPrice?: number;
  deliveryAvailable?: boolean;
  sort?: "price_asc" | "price_desc" | "created_at";
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(filters as unknown as Record<string, unknown>),
    queryFn: async () => {
      const params: Record<string, unknown> = {
        fields: "*variants,*variants.calculated_price,*images,*categories",
        region_id: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
      };
      if (filters.categoryHandle) params.category_handle = filters.categoryHandle;
      // ponytail: client-side filtering until Medusa native filter support
      const { products } = await medusaClient.store.product.list(params);
      return (products ?? []) as any[];
    },
  });
}

export function useProduct(handle: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(handle),
    queryFn: async () => {
      const { products } = await medusaClient.store.product.list({
        handle,
        fields: "*variants,*variants.calculated_price,*images,*categories",
        region_id: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
      });
      if (!products?.length) throw new Error("Product not found");
      return products[0] as any;
    },
    enabled: !!handle,
  });
}
