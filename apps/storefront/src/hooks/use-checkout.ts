"use client";

import { useMutation } from "@tanstack/react-query";
import { medusaClient } from "@/lib/medusa-client";

interface CheckoutInput {
  cartId: string;
  shipping: {
    name: string;
    phone: string;
    province: string;
    district?: string;
    ward: string;
    street: string;
  };
  paymentMethod: string;
  deliveryTime: string;
  cardMessage: string;
  photoConfirm: boolean;
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (input: CheckoutInput) => {
      // 1. Update cart with shipping address + email
      // Setting email triggers Medusa auto-creation of payment collection
      const guestEmail = `guest-${input.cartId.slice(-8)}@bloomwedding.vn`;

      await medusaClient.store.cart.update(input.cartId, {
        email: guestEmail,
        shipping_address: {
          first_name: input.shipping.name.split(" ").slice(-1)[0] || "",
          last_name: input.shipping.name.split(" ").slice(0, -1).join(" ") || "",
          phone: input.shipping.phone,
          address_1: input.shipping.street,
          city: input.shipping.district || "",
          province: input.shipping.province,
          country_code: "vn",
        },
        metadata: {
          ward: input.shipping.ward,
          delivery_time: input.deliveryTime,
          card_message: input.cardMessage,
          photo_confirm: String(input.photoConfirm),
        },
      });

      // 2. Initiate payment session for gateway payments only
      // COD orders: payment collection handled by email on cart, no session needed
      if (input.paymentMethod !== "cod") {
        await medusaClient.store.payment.initiatePaymentSession(
          { id: input.cartId } as any,
          { provider_id: input.paymentMethod },
        );
      }

      // 3. Complete cart → create order
      const result: any = await medusaClient.store.cart.complete(input.cartId);

      if (result.type === "order") {
        return { orderId: result.order?.id || "unknown", order: result.order };
      }

      throw new Error("Checkout failed");
    },
  });
}
