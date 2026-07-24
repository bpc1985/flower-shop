import { FilterSidebarSuspense } from "@/components/category/filter-sidebar-suspense";
import { ProductGrid } from "@/components/product/product-grid";
import type { ProductGridFilters } from "@/components/product/product-grid";

interface ProductsPageProps {
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

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-heading text-h2 text-warm-900 mb-8">Tất cả sản phẩm</h1>
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
