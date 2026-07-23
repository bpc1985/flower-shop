"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { OCCASIONS } from "@/lib/occasion-calendar";

export function OccasionMegaMenu() {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // ponytail: 150ms delay — enough to cross the gap, fast enough to feel responsive
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
