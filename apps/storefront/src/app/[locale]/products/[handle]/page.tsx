import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductInfo } from "@/components/product/product-info";
import { RelatedProducts } from "@/components/product/related-products";
import { medusaClient } from "@/lib/medusa-client";

interface ProductPageProps {
  params: Promise<{ locale: string; handle: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { handle } = await params;
  try {
    const { products } = await medusaClient.store.product.list({
      handle,
      fields: "title,description,thumbnail",
    });
    if (!products?.length) return {};
    const p = products[0] as any;
    return {
      title: `${p.title} | Bloom Wedding`,
      description: p.description?.substring(0, 160),
      openGraph: {
        title: p.title,
        description: p.description?.substring(0, 160),
        images: p.thumbnail ? [p.thumbnail] : [],
      },
    };
  } catch {
    return {};
  }
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
  const maxPrice = Math.max(
    ...variants.map((v: any) => v.calculated_price?.calculated_amount ?? 0)
  );

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.thumbnail || product.images?.[0]?.url,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "VND",
      lowPrice: minPrice / 100,
      highPrice: maxPrice / 100,
      availability: "https://schema.org/InStock",
    },
    category: product.categories?.map((c: any) => c.name).join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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
    </>
  );
}
