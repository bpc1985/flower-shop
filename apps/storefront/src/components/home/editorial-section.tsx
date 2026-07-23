import { useTranslations, useLocale } from "next-intl";

export function EditorialSection() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="bg-cream-200/50 rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
        <h2 className="font-heading text-h2 text-warm-900 mb-4">
          {t("editorialTitle")}
        </h2>
        <p className="text-warm-800/70 leading-relaxed">
          {t("editorialBody")}
        </p>
      </div>
    </section>
  );
}
