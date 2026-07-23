import { Modules } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";

export default async function ({ container }: { container: MedusaContainer }) {
  const productSvc: any = container.resolve(Modules.PRODUCT);
  const pricingSvc: any = container.resolve(Modules.PRICING);

  const prods: any[] = await productSvc.listProducts({}, { select: ["id"] });
  if (prods.length === 0) { console.log("No products to clean"); return; }

  // Delete all products
  await productSvc.deleteProducts(prods.map((p) => p.id));
  console.log(`Deleted ${prods.length} products`);

  // Delete all price sets
  const pss = await pricingSvc.listPriceSets({}, { take: 1000 });
  if (pss.length > 0) {
    await pricingSvc.deletePriceSets(pss.map((ps: any) => ps.id));
    console.log(`Deleted ${pss.length} price sets`);
  }
}
