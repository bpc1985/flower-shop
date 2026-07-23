import { Truck, Camera, Gift, Banknote } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Truck, label_vi: "Giao 90 phút", label_en: "90-min delivery" },
  { icon: Camera, label_vi: "Chụp ảnh trước giao", label_en: "Photo confirmation" },
  { icon: Gift, label_vi: "Tặng thiệp miễn phí", label_en: "Free greeting card" },
  { icon: Banknote, label_vi: "Thanh toán COD", label_en: "Cash on delivery" },
];

export function TrustBar({ locale }: { locale: string }) {
  return (
    <div className="border-t border-cream-200 bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {TRUST_ITEMS.map((item) => (
          <div key={item.label_vi} className="flex items-center gap-3 text-sm text-warm-800">
            <item.icon className="w-5 h-5 text-sage-500 shrink-0" />
            <span>{locale === "vi" ? item.label_vi : item.label_en}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
