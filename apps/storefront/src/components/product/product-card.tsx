"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatVNDRange } from "@/lib/format-currency";

interface ProductCardProps {
  product: any;
}

export function ProductCard({ product }: ProductCardProps) {
  const locale = useLocale();
  const minPrice = Math.min(
    ...(product.variants ?? []).map((v: any) =>
      v.calculated_price?.calculated_amount ?? Infinity
    )
  );
  const maxPrice = Math.max(
    ...(product.variants ?? []).map((v: any) =>
      v.calculated_price?.calculated_amount ?? 0
    )
  );

  return (
    <Link href={`/products/${product.handle}`} className="group block">
      <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-cream-200 shadow-card group-hover:shadow-elevated transition-shadow">
        <Image
          src={product.thumbnail || "/placeholder-flower.jpg"}
          alt={product.title ?? ""}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 70vw, 280px"
          unoptimized
        />
        <Badge className="absolute top-3 left-3 bg-sage-500/90 text-cream-100 text-xs">
          {locale === "vi" ? "Giao nhanh" : "Fast"}
        </Badge>
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="font-heading text-sm md:text-base text-warm-900 line-clamp-2">
          {product.title}
        </h3>
        <p className="font-ui text-sm text-sage-600 font-medium">
          {formatVNDRange(minPrice, maxPrice)}
        </p>
      </div>
    </Link>
  );
}
