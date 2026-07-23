import type { MedusaContainer } from "@medusajs/framework/types";

export default async function ({ container }: { container: MedusaContainer }) {
  const cartSvc: any = container.resolve("cart");
  const productSvc: any = container.resolve("product");
  const regionSvc: any = container.resolve("region");

  const prods = await productSvc.listProducts({}, { select: ["id", "title"], take: 1 });
  const variants = await productSvc.listProductVariants(
    { product_id: prods[0].id },
    { take: 1 }
  );
  const variant = variants[0];
  console.log("Variant:", variant.id);

  const regions = await regionSvc.listRegions({}, { take: 1 });
  const region = regions[0];
  console.log("Region:", region.id);

  try {
    const cart = await cartSvc.createCarts({
      region_id: region.id,
      currency_code: "vnd",
      email: "test@test.com",
      items: [{ variant_id: variant.id, quantity: 1 }],
    });
    console.log("Cart:", cart.id);
    console.log("Items:", cart.items?.length);
  } catch (e: any) {
    console.error("ERROR:", e.message);
    if (e.message?.includes("price")) {
      console.error("PRICE ISSUE");
    }
  }
}
