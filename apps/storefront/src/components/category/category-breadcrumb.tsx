import Link from "next/link";
import { useLocale } from "next-intl";
import { ChevronRight } from "lucide-react";
import { OCCASIONS, type Occasion } from "@/lib/occasion-calendar";

interface CategoryBreadcrumbProps {
  occasion: Occasion;
}

export function CategoryBreadcrumb({ occasion }: CategoryBreadcrumbProps) {
  const locale = useLocale();

  return (
    <nav className="flex items-center gap-1 text-sm text-warm-800/60">
      <Link href="/" className="hover:text-burgundy-600 transition-colors">
        {locale === "vi" ? "Trang chủ" : "Home"}
      </Link>
      <ChevronRight className="w-3 h-3" />
      <Link href="/occasions" className="hover:text-burgundy-600 transition-colors">
        {locale === "vi" ? "Dịp" : "Occasions"}
      </Link>
      <ChevronRight className="w-3 h-3" />
      <span className="text-warm-800">
        {locale === "vi" ? occasion.name_vi : occasion.name_en}
      </span>
    </nav>
  );
}
