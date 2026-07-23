import { notFound } from "next/navigation";
import { FilterSidebar } from "@/components/category/filter-sidebar";
import { ProductGrid } from "@/components/product/product-grid";
import { CategoryBreadcrumb } from "@/components/category/category-breadcrumb";
import { OCCASIONS } from "@/lib/occasion-calendar";
import { getTranslations } from "next-intl/server";

interface OccasionPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function OccasionPage({ params }: OccasionPageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "category" });

  const occasion = OCCASIONS.find((o) => o.slug === slug);
  if (!occasion) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <CategoryBreadcrumb occasion={occasion} />
      <h1 className="font-heading text-h2 text-warm-900 mt-4 mb-8">
        {locale === "vi" ? occasion.name_vi : occasion.name_en}
        <span className="text-base font-normal text-warm-800/60 ml-3">
          ({locale === "vi" ? occasion.name_en : occasion.name_vi})
        </span>
      </h1>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-64 shrink-0">
          <FilterSidebar />
        </aside>
        <main className="flex-1">
          <ProductGrid occasionSlug={slug} />
        </main>
      </div>
    </div>
  );
}
