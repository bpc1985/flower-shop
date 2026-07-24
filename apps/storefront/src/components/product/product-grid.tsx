"use client";

import { useMemo } from "react";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "./product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export interface ProductGridFilters {
  occasionSlug?: string;
  occasions?: string[];
  minPrice?: number;
  maxPrice?: number;
}

interface ProductGridProps {
  filters?: ProductGridFilters;
}

function getMinVariantPrice(product: any): number {
  return Math.min(
    ...(product.variants ?? []).map((v: any) =>
      v.calculated_price?.calculated_amount ?? Infinity,
    ),
  );
}

/** Check if a product title/description matches any occasion keyword */
function matchesOccasionKeywords(product: any, occasionSlugs: string[]): boolean {
  // ponytail: simple keyword match on product title/description.
  // Upgrade to tags/metadata if products need precise occasion mapping.
  const keywords: Record<string, string[]> = {
    "sinh-nhat": ["sinh nhật", "birthday", "sinh nhat"],
    "ky-niem": ["kỷ niệm", "anniversary", "ky niem"],
    "tinh-yeu": ["tình yêu", "love", "romance", "romantic", "tinh yeu"],
    "chuc-mung": ["chúc mừng", "congratulation", "chuc mung"],
    "chia-buon": ["chia buồn", "sympathy", "condolence", "funeral", "chia buon"],
    "cam-on": ["cảm ơn", "thank", "cam on"],
    "hoa-tet": ["tết", "tet", "lunar", "xuân", "xuan"],
    "valentine": ["valentine"],
    "ngay-phu-nu": ["phụ nữ", "women", "phu nu", "8/3", "8-3"],
    "ngay-phu-nu-vn": ["20/10", "20-10"],
  };

  const title = (product.title ?? "").toLowerCase();
  const description = (product.description ?? "").toLowerCase();
  const text = `${title} ${description}`;

  return occasionSlugs.some((slug) => {
    const kws = keywords[slug] ?? [slug.replace(/-/g, " ")];
    return kws.some((kw: string) => text.includes(kw));
  });
}

export function ProductGrid({ filters }: ProductGridProps) {
  const { data: products, isLoading, error } = useProducts({
    occasionHandle: filters?.occasionSlug,
  });
  const t = useTranslations("product");

  const occasions = filters?.occasions;
  const minPrice = filters?.minPrice;
  const maxPrice = filters?.maxPrice;

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = products;

    if (occasions && occasions.length > 0) {
      result = result.filter((p) => matchesOccasionKeywords(p, occasions));
    }

    if (minPrice != null || maxPrice != null) {
      result = result.filter((p) => {
        const min = getMinVariantPrice(p);
        if (minPrice != null && min < minPrice) return false;
        if (maxPrice != null && min > maxPrice) return false;
        return true;
      });
    }

    return result;
  }, [products, occasions, minPrice, maxPrice]);

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

  if (!filteredProducts.length) {
    return (
      <div className="text-center py-16 text-warm-800/60">
        <p>{t("noProducts")}</p>
        <p className="text-sm mt-2">{t("comeBack")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {filteredProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
