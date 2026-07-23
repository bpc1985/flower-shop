import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { OCCASIONS } from "@/lib/occasion-calendar";

export function OccasionGrid() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <h2 className="font-heading text-h2 text-warm-900 text-center mb-10">
        {t("shopOccasions")}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {OCCASIONS.map((o) => (
          <Link
            key={o.slug}
            href={`/occasions/${o.slug}`}
            className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-cream-200 transition-colors"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform">
              {o.emoji}
            </span>
            <span className="text-sm font-medium text-warm-800 text-center">
              {locale === "vi" ? o.name_vi : o.name_en}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
