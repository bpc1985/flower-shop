"use client";

import { PriceTierSelector } from "./price-tier-selector";
import { DeliverySpeedSelector } from "./delivery-speed-selector";
import { CareTipsAccordion } from "./care-tips-accordion";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/format-currency";

interface ProductInfoProps {
  product: any;
  minPrice: number;
}

export function ProductInfo({ product, minPrice }: ProductInfoProps) {
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
        variants={product.variants ?? []}
        onSelect={(id) => console.log("Selected:", id)}
      />

      <DeliverySpeedSelector />

      <button className="w-full bg-sage-500 hover:bg-sage-600 text-cream-100 py-3 rounded-full font-medium shadow-card transition-colors">
        Thêm vào giỏ hàng
      </button>

      <CareTipsAccordion />
    </div>
  );
}
