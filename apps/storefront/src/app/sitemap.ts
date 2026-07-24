import type { MetadataRoute } from "next";
import { medusaClient } from "@/lib/medusa-client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bloomwedding.vn";
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/vi`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/en`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/vi/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/en/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  // Product pages
  try {
    const { products } = await medusaClient.store.product.list({ fields: "handle,updated_at", limit: 100 });
    const productPages: MetadataRoute.Sitemap = (products || []).map((p: any) => ({
      url: `${baseUrl}/vi/products/${p.handle}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    staticPages.push(...productPages);
  } catch {
    // Product listing unavailable — sitemap still valid with static pages only
  }

  // Category pages
  try {
    const { product_categories } = await medusaClient.store.category.list();
    const categoryPages: MetadataRoute.Sitemap = (product_categories || []).map((c: any) => ({
      url: `${baseUrl}/vi/occasions/${c.handle}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    staticPages.push(...categoryPages);
  } catch {
    // Categories unavailable — continue
  }

  return staticPages;
}
