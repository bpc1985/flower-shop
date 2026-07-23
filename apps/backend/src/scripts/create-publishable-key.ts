import type { MedusaContainer } from "@medusajs/framework/types";

export default async function ({ container }: { container: MedusaContainer }) {
  const apiKeyService: any = container.resolve("api_key");
  const scService: any = container.resolve("sales_channel");

  // Get default sales channel
  const scs = await scService.listSalesChannels(
    { name: "Default Sales Channel" },
    { take: 1 }
  );
  const sc = scs[0];
  console.log(`SC: ${sc.id} (${sc.name})`);

  // Create new publishable key
  const key = await apiKeyService.createApiKeys({
    title: "Storefront",
    type: "publishable",
    created_by: "seed",
  });

  console.log(`Created key: ${key.id}`);
  console.log(`Token: ${key.token}`);

  // Verify linking
  const keys = await apiKeyService.listApiKeys(
    { id: key.id },
    { relations: ["sales_channels"] }
  );
  const linked = keys[0];
  console.log(`Sales channels linked: ${linked.sales_channels?.length || 0}`);
  if (linked.sales_channels) {
    for (const s of linked.sales_channels) {
      console.log(`  -> ${s.id} ${s.name}`);
    }
  }
}
