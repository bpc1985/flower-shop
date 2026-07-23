import Medusa from "@medusajs/js-sdk";
import "./env"; // Fails fast on missing vars

const TOKEN_KEY = "medusa_jwt";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

const medusaClient = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
  debug: process.env.NODE_ENV === "development",
});

// ponytail: Medusa SDK doesn't auto-persist JWT. Re-inject from localStorage on init.
// setToken_ is private in TS types but exists at runtime.
const savedToken = getStoredToken();
if (savedToken) {
  (medusaClient.auth as any).setToken_(savedToken);
}

export { medusaClient };
