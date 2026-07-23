import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: { container: MedusaContainer }) {
  const productSvc: any = container.resolve(Modules.PRODUCT);
  const catSvc: any = container.resolve(Modules.PRODUCT);
  const regionSvc: any = container.resolve(Modules.REGION);

  const prods = await productSvc.listProducts({}, { select: ["id", "title", "handle", "status"] });
  console.log(`Products: ${prods.length}`);
  console.log(`Published: ${prods.filter((p: any) => p.status === "published").length}`);

  const variants = await productSvc.listProductVariants({}, { take: 1 });
  console.log(`Variants exist: ${variants.length > 0 ? "YES" : "NO"}`);

  const cats = await catSvc.listProductCategories({}, { select: ["id", "handle"] });
  console.log(`Categories: ${cats.length}`);
  for (const c of cats) console.log(`  ${c.handle}`);

  const regions = await regionSvc.listRegions({});
  console.log(`Regions: ${regions.length}`);
  if (regions.length > 0) {
    const r = regions[0];
    console.log(`  ${r.name} / ${r.currency_code} / auto_taxes=${r.automatic_taxes}`);
  }
}
