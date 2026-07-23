import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function seed({ container }: { container: MedusaContainer }) {
  console.log("=== Bloom Wedding Seed ===\n");

  await setupRegion(container);
  console.log("");
  await seedCats(container);
  console.log("");
  await seedProds(container);
  console.log("");
  console.log("=== Seed Complete ===");
}

// ─── Region ───────────────────────────────

async function setupRegion(container: MedusaContainer) {
  const regionSvc: any = container.resolve(Modules.REGION);
  const taxSvc: any = container.resolve(Modules.TAX);

  const existing = await regionSvc.listRegions({ name: "Vietnam" }, { take: 1 });
  let region: any;

  if (existing.length > 0) {
    region = existing[0];
    console.log("Vietnam region already exists.");
  } else {
    region = await regionSvc.createRegions({
      name: "Vietnam",
      currency_code: "vnd",
      countries: ["vn"],
      automatic_taxes: false,
      includes_tax: true,
      payment_providers: [],
      fulfillment_providers: [],
    });
    console.log(`Created region: ${region.name}`);
  }

  const taxRegions = await taxSvc.listTaxRegions({ country_code: "vn" }, { take: 1 });
  if (taxRegions.length > 0) {
    console.log("Tax region already exists. Skipping.");
    return;
  }

  await taxSvc.createTaxRegions({
    country_code: "vn",
    region_id: region.id,
    default_tax_rate: { name: "VAT 10%", code: "VAT-10", rate: 10 },
  });
  console.log("Created tax region with VAT-10");
}

// ─── Categories ────────────────────────────

const OCCASIONS = [
  { name: "Birthday", handle: "birthday", desc: "Birthday flower arrangements", rank: 0 },
  { name: "Valentine's Day", handle: "valentines-day", desc: "Romantic flowers for Valentine's Day", rank: 1 },
  { name: "Anniversary", handle: "anniversary", desc: "Anniversary celebration flowers", rank: 2 },
  { name: "Wedding", handle: "wedding", desc: "Wedding flower arrangements", rank: 3 },
  { name: "Tet (Lunar New Year)", handle: "tet-lunar-new-year", desc: "Traditional Tet flower arrangements", rank: 4 },
  { name: "Women's Day (8/3)", handle: "womens-day", desc: "Flowers for International Women's Day", rank: 5 },
  { name: "Vietnamese Women's Day (20/10)", handle: "vietnamese-womens-day", desc: "Flowers for Vietnamese Women's Day", rank: 6 },
  { name: "Teacher's Day (20/11)", handle: "teachers-day", desc: "Flowers for Teacher's Day", rank: 7 },
  { name: "Mother's Day", handle: "mothers-day", desc: "Flowers for Mother's Day", rank: 8 },
  { name: "Graduation", handle: "graduation", desc: "Graduation celebration flowers", rank: 9 },
  { name: "Grand Opening", handle: "grand-opening", desc: "Grand opening flower stands", rank: 10 },
  { name: "Apology", handle: "apology", desc: "Apology and make-up flowers", rank: 11 },
  { name: "Get Well Soon", handle: "get-well-soon", desc: "Get well soon flowers", rank: 12 },
  { name: "Congratulations", handle: "congratulations", desc: "Congratulations flower arrangements", rank: 13 },
  { name: "Thank You", handle: "thank-you", desc: "Thank you flowers", rank: 14 },
  { name: "Sympathy & Funeral", handle: "sympathy-funeral", desc: "Sympathy and funeral flowers", rank: 15 },
];

const TYPES = [
  { name: "Bouquets", handle: "bouquets", desc: "Hand-tied bouquets", rank: 0 },
  { name: "Baskets", handle: "baskets", desc: "Flower basket arrangements", rank: 1 },
  { name: "Boxes", handle: "boxes", desc: "Luxury flower boxes", rank: 2 },
  { name: "Vases", handle: "vases", desc: "Flower vase arrangements", rank: 3 },
  { name: "Stands", handle: "stands", desc: "Large flower stands for events", rank: 4 },
  { name: "Wreaths", handle: "wreaths", desc: "Funeral and decorative wreaths", rank: 5 },
  { name: "Dried Flowers", handle: "dried-flowers", desc: "Dried and preserved flower arrangements", rank: 6 },
];

async function seedCats(container: MedusaContainer) {
  const productSvc: any = container.resolve(Modules.PRODUCT);

  let occasionParent: any;
  let typeParent: any;

  try {
    occasionParent = await productSvc.createProductCategories({
      name: "Occasions", handle: "occasions",
      description: "Browse flowers by occasion",
      is_active: true, is_internal: false,
    });
    console.log(`Created parent: ${occasionParent.name}`);
  } catch {
    const cats = await productSvc.listProductCategories({ handle: "occasions" }, { take: 1 });
    occasionParent = cats[0];
    console.log(`Parent "${occasionParent?.name}" already exists`);
  }

  try {
    typeParent = await productSvc.createProductCategories({
      name: "Types", handle: "types",
      description: "Browse flowers by type",
      is_active: true, is_internal: false,
    });
    console.log(`Created parent: ${typeParent.name}`);
  } catch {
    const cats = await productSvc.listProductCategories({ handle: "types" }, { take: 1 });
    typeParent = cats[0];
    console.log(`Parent "${typeParent?.name}" already exists`);
  }

  let count = 0;
  for (const cat of OCCASIONS) {
    try {
      await productSvc.createProductCategories({
        ...cat, description: cat.desc,
        parent_category_id: occasionParent.id,
        is_active: true, is_internal: false,
      });
      count++;
    } catch { /* exists */ }
  }
  console.log(`Occasion categories: ${count} new`);

  count = 0;
  for (const cat of TYPES) {
    try {
      await productSvc.createProductCategories({
        ...cat, description: cat.desc,
        parent_category_id: typeParent.id,
        is_active: true, is_internal: false,
      });
      count++;
    } catch { /* exists */ }
  }
  console.log(`Type categories: ${count} new`);
}

// ─── Products ──────────────────────────────

interface ProdDef {
  title: string; handle: string; desc: string;
  occasion: string; type: string; colors: string[];
  stems: [number, number, number]; price: number;
}

const WHITE = new Set(["white", "cream", "ivory", "snow"]);
const TIERS = [
  { name: "Standard", factor: 1.0 },
  { name: "Premium", factor: 1.6 },
  { name: "Deluxe", factor: 2.3 },
];

const PRODS: ProdDef[] = [
  { title: "Birthday Sunshine Bouquet", handle: "birthday-sunshine-bouquet", desc: "Bright and cheerful arrangement with sunflowers, gerberas, and roses.", occasion: "birthday", type: "bouquets", colors: ["yellow", "orange", "pink"], stems: [15, 25, 35], price: 350000 },
  { title: "Birthday Elegance Basket", handle: "birthday-elegance-basket", desc: "Sophisticated basket with roses, carnations, and baby's breath.", occasion: "birthday", type: "baskets", colors: ["pink", "cream"], stems: [20, 30, 40], price: 450000 },
  { title: "Birthday Rose Box", handle: "birthday-rose-box", desc: "Premium preserved roses in a luxury velvet box.", occasion: "birthday", type: "boxes", colors: ["red", "pink"], stems: [9, 16, 25], price: 550000 },
  { title: "Birthday Celebration Vase", handle: "birthday-celebration-vase", desc: "Stunning vase arrangement with mixed seasonal blooms.", occasion: "birthday", type: "vases", colors: ["mixed", "purple", "yellow"], stems: [20, 30, 40], price: 500000 },
  { title: "Valentine Red Rose Bouquet", handle: "valentine-red-rose-bouquet", desc: "Classic dozen red roses wrapped in elegant paper.", occasion: "valentines-day", type: "bouquets", colors: ["red"], stems: [12, 24, 36], price: 400000 },
  { title: "Valentine Luxury Box", handle: "valentine-luxury-box", desc: "Heart-shaped box with premium Ecuadorian roses.", occasion: "valentines-day", type: "boxes", colors: ["red", "pink"], stems: [12, 19, 27], price: 650000 },
  { title: "Valentine Mixed Bouquet", handle: "valentine-mixed-bouquet", desc: "Romantic mix of roses, tulips, and lisianthus.", occasion: "valentines-day", type: "bouquets", colors: ["pink", "white", "red"], stems: [15, 25, 35], price: 380000 },
  { title: "Valentine Chocolate & Flowers", handle: "valentine-chocolate-flowers", desc: "Bouquet paired with Belgian chocolates in gift basket.", occasion: "valentines-day", type: "baskets", colors: ["red", "pink"], stems: [10, 20, 30], price: 550000 },
  { title: "Anniversary Rose Medley", handle: "anniversary-rose-medley", desc: "Blend of red, pink, and white roses symbolizing years together.", occasion: "anniversary", type: "bouquets", colors: ["red", "pink", "white"], stems: [18, 28, 40], price: 450000 },
  { title: "Anniversary Keepsake Box", handle: "anniversary-keepsake-box", desc: "Preserved roses in wooden keepsake box.", occasion: "anniversary", type: "boxes", colors: ["red", "cream"], stems: [12, 18, 24], price: 600000 },
  { title: "Anniversary Flower Vase", handle: "anniversary-flower-vase", desc: "Stunning vase with premium long-stem roses.", occasion: "anniversary", type: "vases", colors: ["red", "burgundy"], stems: [20, 30, 40], price: 550000 },
  { title: "Bride's Bouquet White Rose", handle: "brides-bouquet-white-rose", desc: "Classic bridal bouquet with white roses and eucalyptus.", occasion: "wedding", type: "bouquets", colors: ["white", "cream", "green"], stems: [20, 30, 40], price: 800000 },
  { title: "Wedding Table Centerpiece", handle: "wedding-table-centerpiece", desc: "Elegant low-profile centerpiece for reception tables.", occasion: "wedding", type: "vases", colors: ["white", "pink", "cream"], stems: [15, 25, 35], price: 650000 },
  { title: "Wedding Flower Stand", handle: "wedding-flower-stand", desc: "Grand entrance flower stand for wedding venues.", occasion: "wedding", type: "stands", colors: ["white", "pink", "burgundy"], stems: [40, 60, 80], price: 1500000 },
  { title: "Tet Mai Vang Basket", handle: "tet-mai-vang-basket", desc: "Traditional ochna with lucky red envelopes.", occasion: "tet-lunar-new-year", type: "baskets", colors: ["yellow", "red", "gold"], stems: [10, 20, 30], price: 500000 },
  { title: "Tet Peach Blossom Arrangement", handle: "tet-peach-blossom-arrangement", desc: "Northern-style peach blossoms with red and gold accents.", occasion: "tet-lunar-new-year", type: "vases", colors: ["pink", "red", "gold"], stems: [8, 15, 25], price: 550000 },
  { title: "Tet Kumquat Basket", handle: "tet-kumquat-basket", desc: "Mini kumquat tree with lucky red decorations.", occasion: "tet-lunar-new-year", type: "baskets", colors: ["orange", "red", "gold"], stems: [5, 10, 15], price: 450000 },
  { title: "Tet Marigold Celebration Stand", handle: "tet-marigold-celebration-stand", desc: "Large marigold and chrysanthemum stand.", occasion: "tet-lunar-new-year", type: "stands", colors: ["yellow", "orange", "red"], stems: [30, 50, 70], price: 1200000 },
  { title: "Women's Day Rose Bouquet", handle: "womens-day-rose-bouquet", desc: "Fresh rose bouquet to celebrate amazing women.", occasion: "womens-day", type: "bouquets", colors: ["pink", "red", "yellow"], stems: [15, 25, 35], price: 350000 },
  { title: "Women's Day Tulip Basket", handle: "womens-day-tulip-basket", desc: "Colorful tulip basket for International Women's Day.", occasion: "womens-day", type: "baskets", colors: ["pink", "purple", "yellow"], stems: [15, 25, 35], price: 400000 },
  { title: "Women's Day Mixed Box", handle: "womens-day-mixed-box", desc: "Elegant flower box with mixed seasonal blooms.", occasion: "womens-day", type: "boxes", colors: ["pink", "cream", "purple"], stems: [12, 20, 30], price: 450000 },
  { title: "20/10 Rose & Lily Bouquet", handle: "20-10-rose-lily-bouquet", desc: "Elegant bouquet of roses and lilies.", occasion: "vietnamese-womens-day", type: "bouquets", colors: ["pink", "white", "yellow"], stems: [15, 25, 35], price: 380000 },
  { title: "20/10 Sunflower Basket", handle: "20-10-sunflower-basket", desc: "Cheerful sunflower basket to brighten her day.", occasion: "vietnamese-womens-day", type: "baskets", colors: ["yellow", "orange", "green"], stems: [12, 20, 30], price: 350000 },
  { title: "20/10 Luxury Rose Box", handle: "20-10-luxury-rose-box", desc: "Premium preserved rose box with gold accents.", occasion: "vietnamese-womens-day", type: "boxes", colors: ["red", "pink"], stems: [12, 19, 25], price: 550000 },
  { title: "Teacher's Day Mixed Bouquet", handle: "teachers-day-mixed-bouquet", desc: "Grateful bouquet with carnations, roses, and daisies.", occasion: "teachers-day", type: "bouquets", colors: ["yellow", "white", "pink"], stems: [15, 25, 35], price: 300000 },
  { title: "Teacher's Day Carnation Basket", handle: "teachers-day-carnation-basket", desc: "Traditional carnation basket to show gratitude.", occasion: "teachers-day", type: "baskets", colors: ["red", "pink", "white"], stems: [20, 30, 40], price: 350000 },
  { title: "Teacher's Day Vase Arrangement", handle: "teachers-day-vase-arrangement", desc: "Elegant vase arrangement perfect for the classroom.", occasion: "teachers-day", type: "vases", colors: ["mixed", "yellow", "white"], stems: [15, 25, 35], price: 400000 },
  { title: "Mother's Day Pink Bouquet", handle: "mothers-day-pink-bouquet", desc: "Soft pink bouquet with roses, peonies, and carnations.", occasion: "mothers-day", type: "bouquets", colors: ["pink", "cream", "white"], stems: [18, 28, 38], price: 400000 },
  { title: "Mother's Day Flower Basket", handle: "mothers-day-flower-basket", desc: "Beautiful basket with her favorite garden flowers.", occasion: "mothers-day", type: "baskets", colors: ["mixed", "pink", "purple"], stems: [20, 30, 40], price: 450000 },
  { title: "Mother's Day Orchid Vase", handle: "mothers-day-orchid-vase", desc: "Elegant orchid arrangement in a ceramic vase.", occasion: "mothers-day", type: "vases", colors: ["white", "purple", "pink"], stems: [8, 12, 16], price: 600000 },
  { title: "Graduation Sunflower Bouquet", handle: "graduation-sunflower-bouquet", desc: "Bright sunflower bouquet to celebrate academic success.", occasion: "graduation", type: "bouquets", colors: ["yellow", "orange", "green"], stems: [10, 20, 30], price: 300000 },
  { title: "Graduation Mixed Basket", handle: "graduation-mixed-basket", desc: "Festive basket with bright blooms and graduation ribbon.", occasion: "graduation", type: "baskets", colors: ["mixed", "yellow", "blue"], stems: [15, 25, 35], price: 350000 },
  { title: "Graduation Bear & Flowers", handle: "graduation-bear-flowers", desc: "Adorable teddy bear with mini bouquet.", occasion: "graduation", type: "boxes", colors: ["mixed", "pink", "blue"], stems: [6, 10, 15], price: 400000 },
  { title: "Grand Opening Stand", handle: "grand-opening-stand", desc: "Impressive flower stand with congratulatory banner.", occasion: "grand-opening", type: "stands", colors: ["mixed", "red", "yellow"], stems: [40, 60, 80], price: 1200000 },
  { title: "Grand Opening Basket", handle: "grand-opening-basket", desc: "Large celebratory basket for business openings.", occasion: "grand-opening", type: "baskets", colors: ["mixed", "yellow", "red"], stems: [25, 40, 55], price: 650000 },
  { title: "Grand Opening Vase Arrangement", handle: "grand-opening-vase-arrangement", desc: "Premium vase arrangement for office grand opening.", occasion: "grand-opening", type: "vases", colors: ["mixed", "red", "gold"], stems: [20, 30, 40], price: 550000 },
  { title: "Apology Rose Bouquet", handle: "apology-rose-bouquet", desc: "Heartfelt roses to say you're sorry.", occasion: "apology", type: "bouquets", colors: ["pink", "white", "red"], stems: [12, 24, 36], price: 350000 },
  { title: "Apology Mixed Box", handle: "apology-mixed-box", desc: "Carefully arranged box with handwritten apology card.", occasion: "apology", type: "boxes", colors: ["white", "pink", "blue"], stems: [9, 16, 25], price: 400000 },
  { title: "Apology Orchid Pot", handle: "apology-orchid-pot", desc: "Elegant potted orchid with apology note.", occasion: "apology", type: "vases", colors: ["white", "purple"], stems: [5, 8, 12], price: 450000 },
  { title: "Get Well Bouquet", handle: "get-well-bouquet", desc: "Cheerful bouquet to brighten recovery days.", occasion: "get-well-soon", type: "bouquets", colors: ["yellow", "orange", "green"], stems: [12, 20, 30], price: 300000 },
  { title: "Get Well Basket", handle: "get-well-basket", desc: "Bright flower basket with get-well card.", occasion: "get-well-soon", type: "baskets", colors: ["mixed", "yellow", "pink"], stems: [15, 25, 35], price: 350000 },
  { title: "Get Well Potted Plant", handle: "get-well-potted-plant", desc: "Low-maintenance potted flowering plant.", occasion: "get-well-soon", type: "vases", colors: ["green", "white"], stems: [4, 6, 8], price: 350000 },
  { title: "Congratulations Bouquet", handle: "congratulations-bouquet", desc: "Vibrant celebration bouquet for any achievement.", occasion: "congratulations", type: "bouquets", colors: ["mixed", "yellow", "orange"], stems: [15, 25, 35], price: 350000 },
  { title: "Congratulations Basket", handle: "congratulations-basket", desc: "Festive congratulatory flower basket.", occasion: "congratulations", type: "baskets", colors: ["mixed", "red", "yellow"], stems: [18, 28, 38], price: 400000 },
  { title: "Thank You Bouquet", handle: "thank-you-bouquet", desc: "Grateful bouquet of mixed flowers.", occasion: "thank-you", type: "bouquets", colors: ["mixed", "yellow", "pink"], stems: [12, 20, 30], price: 300000 },
  { title: "Thank You Orchid", handle: "thank-you-orchid", desc: "Elegant orchid as token of appreciation.", occasion: "thank-you", type: "vases", colors: ["white", "purple"], stems: [4, 8, 12], price: 500000 },
  { title: "Sympathy White Lily Stand", handle: "sympathy-white-lily-stand", desc: "Dignified white lily condolence stand.", occasion: "sympathy-funeral", type: "stands", colors: ["white", "green"], stems: [30, 50, 70], price: 800000 },
  { title: "Funeral Wreath", handle: "funeral-wreath", desc: "Traditional funeral wreath with white and yellow flowers.", occasion: "sympathy-funeral", type: "wreaths", colors: ["white", "yellow"], stems: [25, 40, 55], price: 600000 },
  { title: "Condolence White Bouquet", handle: "condolence-white-bouquet", desc: "Simple, elegant white bouquet for condolences.", occasion: "sympathy-funeral", type: "bouquets", colors: ["white", "cream", "green"], stems: [12, 20, 30], price: 350000 },
  { title: "Dried Flower Bouquet", handle: "dried-flower-bouquet", desc: "Beautiful dried flower bouquet lasting for years.", occasion: "birthday", type: "dried-flowers", colors: ["cream", "brown", "pink"], stems: [12, 20, 30], price: 350000 },
  { title: "Preserved Rose Dome", handle: "preserved-rose-dome", desc: "Glass dome with preserved forever roses.", occasion: "anniversary", type: "dried-flowers", colors: ["red", "pink"], stems: [3, 5, 7], price: 500000 },
  { title: "Spring Garden Bouquet", handle: "spring-garden-bouquet", desc: "Garden-fresh spring bouquet with tulips and daffodils.", occasion: "birthday", type: "bouquets", colors: ["mixed", "yellow", "pink"], stems: [15, 25, 35], price: 350000 },
];

async function seedProds(container: MedusaContainer) {
  const productSvc: any = container.resolve(Modules.PRODUCT);
  const pricingSvc: any = container.resolve(Modules.PRICING);
  const remoteLink: any = container.resolve("remoteLink");

  const allCats: any[] = await productSvc.listProductCategories(
    {},
    { select: ["id", "handle"] }
  );
  const catByHandle = new Map(allCats.map((c: any) => [c.handle, c]));
  console.log(`Categories in DB: ${allCats.length}`);

  let created = 0;
  const priceLinks: any[] = [];

  for (const def of PRODS) {
    // Tet white-flower guard
    if (def.occasion === "tet-lunar-new-year" && def.colors.some((c) => WHITE.has(c.toLowerCase()))) {
      console.log(`  SKIP "${def.title}" — white flowers in Tet`);
      continue;
    }

    const occasionCat = catByHandle.get(def.occasion);
    const typeCat = catByHandle.get(def.type);
    if (!occasionCat || !typeCat) {
      console.log(`  SKIP "${def.title}" — missing category`);
      continue;
    }

    // Check existing
    const ex = await productSvc.listProducts({ handle: def.handle }, { take: 1 });
    if (ex.length > 0) {
      console.log(`  SKIP "${def.title}" already exists`);
      continue;
    }

    const product = await productSvc.createProducts({
      title: def.title,
      handle: def.handle,
      description: def.desc,
      status: "published",
      thumbnail: `https://placehold.co/600x600/F5F0E8/6B2737?text=${encodeURIComponent(def.title.substring(0, 20))}`,
      options: [{ title: "Tier", values: TIERS.map((t) => t.name) }],
      variants: TIERS.map((tier, i) => ({
        title: `${def.title} - ${tier.name}`,
        sku: `${def.handle}-${tier.name.toLowerCase()}`,
        manage_inventory: false,
        options: { Tier: tier.name },
      })),
      categories: [{ id: occasionCat.id }, { id: typeCat.id }],
      images: Array.from({ length: 6 }, (_, i) => ({
        url: `https://placehold.co/800x800/F5F0E8/6B2737?text=${encodeURIComponent(def.title.substring(0, 15))}+${i + 1}`,
      })),
    });

    // Create price sets and link to variants — use variant index for tier factor
    for (let tierIdx = 0; tierIdx < TIERS.length; tierIdx++) {
      const variant = product.variants[tierIdx];
      const amount = Math.round(def.price * TIERS[tierIdx].factor);
      const priceSet = await pricingSvc.createPriceSets({
        prices: [{ amount, currency_code: "vnd" }],
      });
      priceLinks.push({
        [Modules.PRODUCT]: { variant_id: variant.id },
        [Modules.PRICING]: { price_set_id: priceSet.id },
      });
    }

    console.log(`  Created: "${def.title}"`);
    created++;
  }

  // Batch link all prices
  if (priceLinks.length > 0) {
    await remoteLink.create(priceLinks);
    console.log(`\nLinked ${priceLinks.length} price sets to variants`);
  }

  console.log(`\nProduct seed: ${created} created`);

  // Link products to default sales channel
  const scSvc: any = container.resolve(Modules.SALES_CHANNEL);
  const scs = await scSvc.listSalesChannels({ name: "Default Sales Channel" }, { take: 1 });
  if (scs.length > 0) {
    const sc = scs[0];
    const prods: any[] = await productSvc.listProducts({}, { select: ["id"] });
    const scLinks = prods.map((p: any) => ({
      [Modules.PRODUCT]: { product_id: p.id },
      [Modules.SALES_CHANNEL]: { sales_channel_id: sc.id },
    }));
    await remoteLink.create(scLinks);
    console.log(`Linked ${prods.length} products to sales channel`);
  }
}
