# Phase 7: Storefront Full — Cart + Checkout + All UX Patterns

**Estimate:** 15-18h | **Depends on:** Phase 3 (storefront shell), Phase 4 (auth), Phase 5 (payment), Phase 6 (shipping)

## 7.1 Cart Hooks (Replacing Phase 3 Stubs)

### apps/storefront/src/hooks/use-cart.ts
```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { medusaClient } from "@/lib/medusa-client";
import { queryKeys } from "./query-keys";
import { getCartId, setCartId, clearCartId } from "@/lib/guest-cart";
import { toast } from "sonner";
import type { Cart, CartItem } from "@bloom/shared-types";

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart.current(),
    queryFn: async () => {
      const cartId = getCartId();
      if (!cartId) return null;
      const { cart } = await medusaClient.store.cart.retrieve(cartId, { fields: "*items,*items.variant,*region" });
      return cart as unknown as Cart;
    },
    staleTime: 0, // Cart is always fresh
    retry: false,
  });
}

export function useCartCount() {
  const { data: cart } = useCart();
  return cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
}

export function useCreateCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { cart } = await medusaClient.store.cart.create({ region_id: "reg_01J..." });
      setCartId(cart.id);
      return cart;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { variantId: string; quantity: number }) => {
      let cartId = getCartId();
      if (!cartId) {
        const { cart } = await medusaClient.store.cart.create({ region_id: "reg_01J..." });
        cartId = cart.id;
        setCartId(cartId);
      }
      const { cart } = await medusaClient.store.cart.createLineItem(cartId, {
        variant_id: input.variantId,
        quantity: input.quantity,
      });
      return cart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      toast.success("Đã thêm vào giỏ hàng");
    },
    onError: (err: Error) => toast.error(err.message || "Không thể thêm vào giỏ"),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { lineItemId: string; quantity: number }) => {
      const cartId = getCartId();
      if (!cartId) throw new Error("No cart");
      return medusaClient.store.cart.updateLineItem(cartId, input.lineItemId, { quantity: input.quantity });
    },
    onMutate: async ({ lineItemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      const prev = queryClient.getQueryData(queryKeys.cart.current());
      // Optimistic update
      queryClient.setQueryData(queryKeys.cart.current(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: any) =>
            item.id === lineItemId ? { ...item, quantity } : item
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKeys.cart.current(), context?.prev);
      toast.error("Không thể cập nhật số lượng");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lineItemId: string) => {
      const cartId = getCartId();
      if (!cartId) throw new Error("No cart");
      return medusaClient.store.cart.deleteLineItem(cartId, lineItemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      toast.success("Đã xóa khỏi giỏ hàng", {
        action: { label: "Hoàn tác", onClick: () => {/* undo logic */} },
      });
    },
    onError: () => toast.error("Không thể xóa sản phẩm"),
  });
}
```

### apps/storefront/src/hooks/use-checkout.ts
```ts
"use client";
import { useMutation } from "@tanstack/react-query";
import { medusaClient } from "@/lib/medusa-client";
import { getCartId } from "@/lib/guest-cart";

interface CheckoutInput {
  email: string;
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_district_id: number;
  recipient_ward_code: string;
  card_message?: string;
  photo_confirmation: boolean;
  delivery_speed: "asap" | "today" | "tomorrow" | "date";
  delivery_date?: string;
  delivery_time_slot: string;
  payment_method: "vnpay" | "momo" | "cod";
  bank_code?: string;
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (input: CheckoutInput) => {
      const cartId = getCartId();
      if (!cartId) throw new Error("No cart found");

      // 1. Update cart with shipping + billing address
      await medusaClient.store.cart.update(cartId, {
        email: input.email,
        shipping_address: {
          first_name: input.recipient_name,
          phone: input.recipient_phone,
          address_1: input.recipient_address,
          city: "Ho Chi Minh",
          country_code: "vn",
          metadata: {
            district_id: input.recipient_district_id,
            ward_code: input.recipient_ward_code,
            is_recipient: input.recipient_name !== input.sender_name,
          },
        },
        billing_address: {
          first_name: input.sender_name,
          phone: input.sender_phone,
          address_1: input.recipient_address,
          city: "Ho Chi Minh",
          country_code: "vn",
        },
        metadata: {
          card_message: input.card_message || "",
          photo_confirmation: input.photo_confirmation,
          delivery_speed: input.delivery_speed,
          delivery_date: input.delivery_date || "",
          delivery_time_slot: input.delivery_time_slot,
          sender_name: input.sender_name,
          sender_phone: input.sender_phone,
          recipient_name: input.recipient_name,
          recipient_phone: input.recipient_phone,
        },
      });

      // 2. Set shipping method (GHN)
      const { cart } = await medusaClient.store.cart.retrieve(cartId);
      const shippingMethods = await medusaClient.store.fulfillment.listCartOptions(cartId);
      if (shippingMethods.length > 0) {
        await medusaClient.store.cart.addShippingMethod(cartId, {
          option_id: shippingMethods[0].id,
        });
      }

      // 3. Set payment session or complete order
      if (input.payment_method === "cod") {
        return medusaClient.store.cart.complete(cartId);
      }

      // For gateway payments: set payment session
      await medusaClient.store.cart.createPaymentSession(cartId, {
        provider_id: input.payment_method,
        data: { bank_code: input.bank_code },
      });

      // Complete payment → Medusa handles redirect
      return medusaClient.store.cart.completePayment(cartId);
    },
  });
}
```

## 7.2 Cart Drawer

### apps/storefront/src/components/cart/cart-drawer.tsx
```tsx
"use client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCart, useRemoveFromCart, useUpdateCartItem } from "@/hooks/use-cart";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";
import { EmptyCart } from "./empty-cart";
import { formatVND } from "@/lib/format-currency";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const t = useTranslations("cart");
  const { data: cart, isLoading } = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-cream-100 border-cream-200 flex flex-col p-0"
      >
        <SheetTitle className="font-heading text-xl text-warm-900 px-6 pt-6 pb-4 border-b border-cream-200">
          {t("title")} {cart?.items?.length ? `(${cart.items.length})` : ""}
        </SheetTitle>

        {isLoading ? (
          <div className="flex-1 p-6">Đang tải...</div>
        ) : !cart?.items?.length ? (
          <EmptyCart onClose={() => onOpenChange(false)} />
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.items.map((item: any) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>

            {/* Summary + CTA */}
            <div className="border-t border-cream-200 px-6 py-4 space-y-4">
              <CartSummary cart={cart} />
              <Link
                href="/checkout"
                onClick={() => onOpenChange(false)}
                className="block w-full bg-sage-500 hover:bg-sage-600 text-cream-100 text-center py-3 rounded-full font-medium shadow-card transition-colors"
              >
                {t("checkout")}
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

### apps/storefront/src/components/cart/cart-item.tsx
```tsx
"use client";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useUpdateCartItem, useRemoveFromCart } from "@/hooks/use-cart";
import { formatVND } from "@/lib/format-currency";

interface CartItemProps {
  item: any; // Cart line item
}

export function CartItem({ item }: CartItemProps) {
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveFromCart();

  const variantTitle = item.variant?.title || "";
  const price = item.unit_price;
  const imageUrl = item.thumbnail || item.variant?.product?.thumbnail || "/placeholder-flower.jpg";

  return (
    <div className="flex gap-4">
      <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-cream-200 shrink-0">
        <Image src={imageUrl} alt={item.title} fill className="object-cover" sizes="80px" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-heading text-sm text-warm-900 leading-snug line-clamp-2">
          {item.title}
        </h4>
        <p className="text-xs text-warm-800/60 mt-0.5">{variantTitle}</p>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 bg-cream-200 rounded-lg">
            <button
              onClick={() => updateItem.mutate({ lineItemId: item.id, quantity: item.quantity - 1 })}
              disabled={item.quantity <= 1}
              className="p-1.5 hover:text-burgundy-600 disabled:opacity-30"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium min-w-[20px] text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => updateItem.mutate({ lineItemId: item.id, quantity: item.quantity + 1 })}
              className="p-1.5 hover:text-burgundy-600"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{formatVND(price * item.quantity)}</span>
            <button
              onClick={() => removeItem.mutate(item.id)}
              className="p-1 text-warm-800/40 hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### apps/storefront/src/components/cart/cart-summary.tsx
```tsx
import { formatVND } from "@/lib/format-currency";

export function CartSummary({ cart }: { cart: any }) {
  const subtotal = cart.subtotal || cart.item_subtotal || 0;
  const shipping = cart.shipping_total || 0;
  const total = cart.total || subtotal;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-warm-800/70">
        <span>Tạm tính</span>
        <span>{formatVND(subtotal)}</span>
      </div>
      <div className="flex justify-between text-warm-800/70">
        <span>Giao hàng</span>
        <span>{shipping > 0 ? formatVND(shipping) : "Tính tại bước giao hàng"}</span>
      </div>
      <div className="flex justify-between font-heading text-base text-warm-900 pt-2 border-t border-cream-200">
        <span>Tổng cộng</span>
        <span>{formatVND(total)}</span>
      </div>
    </div>
  );
}
```

### apps/storefront/src/components/cart/empty-cart.tsx
```tsx
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";

export function EmptyCart({ onClose }: { onClose: () => void }) {
  const t = useTranslations("cart");
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <ShoppingBag className="w-16 h-16 text-cream-300 mb-4" />
      <h3 className="font-heading text-lg text-warm-900 mb-2">{t("empty")}</h3>
      <p className="text-sm text-warm-800/60 mb-6">{t("emptyDesc")}</p>
      <Link
        href="/occasions"
        onClick={onClose}
        className="bg-sage-500 hover:bg-sage-600 text-cream-100 px-6 py-2 rounded-full text-sm font-medium transition-colors"
      >
        {t("browseOccasions")}
      </Link>
    </div>
  );
}
```

## 7.3 Checkout Page (Multi-Step)

### apps/storefront/src/app/[locale]/checkout/page.tsx
```tsx
import { getTranslations } from "next-intl/server";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-heading text-h2 text-warm-900 mb-8">{t("title")}</h1>
      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        <CheckoutForm />
        {/* Order summary sidebar shown on desktop, integrated in form on mobile */}
      </div>
    </div>
  );
}
```

### apps/storefront/src/components/checkout/checkout-form.tsx
```tsx
"use client";
import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useCheckout } from "@/hooks/use-checkout";
import { useCart } from "@/hooks/use-cart";
import { DeliveryDetailsStep } from "./delivery-details-step";
import { DeliveryTimeStep } from "./delivery-time-step";
import { PaymentStep } from "./payment-step";
import { ReviewStep } from "./review-step";
import { OrderSummarySidebar } from "./order-summary-sidebar";
import { phoneSchema } from "@bloom/shared-types/schemas";
import { toast } from "sonner";

const checkoutSchema = z.object({
  // Delivery
  isForSelf: z.boolean(),
  senderName: z.string().min(1, "Vui lòng nhập tên"),
  senderPhone: phoneSchema,
  recipientName: z.string().min(1, "Vui lòng nhập tên người nhận"),
  recipientPhone: phoneSchema,
  email: z.string().email("Email không hợp lệ"),
  // Address (validated by GHN autocomplete)
  recipientProvinceId: z.number(),
  recipientDistrictId: z.number(),
  recipientWardCode: z.string().min(1),
  recipientStreet: z.string().min(1),
  // Delivery time
  deliverySpeed: z.enum(["asap", "today", "tomorrow", "date"]),
  deliveryDate: z.string().optional(),
  deliveryTimeSlot: z.string().min(1),
  // Extras
  cardMessage: z.string().max(100).optional(),
  photoConfirmation: z.boolean(),
  // Payment
  paymentMethod: z.enum(["vnpay", "momo", "cod"]),
  bankCode: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const STEPS = [
  { id: "delivery", label: "Giao hàng" },
  { id: "time", label: "Thời gian" },
  { id: "payment", label: "Thanh toán" },
  { id: "review", label: "Xác nhận" },
];

export function CheckoutForm() {
  const t = useTranslations("checkout");
  const [step, setStep] = useState(0);
  const { data: cart } = useCart();
  const checkout = useCheckout();

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      isForSelf: false,
      deliverySpeed: "asap",
      photoConfirmation: true,
      paymentMethod: "cod",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      const result = await checkout.mutateAsync({
        email: data.email,
        sender_name: data.senderName,
        sender_phone: data.senderPhone,
        recipient_name: data.isForSelf ? data.senderName : data.recipientName,
        recipient_phone: data.isForSelf ? data.senderPhone : data.recipientPhone,
        recipient_address: `${data.recipientStreet}`,
        recipient_district_id: data.recipientDistrictId,
        recipient_ward_code: data.recipientWardCode,
        card_message: data.cardMessage,
        photo_confirmation: data.photoConfirmation,
        delivery_speed: data.deliverySpeed,
        delivery_date: data.deliveryDate,
        delivery_time_slot: data.deliveryTimeSlot,
        payment_method: data.paymentMethod,
        bank_code: data.bankCode,
      });

      // Handle payment redirect or order confirmation
      if (result.type === "order") {
        window.location.href = `/order/${result.order.id}/confirmed`;
      } else if (result.redirect_url) {
        window.location.href = result.redirect_url;
      }
    } catch (error: any) {
      toast.error(error.message || t("error"));
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i === step
                    ? "bg-sage-500 text-cream-100"
                    : i < step
                      ? "bg-sage-300 text-cream-100"
                      : "bg-cream-200 text-warm-800/40"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i === step ? "text-warm-900 font-medium" : "text-warm-800/50"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-cream-200 hidden sm:block" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && <DeliveryDetailsStep onNext={() => setStep(1)} />}
        {step === 1 && <DeliveryTimeStep onBack={() => setStep(0)} onNext={() => setStep(2)} />}
        {step === 2 && <PaymentStep onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && (
          <ReviewStep
            onBack={() => setStep(2)}
            isPending={checkout.isPending}
          />
        )}
      </form>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <OrderSummarySidebar cart={cart} />
      </div>
    </FormProvider>
  );
}
```

### apps/storefront/src/components/checkout/delivery-details-step.tsx
```tsx
"use client";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RecipientToggle } from "./recipient-toggle";
import { AddressAutocomplete } from "./address-autocomplete";
import { CardMessageInput } from "./card-message-input";

export function DeliveryDetailsStep({ onNext }: { onNext: () => void }) {
  const t = useTranslations("checkout");
  const { register, control, setValue, formState: { errors } } = useFormContext();
  const isForSelf = useWatch({ control, name: "isForSelf" });

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-h3 text-warm-900">{t("deliveryDetails")}</h2>

      {/* Sender info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input {...register("senderName")} placeholder="Tên người gửi *" className="h-12 rounded-xl border-cream-200" />
          {errors.senderName && <p className="text-destructive text-xs mt-1">{errors.senderName.message as string}</p>}
        </div>
        <div>
          <Input {...register("senderPhone")} placeholder="SĐT người gửi *" className="h-12 rounded-xl border-cream-200" />
          {errors.senderPhone && <p className="text-destructive text-xs mt-1">{errors.senderPhone.message as string}</p>}
        </div>
      </div>

      <Input {...register("email")} placeholder="Email *" type="email" className="h-12 rounded-xl border-cream-200" />
      {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message as string}</p>}

      {/* Recipient toggle */}
      <RecipientToggle />

      {/* Recipient info (shown when not self) */}
      {!isForSelf && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input {...register("recipientName")} placeholder="Tên người nhận *" className="h-12 rounded-xl border-cream-200" />
          <Input {...register("recipientPhone")} placeholder="SĐT người nhận *" className="h-12 rounded-xl border-cream-200" />
        </div>
      )}

      {/* Address */}
      <AddressAutocomplete />

      {/* Card message */}
      <CardMessageInput />

      <Button onClick={onNext} className="w-full bg-sage-500 hover:bg-sage-600 h-12 rounded-full text-base">
        {t("continue")} → Thời gian giao
      </Button>
    </div>
  );
}
```

### apps/storefront/src/components/checkout/recipient-toggle.tsx
```tsx
"use client";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

export function RecipientToggle() {
  const { setValue, watch } = useFormContext();
  const isForSelf = watch("isForSelf");

  return (
    <div className="flex bg-cream-200 rounded-xl p-1">
      <button
        type="button"
        onClick={() => setValue("isForSelf", false)}
        className={cn(
          "flex-1 py-3 text-sm rounded-lg text-center transition-colors",
          !isForSelf ? "bg-cream-100 text-burgundy-600 font-medium shadow-sm" : "text-warm-800"
        )}
      >
        🎁 Tặng người khác
      </button>
      <button
        type="button"
        onClick={() => setValue("isForSelf", true)}
        className={cn(
          "flex-1 py-3 text-sm rounded-lg text-center transition-colors",
          isForSelf ? "bg-cream-100 text-burgundy-600 font-medium shadow-sm" : "text-warm-800"
        )}
      >
        💐 Cho bản thân
      </button>
    </div>
  );
}
```

### apps/storefront/src/components/checkout/card-message-input.tsx
```tsx
"use client";
import { useFormContext } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";

export function CardMessageInput() {
  const { register, watch } = useFormContext();
  const message = watch("cardMessage") || "";

  return (
    <div>
      <label className="text-sm font-medium text-warm-800 block mb-2">
        ✍️ Lời nhắn trên thiệp <span className="text-warm-800/40">(tùy chọn)</span>
      </label>
      <Textarea
        {...register("cardMessage")}
        placeholder="Ví dụ: Chúc mừng sinh nhật em yêu! ❤️"
        maxLength={100}
        className="rounded-xl border-cream-200 resize-none h-20"
      />
      <p className="text-xs text-warm-800/40 text-right mt-1">{message.length}/100</p>
    </div>
  );
}
```

### apps/storefront/src/components/checkout/photo-confirmation-checkbox.tsx
```tsx
"use client";
import { useFormContext } from "react-hook-form";
import { Camera } from "lucide-react";

export function PhotoConfirmationCheckbox() {
  const { register, watch } = useFormContext();
  const checked = watch("photoConfirmation");

  return (
    <label className="flex items-start gap-3 p-4 rounded-xl bg-cream-200/50 border border-cream-200 cursor-pointer hover:border-cream-300 transition-colors">
      <input
        type="checkbox"
        {...register("photoConfirmation")}
        className="mt-0.5 w-4 h-4 accent-sage-500"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-sage-500" />
          <span className="font-medium text-sm text-warm-900">📸 Gửi ảnh hoa trước khi giao</span>
        </div>
        <p className="text-xs text-warm-800/60 mt-1">
          Chúng tôi sẽ chụp ảnh bó hoa và gửi bạn duyệt trước khi giao. Miễn phí.
        </p>
      </div>
    </label>
  );
}
```

### apps/storefront/src/components/checkout/order-summary-sidebar.tsx
```tsx
import Image from "next/image";
import { formatVND } from "@/lib/format-currency";

export function OrderSummarySidebar({ cart }: { cart: any }) {
  if (!cart?.items?.length) return null;

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl p-6 sticky top-20">
      <h3 className="font-heading text-lg text-warm-900 mb-4">Đơn hàng</h3>
      <div className="space-y-3">
        {cart.items.map((item: any) => (
          <div key={item.id} className="flex gap-3">
            <div className="relative w-14 h-16 rounded-lg overflow-hidden bg-cream-200 shrink-0">
              <Image src={item.thumbnail || "/placeholder-flower.jpg"} alt={item.title} fill className="object-cover" sizes="56px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-warm-900 line-clamp-1">{item.title}</p>
              <p className="text-xs text-warm-800/60">{item.variant?.title} × {item.quantity}</p>
              <p className="text-sm font-medium">{formatVND(item.unit_price * item.quantity)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-cream-200 mt-4 pt-4 space-y-2 text-sm">
        <div className="flex justify-between"><span>Tạm tính</span><span>{formatVND(cart.subtotal || 0)}</span></div>
        <div className="flex justify-between"><span>Giao hàng</span><span>Tính sau</span></div>
        <div className="flex justify-between font-heading text-base pt-2 border-t border-cream-200">
          <span>Tổng</span><span>{formatVND(cart.total || 0)}</span>
        </div>
      </div>
    </div>
  );
}
```

## 7.4 Order Confirmation Page

### apps/storefront/src/app/[locale]/order/[id]/page.tsx
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatVND } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { medusaClient } from "@/lib/medusa-client";

interface OrderPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const { order } = await medusaClient.store.order.retrieve(id, {
    fields: "*items,*items.variant,*shipping_address,*fulfillments",
  }).catch(() => notFound());

  const isPaid = order.payment_status === "captured";
  const trackingCode = order.fulfillments?.[0]?.data?.tracking_code;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">{isPaid ? "🎉" : "⏳"}</div>

      <h1 className="font-heading text-h2 text-warm-900 mb-2">
        {isPaid ? "Đặt hàng thành công!" : "Đơn hàng đang chờ thanh toán"}
      </h1>
      <p className="text-warm-800/60 mb-2">
        Mã đơn hàng: <span className="font-mono font-medium text-warm-900">{order.display_id || id}</span>
      </p>

      {trackingCode && (
        <Badge className="bg-sage-500/10 text-sage-700 mb-6">
          📦 Mã vận đơn: {trackingCode}
        </Badge>
      )}

      <div className="bg-cream-50 border border-cream-200 rounded-2xl p-6 text-left mb-8">
        <h3 className="font-heading text-lg text-warm-900 mb-4">Chi tiết đơn hàng</h3>
        {order.items?.map((item: any) => (
          <div key={item.id} className="flex justify-between py-2 border-b border-cream-100 last:border-0 text-sm">
            <span>{item.title} × {item.quantity}</span>
            <span className="font-medium">{formatVND(item.unit_price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between font-heading text-base mt-4 pt-4 border-t border-cream-200">
          <span>Tổng cộng</span>
          <span>{formatVND(order.total)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/occasions">
          <Button className="bg-sage-500 hover:bg-sage-600 rounded-full">Tiếp tục mua sắm</Button>
        </Link>
        {/* Zalo share */}
        <Button variant="outline" className="rounded-full border-cream-200" asChild>
          <a
            href={`https://zalo.me/share?url=${encodeURIComponent(`https://bloomwedding.vn/order/${id}`)}`}
            target="_blank"
          >
            💬 Chia sẻ qua Zalo
          </a>
        </Button>
      </div>
    </div>
  );
}
```

## 7.5 Account Pages

### apps/storefront/src/app/[locale]/account/page.tsx
```tsx
import { redirect } from "next/navigation";
import { OrderList } from "@/components/account/order-list";
import { ProfileForm } from "@/components/account/profile-form";
import { AddressBook } from "@/components/account/address-book";
// Auth gate
import { authClient } from "@/lib/auth-client";

export default async function AccountPage() {
  const session = await authClient.getSession();
  if (!session) redirect("/");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-heading text-h2 text-warm-900 mb-8">Tài khoản</h1>

      <div className="space-y-8">
        <section>
          <h2 className="font-heading text-xl text-warm-900 mb-4">Đơn hàng gần đây</h2>
          <OrderList />
        </section>

        <section>
          <h2 className="font-heading text-xl text-warm-900 mb-4">Địa chỉ đã lưu</h2>
          <AddressBook />
        </section>

        <section>
          <h2 className="font-heading text-xl text-warm-900 mb-4">Thông tin cá nhân</h2>
          <ProfileForm />
        </section>
      </div>
    </div>
  );
}
```

### apps/storefront/src/components/account/order-list.tsx
```tsx
"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { medusaClient } from "@/lib/medusa-client";
import { formatVND } from "@/lib/format-currency";
import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "Chờ xử lý", variant: "outline" },
  completed: { label: "Đã giao", variant: "default" },
  canceled: { label: "Đã hủy", variant: "secondary" },
};

export function OrderList() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { orders } = await medusaClient.store.order.list({ fields: "*items" });
      return orders;
    },
  });

  if (isLoading) return <p className="text-sm text-warm-800/60">Đang tải...</p>;
  if (!orders?.length) return <p className="text-sm text-warm-800/60">Chưa có đơn hàng nào.</p>;

  return (
    <div className="space-y-3">
      {orders.map((order: any) => (
        <Link
          key={order.id}
          href={`/account/orders/${order.id}`}
          className="flex items-center justify-between p-4 rounded-xl border border-cream-200 hover:border-cream-300 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-warm-900">#{order.display_id}</p>
            <p className="text-xs text-warm-800/60">
              {new Date(order.created_at).toLocaleDateString("vi-VN")} — {formatVND(order.total)}
            </p>
          </div>
          <Badge variant={STATUS_MAP[order.status]?.variant || "outline"}>
            {STATUS_MAP[order.status]?.label || order.status}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
```

## 7.6 Seasonal Logic

### apps/storefront/src/components/seasonal/seasonal-banner.tsx
```tsx
import Link from "next/link";
import { getUpcomingOccasions } from "@/lib/occasion-calendar";

export function SeasonalBanner() {
  const upcoming = getUpcomingOccasions();
  const occasion = upcoming[0];
  if (!occasion) return null;

  const daysUntil = Math.ceil(
    (new Date(occasion.date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-gradient-to-r from-blush-400/30 to-sage-400/20 border-b border-cream-200">
      <div className="max-w-7xl mx-auto px-4 py-3 text-center">
        <Link href={`/occasions/${occasion.slug}`} className="text-sm">
          <span className="mr-2">{occasion.emoji}</span>
          <span className="font-medium text-warm-900">{occasion.name_vi}</span>
          <span className="text-warm-800/60 mx-2">còn {daysUntil} ngày</span>
          <span className="text-sage-600 underline underline-offset-2 font-medium">— Đặt hoa ngay</span>
        </Link>
      </div>
    </div>
  );
}
```

## Files Created (Summary)

```
apps/storefront/src/
├── hooks/
│   ├── use-cart.ts                   # Full implementation (replaces stub)
│   ├── use-cart-count.ts
│   ├── use-checkout.ts
│   ├── use-orders.ts
│   ├── use-delivery.ts
│   └── use-search.ts
├── components/
│   ├── cart/
│   │   ├── cart-drawer.tsx
│   │   ├── cart-item.tsx
│   │   ├── cart-summary.tsx
│   │   └── empty-cart.tsx
│   ├── checkout/
│   │   ├── checkout-form.tsx         # Multi-step form
│   │   ├── delivery-details-step.tsx
│   │   ├── delivery-time-step.tsx
│   │   ├── payment-step.tsx
│   │   ├── review-step.tsx
│   │   ├── recipient-toggle.tsx
│   │   ├── card-message-input.tsx
│   │   ├── photo-confirmation-checkbox.tsx
│   │   ├── order-summary-sidebar.tsx
│   │   └── payment-method-selector.tsx
│   ├── account/
│   │   ├── order-list.tsx
│   │   ├── address-book.tsx
│   │   └── profile-form.tsx
│   ├── search/
│   │   ├── search-bar.tsx
│   │   └── search-results.tsx
│   ├── seasonal/
│   │   ├── seasonal-banner.tsx
│   │   └── occasion-countdown.tsx
│   └── checkout/ (Phase 6)
│       ├── address-autocomplete.tsx
│       └── time-slot-selector.tsx
└── app/[locale]/
    ├── checkout/page.tsx
    ├── order/[id]/page.tsx
    ├── account/page.tsx
    ├── account/orders/[id]/page.tsx
    └── search/page.tsx
```

## Acceptance Criteria

- [ ] Add product to cart → cart drawer opens → item visible with tier + stem count
- [ ] Quantity +/- works with optimistic updates
- [ ] Remove with undo toast
- [ ] Empty cart → "Browse Occasions" link
- [ ] Cart badge counter updates in header (real-time via Tanstack Query)
- [ ] Guest checkout: no login required for COD orders
- [ ] Auth checkout: pre-filled sender data from session
- [ ] Recipient toggle switches forms
- [ ] Card message: 100 char max, counter, preview
- [ ] Address autocomplete: province → district → ward → street
- [ ] Time slots: filter by zone, disable past slots, 5pm cutoff
- [ ] Payment method: VNPay/Momo redirect, COD confirms immediately
- [ ] Photo confirmation checkbox → metadata in order
- [ ] Order confirmation page: order#, items, tracking, Zalo share
- [ ] Account page: order history with status badges
- [ ] Search: Cmd+K, instant results, diacritics-insensitive Vietnamese
- [ ] Seasonal banner: shows upcoming occasion with days countdown
- [ ] All forms validated with Zod, inline errors in Vietnamese
- [ ] Mobile: single column, no horizontal scroll, thumb-friendly inputs
- [ ] All text from i18n files (VN + EN)
