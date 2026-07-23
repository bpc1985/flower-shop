"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useState } from "react";
import { getUpcomingOccasions } from "@/lib/occasion-calendar";
import { useLocale } from "next-intl";

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  const locale = useLocale();
  const upcoming = getUpcomingOccasions();
  const next = upcoming[0];

  if (dismissed || !next) return null;

  return (
    <div className="bg-burgundy-600 text-cream-100 text-center text-sm py-2 px-4 relative">
      <span>
        {locale === "vi" ? next.name_vi : next.name_en}{" "}
        {locale === "vi" ? "sắp đến! Đặt hoa sớm để nhận ưu đãi" : "is coming! Order early for best prices"} —{" "}
        <Link href={`/occasions/${next.slug}`} className="underline underline-offset-2 font-medium">
          {locale === "vi" ? "Mua ngay" : "Shop now"}
        </Link>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-1/2 -translate-y-1/2"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
