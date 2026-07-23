// ponytail: Medusa handles anonymous carts natively via publishable API key.
// Cart ID stored in localStorage. No custom guest login needed.

const CART_KEY = "medusa_cart_id";

export function getCartId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CART_KEY);
}

export function setCartId(cartId: string) {
  localStorage.setItem(CART_KEY, cartId);
}

export function clearCartId() {
  localStorage.removeItem(CART_KEY);
}
