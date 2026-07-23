"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { OCCASIONS, type Occasion } from "@/lib/occasion-calendar";
import { ChevronRight } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ponytail: UI-only filter sidebar, functional filtering in Phase 7

export function FilterSidebar() {
  const locale = useLocale();

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-heading text-sm text-warm-900 mb-3">
          {locale === "vi" ? "Dịp" : "Occasions"}
        </h4>
        <div className="space-y-1">
          {OCCASIONS.map((o) => (
            <Link
              key={o.slug}
              href={`/occasions/${o.slug}`}
              className="flex items-center justify-between text-sm text-warm-800 hover:text-burgundy-600 py-1 transition-colors"
            >
              <span>{locale === "vi" ? o.name_vi : o.name_en}</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-heading text-sm text-warm-900 mb-3">
          {locale === "vi" ? "Giá" : "Price"}
        </h4>
        <div className="flex gap-2">
          <Input placeholder="Min ₫" className="text-sm" />
          <Input placeholder="Max ₫" className="text-sm" />
        </div>
      </div>
    </div>
  );
}
