"use client";

import { useTranslations } from "next-intl";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/product/product-card";
import { Skeleton } from "@/components/ui/skeleton";

function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[4/5] rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function FeaturedCarousel() {
  const t = useTranslations("home");
  const { data: products, isLoading } = useProducts();

  if (isLoading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="font-heading text-h2 text-warm-900 mb-8">{t("featured")}</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[70vw] md:w-[280px] shrink-0 snap-start">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <h2 className="font-heading text-h2 text-warm-900 mb-8">{t("featured")}</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
        {products?.slice(0, 8).map((product) => (
          <div key={product.id} className="w-[70vw] md:w-[280px] shrink-0 snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
