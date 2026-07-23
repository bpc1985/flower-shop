"use client";

import { useQuery } from "@tanstack/react-query";
import { medusaClient } from "@/lib/medusa-client";
import { queryKeys } from "./query-keys";

export function useCategories(parentHandle?: string) {
  return useQuery({
    queryKey: queryKeys.categories.list({ parentHandle }),
    queryFn: async () => {
      const { product_categories } = await medusaClient.store.category.list({
        ...(parentHandle && { parent_category_handle: parentHandle }),
        include_descendants_tree: true,
        fields: "*category_children",
      });
      return (product_categories ?? []) as any[];
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useCategory(handle: string) {
  return useQuery({
    queryKey: queryKeys.categories.detail(handle),
    queryFn: async () => {
      const { product_categories } = await medusaClient.store.category.list({
        handle,
        include_descendants_tree: true,
      });
      if (!product_categories?.length) throw new Error("Category not found");
      return product_categories[0] as any;
    },
    staleTime: 60 * 60 * 1000,
    enabled: !!handle,
  });
}
