"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCustomer, useLogout } from "@/hooks/use-auth";
import { getStoredToken } from "@/lib/medusa-client";
import { useOrders } from "@/hooks/use-orders";
import { formatVND } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Package, User, LogOut, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export default function AccountPage() {
  const t = useTranslations("account");
  const { data: customer, isLoading: loadingCustomer } = useCustomer();
  const { data: orders, isLoading: loadingOrders } = useOrders();
  const { mutate: logout } = useLogout();

  if (loadingCustomer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-cream-200 rounded w-48 mx-auto" />
          <div className="h-4 bg-cream-200 rounded w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <User className="w-12 h-12 text-warm-800/30 mx-auto mb-4" />
        <h1 className="font-heading text-2xl text-warm-900 mb-2">{t("title")}</h1>
        <p className="text-warm-800/60 mb-6">Vui lòng đăng nhập để xem tài khoản</p>
        <Link href="/" className="text-sage-600 hover:underline font-medium">
          {t("startShopping")}
        </Link>
      </div>
    );
  }

  const customerData = customer as Record<string, unknown>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-heading text-2xl text-warm-900 mb-8">{t("title")}</h1>

      {/* Profile */}
      <Card className="p-6 mb-8 border-cream-200 bg-cream-100">
        <h2 className="font-heading text-lg text-warm-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-sage-600" />
          {t("profile")}
        </h2>
        <div className="space-y-2 text-sm text-warm-800">
          <p>
            <strong>{t("name")}:</strong>{" "}
            {String(customerData.first_name || "")} {String(customerData.last_name || "")}
          </p>
          <p>
            <strong>{t("email")}:</strong> {String(customerData.email || "")}
          </p>
          {Boolean(customerData.phone) && (
            <p>
              <strong>{t("phone")}:</strong> {String(customerData.phone)}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          className="mt-4 border-cream-200 text-warm-800"
          onClick={() => {
            logout();
            toast.success(t("loggedOut"));
          }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t("logout")}
        </Button>
      </Card>

      {/* Orders */}
      <div>
        <h2 className="font-heading text-lg text-warm-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-sage-600" />
          {t("orders")}
        </h2>

        {loadingOrders ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-cream-200 rounded-xl" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-12 bg-cream-100 rounded-xl border border-cream-200">
            <ShoppingBag className="w-10 h-10 text-warm-800/30 mx-auto mb-3" />
            <p className="text-warm-800/60 mb-4">{t("noOrders")}</p>
            <Link href="/products" className="text-sage-600 hover:underline font-medium">
              {t("startShopping")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block p-4 rounded-xl border border-cream-200 bg-cream-100 hover:border-sage-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-warm-900">
                      {t("orderNumber")}
                      {String(order.display_id || order.id).slice(-8)}
                    </p>
                    <p className="text-xs text-warm-800/60 mt-0.5">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-burgundy-600">
                      {formatVND(order.total || order.summary?.raw_current_order_total?.value || 0)}
                    </p>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                        order.status === "completed"
                          ? "bg-sage-100 text-sage-700"
                          : order.status === "canceled"
                            ? "bg-red-100 text-red-700"
                            : "bg-cream-200 text-warm-700"
                      }`}
                    >
                      {t(`status.${order.status}` as any) || order.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-warm-800/60 mt-2">
                  {order.items?.length || 0} {t("orderItems")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
