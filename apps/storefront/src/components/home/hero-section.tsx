import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  const t = useTranslations("home");

  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <h1 className="font-heading text-display text-warm-900 whitespace-pre-line">
              {t("hero")}
            </h1>
            <p className="text-body text-warm-800/70 max-w-md">
              {t("heroSub")}
            </p>
            <Link
              href="/occasions"
              className="inline-flex items-center gap-2 bg-sage-500 hover:bg-sage-600 text-cream-100 px-6 py-3 rounded-full font-medium transition-colors shadow-card"
            >
              {t("shopOccasions")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-elevated">
            <img
              src="https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=800&q=80"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
