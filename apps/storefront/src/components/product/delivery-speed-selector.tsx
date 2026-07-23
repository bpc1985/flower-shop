"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { DELIVERY_SPEEDS } from "@/lib/constants";

export function DeliverySpeedSelector() {
  const [speed, setSpeed] = useState<string>("asap");
  const locale = useLocale();

  return (
    <div>
      <label className="text-sm font-medium text-warm-800 block mb-2">
        ⚡ {locale === "vi" ? "Thời gian giao hàng" : "Delivery Time"}
      </label>
      <div className="flex gap-2 flex-wrap">
        {DELIVERY_SPEEDS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSpeed(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              speed === opt.value
                ? "border-sage-500 bg-sage-500/10 text-sage-700"
                : "border-cream-200 text-warm-800 hover:border-cream-300"
            }`}
          >
            {locale === "vi" ? opt.label_vi : opt.label_en}
          </button>
        ))}
      </div>
    </div>
  );
}
