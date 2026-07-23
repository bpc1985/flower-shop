# Phase 9: ZaloPay + GHTK + Carrier Comparison

**Estimate:** 8-10h | **Depends on:** Phase 5 (payment arch), Phase 6 (shipping arch), Phase 7 (checkout UI)

## 9.1 ZaloPay Payment Provider

Follows same pattern as VNPay provider (Phase 5). Key differences:

### apps/backend/src/modules/zalopay/zalopay-client.ts
```ts
import crypto from "crypto";

export class ZaloPayClient {
  constructor(private config: {
    appId: string;
    key1: string;      // HMAC key
    key2: string;      // Callback verification key
    endpoint: string;
    callbackUrl: string;
  }) {}

  sign(data: Record<string, string>): string {
    const raw = Object.keys(data).sort()
      .map(k => `${k}=${data[k]}`)
      .join("&");
    return crypto.createHmac("sha256", this.config.key1)
      .update(raw).digest("hex");
  }

  verifyCallback(data: string, mac: string): boolean {
    const expected = crypto.createHmac("sha256", this.config.key2)
      .update(data).digest("hex");
    return expected === mac;
  }

  async createOrder(params: {
    appTransId: string;
    appUser: string;
    amount: number;
    description: string;
  }): Promise<{ orderUrl: string; zpTransToken: string }> {
    const embedData = JSON.stringify({ redirecturl: this.config.callbackUrl });
    const orderData = {
      app_id: this.config.appId,
      app_trans_id: params.appTransId,
      app_user: params.appUser,
      amount: params.amount,
      app_time: Date.now().toString(),
      embed_data: embedData,
      item: JSON.stringify([{ itemid: "flower", itemname: params.description, itemprice: params.amount }]),
      description: params.description,
      callback_url: this.config.callbackUrl,
    };

    const mac = this.sign(orderData as any);

    const res = await fetch(`${this.config.endpoint}/v2/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...orderData, mac }),
    });
    const data = await res.json();

    if (data.return_code !== 1) {
      throw new Error(`ZaloPay error: ${data.return_message}`);
    }

    return { orderUrl: data.order_url, zpTransToken: data.zp_trans_token };
  }
}
```

### apps/backend/src/modules/zalopay/provider.ts
```ts
// Ponytail: Same pattern as VNPayPaymentProvider.
// Key method differences:
// - initiatePayment: calls ZaloPayClient.createOrder → returns { redirect_url, zp_trans_token }
// - getWebhookActionAndData: verifies MAC from callback → returns capture action
// - capturePayment: verifies callback data against key2

import { AbstractPaymentProvider, PaymentSessionStatus } from "@medusajs/framework/utils";
import { ZaloPayClient } from "./zalopay-client";

export class ZaloPayPaymentProvider extends AbstractPaymentProvider {
  static identifier = "zalopay";
  // ... full implementation per Phase 5 pattern
}
```

### Module + webhook (same structure as VNPay)
```
apps/backend/src/modules/zalopay/
├── index.ts
├── provider.ts
├── zalopay-client.ts
├── webhook/route.ts
└── types.ts
```

### Medusa config addition
```ts
{
  resolve: "./src/modules/zalopay",
  id: "zalopay",
  options: {
    appId: process.env.ZALOPAY_APP_ID!,
    key1: process.env.ZALOPAY_KEY1!,
    key2: process.env.ZALOPAY_KEY2!,
    endpoint: process.env.ZALOPAY_ENDPOINT || "https://sb-openapi.zalopay.vn",
    callbackUrl: process.env.ZALOPAY_CALLBACK_URL!,
  },
},
```

## 9.2 GHTK Fulfillment Provider

Follows same pattern as GHN provider (Phase 6). Simpler API.

### apps/backend/src/modules/ghtk/ghtk-client.ts
```ts
export class GHTKClient {
  constructor(private config: { token: string; endpoint?: string }) {}

  private get endpoint() {
    return this.config.endpoint || "https://services.giaohangtietkiem.vn";
  }

  async calculateFee(params: {
    pick_province: string;
    pick_district: string;
    province: string;
    district: string;
    weight: number;
    value: number;
  }) {
    const res = await fetch(`${this.endpoint}/services/shipment/fee`, {
      method: "POST",
      headers: { Token: this.config.token, "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(`GHTK fee error: ${data.message}`);
    return { total: data.fee.fee, deliveryTime: data.fee.delivery_time };
  }

  async createOrder(params: {
    products: { name: string; weight: number; quantity: number }[];
    order: { id: string; pick_name: string; pick_address: string; pick_province: string;
             pick_district: string; pick_ward: string; pick_tel: string;
             name: string; address: string; province: string; district: string;
             ward: string; tel: string; note: string; is_freeship: string; }
  }) {
    const res = await fetch(`${this.endpoint}/services/shipment/order`, {
      method: "POST",
      headers: { Token: this.config.token, "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(`GHTK order error: ${data.message}`);
    return { trackingCode: data.order.label, estimatedPickTime: data.order.estimated_pick_time };
  }
}
```

### Provider structure:
```
apps/backend/src/modules/ghtk/
├── index.ts
├── provider.ts
├── ghtk-client.ts
├── webhook/route.ts
└── types.ts
```

## 9.3 Carrier Comparison (Frontend)

### apps/storefront/src/components/checkout/delivery-time-step.tsx (UPDATED)
```tsx
"use client";
import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { TimeSlotSelector } from "./time-slot-selector";
import { generateTimeSlots, getZoneByDistrict, type Zone } from "@/lib/delivery-zones";
import { formatVND } from "@/lib/format-currency";

interface CarrierOption {
  id: string;
  name: string;
  fee: number;
  estMinutes: number;
  available: boolean;
}

export function DeliveryTimeStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { watch, setValue } = useFormContext();
  const [carriers, setCarriers] = useState<CarrierOption[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [loading, setLoading] = useState(false);

  const districtId = watch("recipientDistrictId");
  const deliverySpeed = watch("deliverySpeed");
  const isToday = deliverySpeed === "asap" || deliverySpeed === "today";

  const zone = getZoneByDistrict(districtId);

  useEffect(() => {
    if (!zone) return;

    // Compare GHN vs GHTK for this address
    setLoading(true);
    Promise.allSettled([
      // GHN fee (via Medusa cart shipping options)
      fetch(`/api/shipping/estimate?district=${districtId}&carrier=ghn`).then(r => r.json()),
      fetch(`/api/shipping/estimate?district=${districtId}&carrier=ghtk`).then(r => r.json()),
    ]).then(([ghnResult, ghtkResult]) => {
      const options: CarrierOption[] = [];
      if (ghnResult.status === "fulfilled" && ghnResult.value.available) {
        options.push({
          id: "ghn",
          name: "GHN (Giao Hàng Nhanh)",
          fee: ghnResult.value.fee,
          estMinutes: zone.maxMinutes,
          available: true,
        });
      }
      if (ghtkResult.status === "fulfilled" && ghtkResult.value.available) {
        options.push({
          id: "ghtk",
          name: "GHTK (Giao Hàng Tiết Kiệm)",
          fee: ghtkResult.value.fee,
          estMinutes: ghtkResult.value.estMinutes || zone.maxMinutes + 30,
          available: true,
        });
      }
      setCarriers(options);
      if (options.length > 0 && !selectedCarrier) {
        setSelectedCarrier(options[0].id);
      }
      setLoading(false);
    });
  }, [districtId]);

  const timeSlots = zone ? generateTimeSlots(zone, isToday) : [];
  const selectedSlot = watch("deliveryTimeSlot");
  const carrier = carriers.find(c => c.id === selectedCarrier);

  if (!zone) {
    return (
      <div className="space-y-6 text-center py-8">
        <p className="text-warm-800/60">Vui lòng nhập địa chỉ giao hàng trước</p>
        <Button onClick={onBack} variant="outline" className="rounded-full border-cream-200">
          ← Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-h3 text-warm-900">⏱️ Thời gian giao hàng</h2>

      {/* Zone badge */}
      <div className="inline-flex items-center gap-2 bg-sage-500/10 text-sage-700 px-4 py-2 rounded-full text-sm font-medium">
        🚀 {zone.name} — Giao trong {zone.maxMinutes} phút
        {zone.fee === 0 && " (Miễn phí giao hàng)"}
      </div>

      {/* Speed selector */}
      <div>
        <label className="text-sm font-medium text-warm-800 block mb-2">Tốc độ giao</label>
        <div className="flex gap-2">
          {[
            { value: "asap", label: "Giao ngay" },
            { value: "today", label: "Hôm nay" },
            { value: "tomorrow", label: "Ngày mai" },
            { value: "date", label: "Chọn ngày" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue("deliverySpeed", opt.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                deliverySpeed === opt.value
                  ? "border-sage-500 bg-sage-500/10 text-sage-700"
                  : "border-cream-200 text-warm-800 hover:border-cream-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Carrier comparison */}
      {carriers.length > 1 && (
        <div>
          <label className="text-sm font-medium text-warm-800 block mb-2">Đơn vị vận chuyển</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {carriers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCarrier(c.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedCarrier === c.id
                    ? "border-sage-500 bg-sage-500/5"
                    : "border-cream-200 hover:border-cream-300"
                }`}
              >
                <p className="font-medium text-warm-900">{c.name}</p>
                <p className="text-sm text-warm-800/60 mt-1">
                  {formatVND(c.fee)} • ~{c.estMinutes} phút
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time slots */}
      <div>
        <label className="text-sm font-medium text-warm-800 block mb-2">Khung giờ giao</label>
        <TimeSlotSelector
          slots={timeSlots}
          value={selectedSlot}
          onChange={(slotId) => setValue("deliveryTimeSlot", slotId)}
        />
      </div>

      {/* Fee summary */}
      {carrier && (
        <div className="bg-cream-50 border border-cream-200 rounded-xl p-4 text-sm">
          <div className="flex justify-between">
            <span>Phí giao hàng ({carrier.name})</span>
            <span className="font-medium">{formatVND(carrier.fee)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={onBack} variant="outline" className="rounded-full border-cream-200">
          ← Quay lại
        </Button>
        <Button onClick={onNext} className="flex-1 bg-sage-500 hover:bg-sage-600 rounded-full">
          Tiếp tục → Thanh toán
        </Button>
      </div>
    </div>
  );
}
```

## 9.4 Payment Method Selector Update

Add ZaloPay option to `payment-method-selector.tsx` (from Phase 5):
```tsx
{
  id: "zalopay" as const,
  label: "ZaloPay",
  description: "Thanh toán qua ví ZaloPay",
  icon: "💜",
},
```

## Acceptance Criteria

- [ ] ZaloPay: redirect → ZaloPay → pay → callback → order confirmed
- [ ] ZaloPay MAC verification on callback (test: wrong MAC rejected)
- [ ] GHTK: fee calculated and order created
- [ ] Carrier comparison shows GHN vs GHTK when both available
- [ ] Carrier shows price + estimated minutes
- [ ] Single carrier: auto-selected, no comparison UI
- [ ] Both providers' webhooks verify signatures
- [ ] ZaloPay added to payment method selector
