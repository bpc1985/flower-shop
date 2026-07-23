export const queryKeys = {
  products: {
    all: ["products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (handle: string) => [...queryKeys.products.details(), handle] as const,
  },
  categories: {
    all: ["categories"] as const,
    lists: () => [...queryKeys.categories.all, "list"] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.categories.lists(), filters] as const,
    details: () => [...queryKeys.categories.all, "detail"] as const,
    detail: (handle: string) => [...queryKeys.categories.details(), handle] as const,
  },
  cart: {
    all: ["cart"] as const,
    current: () => [...queryKeys.cart.all, "current"] as const,
  },
  customer: {
    all: ["customer"] as const,
    current: () => [...queryKeys.customer.all, "current"] as const,
  },
  region: {
    all: ["region"] as const,
    current: () => [...queryKeys.region.all, "current"] as const,
  },
};
