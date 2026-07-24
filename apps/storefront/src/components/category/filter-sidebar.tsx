"use client";

import { useCallback, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { OCCASIONS } from "@/lib/occasion-calendar";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function FilterSidebar() {
  const locale = useLocale();
  const t = useTranslations("category");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeOccasions = searchParams.getAll("occasion");
  const minPriceParam = searchParams.get("min_price");
  const maxPriceParam = searchParams.get("max_price");

  const [minPrice, setMinPrice] = useState(minPriceParam ?? "");
  const [maxPrice, setMaxPrice] = useState(maxPriceParam ?? "");

  const hasAnyFilter = activeOccasions.length > 0 || !!minPriceParam || !!maxPriceParam;

  const pushFilters = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        params.delete(key);
        if (value === null || value === "") continue;
        if (Array.isArray(value)) {
          for (const v of value) params.append(key, v);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const handleOccasionToggle = (slug: string) => {
    const next = activeOccasions.includes(slug)
      ? activeOccasions.filter((s) => s !== slug)
      : [...activeOccasions, slug];
    pushFilters({ occasion: next.length > 0 ? next : null });
  };

  const handlePriceApply = () => {
    pushFilters({
      min_price: minPrice || null,
      max_price: maxPrice || null,
    });
  };

  const handleClearAll = () => {
    setMinPrice("");
    setMaxPrice("");
    router.push(pathname, { scroll: false });
  };

  const handleRemoveOccasion = (slug: string) => {
    const next = activeOccasions.filter((s) => s !== slug);
    pushFilters({ occasion: next.length > 0 ? next : null });
  };

  const handleRemovePrice = () => {
    setMinPrice("");
    setMaxPrice("");
    pushFilters({ min_price: null, max_price: null });
  };

  const isNumber = (v: string) => v !== "" && !isNaN(Number(v));

  return (
    <div className="space-y-6">
      {hasAnyFilter && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-warm-800">{t("activeFilters")}</span>
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={handleClearAll}>
              {t("clearAll")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeOccasions.map((slug) => {
              const occ = OCCASIONS.find((o) => o.slug === slug);
              return (
                <Badge key={slug} variant="secondary" className="gap-1 cursor-pointer pr-1">
                  {locale === "vi" ? occ?.name_vi : occ?.name_en}
                  <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); handleRemoveOccasion(slug); }} />
                </Badge>
              );
            })}
            {((minPriceParam && isNumber(minPriceParam)) || (maxPriceParam && isNumber(maxPriceParam))) && (
              <Badge variant="secondary" className="gap-1 cursor-pointer pr-1">
                {minPriceParam && isNumber(minPriceParam) ? `${Number(minPriceParam).toLocaleString()}₫` : "0₫"}
                {" – "}
                {maxPriceParam && isNumber(maxPriceParam) ? `${Number(maxPriceParam).toLocaleString()}₫` : "∞"}
                <X className="w-3 h-3" onClick={handleRemovePrice} />
              </Badge>
            )}
          </div>
          <Separator />
        </>
      )}

      <div>
        <h4 className="font-heading text-sm text-warm-900 mb-3">{t("occasions")}</h4>
        <div className="space-y-1">
          {OCCASIONS.map((o) => {
            const active = activeOccasions.includes(o.slug);
            return (
              <button
                key={o.slug}
                type="button"
                onClick={() => handleOccasionToggle(o.slug)}
                className={cn(
                  "flex items-center justify-between text-sm w-full text-left py-1 transition-colors",
                  active ? "text-burgundy-600 font-medium" : "text-warm-800 hover:text-burgundy-600",
                )}
              >
                <span>{o.emoji} {locale === "vi" ? o.name_vi : o.name_en}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-heading text-sm text-warm-900 mb-3">{t("price")}</h4>
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs text-warm-800/70 mb-1 block">{t("minPrice")}</Label>
              <Input
                placeholder="0"
                className="text-sm"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handlePriceApply(); }}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-warm-800/70 mb-1 block">{t("maxPrice")}</Label>
              <Input
                placeholder="∞"
                className="text-sm"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handlePriceApply(); }}
              />
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handlePriceApply}>
            {t("apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}
