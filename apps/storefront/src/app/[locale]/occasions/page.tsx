import Link from "next/link";
import { OCCASIONS } from "@/lib/occasion-calendar";
import { getTranslations } from "next-intl/server";

interface OccasionsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OccasionsPage({ params }: OccasionsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "category" });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-heading text-h2 text-warm-900 mb-8">
        {locale === "vi" ? "Khám phá theo dịp" : "Shop by Occasion"}
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {OCCASIONS.map((o) => (
          <Link
            key={o.slug}
            href={`/occasions/${o.slug}`}
            className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-cream-50 border border-cream-200 hover:border-sage-400 hover:shadow-sm transition-all"
          >
            <span className="text-4xl">{o.emoji}</span>
            <span className="text-sm font-medium text-warm-800 group-hover:text-sage-700 text-center">
              {locale === "vi" ? o.name_vi : o.name_en}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
