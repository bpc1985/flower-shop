import { ProductGrid } from "@/components/product/product-grid";

export default function ProductsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-heading text-h2 text-warm-900 mb-8">Tất cả sản phẩm</h1>
      <ProductGrid />
    </div>
  );
}
