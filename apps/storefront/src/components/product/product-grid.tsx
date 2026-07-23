"use client";

import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "./product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface ProductGridProps {
  occasionSlug?: string;
  filters?: Record<string, string>;
}

export function ProductGrid({ occasionSlug }: ProductGridProps) {
  const { data: products, isLoading, error } = useProducts({
    occasionHandle: occasionSlug,
  });
  const t = useTranslations("product");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!products?.length) {
    return (
      <div className="text-center py-16 text-warm-800/60">
        <p>{t("noProducts")}</p>
        <p className="text-sm mt-2">{t("comeBack")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
