# Phase 6: Shipping — GHN Provider + COD Reconciliation + Address System

**Estimate:** 10-12h | **Depends on:** Phase 2 (backend core)

## Step 0: Verify Medusa 2.17 Fulfillment Provider Interface

```bash
cd apps/backend
# CRITICAL: Medusa 2.x uses AbstractFulfillmentProvider — NOT AbstractFulfillmentProviderService
find node_modules/@medusajs -name "*.d.ts" -path "*/fulfillment*" | xargs grep -l "AbstractFulfillment" | head -3

# Read actual type
cat node_modules/@medusajs/framework/dist/utils/fulfillment/abstract-fulfillment-provider.d.ts
```

**Expected method signatures (verify against actual):**
- `getFulfillmentOptions(): Promise<FulfillmentOption[]>` — "express", "standard"
- `validateFulfillmentData(optionData, data, context): Promise<Record<string, unknown>>` — validate GHN codes
- `canCalculate(optionData, fulfillmentData, context): Promise<boolean>` — is address in GHN coverage?
- `calculatePrice(optionData, fulfillmentData, context): Promise<number>` — GHN API fee
- `createFulfillment(fulfillmentData, fulfillmentItems, order, context): Promise<FulfillmentResult>` — create GHN order
- `cancelFulfillment(fulfillmentData): Promise<void>` — cancel GHN order
- `getFulfillmentDocuments(fulfillmentData): Promise<FulfillmentDocument[]>` — get label PDF

## 6.1 Medusa Config Registration

### apps/backend/medusa-config.ts (ADD)
```ts
import { Modules } from "@medusajs/framework/utils";

{
  resolve: Modules.FULFILLMENT,
  options: {
    providers: [
      {
        resolve: "./src/modules/ghn",
        id: "ghn",
        options: {
          token: process.env.GHN_TOKEN!,
          shopId: parseInt(process.env.GHN_SHOP_ID || "0"),
          fromDistrictId: parseInt(process.env.GHN_FROM_DISTRICT_ID || "0"),
          fromWardCode: process.env.GHN_FROM_WARD_CODE || "",
          endpoint: process.env.GHN_ENDPOINT || "https://dev-online-gateway.ghn.vn/shiip/public-api",
        },
      },
    ],
  },
},
```

## 6.2 GHN Module

### apps/backend/src/modules/ghn/types.ts
```ts
export interface GHNConfig {
  token: string;
  shopId: number;
  fromDistrictId: number;
  fromWardCode: string;
  endpoint: string;
}

export interface GHNService {
  service_id: number;
  short_name: string;
  service_type_id: number; // 1=Express, 2=Standard
}

export interface GHNAddress {
  ProvinceID: number;
  ProvinceName: string;
  DistrictID: number;
  DistrictName: string;
  WardCode: string;
  WardName: string;
}

export interface GHNFeeRequest {
  from_district_id: number;
  from_ward_code: string;
  to_district_id: number;
  to_ward_code: string;
  weight: number;       // grams
  length: number;       // cm
  width: number;        // cm
  height: number;       // cm
  service_type_id: number;
  insurance_value: number;
}

export interface GHNCreateOrderRequest {
  from_name: string;
  from_phone: string;
  from_address: string;
  from_ward_code: string;
  from_district_id: number;
  to_name: string;
  to_phone: string;
  to_address: string;
  to_ward_code: string;
  to_district_id: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  service_type_id: number;
  payment_type_id: number;    // 1=người gửi trả, 2=người nhận trả (COD)
  required_note: string;      // "CHOXEMHANGKHONGTHU", "CHOTHUHANG", etc.
  items: { name: string; quantity: number; price: number }[];
  cod_amount: number;         // COD amount (0 if not COD)
  insurance_value: number;
  note: string;
}

export interface GHNOrderResult {
  order_code: string;
  expected_delivery_time: string;
  total_fee: number;
  sort_code: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  nameEn: string;
  districtIds: number[];
  maxMinutes: number;
  fee: number; // 0 = free
}

// VN Administrative Division (from GHN province API)
export interface Province {
  ProvinceID: number;
  ProvinceName: string;
  Code: string;
}

export interface District {
  DistrictID: number;
  DistrictName: string;
  ProvinceID: number;
}

export interface Ward {
  WardCode: string;
  WardName: string;
  DistrictID: number;
}
```

### apps/backend/src/modules/ghn/ghn-client.ts
```ts
import type {
  GHNConfig,
  GHNFeeRequest,
  GHNCreateOrderRequest,
  GHNOrderResult,
  Province,
  District,
  Ward,
} from "./types";

export class GHNClient {
  private headers: Record<string, string>;

  constructor(private config: GHNConfig) {
    this.headers = {
      "Content-Type": "application/json",
      Token: config.token,
      ShopId: config.shopId.toString(),
    };
  }

  async calculateFee(params: GHNFeeRequest): Promise<{
    total: number;
    serviceName: string;
    expectedDays: number;
  }> {
    const response = await fetch(`${this.config.endpoint}/v2/shipping-order/fee`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        ...params,
        from_district_id: this.config.fromDistrictId,
        from_ward_code: this.config.fromWardCode,
      }),
    });

    const data = await response.json();

    if (data.code !== 200) {
      throw new Error(`GHN fee calculation error: ${data.message} (code: ${data.code})`);
    }

    return {
      total: data.data.total,
      serviceName: data.data.service_type_id === 1 ? "Express" : "Standard",
      expectedDays: Math.ceil(data.data.expected_delivery_time / 86400) || 1,
    };
  }

  async createOrder(params: Omit<GHNCreateOrderRequest, "from_district_id" | "from_ward_code">): Promise<GHNOrderResult> {
    const response = await fetch(`${this.config.endpoint}/v2/shipping-order/create`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        ...params,
        from_district_id: this.config.fromDistrictId,
        from_ward_code: this.config.fromWardCode,
        service_type_id: params.service_type_id || 1,
        payment_type_id: params.cod_amount > 0 ? 2 : 1,
        required_note: "KHONGCHOXEMHANG",
      }),
    });

    const data = await response.json();

    if (data.code !== 200) {
      throw new Error(`GHN order creation error: ${data.message} (code: ${data.code})`);
    }

    return {
      order_code: data.data.order_code,
      expected_delivery_time: data.data.expected_delivery_time,
      total_fee: data.data.total_fee,
      sort_code: data.data.sort_code,
    };
  }

  async cancelOrder(orderCode: string): Promise<void> {
    await fetch(`${this.config.endpoint}/v2/switch-status/cancel`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ order_codes: [orderCode] }),
    });
  }

  async getOrderDetail(orderCode: string): Promise<{ status: string; trackingUrl: string }> {
    const response = await fetch(`${this.config.endpoint}/v2/shipping-order/detail`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ order_code: orderCode }),
    });
    const data = await response.json();
    return {
      status: data.data?.status || "unknown",
      trackingUrl: `https://donhang.ghn.vn/?order_code=${orderCode}`,
    };
  }

  async getLabel(orderCode: string): Promise<string> {
    const response = await fetch(`${this.config.endpoint}/v2/a5/gen-token`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ order_codes: [orderCode] }),
    });
    const data = await response.json();
    return data.data?.token || "";
  }

  // Address APIs — for autocomplete
  async getProvinces(): Promise<Province[]> {
    const res = await fetch(`${this.config.endpoint}/master-data/province`, {
      headers: this.headers,
    });
    const data = await res.json();
    return data.data || [];
  }

  async getDistricts(provinceId: number): Promise<District[]> {
    const res = await fetch(`${this.config.endpoint}/master-data/district`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ province_id: provinceId }),
    });
    const data = await res.json();
    return data.data || [];
  }

  async getWards(districtId: number): Promise<Ward[]> {
    const res = await fetch(`${this.config.endpoint}/master-data/ward`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ district_id: districtId }),
    });
    const data = await res.json();
    return data.data || [];
  }
}
```

### apps/backend/src/modules/ghn/provider.ts
```ts
import { AbstractFulfillmentProvider } from "@medusajs/framework/utils";
// NOTE: Verify this import from Step 0. NOT "AbstractFulfillmentProviderService".

import { GHNClient } from "./ghn-client";
import { logger } from "../../lib/logger";
import type { DeliveryZone } from "./types";

// ponytail: hardcoded zones for launch. Add admin-configurable zones when needed.
const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "zone-1",
    name: "Nội thành",
    nameEn: "Inner City",
    districtIds: [1442, 1444, 1446, 1447], // Q1, Q3, PN, BT — verify GHN IDs
    maxMinutes: 90,
    fee: 0,
  },
  {
    id: "zone-2",
    name: "TP mở rộng",
    nameEn: "Extended City",
    districtIds: [1443, 1448, 1454, 1455], // Q2, Q7, TB, GV
    maxMinutes: 120,
    fee: 30000,
  },
  {
    id: "zone-3",
    name: "Ngoại thành",
    nameEn: "Suburban",
    districtIds: [1449, 1456, 1457], // Q9, TD, BTan
    maxMinutes: 240,
    fee: 50000,
  },
];

export class GHNFulfillmentProvider extends AbstractFulfillmentProvider {
  static identifier = "ghn";
  private client: GHNClient;
  private options: any;

  constructor(container: any, options: any) {
    super(container, options);
    this.options = options;
    this.client = new GHNClient(options);
  }

  async getFulfillmentOptions() {
    return [
      { id: "ghn-express", name: "Giao nhanh", serviceTypeId: 1 },
      { id: "ghn-standard", name: "Giao tiêu chuẩn", serviceTypeId: 2 },
    ];
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { recipient_district_id, recipient_ward_code } = data;

    if (!recipient_district_id || !recipient_ward_code) {
      return { valid: false, error: "Thông tin địa chỉ giao hàng chưa đầy đủ" };
    }

    // Check if in delivery zone
    const zone = DELIVERY_ZONES.find(
      (z) => z.districtIds.includes(recipient_district_id as number)
    );

    if (!zone) {
      return {
        valid: false,
        error: "Khu vực này hiện chưa được hỗ trợ giao hàng nhanh",
      };
    }

    return { valid: true, zone_id: zone.id, zone_name: zone.name };
  }

  async canCalculate(
    optionData: Record<string, unknown>,
    fulfillmentData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<boolean> {
    const validation = await this.validateFulfillmentData(optionData, fulfillmentData, context);
    return validation.valid === true;
  }

  async calculatePrice(
    optionData: Record<string, unknown>,
    fulfillmentData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<number> {
    const { recipient_district_id, recipient_ward_code, weight, insurance_value } =
      fulfillmentData;

    const zone = DELIVERY_ZONES.find(
      (z) => z.districtIds.includes(recipient_district_id as number)
    );

    if (!zone) {
      throw new Error("Delivery not available for this address");
    }

    try {
      const fee = await this.client.calculateFee({
        from_district_id: this.options.fromDistrictId,
        from_ward_code: this.options.fromWardCode,
        to_district_id: recipient_district_id as number,
        to_ward_code: recipient_ward_code as string,
        weight: (weight as number) || 500,
        length: 30,
        width: 20,
        height: 15,
        service_type_id: (optionData.serviceTypeId as number) || 1,
        insurance_value: (insurance_value as number) || 0,
      });

      return fee.total;
    } catch (error) {
      logger.error("GHN fee calculation failed", { error });
      // Fallback to zone fee if GHN API fails
      return zone.fee;
    }
  }

  async createFulfillment(
    fulfillmentData: Record<string, unknown>,
    fulfillmentItems: any[],
    order: any,
    context: Record<string, unknown>
  ): Promise<{ data: Record<string, unknown>; labels: any[] }> {
    const {
      recipient_name,
      recipient_phone,
      recipient_address,
      recipient_district_id,
      recipient_ward_code,
      weight,
      cod_amount,
      insurance_value,
      note,
    } = fulfillmentData;

    const items = fulfillmentItems.map((item) => ({
      name: item.title || "Hoa tươi",
      quantity: item.quantity || 1,
      price: item.unit_price || 0,
    }));

    const result = await this.client.createOrder({
      from_name: "Bloom Wedding",
      from_phone: "0909123456",
      from_address: "Shop address",
      to_name: recipient_name as string,
      to_phone: recipient_phone as string,
      to_address: recipient_address as string,
      to_ward_code: recipient_ward_code as string,
      to_district_id: recipient_district_id as number,
      weight: (weight as number) || 500,
      length: 30,
      width: 20,
      height: 15,
      service_type_id: 1,
      items,
      cod_amount: (cod_amount as number) || 0,
      insurance_value: (insurance_value as number) || 0,
      note: (note as string) || "",
    });

    // Get label
    const labelUrl = await this.client.getLabel(result.order_code);

    return {
      data: {
        tracking_code: result.order_code,
        expected_delivery: result.expected_delivery_time,
        shipping_fee: result.total_fee,
        label_url: labelUrl,
      },
      labels: [
        {
          tracking_number: result.order_code,
          label_url: labelUrl,
          carrier: "GHN",
        },
      ],
    };
  }

  async cancelFulfillment(
    fulfillmentData: Record<string, unknown>
  ): Promise<void> {
    const trackingCode = fulfillmentData.tracking_code as string;
    if (trackingCode) {
      await this.client.cancelOrder(trackingCode);
    }
  }

  async getFulfillmentDocuments(
    fulfillmentData: Record<string, unknown>
  ): Promise<any[]> {
    const trackingCode = fulfillmentData.tracking_code as string;
    if (!trackingCode) return [];

    const labelUrl = await this.client.getLabel(trackingCode);
    return [{ type: "label", url: labelUrl, carrier: "GHN" }];
  }
}
```

### apps/backend/src/modules/ghn/index.ts
```ts
import { ModuleProvider } from "@medusajs/framework/utils";
import { GHNFulfillmentProvider } from "./provider";

export default ModuleProvider("fulfillment_ghn", {
  services: [GHNFulfillmentProvider],
});

export { GHNFulfillmentProvider };
```

## 6.3 COD Reconciliation

### apps/backend/src/modules/ghn/jobs/reconcile-cod.ts
```ts
import { MedusaContainer } from "@medusajs/framework";

export default async function reconcileCOD(container: MedusaContainer) {
  const logger = container.resolve("logger");

  try {
    // Fetch orders with COD payment that are "delivered" per GHN
    // Compare GHN collected vs Medusa payment status
    // ponytail: for launch, manual reconciliation via admin dashboard.
    // Automate when order volume exceeds 100/week.

    logger.info("COD reconciliation: manual check required for delivered COD orders");
  } catch (error) {
    logger.error("COD reconciliation failed", { error });
  }
}

export const config = {
  name: "reconcile-cod",
  schedule: "0 9 * * 1", // Every Monday 9 AM
};
```

## 6.4 Address Autocomplete (Frontend)

### apps/storefront/src/components/checkout/address-autocomplete.tsx
```tsx
"use client";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface AddressData {
  provinceId: number;
  provinceName: string;
  districtId: number;
  districtName: string;
  wardCode: string;
  wardName: string;
  street: string;
}

interface AddressAutocompleteProps {
  value: AddressData;
  onChange: (data: AddressData) => void;
  ghnToken: string;
}

export function AddressAutocomplete({ value, onChange, ghnToken }: AddressAutocompleteProps) {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const headers = { Token: ghnToken, "Content-Type": "application/json" };

  // Fetch provinces on mount
  useEffect(() => {
    fetch("https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province", { headers })
      .then((r) => r.json())
      .then((d) => setProvinces(d.data || []));
  }, []);

  const handleProvinceChange = (provinceId: string) => {
    const prov = provinces.find((p) => p.ProvinceID === parseInt(provinceId));
    onChange({ ...value, provinceId: parseInt(provinceId), provinceName: prov?.ProvinceName || "" });
    // Fetch districts
    fetch("https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/district", {
      method: "POST", headers, body: JSON.stringify({ province_id: parseInt(provinceId) }),
    })
      .then((r) => r.json())
      .then((d) => setDistricts(d.data || []));
  };

  const handleDistrictChange = (districtId: string) => {
    const dist = districts.find((d) => d.DistrictID === parseInt(districtId));
    onChange({ ...value, districtId: parseInt(districtId), districtName: dist?.DistrictName || "" });
    // Fetch wards
    fetch("https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward", {
      method: "POST", headers, body: JSON.stringify({ district_id: parseInt(districtId) }),
    })
      .then((r) => r.json())
      .then((d) => setWards(d.data || []));
  };

  const handleWardChange = (wardCode: string) => {
    const ward = wards.find((w) => w.WardCode === wardCode);
    onChange({ ...value, wardCode, wardName: ward?.WardName || "" });
  };

  return (
    <div className="space-y-3">
      <Select value={value.provinceId ? value.provinceId.toString() : ""} onValueChange={handleProvinceChange}>
        <SelectTrigger className="h-12 rounded-xl border-cream-200">
          <SelectValue placeholder="Chọn Tỉnh/Thành phố" />
        </SelectTrigger>
        <SelectContent>
          {provinces.map((p) => (
            <SelectItem key={p.ProvinceID} value={p.ProvinceID.toString()}>{p.ProvinceName}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.districtId ? value.districtId.toString() : ""} onValueChange={handleDistrictChange} disabled={!value.provinceId}>
        <SelectTrigger className="h-12 rounded-xl border-cream-200">
          <SelectValue placeholder="Chọn Quận/Huyện" />
        </SelectTrigger>
        <SelectContent>
          {districts.map((d) => (
            <SelectItem key={d.DistrictID} value={d.DistrictID.toString()}>{d.DistrictName}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.wardCode} onValueChange={handleWardChange} disabled={!value.districtId}>
        <SelectTrigger className="h-12 rounded-xl border-cream-200">
          <SelectValue placeholder="Chọn Phường/Xã" />
        </SelectTrigger>
        <SelectContent>
          {wards.map((w) => (
            <SelectItem key={w.WardCode} value={w.WardCode}>{w.WardName}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={value.street}
        onChange={(e) => onChange({ ...value, street: e.target.value })}
        placeholder="Số nhà, tên đường"
        className="h-12 rounded-xl border-cream-200"
      />
    </div>
  );
}
```

### apps/storefront/src/components/checkout/time-slot-selector.tsx
```tsx
"use client";
import { cn } from "@/lib/utils";

interface TimeSlot {
  id: string;
  label: string;
  available: boolean;
}

interface TimeSlotSelectorProps {
  slots: TimeSlot[];
  value: string;
  onChange: (slotId: string) => void;
}

export function TimeSlotSelector({ slots, value, onChange }: TimeSlotSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {slots.map((slot) => (
        <button
          key={slot.id}
          onClick={() => slot.available && onChange(slot.id)}
          disabled={!slot.available}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap shrink-0 transition-colors",
            value === slot.id
              ? "border-sage-500 bg-sage-500/10 text-sage-700"
              : slot.available
                ? "border-cream-200 text-warm-800 hover:border-cream-300"
                : "border-cream-200 text-warm-800/30 cursor-not-allowed line-through"
          )}
        >
          {slot.label}
        </button>
      ))}
    </div>
  );
}
```

## 6.5 Delivery Zones & Time Slot Generation

### apps/storefront/src/lib/delivery-zones.ts
```ts
export interface Zone {
  id: string;
  name: string;
  nameEn: string;
  districtIds: number[];
  maxMinutes: number;
  fee: number;
}

export const ZONES: Zone[] = [
  { id: "zone-1", name: "Nội thành", nameEn: "Inner City", districtIds: [1442,1444,1446,1447], maxMinutes: 90, fee: 0 },
  { id: "zone-2", name: "TP mở rộng", nameEn: "Extended", districtIds: [1443,1448,1454,1455], maxMinutes: 120, fee: 30000 },
  { id: "zone-3", name: "Ngoại thành", nameEn: "Suburban", districtIds: [1449,1456,1457], maxMinutes: 240, fee: 50000 },
];

export function getZoneByDistrict(districtId: number): Zone | undefined {
  return ZONES.find((z) => z.districtIds.includes(districtId));
}

export function generateTimeSlots(zone: Zone, isToday: boolean): { id: string; label: string; available: boolean }[] {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;
  const cutOffMinutes = 17 * 60; // 5pm cutoff for same-day

  const allSlots = [
    { id: "7-9", start: 7 * 60, end: 9 * 60, label: "7:00-9:00" },
    { id: "9-11", start: 9 * 60, end: 11 * 60, label: "9:00-11:00" },
    { id: "11-13", start: 11 * 60, end: 13 * 60, label: "11:00-13:00" },
    { id: "13-15", start: 13 * 60, end: 15 * 60, label: "13:00-15:00" },
    { id: "15-17", start: 15 * 60, end: 17 * 60, label: "15:00-17:00" },
    { id: "17-19", start: 17 * 60, end: 19 * 60, label: "17:00-19:00" },
    { id: "19-21", start: 19 * 60, end: 21 * 60, label: "19:00-21:00" },
  ];

  return allSlots.map((slot) => {
    const slotNotInPast = !isToday || currentMinutes + zone.maxMinutes <= slot.end;
    const sameDayAvailable = isToday ? currentMinutes <= cutOffMinutes : true;
    return {
      id: slot.id,
      label: slot.label,
      available: slotNotInPast && sameDayAvailable,
    };
  });
}
```

## Files Created

```
apps/backend/src/modules/ghn/
├── index.ts
├── provider.ts
├── ghn-client.ts
├── types.ts
├── webhook/route.ts
└── jobs/reconcile-cod.ts

apps/storefront/src/
├── components/checkout/
│   ├── address-autocomplete.tsx
│   └── time-slot-selector.tsx
└── lib/delivery-zones.ts
```

## Acceptance Criteria

- [ ] Step 0: actual Medusa 2.17 fulfillment provider interface verified
- [ ] GHN fee calculated from real district/ward codes
- [ ] Zone 1: free delivery badge shown
- [ ] Zone 3: 50.000đ fee shown
- [ ] Out-of-range: "Không hỗ trợ giao hàng" message
- [ ] Address autocomplete: province → district → ward cascading dropdowns
- [ ] GHN order created with tracking code on order fulfillment
- [ ] Label URL retrievable
- [ ] GHN webhook updates fulfillment status
- [ ] Time slots: past slots disabled, future slots selectable
- [ ] Same-day cutoff: no slots after 5pm
- [ ] Provider compiles against actual AbstractFulfillmentProvider (no "Service" suffix)
