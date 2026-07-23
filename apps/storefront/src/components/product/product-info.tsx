"use client";

import { useState } from "react";
import { PriceTierSelector } from "./price-tier-selector";
import { DeliverySpeedSelector } from "./delivery-speed-selector";
import { CareTipsAccordion } from "./care-tips-accordion";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/format-currency";
import { useAddToCart } from "@/hooks/use-cart";

interface ProductInfoProps {
  product: any;
  minPrice: number;
}

export function ProductInfo({ product, minPrice }: ProductInfoProps) {
  const variants = product.variants ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id || "");
  const { mutate: addToCart, isPending } = useAddToCart();

  return (
    <div className="space-y-6">
      <div>
        <Badge className="bg-sage-500/90 text-cream-100 mb-3">
          ⚡ Giao nhanh 90 phút
        </Badge>
        <h1 className="font-heading text-h1 text-warm-900">{product.title}</h1>
      </div>

      <p className="font-ui text-2xl font-semibold text-warm-900">
        Từ {formatVND(minPrice)}
      </p>

      {product.description && (
        <p className="text-body text-warm-800/70 leading-relaxed">
          {product.description}
        </p>
      )}

      <PriceTierSelector
        variants={variants}
        onSelect={setSelectedVariantId}
      />

      <DeliverySpeedSelector />

      <button
        onClick={() => addToCart({ variantId: selectedVariantId, quantity: 1 })}
        disabled={isPending || !selectedVariantId}
        className="w-full bg-sage-500 hover:bg-sage-600 text-cream-100 py-3 rounded-full font-medium shadow-card transition-colors disabled:opacity-50"
      >
        {isPending ? "Đang thêm..." : "Thêm vào giỏ hàng"}
      </button>

      <CareTipsAccordion />
    </div>
  );
}
