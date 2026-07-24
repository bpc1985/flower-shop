import { notFound } from "next/navigation";
import { FilterSidebarSuspense } from "@/components/category/filter-sidebar-suspense";
import { ProductGrid } from "@/components/product/product-grid";
import type { ProductGridFilters } from "@/components/product/product-grid";
import { CategoryBreadcrumb } from "@/components/category/category-breadcrumb";
import { OCCASIONS } from "@/lib/occasion-calendar";
import { getTranslations } from "next-intl/server";

interface OccasionPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseFilters(sp: Record<string, string | string[] | undefined>): ProductGridFilters {
  const occasions = (() => {
    const v = sp["occasion"];
    if (!v) return undefined;
    return Array.isArray(v) ? v : [v];
  })();
  const minPrice = (() => {
    const v = sp["min_price"];
    if (typeof v !== "string") return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  })();
  const maxPrice = (() => {
    const v = sp["max_price"];
    if (typeof v !== "string") return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  })();

  return { occasions, minPrice, maxPrice };
}

export default async function OccasionPage({ params, searchParams }: OccasionPageProps) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "category" });

  const occasion = OCCASIONS.find((o) => o.slug === slug);
  if (!occasion) notFound();

  const filters = parseFilters(sp);

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
          <FilterSidebarSuspense />
        </aside>
        <main className="flex-1">
          <ProductGrid filters={filters} />
        </main>
      </div>
    </div>
  );
}
