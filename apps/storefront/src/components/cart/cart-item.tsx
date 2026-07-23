"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUpdateCartItem, useRemoveFromCart } from "@/hooks/use-cart";
import { formatVND } from "@/lib/format-currency";

interface CartItemProps {
  item: any;
}

export function CartItem({ item }: CartItemProps) {
  const t = useTranslations("cart");
  const { mutate: updateItem, isPending: updating } = useUpdateCartItem();
  const { mutate: removeItem, isPending: removing } = useRemoveFromCart();

  const variantTitle = item.variant?.title || "";
  const price = item.unit_price;
  const imageUrl = item.thumbnail || item.variant?.product?.thumbnail || "/placeholder-flower.jpg";
  const isPending = updating || removing;

  return (
    <div className="flex gap-3 py-3 border-b border-cream-200 last:border-0">
      <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-cream-200">
        <Image
          src={imageUrl}
          alt={item.title || ""}
          fill
          className="object-cover"
          sizes="80px"
          unoptimized
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-warm-900 line-clamp-1">{item.title}</h4>
        {variantTitle && (
          <p className="text-xs text-warm-800/60 mt-0.5">
            {variantTitle}
          </p>
        )}
        <p className="text-sm font-semibold text-burgundy-600 mt-1">
          {formatVND(price)}
        </p>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => updateItem({ lineItemId: item.id, quantity: item.quantity - 1 })}
            disabled={isPending || item.quantity <= 1}
            className="w-7 h-7 rounded border border-cream-200 flex items-center justify-center disabled:opacity-30"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
          <button
            onClick={() => updateItem({ lineItemId: item.id, quantity: item.quantity + 1 })}
            disabled={isPending}
            className="w-7 h-7 rounded border border-cream-200 flex items-center justify-center disabled:opacity-30"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => removeItem(item.id)}
            disabled={removing}
            className="ml-auto w-7 h-7 rounded flex items-center justify-center text-warm-800/40 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
