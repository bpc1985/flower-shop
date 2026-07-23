# Fulfillment Provider Discovery Spike -- Medusa 2.17.2

**Date:** 2026-07-23 | **Target:** Phase 6 shipping implementation

## Sources Consulted

- `@medusajs/utils/src/fulfillment/provider.ts` (GitHub v2.17.2 tag)
- `@medusajs/types/src/fulfillment/provider.ts` (GitHub v2.17.2 tag)
- `@medusajs/types/src/fulfillment/common.ts` (GitHub v2.17.2 tag)
- Existing project code: `momo/index.ts`, `vnpay/index.ts`, `phone-otp/index.ts` (verified patterns)
- `phase-06-shipping.md` plan spec
- `plan.md` for phase dependency and design decisions

---

## 1. Class Name: `AbstractFulfillmentProviderService` (NOT `AbstractFulfillmentProvider`)

**This is the critical finding.** The plan spec (phase-06-shipping.md, line 9) states:

> "CRITICAL: Medusa 2.x uses AbstractFulfillmentProvider -- NOT AbstractFulfillmentProviderService"

**That assertion is wrong.** The actual Medusa 2.17.2 source at `packages/core/utils/src/fulfillment/provider.ts` exports:

```ts
export class AbstractFulfillmentProviderService implements IFulfillmentProvider
```

Both the `@medusajs/utils` source file and the `@medusajs/types` `IFulfillmentProvider` interface confirm this. The existing pattern matches: all existing providers (MoMo, VNPay, PhoneOTP) import from `@medusajs/framework/utils`.

**Correct import:**
```ts
import { AbstractFulfillmentProviderService, ModuleProvider, Modules } from "@medusajs/framework/utils";
```

---

## 2. Verified Method Signatures

All sources: `provider.ts` source file at `packages/core/utils/src/fulfillment/provider.ts` (GitHub v2.17.2).

### Mandatory (abstract) methods:

| Method | Signature | Plan Spec vs Reality |
|--------|-----------|---------------------|
| `getFulfillmentOptions()` | `() => Promise<FulfillmentOption[]>` | Matches |
| `validateFulfillmentData()` | `(optionData: Record<string,unknown>, data: Record<string,unknown>, context: ValidateFulfillmentDataContext) => Promise<any>` | OK, but context type is specific |
| `validateOption()` | `(data: Record<string,unknown>) => Promise<boolean>` | Missing from plan spec entirely |
| `canCalculate()` | `(data: CreateShippingOptionDTO) => Promise<boolean>` | Plan says 3 params -- WRONG. Only 1 param. |
| `calculatePrice()` | `(optionData, data, context) => Promise<CalculatedShippingOptionPrice>` | Plan says returns Promise<number> -- WRONG |
| `createFulfillment()` | `(data, items, order, fulfillment) => Promise<CreateFulfillmentResult>` | Plan says `Promise<FulfillmentResult>` -- close but wrong type |
| `cancelFulfillment()` | `(data: Record<string,unknown>) => Promise<any>` | Plan says `Promise<void>` -- WRONG, returns any |
| `createReturnFulfillment()` | `(fulfillment: Record<string,unknown>) => Promise<CreateFulfillmentResult>` | Missing from plan spec |
| `retrieveDocuments()` | `(fulfillmentData: Record<string,unknown>, documentType: string) => Promise<void>` | Missing from plan spec |

### Optional (default implementation returns `[]`):

| Method | Signature | Notes |
|--------|-----------|-------|
| `getFulfillmentDocuments(data)` | `(data: Record<string,unknown>) => Promise<never[]>` | Default returns `[]` |
| `getReturnDocuments(data)` | `(data: Record<string,unknown>) => Promise<never[]>` | Default returns `[]` |
| `getShipmentDocuments(data)` | `(data: Record<string,unknown>) => Promise<never[]>` | Default returns `[]` |

---

## 3. Return Types

### `CreateFulfillmentResult` (for `createFulfillment`):
```ts
type CreateFulfillmentResult = {
  Data: Record<string, unknown>;     // provider-specific fulfillment data
  Labels: {
    Tracking_number: string;          // tracking number
    Tracking_url: string;             // tracking URL
    Label_url: string;                // label URL
  }[];
}
```

### `CalculatedShippingOptionPrice` (for `calculatePrice`):
```ts
type CalculatedShippingOptionPrice = {
  Calculated_amount: number;                     // the price
  Is_calculated_price_tax_inclusive: boolean;    // if false, Medusa adds tax
}
```

### `FulfillmentOption` (for `getFulfillmentOptions`):
```ts
type FulfillmentOption = {
  Id: string;
  Is_return?: boolean;
  [k: string]: unknown;
}
```

NOTE: All these types use PascalCase property names (`Id`, `Is_return`, `Tracking_number`, `Data`). This is non-standard for TypeScript and you MUST match the casing exactly -- these are Medusa framework types, not our code.

---

## 4. Module Registration

Pattern verified from existing providers (momo, vnpay, phone-otp):

```ts
const services = [GHNFulfillmentProvider];
export default ModuleProvider(Modules.FULFILLMENT, { services });
```

Imports:
```ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils";
```

---

## 5. Constructor Pattern

Verified from existing MoMo provider:

```ts
class GHNFulfillmentProvider extends AbstractFulfillmentProviderService {
  static identifier = "ghn";

  constructor(
    cradle: Record<string, unknown>,
    options?: Record<string, unknown>
  ) {
    super(cradle as any);
    // read options, init GHN API client
  }
}
```

- `cradle` provides injected dependencies (logger etc)
- `options` provides module options from `medusa-config.ts`
- `static identifier` is REQUIRED -- used to create the internal provider key (`fp_{identifier}_{id}`)

---

## 6. Built-in Provider Reference

The `@medusajs/fulfillment` package ships `FulfillmentModuleService` as the default export. This is the core module service that delegates to registered providers -- it is NOT a provider template. There is no built-in fulfillment provider in the Medusa core itself (unlike payment which has a manual provider). Providers are always third-party implementations.

---

## 7. Configuration in `medusa-config.ts`

Expected pattern (consistent with auth/payment/file modules):

```ts
{
  resolve: "@medusajs/medusa/fulfillment",
  options: {
    providers: [
      {
        resolve: "./src/modules/ghn",
        id: "ghn",
        options: {
          token: process.env.GHN_TOKEN,
          shopId: Number(process.env.GHN_SHOP_ID || 0),
          // ...
        },
      },
    ],
  },
},
```

---

## Plan Spec Corrections Required

| Location | Current (wrong) | Correct |
|----------|----------------|---------|
| phase-06-shipping.md:9 | "uses AbstractFulfillmentProvider -- NOT AbstractFulfillmentProviderService" | **WRONG.** Use `AbstractFulfillmentProviderService` |
| phase-06-shipping.md:17 | `canCalculate(optionData, fulfillmentData, context)` | `canCalculate(data: CreateShippingOptionDTO)` -- 1 param |
| phase-06-shipping.md:20 | `calculatePrice(...) => Promise<number>` | `calculatePrice(...) => Promise<CalculatedShippingOptionPrice>` |
| phase-06-shipping.md:22 | `cancelFulfillment(fulfillmentData) => Promise<void>` | Returns `Promise<any>`, not `void` |
| phase-06-shipping.md:23 | `getFulfillmentDocuments(fulfillmentData) => Promise<FulfillmentDocument[]>` | Returns `Promise<never[]>` (default no-impl) |
| phase-06-shipping.md:21 | `createFulfillment(...) => Promise<FulfillmentResult>` | Returns `Promise<CreateFulfillmentResult>` |
| phase-06-shipping.md:17 | `validateFulfillmentData(optionData, data, context)` | Verify `context` is `ValidateFulfillmentDataContext` (not plain Record) |
| (missing) | `validateOption()` not listed | This is an abstract method that MUST be implemented |

Also add `createReturnFulfillment()` and `retrieveDocuments()` to the plan if the GHN provider will handle returns.

---

## Risk Assessment

The plan spec's claim about the class name being "NOT AbstractFulfillmentProviderService" is confidently wrong. If the implementation team trusts the plan over a fresh discovery spike, they will write code that imports a non-existent class and fails at build time. **Impact:** 15-30 min of debugging. **Mitigation:** Apply the corrections above before Phase 6 implementation begins.

## Unresolved Questions

- `CartPropsForFulfillment` and `CalculateShippingOptionPriceDTO`/`CreateShippingOptionDTO` types could not be inspected (404 on GitHub raw). Their full shape needs verification from node_modules or the actual type files once unblocked. The `canCalculate` parameter `CreateShippingOptionDTO` structure in particular affects the GHN coverage check logic.
- No example of a real fulfillment provider in the Medusa monorepo exists to study as a pattern, unlike payment (which has `manual` provider).
