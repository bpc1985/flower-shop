import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: { container: MedusaContainer }) {
  const productService: any = container.resolve("product");
  const scService: any = container.resolve("sales_channel");
  const remoteLink: any = container.resolve("remoteLink");

  const scs = await scService.listSalesChannels(
    { name: "Default Sales Channel" },
    { take: 1 }
  );
  const sc = scs[0];
  if (!sc) { console.log("Default SC not found"); return; }
  console.log(`SC: ${sc.id} (${sc.name})`);

  const prods: any[] = await productService.listProducts(
    {},
    { select: ["id", "title"] }
  );
  console.log(`Products: ${prods.length}`);

  // Use remoteLink to connect products to sales channel
  const links = prods.map((p: any) => ({
    [Modules.PRODUCT]: { product_id: p.id },
    [Modules.SALES_CHANNEL]: { sales_channel_id: sc.id },
  }));

  await remoteLink.create(links);
  console.log(`Linked ${links.length} products via remoteLink`);

  // Verify via link module
  const linkQuery: any = container.resolve("query");
  const result = await linkQuery.graph({
    entity: "product",
    fields: ["id", "title", "sales_channels.id", "sales_channels.name"],
    filters: { id: prods[0].id },
  });
  console.log(`Verify: ${JSON.stringify(result.data[0])}`);
}
