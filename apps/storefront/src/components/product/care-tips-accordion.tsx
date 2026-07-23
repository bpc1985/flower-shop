"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useLocale } from "next-intl";

const DEFAULT_TIPS_VI = [
  "Cắt gốc hoa góc 45° trước khi cắm.",
  "Thay nước hàng ngày và cắt lại gốc mỗi 2 ngày.",
  "Tránh đặt hoa dưới ánh nắng trực tiếp hoặc gần trái cây chín.",
  "Dùng gói dưỡng hoa Bloom Wedding (đính kèm) để kéo dài tuổi thọ hoa.",
];

const DEFAULT_TIPS_EN = [
  "Cut stems at 45° before arranging.",
  "Change water daily and re-trim stems every 2 days.",
  "Keep away from direct sunlight and ripening fruit.",
  "Use the included Bloom Wedding flower food packet for longer life.",
];

interface CareTipsAccordionProps {
  tips?: string[];
}

export function CareTipsAccordion({ tips }: CareTipsAccordionProps) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const displayTips = tips?.length
    ? tips
    : locale === "vi" ? DEFAULT_TIPS_VI : DEFAULT_TIPS_EN;

  return (
    <div className="border border-cream-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-warm-800 hover:bg-cream-200 transition-colors"
      >
        <span>{locale === "vi" ? "🌿 Hướng dẫn chăm sóc hoa" : "🌿 Flower Care Guide"}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-3">
          <ul className="space-y-1 text-sm text-warm-800/80">
            {displayTips.map((tip, i) => (
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
