"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/format-currency";

interface PriceTierSelectorProps {
  variants: any[];
  onSelect: (variantId: string) => void;
}

export function PriceTierSelector({ variants, onSelect }: PriceTierSelectorProps) {
  const [selected, setSelected] = useState(variants[0]?.id || "");

  const handleSelect = (variantId: string) => {
    setSelected(variantId);
    onSelect(variantId);
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {variants.map((v) => {
        const price = v.calculated_price?.calculated_amount ?? 0;
        const isSelected = selected === v.id;
        const borderClass = isSelected
          ? "border-sage-500 bg-sage-500/5"
          : "border-cream-200 hover:border-cream-300";

        return (
          <button
            key={v.id}
            onClick={() => handleSelect(v.id)}
            className={cn("border-2 rounded-xl p-3 text-left transition-all", borderClass)}
          >
            <p className="font-heading text-sm text-warm-900">{v.title?.split(" - ").slice(0, -1).join(" - ") || v.title}</p>
            <p className="font-ui font-semibold text-warm-900 mt-1">{formatVND(price)}</p>
          </button>
        );
      })}
    </div>
  );
}
