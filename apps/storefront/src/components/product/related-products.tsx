"use client";

import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "./product-card";

interface RelatedProductsProps {
  currentHandle: string;
}

export function RelatedProducts({ currentHandle }: RelatedProductsProps) {
  const { data: products } = useProducts();

  if (!products?.length) return null;

  const related = products.filter((p) => p.handle !== currentHandle).slice(0, 4);
  if (related.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-heading text-h2 text-warm-900 mb-8">
        Related Products
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
