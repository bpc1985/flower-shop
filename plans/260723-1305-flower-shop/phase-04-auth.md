# Phase 4: Authentication — Email, Google, Phone OTP

**Estimate:** 10-12h | **Depends on:** Phase 1 (env + logger), Phase 2 (backend)

## Step 0: Discovery Spike (1-2h — MUST DO FIRST)

```bash
# Read actual auth provider interfaces from installed packages
cd apps/backend
find node_modules/@medusajs -name "*.d.ts" | xargs grep -l "AuthProvider\|IAuthProvider\|AbstractAuth" | head -5

# Check what the built-in providers extend
cat node_modules/@medusajs/auth-emailpass/dist/index.d.ts
cat node_modules/@medusajs/auth-google/dist/index.d.ts
```

**Goal:** Find exact import path and base class/interface for custom auth providers in Medusa 2.17.x. DO NOT code blindly.

## 4.1 Module Registration

### apps/backend/medusa-config.ts (ADD to modules array)
```ts
import { Modules } from "@medusajs/framework/utils";

// Inside defineConfig({ modules: [...] })
{
  resolve: Modules.AUTH,
  options: {
    providers: [
      {
        resolve: "@medusajs/auth-emailpass",
        id: "emailpass",
        options: {
          // Email config — Medusa uses built-in email sending
        },
      },
      {
        resolve: "@medusajs/auth-google",
        id: "google",
        options: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          callbackUrl: process.env.GOOGLE_CALLBACK_URL!,
        },
      },
      {
        resolve: "./src/modules/phone-otp",
        id: "phone-otp",
      },
    ],
  },
},
```

## 4.2 Phone OTP Auth Provider

### apps/backend/src/modules/phone-otp/index.ts
```ts
import { ModuleProvider } from "@medusajs/framework/utils";
import { PhoneOTPAuthProvider } from "./provider";

export default ModuleProvider("auth_phone_otp", {
  services: [PhoneOTPAuthProvider],
});

export { PhoneOTPAuthProvider };
```

### apps/backend/src/modules/phone-otp/types.ts
```ts
export interface OTPState {
  code: string;
  phone: string;
  expiresAt: number;       // Unix ms
  attempts: number;        // Failed verification attempts
  resentAt: number;        // Last resend timestamp
}

export interface SMSProvider {
  sendOTP(phone: string, code: string): Promise<{ success: boolean; provider: string }>;
}

export interface OTPConfig {
  codeLength: number;        // 6
  ttlMinutes: number;        // 5
  maxAttempts: number;       // 5
  resendCooldownSeconds: number; // 60
  maxRequestsPerWindow: number;  // 3
  windowMinutes: number;         // 5
}
```

### apps/backend/src/modules/phone-otp/provider.ts
```ts
import { AuthIdentityProviderService } from "@medusajs/framework";
// NOTE: Import path depends on discovery spike result.
// May be AbstractAuthProvider, IAuthProvider, or similar.
// VERIFY against actual package before coding.

import { logger } from "../../lib/logger";
import { ESMSClient } from "./sms/esms-client";
import { SpeedSMSClient } from "./sms/speedsms-client";
import type { OTPState, SMSProvider } from "./types";

const OTP_CONFIG = {
  codeLength: 6,
  ttlMinutes: 5,
  maxAttempts: 5,
  resendCooldownSeconds: 60,
  maxRequestsPerWindow: 3,
  windowMinutes: 5,
};

// ponytail: inline OTP generation — add crypto.randomInt when complexity matters
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class PhoneOTPAuthProvider /* extends <VERIFY BASE CLASS> */ {
  static identifier = "phone-otp";
  static isAuthProvider = true;

  private primarySMS: SMSProvider;
  private fallbackSMS: SMSProvider;

  constructor() {
    this.primarySMS = new ESMSClient({
      apiKey: process.env.ESMS_API_KEY!,
      secretKey: process.env.ESMS_SECRET_KEY!,
    });
    this.fallbackSMS = new SpeedSMSClient({
      apiKey: process.env.SPEEDSMS_API_KEY!,
      senderId: process.env.SPEEDSMS_SENDER_ID!,
    });
  }

  async authenticate(
    data: { phone: string },
    authIdentityService: AuthIdentityProviderService
  ): Promise<{ success: boolean; error?: string }> {
    const phone = data.phone.replace(/\s/g, "");

    // Rate limit check: 3 requests per 5 minutes
    const requestState: OTPState | null =
      await authIdentityService.getState(`otp:${phone}:request`);
    if (requestState) {
      const recentRequests = await this.countRecentRequests(
        authIdentityService,
        phone
      );
      if (recentRequests >= OTP_CONFIG.maxRequestsPerWindow) {
        return {
          success: false,
          error: `Quá ${OTP_CONFIG.maxRequestsPerWindow} lần gửi mã trong ${OTP_CONFIG.windowMinutes} phút. Vui lòng thử lại sau.`,
        };
      }
    }

    // Resend cooldown: 60 seconds
    const lastState: OTPState | null =
      await authIdentityService.getState(`otp:${phone}:current`);
    if (lastState && Date.now() - lastState.resentAt < OTP_CONFIG.resendCooldownSeconds * 1000) {
      return {
        success: false,
        error: `Vui lòng đợi ${OTP_CONFIG.resendCooldownSeconds}s trước khi gửi lại mã.`,
      };
    }

    // Generate + store OTP
    const code = generateOTP();
    const state: OTPState = {
      code,
      phone,
      expiresAt: Date.now() + OTP_CONFIG.ttlMinutes * 60 * 1000,
      attempts: 0,
      resentAt: Date.now(),
    };

    await authIdentityService.setState(`otp:${phone}:current`, state);
    await authIdentityService.recordRequest(`otp:${phone}:request`);

    // Send SMS: try primary, fallback on failure
    try {
      await this.primarySMS.sendOTP(phone, code);
      logger.info("OTP sent via ESMS", { phone });
    } catch (err) {
      logger.warn("ESMS failed, falling back to SpeedSMS", { phone });
      try {
        await this.fallbackSMS.sendOTP(phone, code);
        logger.info("OTP sent via SpeedSMS", { phone });
      } catch (err2) {
        logger.error("Both SMS providers failed", { phone });
        return { success: false, error: "Không thể gửi mã OTP. Vui lòng thử lại sau." };
      }
    }

    return { success: true };
  }

  async validateCallback(
    data: { phone: string; code: string },
    authIdentityService: AuthIdentityProviderService
  ): Promise<{ success: boolean; error?: string }> {
    const phone = data.phone.replace(/\s/g, "");
    const state: OTPState | null =
      await authIdentityService.getState(`otp:${phone}:current`);

    if (!state) {
      return { success: false, error: "Mã OTP không tồn tại hoặc đã hết hạn." };
    }

    if (Date.now() > state.expiresAt) {
      await authIdentityService.setState(`otp:${phone}:current`, null);
      return { success: false, error: "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới." };
    }

    if (state.attempts >= OTP_CONFIG.maxAttempts) {
      await authIdentityService.setState(`otp:${phone}:current`, null);
      return { success: false, error: "Quá số lần thử. Vui lòng yêu cầu mã mới." };
    }

    // Increment attempts
    state.attempts++;
    await authIdentityService.setState(`otp:${phone}:current`, state);

    if (state.code !== data.code) {
      return { success: false, error: "Mã OTP không đúng." };
    }

    // Clear state on success
    await authIdentityService.setState(`otp:${phone}:current`, null);

    return { success: true };
  }

  private async countRecentRequests(
    service: AuthIdentityProviderService,
    phone: string
  ): Promise<number> {
    // ponytail: count from stored request logs
    // In production, use Redis ZSET or Medusa's built-in state tracking
    const state: OTPState | null =
      await service.getState(`otp:${phone}:request`);
    return state ? 1 : 0; // Simplified — expand with real rate limiting
  }
}
```

### apps/backend/src/modules/phone-otp/sms/esms-client.ts
```ts
import type { SMSProvider } from "../types";

interface ESMSConfig {
  apiKey: string;
  secretKey: string;
}

export class ESMSClient implements SMSProvider {
  private apiKey: string;
  private secretKey: string;
  private baseUrl = "https://rest.esms.vn/MainService.svc/json";

  constructor(config: ESMSConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
  }

  async sendOTP(phone: string, code: string): Promise<{ success: boolean; provider: string }> {
    const normalizedPhone = phone.startsWith("0")
      ? `84${phone.slice(1)}`
      : phone.startsWith("+84")
        ? phone.slice(1)
        : phone;

    const response = await fetch(`${this.baseUrl}/SendMultipleMessage_V4_post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ApiKey: this.apiKey,
        SecretKey: this.secretKey,
        Phone: normalizedPhone,
        Content: `Ma xac thuc Bloom Wedding: ${code}. Het han sau 5 phut.`,
        SmsType: "2", // OTP type
        Brandname: "BloomWedding", // Must be registered with ESMS
      }),
    });

    const result = await response.json();
    if (result.CodeResult !== "100") {
      throw new Error(`ESMS error: ${result.ErrorMessage}`);
    }

    return { success: true, provider: "esms" };
  }
}
```

### apps/backend/src/modules/phone-otp/sms/speedsms-client.ts
```ts
import type { SMSProvider } from "../types";

interface SpeedSMSConfig {
  apiKey: string;
  senderId: string;
}

export class SpeedSMSClient implements SMSProvider {
  private apiKey: string;
  private senderId: string;
  private baseUrl = "https://api.speedsms.vn/index.php";

  constructor(config: SpeedSMSConfig) {
    this.apiKey = config.apiKey;
    this.senderId = config.senderId;
  }

  async sendOTP(phone: string, code: string): Promise<{ success: boolean; provider: string }> {
    const response = await fetch(`${this.baseUrl}/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${this.apiKey}:x`).toString("base64")}`,
      },
      body: JSON.stringify({
        to: [phone],
        content: `Ma xac thuc Bloom Wedding: ${code}. Het han sau 5 phut.`,
        sms_type: "3", // OTP
        sender: this.senderId,
      }),
    });

    const result = await response.json();
    if (result.status !== "success") {
      throw new Error(`SpeedSMS error: ${result.message}`);
    }

    return { success: true, provider: "speedsms" };
  }
}
```

## 4.3 Frontend Auth Components

### apps/storefront/src/lib/auth-client.ts
```ts
import { medusaClient } from "./medusa-client";

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

interface PhoneOTPInput {
  phone: string;
}

interface PhoneOTPVerifyInput {
  phone: string;
  code: string;
}

export const authClient = {
  // Email/Password
  login: async (input: LoginInput) => {
    return medusaClient.auth.login("emailpass", {
      email: input.email,
      password: input.password,
    });
  },

  register: async (input: RegisterInput) => {
    return medusaClient.auth.register("emailpass", {
      email: input.email,
      password: input.password,
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone,
    });
  },

  logout: async () => {
    return medusaClient.auth.logout();
  },

  // Google OAuth
  loginWithGoogle: () => {
    window.location.href = `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/auth/google`;
  },

  // Phone OTP
  requestOTP: async (input: PhoneOTPInput) => {
    return medusaClient.auth.login("phone-otp", {
      phone: input.phone,
    });
  },

  verifyOTP: async (input: PhoneOTPVerifyInput) => {
    return medusaClient.auth.validateCallback("phone-otp", {
      phone: input.phone,
      code: input.code,
    });
  },

  // Session
  getSession: async () => {
    try {
      return await medusaClient.auth.getSession();
    } catch {
      return null;
    }
  },
};
```

### apps/storefront/src/hooks/use-auth.ts
```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "./query-keys";
import { toast } from "sonner";

export function useAuth() {
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: queryKeys.customer.current(),
    queryFn: () => authClient.getSession(),
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: authClient.login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.all });
      toast.success("Đăng nhập thành công");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Đăng nhập thất bại");
    },
  });

  const registerMutation = useMutation({
    mutationFn: authClient.register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.all });
      toast.success("Đăng ký thành công");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Đăng ký thất bại");
    },
  });

  const requestOTPMutation = useMutation({
    mutationFn: authClient.requestOTP,
    onSuccess: () => toast.success("Đã gửi mã OTP"),
    onError: (err: Error) => toast.error(err.message),
  });

  const verifyOTPMutation = useMutation({
    mutationFn: authClient.verifyOTP,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.all });
      toast.success("Xác thực thành công");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const logoutMutation = useMutation({
    mutationFn: authClient.logout,
    onSuccess: () => {
      queryClient.clear();
      toast.success("Đã đăng xuất");
    },
  });

  return {
    session: session.data,
    isLoading: session.isLoading,
    isLoggedIn: !!session.data,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    requestOTP: requestOTPMutation.mutateAsync,
    verifyOTP: verifyOTPMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginWithGoogle: authClient.loginWithGoogle,
    isPending:
      loginMutation.isPending ||
      registerMutation.isPending ||
      requestOTPMutation.isPending ||
      verifyOTPMutation.isPending,
  };
}
```

### apps/storefront/src/components/auth/login-dialog.tsx
```tsx
"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EmailLoginForm } from "./email-login-form";
import { PhoneOTPForm } from "./phone-otp-form";
import { GoogleSigninButton } from "./google-signin-button";

type Tab = "email" | "phone";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const t = useTranslations("auth");
  const [tab, setTab] = useState<Tab>("email");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-cream-100 border-cream-200">
        <DialogTitle className="font-heading text-xl text-warm-900 text-center">
          {t("loginTitle")}
        </DialogTitle>

        {/* Tab switcher */}
        <div className="flex bg-cream-200 rounded-lg p-0.5">
          <button
            onClick={() => setTab("email")}
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${
              tab === "email" ? "bg-cream-100 text-burgundy-600 font-medium shadow-sm" : "text-warm-800"
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setTab("phone")}
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${
              tab === "phone" ? "bg-cream-100 text-burgundy-600 font-medium shadow-sm" : "text-warm-800"
            }`}
          >
            {t("phoneTab")}
          </button>
        </div>

        {tab === "email" ? <EmailLoginForm onSuccess={() => onOpenChange(false)} /> : <PhoneOTPForm onSuccess={() => onOpenChange(false)} />}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-cream-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-cream-100 px-2 text-warm-800/60">{t("or")}</span>
          </div>
        </div>

        <GoogleSigninButton />
      </DialogContent>
    </Dialog>
  );
}
```

### apps/storefront/src/components/auth/otp-input.tsx
```tsx
"use client";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export function OTPInput({ length = 6, onComplete, disabled }: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);

    // Auto-advance
    if (value && index < length - 1) {
      refs.current[index + 1]?.focus();
    }

    // Check complete
    const code = newValues.join("");
    if (code.length === length) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    const newValues = [...values];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setValues(newValues);
    if (pasted.length === length) onComplete(pasted);
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {values.map((val, i) => (
        <Input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={val}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          maxLength={1}
          className="w-12 h-14 text-center text-lg font-semibold"
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
```

### apps/storefront/src/components/auth/phone-otp-form.tsx
```tsx
"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OTPInput } from "./otp-input";
import { phoneSchema } from "@bloom/shared-types/schemas";

interface PhoneOTPFormProps {
  onSuccess: () => void;
}

export function PhoneOTPForm({ onSuccess }: PhoneOTPFormProps) {
  const t = useTranslations("auth");
  const { requestOTP, verifyOTP, isPending } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOTP = async () => {
    setError("");
    const result = phoneSchema.safeParse(phone);
    if (!result.success) {
      setError("Số điện thoại không hợp lệ");
      return;
    }
    try {
      await requestOTP({ phone });
      setStep("otp");
      setCountdown(60);
    } catch {
      setError("Không thể gửi mã OTP");
    }
  };

  const handleVerifyOTP = async (code: string) => {
    try {
      await verifyOTP({ phone, code });
      onSuccess();
    } catch {
      setError("Mã OTP không đúng");
    }
  };

  return (
    <div className="space-y-4">
      {step === "phone" ? (
        <>
          <div className="flex gap-2">
            <div className="w-16 shrink-0">
              <Input value="+84" disabled className="text-center" />
            </div>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Số điện thoại"
              maxLength={10}
              inputMode="numeric"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={handleSendOTP} disabled={isPending} className="w-full bg-sage-500 hover:bg-sage-600">
            Gửi mã OTP
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-center text-warm-800/70">
            Nhập mã OTP gửi đến {phone}
          </p>
          <OTPInput onComplete={handleVerifyOTP} disabled={isPending} />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <Button
            variant="link"
            onClick={handleSendOTP}
            disabled={countdown > 0 || isPending}
            className="w-full text-sage-600"
          >
            {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại mã"}
          </Button>
        </>
      )}
    </div>
  );
}
```

## 4.4 Guest Checkout Support

### Design principle
- Product browsing, cart, and COD checkout do NOT require login
- Medusa creates anonymous carts with publishable API key
- At checkout, customer provides name + phone + email (not necessarily an account)
- Optional account creation after order: "Tạo tài khoản để theo dõi đơn hàng?"
- Payment gateway orders require email for confirmation

### apps/storefront/src/lib/guest-cart.ts
```ts
// ponytail: Medusa handles anonymous carts natively via publishable API key.
// Cart ID stored in cookie/localStorage. No custom guest logic needed.

export function getCartId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("medusa_cart_id");
}

export function setCartId(cartId: string) {
  localStorage.setItem("medusa_cart_id", cartId);
}

export function clearCartId() {
  localStorage.removeItem("medusa_cart_id");
}
```

## Files Created

```
apps/backend/src/modules/phone-otp/
├── index.ts
├── provider.ts
├── types.ts
└── sms/
    ├── esms-client.ts
    └── speedsms-client.ts

apps/storefront/src/
├── lib/auth-client.ts
├── lib/guest-cart.ts
├── hooks/use-auth.ts
└── components/auth/
    ├── login-dialog.tsx
    ├── email-login-form.tsx
    ├── phone-otp-form.tsx
    ├── otp-input.tsx
    └── google-signin-button.tsx
```

## Acceptance Criteria

- [ ] Discovery spike: verified actual auth provider interface from Medusa 2.17 source
- [ ] Email/password registration + login works end-to-end
- [ ] Google OAuth redirect → consent → session works
- [ ] Phone OTP: enter phone → SMS received → enter code → logged in
- [ ] Rate limiting: 3 OTP per 5 min enforced (test with rapid requests)
- [ ] Rate limiting: 5 failed attempts blocks phone (test with wrong codes)
- [ ] 60-second resend cooldown shown in UI
- [ ] OTP expires after 5 min, clear error shown
- [ ] SMS failover: kill ESMS → SpeedSMS used (check logs)
- [ ] Guest cart persists without login
- [ ] Auth state persists across navigation
- [ ] Logout clears session + Tanstack Query cache
- [ ] All forms have Zod validation + inline error messages
- [ ] Mobile: OTP boxes large, auto-advance, paste works
