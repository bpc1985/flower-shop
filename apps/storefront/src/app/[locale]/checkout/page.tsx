"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { useCustomer } from "@/hooks/use-auth";
import { useCreateCheckout } from "@/hooks/use-checkout";
import { formatVND } from "@/lib/format-currency";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Step = "shipping" | "payment" | "review";

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const router = useRouter();
  const { data: cart } = useCart();
  const { data: customer } = useCustomer();
  const { mutateAsync: createCheckout, isPending } = useCreateCheckout();

  const [step, setStep] = useState<Step>("shipping");
  const [shipping, setShipping] = useState({
    name: customer?.first_name
      ? `${customer.first_name} ${customer.last_name}`
      : "",
    phone: customer?.phone || "",
    province: "",
    district: "",
    ward: "",
    street: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cardMessage, setCardMessage] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("asap");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [photoConfirm, setPhotoConfirm] = useState(false);

  const validateShipping = (): boolean => {
    const errs: Record<string, string> = {};
    if (!shipping.name.trim()) errs.name = t("errors.nameRequired");
    if (!shipping.phone.trim()) errs.phone = t("errors.phoneRequired");
    else if (!/^(0|\+84)[3|5|7|8|9]\d{8}$/.test(shipping.phone.trim()))
      errs.phone = t("errors.phoneInvalid");
    if (!shipping.street.trim()) errs.street = t("errors.streetRequired");
    if (!shipping.province.trim()) errs.province = t("errors.provinceRequired");
    if (!shipping.ward.trim()) errs.ward = t("errors.wardRequired");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  if (!cart || (cart as any)?.items?.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="font-heading text-2xl text-warm-900 mb-4">
          {t("title")}
        </h1>
        <p className="text-warm-800/60 mb-6">Giỏ hàng trống</p>
        <Link
          href="/products"
          className="text-sage-600 hover:underline font-medium"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  const items = (cart as any)?.items || [];
  const subtotal = (cart as any)?.subtotal || (cart as any)?.item_subtotal || 0;
  const shippingFee = 0; // Calculated after address entry
  const total = subtotal + shippingFee;

  const handleSubmit = async () => {
    try {
      const result = await createCheckout({
        cartId: (cart as any).id,
        shipping,
        paymentMethod,
        deliveryTime,
        cardMessage,
        photoConfirm,
      });
      toast.success(t("orderSuccess"));
      router.push(`/account/orders/${result.orderId}`);
    } catch (err: any) {
      toast.error(err.message || t("error"));
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-heading text-2xl text-warm-900 mb-8">{t("title")}</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["shipping", "payment", "review"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-sage-500 text-cream-100"
                  : step > s
                    ? "bg-sage-200 text-sage-700"
                    : "bg-cream-200 text-warm-800/50"
              }`}
            >
              {step > s ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-sm ${step === s ? "font-medium text-warm-900" : "text-warm-800/50"}`}
            >
              {t(s)}
            </span>
            {i < 2 && <div className="w-8 h-px bg-cream-200" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === "shipping" && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              value={shipping.name}
              onChange={e => {
                setShipping({ ...shipping, name: e.target.value });
                setErrors(prev => {
                  const { name: _, ...rest } = prev;
                  return rest;
                });
              }}
              className={errors.name ? "border-red-400" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input
              id="phone"
              value={shipping.phone}
              onChange={e => {
                setShipping({ ...shipping, phone: e.target.value });
                setErrors(prev => {
                  const { phone: _, ...rest } = prev;
                  return rest;
                });
              }}
              inputMode="numeric"
              className={errors.phone ? "border-red-400" : ""}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>
          <div>
            <Label htmlFor="street">{t("street")}</Label>
            <Input
              id="street"
              value={shipping.street}
              onChange={e => {
                setShipping({ ...shipping, street: e.target.value });
                setErrors(prev => {
                  const { street: _, ...rest } = prev;
                  return rest;
                });
              }}
              className={errors.street ? "border-red-400" : ""}
            />
            {errors.street && (
              <p className="text-xs text-red-500 mt-1">{errors.street}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="province">{t("province")}</Label>
              <Input
                id="province"
                value={shipping.province}
                onChange={e => {
                  setShipping({ ...shipping, province: e.target.value });
                  setErrors(prev => {
                    const { province: _, ...rest } = prev;
                    return rest;
                  });
                }}
                className={errors.province ? "border-red-400" : ""}
              />
              {errors.province && (
                <p className="text-xs text-red-500 mt-1">{errors.province}</p>
              )}
            </div>
            <div>
              <Label htmlFor="ward">{t("ward")}</Label>
              <Input
                id="ward"
                value={shipping.ward}
                onChange={e => {
                  setShipping({ ...shipping, ward: e.target.value });
                  setErrors(prev => {
                    const { ward: _, ...rest } = prev;
                    return rest;
                  });
                }}
                className={errors.ward ? "border-red-400" : ""}
              />
              {errors.ward && (
                <p className="text-xs text-red-500 mt-1">{errors.ward}</p>
              )}
            </div>
            <div>
              <Label htmlFor="district">{t("district")}</Label>
              <Input
                id="district"
                value={shipping.district}
                onChange={e => {
                  setShipping({ ...shipping, district: e.target.value });
                  setErrors(prev => {
                    const { district: _, ...rest } = prev;
                    return rest;
                  });
                }}
                className={errors.district ? "border-red-400" : ""}
              />
              {errors.district && (
                <p className="text-xs text-red-500 mt-1">{errors.district}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="message">{t("cardMessage")}</Label>
            <Input
              id="message"
              value={cardMessage}
              onChange={e => setCardMessage(e.target.value.slice(0, 100))}
              placeholder={t("cardMessageHint")}
              maxLength={100}
            />
            <p className="text-xs text-warm-800/40 mt-1">
              {cardMessage.length}/100
            </p>
          </div>
          <Button
            onClick={() => {
              if (validateShipping()) setStep("payment");
            }}
            className="w-full bg-sage-500 hover:bg-sage-600 text-cream-100"
          >
            {t("continue")}
          </Button>
        </div>
      )}

      {step === "payment" && (
        <div className="space-y-4">
          {/* Delivery time */}
          <div className="space-y-2">
            <Label>{t("deliveryTime")}</Label>
            <div className="grid grid-cols-4 gap-2">
              {(["asap", "today", "tomorrow", "date"] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setDeliveryTime(opt)}
                  className={`py-2 px-3 text-sm rounded-lg border transition-colors ${
                    deliveryTime === opt
                      ? "border-sage-500 bg-sage-50 text-sage-700 font-medium"
                      : "border-cream-200 text-warm-800 hover:border-sage-300"
                  }`}
                >
                  {t(opt)}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>{t("paymentMethod")}</Label>
            {(["cod", "vnpay", "momo"] as const).map(m => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`w-full py-3 px-4 rounded-lg border text-left transition-colors ${
                  paymentMethod === m
                    ? "border-sage-500 bg-sage-50 text-sage-700"
                    : "border-cream-200 text-warm-800 hover:border-sage-300"
                }`}
              >
                {t(m)}
              </button>
            ))}
          </div>

          {/* Photo confirmation */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={photoConfirm}
              onChange={e => setPhotoConfirm(e.target.checked)}
              className="w-4 h-4 rounded border-cream-300 text-sage-500 focus:ring-sage-500"
            />
            <span className="text-sm text-warm-800">
              {t("photoBeforeSend")}
            </span>
          </label>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep("shipping")}
              className="flex-1 border-cream-200"
            >
              {t("back")}
            </Button>
            <Button
              onClick={() => setStep("review")}
              className="flex-1 bg-sage-500 hover:bg-sage-600 text-cream-100"
            >
              {t("continue")}
            </Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <div className="bg-cream-50 rounded-xl p-4 space-y-2 border border-cream-200">
            <h3 className="font-medium text-warm-900">{t("orderSummary")}</h3>
            {items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-warm-800">
                  {item.title} × {item.quantity}
                </span>
                <span className="font-medium">
                  {formatVND(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t border-cream-200 pt-2 flex justify-between font-medium">
              <span>{t("total")}</span>
              <span>{formatVND(total)}</span>
            </div>
          </div>

          <div className="text-sm text-warm-800 space-y-1">
            <p>
              <strong>{t("name")}:</strong> {shipping.name}
            </p>
            <p>
              <strong>{t("phone")}:</strong> {shipping.phone}
            </p>
            <p>
              <strong>{t("address")}:</strong> {shipping.street},{" "}
              {shipping.ward}, {shipping.district}, {shipping.province}
            </p>
            <p>
              <strong>{t("deliveryTime")}:</strong> {t(deliveryTime as any)}
            </p>
            <p>
              <strong>{t("paymentMethod")}:</strong> {t(paymentMethod as any)}
            </p>
            {cardMessage && (
              <p>
                <strong>{t("cardMessage")}:</strong> {cardMessage}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep("payment")}
              className="flex-1 border-cream-200"
            >
              {t("back")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 bg-burgundy-600 hover:bg-burgundy-700 text-cream-100"
            >
              {isPending ? t("placing") : t("placeOrder")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
