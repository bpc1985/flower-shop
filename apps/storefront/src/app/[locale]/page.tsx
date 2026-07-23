import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="font-heading text-4xl md:text-6xl text-warm-900 whitespace-pre-line">
          {t("hero")}
        </h1>
        <p className="text-lg text-warm-800/60">{t("heroSub")}</p>
      </div>
    </main>
  );
}
