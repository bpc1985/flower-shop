import { AbstractPaymentProvider, PaymentActions, ModuleProvider, Modules } from "@medusajs/framework/utils";
import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types";
import crypto from "node:crypto";
import querystring from "node:querystring";

// ---------------------------------------------------------------------------
// VNPay Payment Provider — Medusa 2.17 custom module
// Sandbox: https://sandbox.vnpayment.vn
// Requires VNPAY_TMN_CODE + VNPAY_HASH_SECRET env vars to activate
// ---------------------------------------------------------------------------

interface VNPayConfig {
  tmnCode: string;
  hashSecret: string;
  vnpUrl: string;
  vnpApiUrl: string;
  returnUrl: string;
  ipnUrl: string;
}

class VNPayClient {
  constructor(private config: VNPayConfig) {}

  sign(params: Record<string, string | number | undefined>): string {
    const sorted = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== "" && k !== "vnp_SecureHash")
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key]!.toString();
        return acc;
      }, {} as Record<string, string>);

    const query = querystring.stringify(sorted, "&", "=", {
      encodeURIComponent: (s: string) => s,
    });

    return crypto.createHmac("sha512", this.config.hashSecret).update(query).digest("hex");
  }

  verifySignature(params: Record<string, string | number | undefined>): boolean {
    const expectedHash = this.sign(params);
    return expectedHash === String(params.vnp_SecureHash || "");
  }

  createPaymentUrl(params: { amount: number; orderId: string; bankCode?: string; locale?: string; ipAddr?: string }): string {
    const date = new Date();
    const createDate =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0") +
      String(date.getHours()).padStart(2, "0") +
      String(date.getMinutes()).padStart(2, "0") +
      String(date.getSeconds()).padStart(2, "0");

    const vnpParams: Record<string, string> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: this.config.tmnCode,
      vnp_Amount: (params.amount * 100).toString(),
      vnp_CurrCode: "VND",
      vnp_TxnRef: params.orderId,
      vnp_OrderInfo: `BloomWedding#${params.orderId}`,
      vnp_OrderType: "250000",
      vnp_Locale: params.locale || "vn",
      vnp_ReturnUrl: this.config.returnUrl,
      vnp_IpAddr: params.ipAddr || "127.0.0.1",
      vnp_CreateDate: createDate,
    };

    if (params.bankCode) vnpParams.vnp_BankCode = params.bankCode;

    const secureHash = this.sign(vnpParams);
    const query = querystring.stringify({ ...vnpParams, vnp_SecureHash: secureHash }, "&", "=", {
      encodeURIComponent: (s: string) => s,
    });

    return `${this.config.vnpUrl}?${query}`;
  }
}

class VNPayPaymentProvider extends AbstractPaymentProvider {
  static identifier = "vnpay";
  private client: VNPayClient;

  constructor(cradle: Record<string, unknown>, options?: Record<string, unknown>) {
    super(cradle as any);

    const opts = (options || {}) as Record<string, string>;
    const config: VNPayConfig = {
      tmnCode: opts.tmnCode || process.env.VNPAY_TMN_CODE || "",
      hashSecret: opts.hashSecret || process.env.VNPAY_HASH_SECRET || "",
      vnpUrl: opts.vnpUrl || process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
      vnpApiUrl: opts.vnpApiUrl || process.env.VNPAY_API_URL || "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
      returnUrl: opts.returnUrl || process.env.VNPAY_RETURN_URL || "http://localhost:8000/checkout/result/vnpay",
      ipnUrl: opts.ipnUrl || process.env.VNPAY_IPN_URL || "http://localhost:9000/api/hooks/vnpay",
    };
    this.client = new VNPayClient(config);
  }

  async initiatePayment(data: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const amount = Number(data.amount);
    const orderId = String((data.context as any)?.payment?.id || `vnpay_${Date.now()}`);

    const paymentUrl = this.client.createPaymentUrl({ amount, orderId });

    return {
      id: orderId,
      data: { paymentUrl, orderId, amount },
      status: "pending" as const,
    };
  }

  async authorizePayment(data: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const inner = (data.data || {}) as Record<string, string | number | undefined>;

    if (!inner.vnp_SecureHash) {
      return { data: inner as Record<string, unknown>, status: "error" as const };
    }

    if (!this.client.verifySignature(inner)) {
      return { data: inner as Record<string, unknown>, status: "error" as const };
    }

    const status = String(inner.vnp_ResponseCode || "") === "00" ? "authorized" : "error";
    return { data: inner as Record<string, unknown>, status };
  }

  async capturePayment(data: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: (data.data || {}) as Record<string, unknown> };
  }

  async refundPayment(data: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return { data: (data.data || {}) as Record<string, unknown> };
  }

  async cancelPayment(data: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: (data.data || {}) as Record<string, unknown> };
  }

  async getPaymentStatus(_data: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: "pending" as const };
  }

  async deletePayment(_data: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return {};
  }

  async retrievePayment(data: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: (data.data || {}) as Record<string, unknown> };
  }

  async updatePayment(data: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: (data.data || {}) as Record<string, unknown> };
  }

  async getWebhookActionAndData(
    payload: { data: Record<string, unknown>; rawData: string | Buffer; headers: Record<string, unknown> },
  ): Promise<WebhookActionResult> {
    const body = payload.data as Record<string, string | number | undefined>;

    if (!this.client.verifySignature(body)) {
      return { action: PaymentActions.FAILED };
    }

    if (String(body.vnp_ResponseCode || "") === "00" && String(body.vnp_TransactionStatus || "") === "00") {
      const vnpAmount = parseInt(String(body.vnp_Amount || "0"));
      return {
        action: PaymentActions.SUCCESSFUL,
        data: { session_id: String(body.vnp_TxnRef || ""), amount: vnpAmount / 100 },
      };
    }

    return { action: PaymentActions.FAILED };
  }
}

const services = [VNPayPaymentProvider];
export default ModuleProvider(Modules.PAYMENT, { services });
