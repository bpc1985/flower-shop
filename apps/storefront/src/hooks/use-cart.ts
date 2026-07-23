"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { medusaClient } from "@/lib/medusa-client";
import { queryKeys } from "./query-keys";
import { getCartId, setCartId, clearCartId } from "@/lib/guest-cart";
import { toast } from "sonner";

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart.current(),
    queryFn: async () => {
      const cartId = getCartId();
      if (!cartId) return null;
      const { cart } = await medusaClient.store.cart.retrieve(cartId, {
        fields: "*items,*items.variant,*items.variant.product,*region",
      });
      return cart as any;
    },
    staleTime: 0,
    retry: false,
  });
}

export function useCartCount() {
  const { data: cart } = useCart();
  return (cart as any)?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
}

export function useAddToCart(): any {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { variantId: string; quantity: number }) => {
      let cartId = getCartId();
      if (!cartId) {
        // ponytail: omit region_id — Medusa auto-assigns default region
        const { cart } = await medusaClient.store.cart.create({ currency_code: "vnd" });
        cartId = cart.id;
        setCartId(cartId);
      }
      const { cart } = await medusaClient.store.cart.createLineItem(cartId, {
        variant_id: input.variantId,
        quantity: input.quantity,
      });
      return cart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      toast.success("Đã thêm vào giỏ hàng");
    },
    onError: (err: Error) => toast.error(err.message || "Không thể thêm vào giỏ"),
  });
}

export function useUpdateCartItem(): any {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { lineItemId: string; quantity: number }) => {
      const cartId = getCartId();
      if (!cartId) throw new Error("No cart");
      return medusaClient.store.cart.updateLineItem(cartId, input.lineItemId, {
        quantity: input.quantity,
      });
    },
    onError: () => toast.error("Không thể cập nhật số lượng"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });
}

export function useRemoveFromCart(): any {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineItemId: string) => {
      const cartId = getCartId();
      if (!cartId) throw new Error("No cart");
      return medusaClient.store.cart.deleteLineItem(cartId, lineItemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      toast.success("Đã xóa sản phẩm", {
        action: { label: "Hoàn tác", onClick: () => toast.info("Chưa hỗ trợ hoàn tác") },
      });
    },
    onError: () => toast.error("Không thể xóa sản phẩm"),
  });
}

export function useClearCart(): any {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // ponytail: Medusa JS SDK has no cart.delete. Cart auto-expires after 7 days.
      clearCartId();
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.cart.current(), null);
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}
