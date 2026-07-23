import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: { container: MedusaContainer }) {
  const productService: any = container.resolve("product");
  const pricingService: any = container.resolve("pricing");
  const remoteLink: any = container.resolve("remoteLink");

  const prods: any[] = await productService.listProducts(
    {},
    { select: ["id", "title", "variants.id", "variants.title"] }
  );

  console.log(`Products: ${prods.length}`);

  let priceCount = 0;
  const priceLinks: any[] = [];

  for (const p of prods) {
    for (const v of p.variants || []) {
      // Determine price amount from variant title
      let amount = 0;
      if (v.title.toLowerCase().includes("standard")) {
        amount = Math.round(350000); // approximate — already computed in seed
      } else if (v.title.toLowerCase().includes("premium")) {
        amount = Math.round(350000 * 1.6);
      } else if (v.title.toLowerCase().includes("deluxe")) {
        amount = Math.round(350000 * 2.3);
      }

      if (amount > 0) {
        // Create price set for variant
        const priceSet = await pricingService.createPriceSets({
          prices: [{
            amount,
            currency_code: "vnd",
          }],
        });

        // Link price set to variant
        priceLinks.push({
          [Modules.PRODUCT]: { variant_id: v.id },
          [Modules.PRICING]: { price_set_id: priceSet.id },
        });
        priceCount++;
      }
    }
  }

  // Batch link all price sets
  await remoteLink.create(priceLinks);
  console.log(`Created ${priceCount} price sets and linked to variants`);

  // Verify
  const prices = await pricingService.listPrices({}, { take: 3 });
  console.log(`Prices in DB: ${prices.length}`);
  for (const pr of prices.slice(0, 3)) {
    console.log(`  ${pr.amount} ${pr.currency_code}`);
  }
}
