# Phase 3: Storefront Core — Design System + Product Browsing

**Estimate:** 12-15h | **Depends on:** Phase 1 (i18n routing), Phase 2 (products + categories)

## 3.1 Tanstack Query Hooks (Read-Only)

### apps/storefront/src/hooks/query-keys.ts
```ts
export const queryKeys = {
  products: {
    all: ["products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (handle: string) => [...queryKeys.products.details(), handle] as const,
  },
  categories: {
    all: ["categories"] as const,
    lists: () => [...queryKeys.categories.all, "list"] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.categories.lists(), filters] as const,
    details: () => [...queryKeys.categories.all, "detail"] as const,
    detail: (handle: string) => [...queryKeys.categories.details(), handle] as const,
  },
  cart: {
    all: ["cart"] as const,
    current: () => [...queryKeys.cart.all, "current"] as const,
  },
  customer: {
    all: ["customer"] as const,
    current: () => [...queryKeys.customer.all, "current"] as const,
  },
  region: {
    all: ["region"] as const,
    current: () => [...queryKeys.region.all, "current"] as const,
  },
};
```

### apps/storefront/src/hooks/use-products.ts
```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { medusaClient } from "@/lib/medusa-client";
import { queryKeys } from "./query-keys";
import type { Product } from "@bloom/shared-types";

interface ProductFilters {
  categoryHandle?: string;
  occasionHandle?: string;
  minPrice?: number;
  maxPrice?: number;
  deliveryAvailable?: boolean;
  sort?: "price_asc" | "price_desc" | "created_at";
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const { products } = await medusaClient.store.product.list({
        fields: "*variants,*variants.prices,*images,*categories",
        ...(filters.categoryHandle && {
          category_handle: filters.categoryHandle,
        }),
        ...(filters.minPrice && { price_list_id: filters.minPrice.toString() }),
        // Note: full filtering done client-side until Medusa supports all filters
      });
      return products as unknown as Product[];
    },
  });
}

export function useProduct(handle: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(handle),
    queryFn: async () => {
      const { products } = await medusaClient.store.product.list({
        handle,
        fields: "*variants,*variants.prices,*images,*categories",
      });
      if (products.length === 0) throw new Error("Product not found");
      return products[0] as unknown as Product;
    },
  });
}
```

### apps/storefront/src/hooks/use-categories.ts
```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { medusaClient } from "@/lib/medusa-client";
import { queryKeys } from "./query-keys";

export function useCategories(parentHandle?: string) {
  return useQuery({
    queryKey: queryKeys.categories.list({ parentHandle }),
    queryFn: async () => {
      const { product_categories } = await medusaClient.store.category.list({
        ...(parentHandle && { parent_handle: parentHandle }),
        include_descendants_tree: true,
        fields: "*category_children",
      });
      return product_categories;
    },
    staleTime: 60 * 60 * 1000, // Categories change rarely — 1h stale
  });
}

export function useCategory(handle: string) {
  return useQuery({
    queryKey: queryKeys.categories.detail(handle),
    queryFn: async () => {
      const { product_categories } = await medusaClient.store.category.list({
        handle,
        include_descendants_tree: true,
      });
      if (product_categories.length === 0) throw new Error("Category not found");
      return product_categories[0];
    },
    staleTime: 60 * 60 * 1000,
  });
}
```

### apps/storefront/src/hooks/use-cart.ts (STUB for Phase 3)
```ts
"use client";
import type { Cart } from "@bloom/shared-types";

// Stub — returns empty cart. Real implementation in Phase 7.
const EMPTY_CART: Cart = {
  id: "",
  items: [],
  subtotal: 0,
  shipping_total: 0,
  total: 0,
  region: { currency_code: "vnd" },
};

export function useCart() {
  return { data: EMPTY_CART, isLoading: false };
}

export function useCartCount() {
  return 0;
}

export function useAddToCart() {
  return { mutateAsync: () => Promise.resolve(undefined), isPending: false };
}
```

### apps/storefront/src/hooks/use-customer.ts (STUB for Phase 3)
```ts
"use client";
export function useCustomer() {
  return { data: null, isLoading: false }; // Not logged in
}
```

### apps/storefront/src/lib/format-currency.ts
```ts
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
  // Output: "350.000 ₫"
}

export function formatVNDRange(min: number, max: number): string {
  if (min === max) return formatVND(min);
  return `${formatVND(min)} — ${formatVND(max)}`;
}
```

### apps/storefront/src/lib/occasion-calendar.ts
```ts
interface Occasion {
  slug: string;
  name_vi: string;
  name_en: string;
  emoji: string;
  date?: string;          // ISO date for fixed-date occasions
  lunarMonth?: number;    // Lunar month for Tet (1 = January)
  lunarDay?: number;
  daysBefore: number;     // How many days before to start showing banner
}

export const OCCASIONS: Occasion[] = [
  { slug: "sinh-nhat", name_vi: "Sinh Nhật", name_en: "Birthday", emoji: "🎂", daysBefore: 0 },
  { slug: "ky-niem", name_vi: "Kỷ Niệm", name_en: "Anniversary", emoji: "💝", daysBefore: 0 },
  { slug: "tinh-yeu", name_vi: "Tình Yêu", name_en: "Love & Romance", emoji: "💕", daysBefore: 0 },
  { slug: "chuc-mung", name_vi: "Chúc Mừng", name_en: "Congratulations", emoji: "🎉", daysBefore: 0 },
  { slug: "chia-buon", name_vi: "Chia Buồn", name_en: "Sympathy", emoji: "🕊️", daysBefore: 0 },
  { slug: "cam-on", name_vi: "Cảm Ơn", name_en: "Thank You", emoji: "🙏", daysBefore: 0 },
  { slug: "hoa-tet", name_vi: "Hoa Tết", name_en: "Tet Flowers", emoji: "🧧", daysBefore: 14 },
  { slug: "valentine", name_vi: "Valentine 14/2", name_en: "Valentine's Day", emoji: "💘", date: "2027-02-14", daysBefore: 7 },
  { slug: "ngay-phu-nu", name_vi: "Ngày Phụ Nữ", name_en: "Women's Day", emoji: "🌸", date: "2027-03-08", daysBefore: 5 },
  { slug: "ngay-phu-nu-vn", name_vi: "20/10", name_en: "VN Women's Day", emoji: "🌷", date: "2026-10-20", daysBefore: 5 },
];

export function getUpcomingOccasions(): Occasion[] {
  const now = new Date();
  const upcoming: Occasion[] = [];
  for (const o of OCCASIONS) {
    if (!o.date) continue;
    const date = new Date(o.date);
    const daysUntil = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntil >= 0 && daysUntil <= o.daysBefore) {
      upcoming.push(o);
    }
  }
  return upcoming;
}
```

## 3.2 Layout Shell Components

### apps/storefront/src/app/[locale]/layout.tsx (UPDATED from Phase 1)
```
Add Header + Footer to layout:
  ...
  <body>
    <NextIntlClientProvider messages={messages}>
      <QueryProvider>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <Toaster position="top-center" richColors />
      </QueryProvider>
    </NextIntlClientProvider>
  </body>
```

### apps/storefront/src/components/layout/announcement-bar.tsx
```tsx
"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useState } from "react";
import { getUpcomingOccasions } from "@/lib/occasion-calendar";

export function AnnouncementBar() {
  const t = useTranslations("home");
  const [dismissed, setDismissed] = useState(false);
  const upcoming = getUpcomingOccasions();
  const next = upcoming[0];

  if (dismissed || !next) return null;

  return (
    <div className="bg-burgundy-600 text-cream-100 text-center text-sm py-2 px-4 relative">
      <span>
        {next.name_vi} sắp đến! Đặt hoa sớm để nhận ưu đãi —{" "}
        <Link href={`/occasions/${next.slug}`} className="underline underline-offset-2 font-medium">
          Mua ngay
        </Link>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-1/2 -translate-y-1/2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
```

### apps/storefront/src/components/layout/header.tsx
```tsx
"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, ShoppingBag, User } from "lucide-react";
import { OccasionMegaMenu } from "./occasion-mega-menu";
import { LanguageSwitcher } from "./language-switcher";
import { SearchBar } from "@/components/search/search-bar";

export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-50 bg-cream-100/80 backdrop-blur-md border-b border-cream-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="font-heading text-2xl font-bold text-burgundy-600 shrink-0">
          Bloom Wedding
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <OccasionMegaMenu />
          <Link href="/products" className="text-warm-800 hover:text-burgundy-600 transition-colors">
            {t("shop")}
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <SearchBar />
          <Link href="/account" className="hidden sm:block p-2 hover:text-burgundy-600 transition-colors">
            <User className="w-5 h-5" />
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}

function CartButton() {
  const count = 0; // useCartCount() — Phase 7
  return (
    <Link href="/checkout" className="p-2 relative hover:text-burgundy-600 transition-colors">
      <ShoppingBag className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-sage-500 text-cream-100 text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
```

### apps/storefront/src/components/layout/occasion-mega-menu.tsx
```tsx
"use client";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useCategories } from "@/hooks/use-categories";
import { OCCASIONS } from "@/lib/occasion-calendar";

export function OccasionMegaMenu() {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const { data: occasionParent } = useCategories("occasions");

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button className="flex items-center gap-1 text-warm-800 hover:text-burgundy-600 transition-colors py-2">
        {locale === "vi" ? "Dịp" : "Occasions"}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-cream-100 border border-cream-200 rounded-xl shadow-elevated p-6 w-[600px] grid grid-cols-3 gap-4 z-50">
          {OCCASIONS.map((o) => (
            <Link
              key={o.slug}
              href={`/occasions/${o.slug}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-200 transition-colors text-sm"
              onClick={() => setOpen(false)}
            >
              <span className="text-lg">{o.emoji}</span>
              <span>{locale === "vi" ? o.name_vi : o.name_en}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

### apps/storefront/src/components/layout/footer.tsx
```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { OCCASIONS } from "@/lib/occasion-calendar";

export async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const primaryOccasions = OCCASIONS.slice(0, 4);

  return (
    <footer className="bg-burgundy-600 text-cream-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* About */}
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-heading text-xl text-cream-100 mb-4">Bloom Wedding</h3>
          <p className="text-sm leading-relaxed text-cream-300">
            Cửa hàng hoa tươi cao cấp tại TP.HCM.
            Giao hoa trong 90 phút — đảm bảo 90% giống hình.
          </p>
        </div>

        {/* Customer Service */}
        <div>
          <h4 className="font-heading text-cream-100 mb-3">Dịch vụ</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:text-cream-100 transition-colors">Chính sách giao hàng</Link></li>
            <li><Link href="/" className="hover:text-cream-100 transition-colors">Đổi trả & Hoàn tiền</Link></li>
            <li><Link href="/" className="hover:text-cream-100 transition-colors">Câu hỏi thường gặp</Link></li>
            <li><Link href="/" className="hover:text-cream-100 transition-colors">Liên hệ</Link></li>
          </ul>
        </div>

        {/* Occasions */}
        <div>
          <h4 className="font-heading text-cream-100 mb-3">Dịp phổ biến</h4>
          <ul className="space-y-2 text-sm">
            {primaryOccasions.map((o) => (
              <li key={o.slug}>
                <Link href={`/occasions/${o.slug}`} className="hover:text-cream-100 transition-colors">
                  {o.name_vi}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact + Zalo */}
        <div>
          <h4 className="font-heading text-cream-100 mb-3">Liên hệ</h4>
          <ul className="space-y-2 text-sm">
            <li>📞 0909 123 456</li>
            <li>✉️ hello@bloomwedding.vn</li>
            <li>📍 TP. Hồ Chí Minh</li>
            <li>
              <a href="https://zalo.me/0909123456" target="_blank" className="hover:text-cream-100 transition-colors">
                💬 Zalo OA
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-burgundy-500/30 text-center py-4 text-xs text-cream-300">
        © {new Date().getFullYear()} Bloom Wedding. All rights reserved.
      </div>
    </footer>
  );
}
```

### apps/storefront/src/components/layout/mobile-nav.tsx
```tsx
"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu, X, User, Search } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { OCCASIONS } from "@/lib/occasion-calendar";

export function MobileNav() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="md:hidden p-2">
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] bg-cream-100 border-cream-200">
        <nav className="flex flex-col gap-6 mt-8">
          {/* Language switcher */}
          <LanguageSwitcher onSelect={() => setOpen(false)} />

          {/* Occasions */}
          <div>
            <h4 className="font-heading text-lg text-burgundy-600 mb-3">Dịp</h4>
            <div className="grid grid-cols-2 gap-2">
              {OCCASIONS.map((o) => (
                <Link
                  key={o.slug}
                  href={`/occasions/${o.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-sm py-1.5"
                >
                  <span>{o.emoji}</span> {o.name_vi}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

### apps/storefront/src/components/layout/language-switcher.tsx
```tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

export function LanguageSwitcher({ onSelect }: { onSelect?: () => void }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    onSelect?.();
  };

  return (
    <div className="flex items-center gap-1 bg-cream-200 rounded-lg p-0.5">
      <button
        onClick={() => switchTo("vi")}
        className={`px-2 py-1 text-xs rounded-md transition-colors ${
          locale === "vi" ? "bg-cream-100 text-burgundy-600 font-medium shadow-sm" : "text-warm-800"
        }`}
      >
        🇻🇳 VN
      </button>
      <button
        onClick={() => switchTo("en")}
        className={`px-2 py-1 text-xs rounded-md transition-colors ${
          locale === "en" ? "bg-cream-100 text-burgundy-600 font-medium shadow-sm" : "text-warm-800"
        }`}
      >
        🇬🇧 EN
      </button>
    </div>
  );
}
```

### apps/storefront/src/components/layout/trust-bar.tsx
```tsx
import { Truck, Camera, Gift, Banknote } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Truck, label: "Giao 90 phút", labelEn: "90-min delivery" },
  { icon: Camera, label: "Chụp ảnh trước giao", labelEn: "Photo confirmation" },
  { icon: Gift, label: "Tặng thiệp miễn phí", labelEn: "Free greeting card" },
  { icon: Banknote, label: "Thanh toán COD", labelEn: "Cash on delivery" },
];

export function TrustBar({ locale }: { locale: string }) {
  return (
    <div className="border-t border-cream-200 bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {TRUST_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm text-warm-800">
            <item.icon className="w-5 h-5 text-sage-500 shrink-0" />
            <span>{locale === "vi" ? item.label : item.labelEn}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 3.3 Homepage

### apps/storefront/src/app/[locale]/page.tsx
```tsx
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/home/hero-section";
import { OccasionGrid } from "@/components/home/occasion-grid";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { EditorialSection } from "@/components/home/editorial-section";
import { TrustBar } from "@/components/layout/trust-bar";
import { AnnouncementBar } from "@/components/layout/announcement-bar";

export default function HomePage() {
  return (
    <>
      <AnnouncementBar />
      <HeroSection />
      <OccasionGrid />
      <FeaturedCarousel />
      <EditorialSection />
      <TrustBar />
    </>
  );
}
```

### apps/storefront/src/components/home/hero-section.tsx
```tsx
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  const t = useTranslations("home");

  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Text */}
          <div className="space-y-6">
            <h1 className="font-heading text-display text-warm-900 whitespace-pre-line">
              {t("hero")}
            </h1>
            <p className="text-body text-warm-800/70 max-w-md">
              {t("heroSub")}
            </p>
            <Link
              href="/occasions"
              className="inline-flex items-center gap-2 bg-sage-500 hover:bg-sage-600 text-cream-100 px-6 py-3 rounded-full font-medium transition-colors shadow-card"
            >
              {t("shopOccasions")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Hero Image */}
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-elevated">
            <img
              src="https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=800&q=80"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
```

### apps/storefront/src/components/home/occasion-grid.tsx
```tsx
import Link from "next/link";
import { useTranslations } from "next-intl";
import { OCCASIONS } from "@/lib/occasion-calendar";

export function OccasionGrid() {
  const t = useTranslations("home");

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <h2 className="font-heading text-h2 text-warm-900 text-center mb-10">
        {t("shopOccasions")}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {OCCASIONS.map((o) => (
          <Link
            key={o.slug}
            href={`/occasions/${o.slug}`}
            className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-cream-200 transition-colors"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform">
              {o.emoji}
            </span>
            <span className="text-sm font-medium text-warm-800 text-center">
              {o.name_vi}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

### apps/storefront/src/components/home/featured-carousel.tsx
```tsx
"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/product/product-card";

export function FeaturedCarousel() {
  const t = useTranslations("home");
  const { data: products, isLoading } = useProducts({ deliveryAvailable: true });

  if (isLoading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="font-heading text-h2 text-warm-900 mb-8">{t("featured")}</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[70vw] md:w-[280px] shrink-0 snap-start">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <h2 className="font-heading text-h2 text-warm-900 mb-8">{t("featured")}</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
        {products?.slice(0, 8).map((product) => (
          <div key={product.id} className="w-[70vw] md:w-[280px] shrink-0 snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
```

## 3.4 Product Components

### apps/storefront/src/components/product/product-card.tsx
```tsx
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatVNDRange } from "@/lib/format-currency";
import type { Product } from "@bloom/shared-types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const minPrice = Math.min(...product.variants.map(v => v.prices?.[0]?.amount ?? Infinity));
  const maxPrice = Math.max(...product.variants.map(v => v.prices?.[0]?.amount ?? 0));
  const deliveryAvailable =
    product.metadata?.delivery_available === true ||
    product.tags?.some(t => t === "same-day-delivery");

  return (
    <Link href={`/products/${product.handle}`} className="group block">
      <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-cream-200 shadow-card group-hover:shadow-elevated transition-shadow">
        <Image
          src={product.thumbnail || "/placeholder-flower.jpg"}
          alt={product.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 70vw, 280px"
        />
        {deliveryAvailable && (
          <Badge className="absolute top-3 left-3 bg-sage-500/90 text-cream-100 text-xs">
            Giao nhanh
          </Badge>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="font-heading text-sm md:text-base text-warm-900 line-clamp-2">
          {product.title}
        </h3>
        <p className="font-ui text-sm text-sage-600 font-medium">
          {formatVNDRange(minPrice, maxPrice)}
        </p>
      </div>
    </Link>
  );
}
```

### apps/storefront/src/components/product/product-gallery.tsx
```tsx
"use client";
import Image from "next/image";
import { useState } from "react";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-cream-200 shadow-card">
        <Image
          src={images[selected] || "/placeholder-flower.jpg"}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
              i === selected ? "border-sage-500" : "border-transparent"
            }`}
          >
            <Image src={img} alt={`${title} ${i + 1}`} fill className="object-cover" sizes="64px" />
          </button>
        ))}
      </div>
    </div>
  );
}
```

### apps/storefront/src/components/product/price-tier-selector.tsx
```tsx
"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/format-currency";
import type { ProductVariant, PriceTier } from "@bloom/shared-types";

interface PriceTierSelectorProps {
  variants: ProductVariant[];
  onSelect: (variantId: string) => void;
}

export function PriceTierSelector({ variants, onSelect }: PriceTierSelectorProps) {
  const [selected, setSelected] = useState(variants[0]?.id || "");

  const handleSelect = (variantId: string) => {
    setSelected(variantId);
    onSelect(variantId);
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {variants.map((v) => {
        const tier = v.metadata?.tier as PriceTier;
        const stems = v.metadata?.stem_count;
        const price = v.prices?.[0]?.amount ?? 0;

        const isSelected = selected === v.id;
        const borderClass = isSelected
          ? tier === "deluxe"
            ? "border-burgundy-600 bg-burgundy-600/5"
            : "border-sage-500 bg-sage-500/5"
          : "border-cream-200 hover:border-cream-300";

        return (
          <button
            key={v.id}
            onClick={() => handleSelect(v.id)}
            className={cn(
              "border-2 rounded-xl p-3 text-left transition-all",
              borderClass
            )}
          >
            <p className="font-heading text-sm text-warm-900 capitalize">
              {v.title.split(" — ")[0]}
            </p>
            <p className="text-xs text-warm-800/60">{stems} bông</p>
            <p className="font-ui font-semibold text-warm-900 mt-1">
              {formatVND(price)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
```

### apps/storefront/src/components/product/care-tips-accordion.tsx
```tsx
"use client";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface CareTipsAccordionProps {
  tips: string[];
}

export function CareTipsAccordion({ tips }: CareTipsAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-cream-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-warm-800 hover:bg-cream-200 transition-colors"
      >
        <span>🌿 Hướng dẫn chăm sóc hoa</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-3">
          <ul className="space-y-1 text-sm text-warm-800/80">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-sage-500 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## 3.5 Product Listing Page

### apps/storefront/src/app/[locale]/occasions/[slug]/page.tsx
```tsx
import { notFound } from "next/navigation";
import { FilterSidebar } from "@/components/category/filter-sidebar";
import { ProductGrid } from "@/components/product/product-grid";
import { CategoryBreadcrumb } from "@/components/category/category-breadcrumb";

interface OccasionPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ sort?: string; min?: string; max?: string; type?: string }>;
}

export default async function OccasionPage({ params, searchParams }: OccasionPageProps) {
  const { slug } = await params;
  const filters = await searchParams;

  // Verify occasion slug exists
  const occasion = OCCASIONS.find((o) => o.slug === slug);
  if (!occasion) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <CategoryBreadcrumb occasion={occasion} />
      <h1 className="font-heading text-h2 text-warm-900 mt-4 mb-8">
        {occasion.name_vi}
        <span className="text-base font-normal text-warm-800/60 ml-3">
          ({occasion.name_en})
        </span>
      </h1>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-64 shrink-0">
          <FilterSidebar />
        </aside>
        <main className="flex-1">
          <ProductGrid occasionSlug={slug} filters={filters} />
        </main>
      </div>
    </div>
  );
}
```

### apps/storefront/src/components/product/product-grid.tsx
```tsx
"use client";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "./product-card";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductGridProps {
  occasionSlug?: string;
  filters?: Record<string, string>;
}

export function ProductGrid({ occasionSlug, filters = {} }: ProductGridProps) {
  const { data: products, isLoading, error } = useProducts({
    occasionHandle: occasionSlug,
    ...filters,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!products?.length) {
    return (
      <div className="text-center py-16 text-warm-800/60">
        <p>Chưa có sản phẩm nào trong dịp này.</p>
        <p className="text-sm mt-2">Vui lòng quay lại sau hoặc chọn dịp khác.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

## 3.6 Product Detail Page

### apps/storefront/src/app/[locale]/products/[handle]/page.tsx
```tsx
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/product-gallery";
import { PriceTierSelector } from "@/components/product/price-tier-selector";
import { DeliverySpeedSelector } from "@/components/product/delivery-speed-selector";
import { CareTipsAccordion } from "@/components/product/care-tips-accordion";
import { RelatedProducts } from "@/components/product/related-products";
import { formatVND } from "@/lib/format-currency";
import { Badge } from "@/components/ui/badge";
// Server component fetches from Medusa directly
import { medusaClient } from "@/lib/medusa-client";
import type { Product } from "@bloom/shared-types";

interface ProductPageProps {
  params: Promise<{ locale: string; handle: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;

  const { products } = await medusaClient.store.product.list({
    handle,
    fields: "*variants,*variants.prices,*images,*categories",
  });

  if (!products.length) notFound();
  const product = products[0] as unknown as Product;
  const minPrice = Math.min(...product.variants.map(v => v.prices?.[0]?.amount ?? Infinity));
  const careTips = JSON.parse((product.metadata?.care_tips as string) || "[]");
  const colors = JSON.parse((product.metadata?.colors as string) || "[]");
  const deliveryAvailable =
    product.metadata?.delivery_available === true ||
    product.tags?.some(t => t.value === "same-day-delivery");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <ProductGallery
          images={product.images?.map((i: any) => i.url) || []}
          title={product.title}
        />

        {/* Info */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            {deliveryAvailable && (
              <Badge className="bg-sage-500/90 text-cream-100 mb-3">⚡ Giao nhanh 90 phút</Badge>
            )}
            <h1 className="font-heading text-h1 text-warm-900">{product.title}</h1>
            <p className="text-body text-warm-800/60 mt-1">
              {(product.metadata?.title_en as string) || ""}
            </p>
          </div>

          {/* Price */}
          <p className="font-ui text-2xl font-semibold text-warm-900">
            Từ {formatVND(minPrice)}
          </p>

          {/* Description */}
          <p className="text-body text-warm-800/70 leading-relaxed">
            {product.description}
          </p>

          {/* Colors */}
          {colors.length > 0 && (
            <div className="flex gap-2">
              {colors.map((c: string) => (
                <Badge key={c} variant="outline" className="border-cream-300 text-warm-800">
                  {c}
                </Badge>
              ))}
            </div>
          )}

          {/* Tier selector */}
          <PriceTierSelector
            variants={product.variants}
            onSelect={(id) => console.log("Selected:", id)}
            // Phase 7: connect to useAddToCart
          />

          {/* Delivery speed (UI only in Phase 3) */}
          <DeliverySpeedSelector />

          {/* Add to cart */}
          <button className="w-full bg-sage-500 hover:bg-sage-600 text-cream-100 py-3 rounded-full font-medium shadow-card transition-colors">
            Thêm vào giỏ hàng
          </button>

          {/* Care tips */}
          <CareTipsAccordion tips={careTips} />
        </div>
      </div>

      {/* Related */}
      <RelatedProducts currentHandle={product.handle} />
    </div>
  );
}
```

### apps/storefront/src/components/product/delivery-speed-selector.tsx (UI Only)
```tsx
"use client";
import { useState } from "react";
import type { DeliverySpeed } from "@bloom/shared-types";

const OPTIONS: { value: DeliverySpeed; label: string }[] = [
  { value: "asap", label: "Giao ngay" },
  { value: "today", label: "Hôm nay" },
  { value: "tomorrow", label: "Ngày mai" },
  { value: "date", label: "Chọn ngày" },
];

export function DeliverySpeedSelector() {
  const [speed, setSpeed] = useState<DeliverySpeed>("asap");

  return (
    <div>
      <label className="text-sm font-medium text-warm-800 block mb-2">
        ⚡ Thời gian giao hàng
      </label>
      <div className="flex gap-2 flex-wrap">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSpeed(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              speed === opt.value
                ? "border-sage-500 bg-sage-500/10 text-sage-700"
                : "border-cream-200 text-warm-800 hover:border-cream-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## 3.7 Shadcn Components to Install

```bash
cd apps/storefront
npx shadcn@latest init
npx shadcn@latest add button card input label select sheet dialog navigation-menu badge accordion slider scroll-area separator skeleton
```

All components get the custom theme from `globals.css` automatically (Shadcn uses CSS variables).

## Files Created (Complete List)

```
apps/storefront/src/
├── app/[locale]/
│   ├── layout.tsx                     # Updated with Header + Footer
│   ├── page.tsx                       # Homepage
│   ├── products/[handle]/page.tsx     # Product detail (RSC)
│   ├── occasions/[slug]/page.tsx      # Category listing
│   ├── loading.tsx                    # Skeleton root loader
│   └── not-found.tsx                  # 404 with occasion nav
├── components/
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── announcement-bar.tsx
│   │   ├── mobile-nav.tsx
│   │   ├── occasion-mega-menu.tsx
│   │   ├── trust-bar.tsx
│   │   └── language-switcher.tsx
│   ├── home/
│   │   ├── hero-section.tsx
│   │   ├── occasion-grid.tsx
│   │   ├── featured-carousel.tsx
│   │   └── editorial-section.tsx
│   ├── product/
│   │   ├── product-card.tsx
│   │   ├── product-grid.tsx
│   │   ├── product-gallery.tsx
│   │   ├── price-tier-selector.tsx
│   │   ├── delivery-speed-selector.tsx
│   │   ├── care-tips-accordion.tsx
│   │   ├── related-products.tsx
│   │   └── product-card-skeleton.tsx
│   ├── category/
│   │   ├── filter-sidebar.tsx
│   │   └── category-breadcrumb.tsx
│   ├── providers/
│   │   └── query-provider.tsx
│   ├── search/
│   │   └── search-bar.tsx            # UI only, functional in Phase 7
│   └── ui/                           # shadcn generated
├── hooks/
│   ├── use-products.ts
│   ├── use-categories.ts
│   ├── use-cart.ts                   # STUB
│   ├── use-customer.ts               # STUB
│   └── query-keys.ts
├── i18n/messages/
│   ├── vi/
│   │   ├── common.json
│   │   ├── home.json
│   │   ├── product.json
│   │   └── category.json
│   └── en/
│       ├── common.json
│       ├── home.json
│       ├── product.json
│       └── category.json
└── lib/
    ├── medusa-client.ts
    ├── format-currency.ts
    ├── occasion-calendar.ts
    ├── constants.ts
    └── utils.ts                      # cn() helper
```

## Acceptance Criteria

- [ ] Homepage: hero, occasion grid, featured carousel, trust bar render correctly in VN + EN
- [ ] Occasion mega-menu opens on hover, 16+ links, correct locale names
- [ ] Mobile nav slide-out with all occasion links
- [ ] Product listing: grid + filters render products from Medusa
- [ ] Product detail: gallery, tier selector, delivery speed, care tips
- [ ] Loading skeletons appear during data fetch
- [ ] Empty product grid shows "no products" message
- [ ] 404 page has occasion navigation
- [ ] Language switcher toggles VN/EN, persists across pages
- [ ] VND formatted with ₫ symbol, dot-separated thousands
- [ ] No pure white backgrounds anywhere
- [ ] Shadcn components use custom theme tokens
- [ ] Cart + customer hooks are stubbed (no auth errors)
