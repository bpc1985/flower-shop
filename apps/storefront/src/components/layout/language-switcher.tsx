"use client";

import { useLocale } from "next-intl";
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
