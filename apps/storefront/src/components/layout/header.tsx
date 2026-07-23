"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, ShoppingBag, User, LogOut } from "lucide-react";
import { OccasionMegaMenu } from "./occasion-mega-menu";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { LoginDialog } from "@/components/auth/login-dialog";
import { useCustomer, useLogout } from "@/hooks/use-auth";

export function Header() {
  const t = useTranslations("common");
  const { data: customer } = useCustomer();
  const { mutate: logout } = useLogout();

  return (
    <header className="sticky top-0 z-50 bg-cream-100/80 backdrop-blur-md border-b border-cream-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link href="/" className="font-heading text-2xl font-bold text-burgundy-600 shrink-0">
            Bloom Wedding
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <OccasionMegaMenu />
          <Link href="/products" className="text-warm-800 hover:text-burgundy-600 transition-colors">
            {t("nav.shop")}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          {customer ? (
            <div className="flex items-center gap-1">
              <Link href="/account" className="hidden sm:block p-2 hover:text-burgundy-600 transition-colors">
                <User className="w-5 h-5" />
              </Link>
              <button
                onClick={() => logout()}
                className="p-2 hover:text-burgundy-600 transition-colors"
                title={t("nav.logout")}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <LoginDialog>
              <button className="p-2 hover:text-burgundy-600 transition-colors" title={t("nav.login")}>
                <User className="w-5 h-5" />
              </button>
            </LoginDialog>
          )}

          <Link href="/checkout" className="p-2 relative hover:text-burgundy-600 transition-colors">
            <ShoppingBag className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
