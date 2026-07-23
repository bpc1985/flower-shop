import { medusaClient, storeToken, clearToken } from "./medusa-client";

// ponytail: thin adapter — no abstraction tax, just keep auth operations co-located.
// Persists JWT to localStorage so SDK can use it across SPA navigations.
// OTP callback uses direct fetch since JS SDK has no validateCallback method.

export const authClient = {
  login: async (input: { email: string; password: string }) => {
    const token = (await medusaClient.auth.login("customer", "emailpass", {
      email: input.email,
      password: input.password,
    })) as unknown as string;
    if (token) {
      storeToken(token);
      (medusaClient.auth as any).setToken_(token);
    }
    return token;
  },

  register: async (input: { email: string; password: string; first_name: string; last_name: string }) => {
    const token = (await medusaClient.auth.register("customer", "emailpass", {
      email: input.email,
      password: input.password,
      first_name: input.first_name,
      last_name: input.last_name,
    })) as unknown as string;
    if (token) {
      storeToken(token);
      (medusaClient.auth as any).setToken_(token);
    }
    return token;
  },

  requestOTP: async (input: { phone: string }) => {
    return medusaClient.auth.login("customer", "phone-otp", {
      phone: input.phone,
    });
  },

  verifyOTP: async (input: { phone: string; code: string }) => {
    const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
    const resp = await fetch(`${baseUrl}/auth/customer/phone-otp/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: input.phone, code: input.code }),
      credentials: "include",
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error((body as any).message || "OTP verification failed");
    }
    return resp.json();
  },

  loginWithGoogle: () => {
    window.location.href = `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/auth/customer/google`;
  },

  logout: async () => {
    clearToken();
    // ponytail: SDK stores token in memory. Clear it so useCustomer doesn't re-auth.
    (medusaClient.auth as any).setToken_("");
    return medusaClient.auth.logout();
  },
};
