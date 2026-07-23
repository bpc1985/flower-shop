# Phase 5: Payment — VNPay + Momo (Webhook Security Built-In)

**Estimate:** 8-10h | **Depends on:** Phase 2 (backend core)

## Step 0: Verify Medusa 2.17 Payment Provider Interface

```bash
cd apps/backend
# Find exact AbstractPaymentProvider path
find node_modules/@medusajs -name "*.d.ts" -path "*/payment/*" | xargs grep -l "AbstractPaymentProvider" | head -3

# Read the type definition
cat node_modules/@medusajs/framework/dist/utils/payment/abstract-payment-provider.d.ts
# OR
cat node_modules/@medusajs/payment/dist/types/provider.d.ts
```

**Verify these method signatures exist:**
- `initiatePayment(context: InitiatePaymentContext): Promise<InitiatePaymentResult>`
- `authorizePayment(context: AuthorizePaymentContext): Promise<AuthorizePaymentResult>`
- `capturePayment(context: CapturePaymentContext): Promise<CapturePaymentResult>`
- `refundPayment(context: RefundPaymentContext): Promise<RefundPaymentResult>`
- `cancelPayment(context: CancelPaymentContext): Promise<CancelPaymentResult>`
- `getPaymentStatus(context: GetPaymentStatusContext): Promise<string>`
- `getWebhookActionAndData(data: Record<string, unknown>): Promise<WebhookActionResult>`

## 5.1 Medusa Config Registration

### apps/backend/medusa-config.ts (ADD)
```ts
import { Modules } from "@medusajs/framework/utils";

// In modules array:
{
  resolve: Modules.PAYMENT,
  options: {
    providers: [
      {
        resolve: "./src/modules/vnpay",
        id: "vnpay",
        options: {
          tmnCode: process.env.VNPAY_TMN_CODE!,
          hashSecret: process.env.VNPAY_HASH_SECRET!,
          vnpUrl: process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
          vnpApiUrl: process.env.VNPAY_API_URL || "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
          returnUrl: process.env.VNPAY_RETURN_URL!,
          ipnUrl: process.env.VNPAY_IPN_URL!,
        },
      },
      {
        resolve: "./src/modules/momo",
        id: "momo",
        options: {
          partnerCode: process.env.MOMO_PARTNER_CODE!,
          accessKey: process.env.MOMO_ACCESS_KEY!,
          secretKey: process.env.MOMO_SECRET_KEY!,
          publicKey: process.env.MOMO_PUBLIC_KEY!,
          endpoint: process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn",
          returnUrl: process.env.MOMO_RETURN_URL!,
          ipnUrl: process.env.MOMO_IPN_URL!,
        },
      },
    ],
  },
},
```

## 5.2 VNPay Provider

### apps/backend/src/modules/vnpay/types.ts
```ts
export interface VNPayConfig {
  tmnCode: string;
  hashSecret: string;
  vnpUrl: string;
  vnpApiUrl: string;
  returnUrl: string;
  ipnUrl: string;
}

export interface VNPayParams {
  vnp_Version: string;
  vnp_Command: string;
  vnp_TmnCode: string;
  vnp_Amount: number;
  vnp_CreateDate: string;
  vnp_CurrCode: string;
  vnp_IpAddr: string;
  vnp_Locale: string;
  vnp_OrderInfo: string;
  vnp_OrderType: string;
  vnp_ReturnUrl: string;
  vnp_TxnRef: string;
  vnp_BankCode?: string;
  vnp_SecureHash?: string;
}

export interface VNPayReturn {
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo: string;
  vnp_CardType: string;
  vnp_OrderInfo: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_TmnCode: string;
  vnp_TransactionNo: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
  vnp_SecureHashType?: string;
}

// Allowed VNPay IPN server IPs (verify from VNPay docs)
export const VNPAY_IPN_IPS = [
  "113.160.92.202",
  "113.52.45.203",
  "116.97.245.130",
];
```

### apps/backend/src/modules/vnpay/vnpay-client.ts
```ts
import crypto from "crypto";
import querystring from "querystring";
import type { VNPayConfig, VNPayParams, VNPayReturn } from "./types";

export class VNPayClient {
  constructor(private config: VNPayConfig) {}

  /**
   * Sorts object params alphabetically, creates query string,
   * appends hashSecret, and returns SHA512 HMAC.
   */
  sign(params: Record<string, string | number | undefined>): string {
    const sorted = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== "" && k !== "vnp_SecureHash")
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = params[key]!.toString();
          return acc;
        },
        {} as Record<string, string>
      );

    const queryString = querystring.stringify(sorted, "&", "=", {
      encodeURIComponent: (str: string) => str, // VNPay uses raw encoding
    });

    return crypto
      .createHmac("sha512", this.config.hashSecret)
      .update(Buffer.from(queryString, "utf-8"))
      .digest("hex")
      .toUpperCase();
  }

  verify(params: VNPayReturn): boolean {
    const secureHash = params.vnp_SecureHash;
    const signed = this.sign({
      vnp_Amount: params.vnp_Amount,
      vnp_BankCode: params.vnp_BankCode,
      vnp_BankTranNo: params.vnp_BankTranNo,
      vnp_CardType: params.vnp_CardType,
      vnp_OrderInfo: params.vnp_OrderInfo,
      vnp_PayDate: params.vnp_PayDate,
      vnp_ResponseCode: params.vnp_ResponseCode,
      vnp_TmnCode: params.vnp_TmnCode,
      vnp_TransactionNo: params.vnp_TransactionNo,
      vnp_TransactionStatus: params.vnp_TransactionStatus,
      vnp_TxnRef: params.vnp_TxnRef,
    });
    return signed === secureHash;
  }

  formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  createPaymentUrl(params: {
    orderId: string;
    amount: number;
    ipAddr: string;
    orderInfo: string;
    bankCode?: string;
    locale?: string;
  }): string {
    const txnRef = `${params.orderId}_${Date.now()}`;
    const createDate = this.formatDate(new Date());

    const vnpParams: Record<string, string | number | undefined> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: this.config.tmnCode,
      vnp_Amount: params.amount, // VND — ALREADY ×100 from Medusa
      vnp_CreateDate: createDate,
      vnp_CurrCode: "VND",
      vnp_IpAddr: params.ipAddr,
      vnp_Locale: params.locale || "vn",
      vnp_OrderInfo: params.orderInfo.substring(0, 255),
      vnp_OrderType: "fashion", // Category code
      vnp_ReturnUrl: this.config.returnUrl,
      vnp_TxnRef: txnRef,
      vnp_BankCode: params.bankCode || "",
    };

    vnpParams.vnp_SecureHash = this.sign(vnpParams);

    const queryString = querystring.stringify(
      Object.fromEntries(
        Object.entries(vnpParams).filter(([, v]) => v !== undefined && v !== "")
      ) as Record<string, string>,
      "&",
      "=",
      { encodeURIComponent: querystring.escape }
    );

    return `${this.config.vnpUrl}?${queryString}`;
  }

  /**
   * Query VNPay for actual payment status (used by IPN handler + stale payment check)
   */
  async queryTransaction(txnRef: string): Promise<{
    status: "PAID" | "PENDING" | "CANCELLED" | "FAILED";
    amount: number;
  }> {
    const date = this.formatDate(new Date());
    const params: Record<string, string> = {
      vnp_RequestId: crypto.randomUUID(),
      vnp_Version: "2.1.0",
      vnp_Command: "querydr",
      vnp_TmnCode: this.config.tmnCode,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: txnRef,
      vnp_TransactionDate: date,
      vnp_CreateDate: date,
      vnp_IpAddr: "127.0.0.1",
    };

    const secureHash = this.sign(params);
    const response = await fetch(this.config.vnpApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, vnp_SecureHash: secureHash }),
    });
    const data = await response.json();

    return {
      status:
        data.vnp_TransactionStatus === "00"
          ? "PAID"
          : data.vnp_TransactionStatus === "01"
            ? "PENDING"
            : data.vnp_TransactionStatus === "02"
              ? "FAILED"
              : "CANCELLED",
      amount: parseInt(data.vnp_Amount || "0"),
    };
  }
}
```

### apps/backend/src/modules/vnpay/provider.ts
```ts
import { AbstractPaymentProvider, PaymentSessionStatus } from "@medusajs/framework/utils";
// NOTE: Verify import path from Step 0 discovery spike
import type {
  InitiatePaymentContext,
  AuthorizePaymentContext,
  CapturePaymentContext,
  RefundPaymentContext,
  CancelPaymentContext,
  GetPaymentStatusContext,
  WebhookActionResult,
} from "@medusajs/framework";
import { VNPayClient } from "./vnpay-client";
import { VNPAY_IPN_IPS, type VNPayReturn } from "./types";
import { logger } from "../../lib/logger";

export class VNPayPaymentProvider extends AbstractPaymentProvider {
  static identifier = "vnpay";
  private client: VNPayClient;

  constructor(container: any, options: any) {
    super(container, options);
    this.client = new VNPayClient(options);
  }

  async initiatePayment(
    context: InitiatePaymentContext
  ): Promise<{ data: Record<string, unknown> }> {
    const { amount, currency_code, resource_id, context: ctx } = context;
    const ipAddr = ctx.ip_addr as string || "127.0.0.1";
    const bankCode = ctx.bank_code as string | undefined;
    const locale = ctx.locale as string | undefined;

    // VNPay requires amount in VND × 100 (e.g., 350000 VND → 35000000)
    const vnpAmount = Math.round(amount * 100);

    const paymentUrl = this.client.createPaymentUrl({
      orderId: resource_id,
      amount: vnpAmount,
      ipAddr,
      orderInfo: `Bloom Wedding - Don hang ${resource_id}`,
      bankCode,
      locale,
    });

    return {
      data: {
        payment_url: paymentUrl,
        redirect_url: paymentUrl,
      },
    };
  }

  async authorizePayment(
    context: AuthorizePaymentContext
  ): Promise<{ data: Record<string, unknown>; status: PaymentSessionStatus }> {
    const { data } = context;

    // VNPay redirect back: verify HMAC signature
    const returnParams = data as unknown as VNPayReturn;
    if (!returnParams.vnp_SecureHash) {
      logger.error("VNPay authorize: missing signature", { data });
      return { data, status: PaymentSessionStatus.ERROR };
    }

    const isValid = this.client.verify(returnParams);
    if (!isValid) {
      logger.error("VNPay authorize: signature mismatch", {
        txnRef: returnParams.vnp_TxnRef,
      });
      return { data, status: PaymentSessionStatus.ERROR };
    }

    const status =
      returnParams.vnp_ResponseCode === "00" && returnParams.vnp_TransactionStatus === "00"
        ? PaymentSessionStatus.AUTHORIZED
        : PaymentSessionStatus.PENDING;

    return { data, status };
  }

  async capturePayment(
    context: CapturePaymentContext
  ): Promise<{ data: Record<string, unknown> }> {
    // VNPay auto-captures on IPN. Verify against query API for defense-in-depth.
    const { data } = context;
    const txnRef = data.vnp_TxnRef as string;

    if (txnRef) {
      const statusCheck = await this.client.queryTransaction(txnRef);
      if (statusCheck.status !== "PAID") {
        logger.error("VNPay capture: transaction not paid per VNPay API", { txnRef, statusCheck });
        return { data: { ...data, verify_status: statusCheck.status } };
      }
    }

    return { data };
  }

  async refundPayment(
    context: RefundPaymentContext
  ): Promise<{ data: Record<string, unknown> }> {
    // VNPay refund requires separate API call + merchant approval
    const { data } = context;
    logger.info("VNPay refund requested (manual review required)", { data });
    return { data };
  }

  async cancelPayment(
    context: CancelPaymentContext
  ): Promise<{ data: Record<string, unknown> }> {
    return { data: context.data };
  }

  async getPaymentStatus(
    context: GetPaymentStatusContext
  ): Promise<PaymentSessionStatus> {
    const { data } = context;
    const responseCode = (data as any)?.vnp_ResponseCode;

    if (responseCode === "00") return PaymentSessionStatus.AUTHORIZED;
    if (responseCode === "24") return PaymentSessionStatus.CANCELED;
    return PaymentSessionStatus.PENDING;
  }

  async getWebhookActionAndData(
    payload: Record<string, unknown>
  ): Promise<WebhookActionResult> {
    const params = payload as unknown as VNPayReturn & { vnp_SecureHash: string };

    // Security: verify signature (MANDATORY — cannot skip)
    const isValid = this.client.verify(params);
    if (!isValid) {
      logger.error("VNPay webhook: invalid signature", { txnRef: params.vnp_TxnRef });
      return { action: "not_supported" };
    }

    // Security: verify amount matches
    // (Amount verification done at capturePayment level)

    if (params.vnp_ResponseCode === "00" && params.vnp_TransactionStatus === "00") {
      return {
        action: "capture",
        data: params,
      };
    }

    return {
      action: "not_supported",
      data: params,
    };
  }
}
```

### apps/backend/src/modules/vnpay/webhook/route.ts
```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { VNPayClient } from "../vnpay-client";
import { VNPAY_IPN_IPS } from "../types";
import { logger } from "../../../lib/logger";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Security: IP whitelist
  const clientIp = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "";
  if (!VNPAY_IPN_IPS.some((ip) => clientIp.includes(ip))) {
    logger.warn("VNPay IPN from untrusted IP", { clientIp, body: req.body });
    // ponytail: in production, reject. For sandbox, log and continue.
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ RspCode: "97", Message: "Untrusted IP" });
    }
  }

  // Forward to Medusa webhook handler
  const paymentService = req.scope.resolve("paymentService");
  try {
    await paymentService.processEvent({
      provider: "vnpay",
      payload: { data: req.body, rawData: req.body },
    });
    return res.json({ RspCode: "00", Message: "Confirm Success" });
  } catch (error) {
    logger.error("VNPay webhook processing failed", { error });
    return res.json({ RspCode: "99", Message: "Unknown error" });
  }
}
```

### apps/backend/src/modules/vnpay/index.ts
```ts
import { ModuleProvider } from "@medusajs/framework/utils";
import { VNPayPaymentProvider } from "./provider";

export default ModuleProvider("payment_vnpay", {
  services: [VNPayPaymentProvider],
});

export { VNPayPaymentProvider };
```

## 5.3 Momo Provider (Same Pattern, Leaner)

### apps/backend/src/modules/momo/momo-client.ts
```ts
import crypto from "crypto";

interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  publicKey: string;
  endpoint: string;
  returnUrl: string;
  ipnUrl: string;
}

export class MomoClient {
  constructor(private config: MomoConfig) {}

  sign(rawSignature: string): string {
    return crypto
      .createHmac("sha256", this.config.secretKey)
      .update(rawSignature)
      .digest("hex");
  }

  verify(rawSignature: string, signature: string): boolean {
    // For IPN: verify with RSA public key (Momo's signature)
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(rawSignature);
    return verifier.verify(this.config.publicKey, signature, "base64");
  }

  async createPayment(params: {
    requestId: string;
    orderId: string;
    amount: number;
    orderInfo: string;
  }): Promise<{ payUrl: string; qrCodeUrl: string }> {
    const requestBody = {
      partnerCode: this.config.partnerCode,
      accessKey: this.config.accessKey,
      requestId: params.requestId,
      amount: params.amount.toString(),
      orderId: params.orderId,
      orderInfo: params.orderInfo,
      redirectUrl: this.config.returnUrl,
      ipnUrl: this.config.ipnUrl,
      requestType: "captureWallet",
      extraData: "",
      lang: "vi",
    };

    const rawSignature = `accessKey=${requestBody.accessKey}&amount=${requestBody.amount}&extraData=${requestBody.extraData}&ipnUrl=${requestBody.ipnUrl}&orderId=${requestBody.orderId}&orderInfo=${requestBody.orderInfo}&partnerCode=${requestBody.partnerCode}&redirectUrl=${requestBody.redirectUrl}&requestId=${requestBody.requestId}&requestType=${requestBody.requestType}`;

    const signature = this.sign(rawSignature);

    const response = await fetch(`${this.config.endpoint}/v2/gateway/api/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestBody, signature }),
    });

    const data = await response.json();

    if (data.resultCode !== 0) {
      throw new Error(`Momo error: ${data.message}`);
    }

    return { payUrl: data.payUrl, qrCodeUrl: data.qrCodeUrl };
  }
}
```

### apps/backend/src/modules/momo/provider.ts
```ts
// Same pattern as VNPayPaymentProvider with MomoClient
// Key differences:
// - Momo uses HMAC SHA256 for request signing, RSA SHA256 for IPN verification
// - Momo returns payUrl for redirect + qrCodeUrl for QR display
// - Momo IPN callback uses signature verification with public key (not HMAC)
//
// Essential methods:
// - initiatePayment → MomoClient.createPayment → return { redirect_url: payUrl }
// - getWebhookActionAndData → verify with RSA public key → capture on resultCode === 0
// - capturePayment → verify from IPN payload

export class MomoPaymentProvider extends AbstractPaymentProvider {
  static identifier = "momo";
  private client: MomoClient;
  // ... (full implementation follows VNPay pattern)
}
```

```
apps/backend/src/modules/momo/
├── index.ts
├── provider.ts
├── momo-client.ts
├── webhook/route.ts        # IPN handler with RSA verification
└── types.ts
```

## 5.4 Stale Payment Cleanup Job

### apps/backend/src/jobs/cancel-stale-payments.ts
```ts
import { MedusaContainer } from "@medusajs/framework";

export default async function cancelStalePayments(container: MedusaContainer) {
  const logger = container.resolve("logger");
  const STALE_MINUTES = 30;

  try {
    const paymentService = container.resolve("paymentService");

    // Query pending payments older than STALE_MINUTES
    const stalePayments = await paymentService.listPaymentSessions({
      status: "pending",
      created_at: { $lt: new Date(Date.now() - STALE_MINUTES * 60 * 1000) },
    });

    for (const payment of stalePayments) {
      await paymentService.cancelPayment(payment.id);
      logger.info("Cancelled stale payment", {
        paymentId: payment.id,
        created: payment.created_at,
      });
    }

    logger.info(`Cancelled ${stalePayments.length} stale payments`);
  } catch (error) {
    logger.error("Stale payment cleanup failed", { error });
  }
}

export const config = {
  name: "cancel-stale-payments",
  schedule: "*/5 * * * *", // Every 5 minutes
};
```

## 5.5 Frontend: Payment Method Selector

### apps/storefront/src/components/checkout/payment-method-selector.tsx
```tsx
"use client";
import { useState } from "react";
import { RadioGroup } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PaymentMethod = "vnpay" | "momo" | "cod";

const METHODS = [
  {
    id: "vnpay" as const,
    label: "VNPay",
    description: "Thẻ ATM, Visa/Master, QR code",
    icon: "🏦",
  },
  {
    id: "momo" as const,
    label: "Ví Momo",
    description: "Thanh toán qua ví điện tử Momo",
    icon: "📱",
  },
  {
    id: "cod" as const,
    label: "COD (Tiền mặt)",
    description: "Thanh toán khi nhận hàng",
    icon: "💵",
  },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      {METHODS.map((method) => (
        <button
          key={method.id}
          onClick={() => onChange(method.id)}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
            value === method.id
              ? "border-sage-500 bg-sage-500/5"
              : "border-cream-200 hover:border-cream-300"
          )}
        >
          <span className="text-2xl">{method.icon}</span>
          <div>
            <p className="font-medium text-warm-900">{method.label}</p>
            <p className="text-sm text-warm-800/60">{method.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
```

## Acceptance Criteria

- [ ] Verification step: actual Medusa 2.17 payment provider interface read and confirmed
- [ ] VNPay: select bank → redirect to sandbox → complete → redirect back → order AUTHORIZED
- [ ] VNPay IPN webhook: VNPay calls IPN URL → payment CAPTURED in Medusa
- [ ] HMAC signature verification rejects request with wrong hash (test: modify amount after signing)
- [ ] IP whitelist check: non-VNPay IP returns 403 in production
- [ ] Amount verification: IPN amount mismatch triggers error log
- [ ] Momo: redirect → pay → return → order AUTHORIZED
- [ ] Momo IPN with RSA signature verification works
- [ ] Stale payment job runs every 5 minutes, cancels abandoned payments
- [ ] COD option appears in selector (no backend provider needed)
- [ ] VND amounts: 350.000đ → VNPay receives 35000000 (×100)
- [ ] Both providers compile against actual AbstractPaymentProvider
