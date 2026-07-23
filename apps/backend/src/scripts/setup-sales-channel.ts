import type { MedusaContainer } from "@medusajs/framework/types";

export default async function ({ container }: { container: MedusaContainer }) {
  const apiKeyService: any = container.resolve("api_key");
  const scService: any = container.resolve("sales_channel");
  const productService: any = container.resolve("product");

  // Get the Medusa-created defaults
  const keys = await apiKeyService.listApiKeys(
    { type: "publishable" },
    { take: 10 }
  );

  const scs = await scService.listSalesChannels({}, { take: 10 });

  // Find the Storefront key (the one we created) + default SC
  const storefrontKey = keys.find((k: any) => k.title.includes("Storefront"));
  const defaultSC = scs.find((s: any) => s.name.includes("Default"));

  if (!storefrontKey || !defaultSC) {
    console.log("Missing", { storefrontKey: !!storefrontKey, defaultSC: !!defaultSC });
    return;
  }

  console.log(`Key: ${storefrontKey.id} (${storefrontKey.title}) token: ${storefrontKey.token}`);
  console.log(`SC:  ${defaultSC.id} (${defaultSC.name})`);

  await apiKeyService.updateApiKeys(storefrontKey.id, {
    title: storefrontKey.title,
    sales_channel_ids: [defaultSC.id],
  });
  console.log("Linked default API key to default sales channel");

  // Link all products to default sales channel
  const allProducts: any[] = await productService.listProducts(
    {},
    { select: ["id", "title"] }
  );
  console.log(`Found ${allProducts.length} products`);

  let updated = 0;
  for (const p of allProducts) {
    await productService.updateProducts(p.id, {
      sales_channels: [{ id: defaultSC.id }],
    });
    updated++;
  }
  console.log(`Linked ${updated} products to sales channel`);
}
