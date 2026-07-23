import Link from "next/link";
import { OCCASIONS } from "@/lib/occasion-calendar";
import { STORE_PHONE, STORE_EMAIL, STORE_CITY, STORE_ZALO } from "@/lib/constants";

export function Footer({ locale }: { locale: string }) {
  const primaryOccasions = OCCASIONS.slice(0, 4);

  return (
    <footer className="bg-burgundy-600 text-cream-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-heading text-xl text-cream-100 mb-4">Bloom Wedding</h3>
          <p className="text-sm leading-relaxed text-cream-300">
            {locale === "vi"
              ? "Cửa hàng hoa tươi cao cấp tại TP.HCM. Giao hoa trong 90 phút — đảm bảo 90% giống hình."
              : "Premium flower shop in HCMC. 90-minute delivery — 90% photo match guarantee."}
          </p>
        </div>

        <div>
          <h4 className="font-heading text-cream-100 mb-3">
            {locale === "vi" ? "Dịch vụ" : "Services"}
          </h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:text-cream-100 transition-colors">{locale === "vi" ? "Chính sách giao hàng" : "Delivery Policy"}</Link></li>
            <li><Link href="/" className="hover:text-cream-100 transition-colors">{locale === "vi" ? "Đổi trả & Hoàn tiền" : "Returns & Refunds"}</Link></li>
            <li><Link href="/" className="hover:text-cream-100 transition-colors">{locale === "vi" ? "Câu hỏi thường gặp" : "FAQ"}</Link></li>
            <li><Link href="/" className="hover:text-cream-100 transition-colors">{locale === "vi" ? "Liên hệ" : "Contact"}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-cream-100 mb-3">
            {locale === "vi" ? "Dịp phổ biến" : "Popular Occasions"}
          </h4>
          <ul className="space-y-2 text-sm">
            {primaryOccasions.map((o) => (
              <li key={o.slug}>
                <Link href={`/occasions/${o.slug}`} className="hover:text-cream-100 transition-colors">
                  {locale === "vi" ? o.name_vi : o.name_en}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-cream-100 mb-3">
            {locale === "vi" ? "Liên hệ" : "Contact"}
          </h4>
          <ul className="space-y-2 text-sm">
            <li>📞 {STORE_PHONE}</li>
            <li>✉️ {STORE_EMAIL}</li>
            <li>📍 {STORE_CITY}</li>
            <li><a href={STORE_ZALO} target="_blank" rel="noopener noreferrer" className="hover:text-cream-100 transition-colors">💬 Zalo OA</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-burgundy-500/30 text-center py-4 text-xs text-cream-300">
        © {new Date().getFullYear()} Bloom Wedding. All rights reserved.
      </div>
    </footer>
  );
}
