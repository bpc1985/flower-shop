import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductInfo } from "@/components/product/product-info";
import { RelatedProducts } from "@/components/product/related-products";
import { medusaClient } from "@/lib/medusa-client";

interface ProductPageProps {
  params: Promise<{ locale: string; handle: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;

  const { products } = await medusaClient.store.product.list({
    handle,
    fields: "*variants,*variants.calculated_price,*images,*categories",
    region_id: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
  });

  if (!products?.length) notFound();
  const product = products[0] as any;
  const variants = product.variants ?? [];
  const minPrice = Math.min(
    ...variants.map((v: any) => v.calculated_price?.calculated_amount ?? Infinity)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <ProductGallery
          images={(product.images ?? []).map((i: any) => i.url)}
          title={product.title ?? ""}
        />
        <ProductInfo product={product} minPrice={minPrice} />
      </div>
      <RelatedProducts currentHandle={product.handle} />
    </div>
  );
}
