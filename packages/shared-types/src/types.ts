export interface ProductOption {
  id: string;
  title: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  prices: { amount: number; currency_code: string }[];
  options: Record<string, string>;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  thumbnail: string;
  images: string[];
  categories: { id: string; name: string }[];
  options: ProductOption[];
  variants: ProductVariant[];
  metadata: Record<string, unknown>;
}

export interface CartItem {
  id: string;
  quantity: number;
  unit_price: number;
  title: string;
  thumbnail: string;
  variant: ProductVariant;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  shipping_total: number;
  total: number;
  region: { currency_code: string };
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  maxMinutes: number;
  districtCodes: number[];
}

export type Locale = "vi" | "en";
export type PriceTier = "standard" | "premium" | "deluxe";
export type DeliverySpeed = "asap" | "today" | "tomorrow" | "date";
