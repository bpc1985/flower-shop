import { medusaClient } from "./medusa-client";

// ponytail: thin adapter — no abstraction tax, just keep auth operations co-located.
// OTP callback uses direct fetch since JS SDK has no validateCallback method.

export const authClient = {
  login: async (input: { email: string; password: string }) => {
    return medusaClient.auth.login("customer", "emailpass", {
      email: input.email,
      password: input.password,
    });
  },

  register: async (input: { email: string; password: string; first_name: string; last_name: string }) => {
    return medusaClient.auth.register("customer", "emailpass", {
      email: input.email,
      password: input.password,
      first_name: input.first_name,
      last_name: input.last_name,
    });
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
    return medusaClient.auth.logout();
  },
};
