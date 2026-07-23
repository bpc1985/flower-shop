"use client";

// Stub — real implementation in Phase 7
export function useCart() {
  return {
    data: {
      id: "",
      items: [] as any[],
      subtotal: 0,
      shipping_total: 0,
      total: 0,
    },
    isLoading: false,
  };
}

export function useCartCount() {
  return 0;
}

export function useAddToCart() {
  return { mutateAsync: () => Promise.resolve(undefined), isPending: false };
}
