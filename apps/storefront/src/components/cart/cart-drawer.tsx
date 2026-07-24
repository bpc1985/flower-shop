"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CartItem } from "./cart-item";
import { useCart, useCartCount } from "@/hooks/use-cart";
import { formatVND } from "@/lib/format-currency";

export function CartDrawer({ children }: { children?: React.ReactNode }) {
  const t = useTranslations("cart");
  const { data: cart, isLoading } = useCart();
  const count = useCartCount();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close cart drawer on route change (checkout, product, etc.)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const items = (cart as any)?.items || [];
  const subtotal = (cart as any)?.subtotal || (cart as any)?.item_subtotal || 0;
  const shippingTotal = (cart as any)?.shipping_total || 0;
  const total = (cart as any)?.total || subtotal + shippingTotal;
  const isEmpty = !isLoading && items.length === 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <button className="p-2 relative hover:text-burgundy-600 transition-colors">
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-burgundy-600 text-cream-100 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] bg-cream-100 border-cream-200 flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl text-warm-900">
            {t("title")} {count > 0 && `(${count})`}
          </SheetTitle>
        </SheetHeader>

        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <ShoppingBag className="w-12 h-12 text-warm-800/30" />
            <p className="text-warm-800/60">{t("empty")}</p>
            <Link
              href="/products"
              className="text-sage-600 hover:underline text-sm font-medium"
            >
              {t("browseOccasions")}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto mt-4">
              {items.map((item: any) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>

            <div className="border-t border-cream-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-warm-800">
                <span>{t("subtotal")}</span>
                <span className="font-medium">{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-warm-800">
                <span>{t("shipping")}</span>
                <span className="font-medium">
                  {shippingTotal > 0 ? formatVND(shippingTotal) : t("calculatedAtCheckout")}
                </span>
              </div>
              <div className="flex justify-between text-base font-heading font-semibold text-warm-900 pt-2 border-t border-cream-200">
                <span>{t("total")}</span>
                <span>{formatVND(total || subtotal)}</span>
              </div>

              <Button asChild className="w-full bg-sage-500 hover:bg-sage-600 text-cream-100">
                <Link href="/checkout">{t("checkout")}</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
