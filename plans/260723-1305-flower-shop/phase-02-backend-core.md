# Phase 2: Backend Core + 50 Product Data

**Estimate:** 10-12h | **Depends on:** Phase 1

## 2.1 Database Setup

```bash
docker compose up -d
cd apps/backend
npx medusa db:create   # creates DB if not exists
pnpm migration:run      # runs MikroORM migrations
npx medusa user --email admin@bloomwedding.vn --password admin123 --name "Admin"
```

Verify tables exist:
```sql
-- product, product_variant, product_category, product_option,
-- cart, line_item, order, customer, region, etc.
```

## 2.2 Vietnam Region + Tax

### Seed region via Medusa API

```ts
// apps/backend/src/scripts/setup-region.ts
import { Medusa } from "@medusajs/js-sdk";

const client = new Medusa({
  baseUrl: "http://localhost:9000",
  apiKey: process.env.ADMIN_API_KEY!,
});

async function setupVietnamRegion() {
  // Create VND currency region
  const region = await client.admin.region.create({
    name: "Vietnam",
    currency_code: "vnd",
    countries: ["vn"],
    automatic_taxes: true,
    tax_rate: 10, // Default VAT
    tax_code: "VAT-10",
    includes_tax: true,
    payment_providers: [],   // Added in Phase 5
    fulfillment_providers: [], // Added in Phase 6
  });

  // Save admin API key for storefront
  await client.admin.store.update({
    default_region_id: region.id,
    default_currency_code: "vnd",
    default_sales_channel_id: "sc_01J...", // from seed
  });
}
```

### VAT Notes
- Default 10% VAT for non-agricultural goods
- Agricultural products may qualify for 5% or 0% VAT in VN — verify during implementation via a quick tax research spike
- For launch, use 10% — adjustable later without code changes
- Tax-inclusive pricing display is standard in VN

## 2.3 Category Tree (Seed Script)

```ts
// apps/backend/src/scripts/seed-categories.ts
import { Medusa } from "@medusajs/js-sdk";

interface CategoryInput {
  name: string;
  name_en: string;
  handle: string;
  description: string;
  description_en: string;
  is_active: boolean;
  children?: CategoryInput[];
}

const occasionCategories: CategoryInput[] = [
  {
    name: "Sinh Nhật",
    name_en: "Birthday",
    handle: "sinh-nhat",
    description: "Hoa tươi mừng sinh nhật — rực rỡ và đáng nhớ",
    description_en: "Fresh birthday flowers — vibrant and memorable",
    is_active: true,
  },
  {
    name: "Kỷ Niệm",
    name_en: "Anniversary",
    handle: "ky-niem",
    description: "Hoa kỷ niệm cho những khoảnh khắc đặc biệt",
    description_en: "Anniversary flowers for special moments",
    is_active: true,
  },
  {
    name: "Tình Yêu",
    name_en: "Love & Romance",
    handle: "tinh-yeu",
    description: "Hoa tình yêu lãng mạn cho người thương",
    description_en: "Romantic flowers for your loved one",
    is_active: true,
  },
  {
    name: "Chúc Mừng",
    name_en: "Congratulations",
    handle: "chuc-mung",
    description: "Hoa chúc mừng cho mọi dịp vui",
    description_en: "Congratulatory flowers for every joy",
    is_active: true,
    children: [
      {
        name: "Tốt Nghiệp",
        name_en: "Graduation",
        handle: "tot-nghiep",
        description: "Hoa chúc mừng tốt nghiệp",
        description_en: "Graduation celebration flowers",
        is_active: true,
      },
      {
        name: "Khai Trương",
        name_en: "New Business",
        handle: "khai-truong",
        description: "Hoa chúc mừng khai trương",
        description_en: "Grand opening flowers",
        is_active: true,
      },
      {
        name: "Tân Gia",
        name_en: "New Home",
        handle: "tan-gia",
        description: "Hoa mừng tân gia",
        description_en: "Housewarming flowers",
        is_active: true,
      },
    ],
  },
  {
    name: "Chia Buồn",
    name_en: "Sympathy",
    handle: "chia-buon",
    description: "Vòng hoa chia buồn trang trọng",
    description_en: "Respectful sympathy flowers",
    is_active: true,
  },
  {
    name: "Cảm Ơn",
    name_en: "Thank You",
    handle: "cam-on",
    description: "Hoa tri ân và cảm ơn",
    description_en: "Thank you and appreciation flowers",
    is_active: true,
  },
  {
    name: "Hoa Tết",
    name_en: "Tet Flowers",
    handle: "hoa-tet",
    description: "Hoa Tết Nguyên Đán — mai, đào, lan, cúc",
    description_en: "Lunar New Year flowers — apricot, peach, orchids",
    is_active: true,
    // NO white flowers in this category
  },
  {
    name: "Ngày Phụ Nữ",
    name_en: "Women's Day",
    handle: "ngay-phu-nu",
    description: "Hoa ngày 8/3 và 20/10",
    description_en: "Flowers for International & Vietnamese Women's Day",
    is_active: true,
  },
  {
    name: "Valentine",
    name_en: "Valentine's Day",
    handle: "valentine",
    description: "Hoa Valentine 14/2 lãng mạn",
    description_en: "Romantic Valentine's Day flowers",
    is_active: true,
  },
];

const typeCategories: CategoryInput[] = [
  {
    name: "Hoa Hồng",
    name_en: "Roses",
    handle: "hoa-hong",
    description: "Hoa hồng các loại — đỏ, hồng, trắng, mix",
    description_en: "Roses — red, pink, white, mixed",
    is_active: true,
  },
  {
    name: "Hoa Ly",
    name_en: "Lilies",
    handle: "hoa-ly",
    description: "Hoa ly thanh lịch và thơm ngát",
    description_en: "Elegant and fragrant lilies",
    is_active: true,
  },
  {
    name: "Hoa Lan",
    name_en: "Orchids",
    handle: "hoa-lan",
    description: "Hoa lan cao cấp các loại",
    description_en: "Premium orchids",
    is_active: true,
  },
  {
    name: "Hoa Cúc",
    name_en: "Chrysanthemums",
    handle: "hoa-cuc",
    description: "Hoa cúc tươi lâu và đa dạng",
    description_en: "Long-lasting chrysanthemums",
    is_active: true,
  },
  {
    name: "Bó Hoa Trộn",
    name_en: "Mixed Bouquets",
    handle: "bo-hoa-tron",
    description: "Bó hoa trộn nghệ thuật theo mùa",
    description_en: "Artisan mixed bouquets by season",
    is_active: true,
  },
  {
    name: "Giỏ Hoa",
    name_en: "Flower Baskets",
    handle: "gio-hoa",
    description: "Giỏ hoa sang trọng cho mọi dịp",
    description_en: "Elegant flower baskets",
    is_active: true,
  },
  {
    name: "Hoa Để Bàn",
    name_en: "Table Arrangements",
    handle: "hoa-de-ban",
    description: "Hoa để bàn tiệc, văn phòng, sự kiện",
    description_en: "Table flowers for events, offices",
    is_active: true,
  },
];

async function seed(adminClient: Medusa) {
  const topOccasion = await adminClient.admin.productCategory.create({
    name: "Dịp",
    handle: "occasions",
    is_active: true,
    is_internal: false,
  });
  const topType = await adminClient.admin.productCategory.create({
    name: "Loại Hoa",
    handle: "product-types",
    is_active: true,
    is_internal: false,
  });

  for (const cat of occasionCategories) {
    await createCategory(adminClient, cat, topOccasion.id);
  }
  for (const cat of typeCategories) {
    await createCategory(adminClient, cat, topType.id);
  }
}

async function createCategory(
  client: Medusa,
  input: CategoryInput,
  parentId: string
) {
  const cat = await client.admin.productCategory.create({
    ...input,
    parent_category_id: parentId,
    metadata: { name_en: input.name_en, description_en: input.description_en },
  });
  if (input.children) {
    for (const child of input.children) {
      await createCategory(client, child, cat.id);
    }
  }
}
```

## 2.4 Product Data (50 Products)

### Product Seed Format

```ts
// apps/backend/src/scripts/seed-products.ts

interface SeedProduct {
  title: string;
  title_en: string;
  handle: string;
  subtitle: string;
  description: string;
  description_en: string;
  occasion_handles: string[];      // Reference category handles
  type_handles: string[];          // Reference type category handles
  tiers: {                          // Variant definitions
    name: "Standard" | "Cao Cấp" | "Sang Trọng";
    name_en: "Standard" | "Premium" | "Deluxe";
    stem_count: number;
    price: number;                  // VND
    weight_grams: number;           // For GHN shipping
  }[];
  delivery_available: boolean;      // Same-day eligible
  care_tips: string[];              // Vietnamese
  care_tips_en: string[];           // English
  photo_match_percent: number;      // Default 90
  colors: string[];                 // [Đỏ, Hồng, Trắng] for search
  images: string[];                 // 6 Unsplash URLs
}

const ROSE_IMAGES = [
  "https://images.unsplash.com/photo-1548610786-...",
  "https://images.unsplash.com/photo-1548094990-...",
  "https://images.unsplash.com/photo-1559563362-...",
  "https://images.unsplash.com/photo-1526047932273-...",
  "https://images.unsplash.com/photo-1561181286-...",
  "https://images.unsplash.com/photo-1563241527-...",
];

const PRODUCTS: SeedProduct[] = [
  // ===== ROSES (10 products) =====
  {
    title: "Bó Hoa Hồng Đỏ Lãng Mạn",
    title_en: "Romantic Red Rose Bouquet",
    handle: "bo-hoa-hong-do-lang-man",
    subtitle: "Tình yêu nồng cháy",
    description: "Bó hoa hồng đỏ Ecuador 12/24/36 bông, gói trong giấy kraft sang trọng, kèm thiệp miễn phí.",
    description_en: "Ecuadorian red rose bouquet, 12/24/36 stems, wrapped in elegant kraft paper with a free greeting card.",
    occasion_handles: ["tinh-yeu", "ky-niem", "valentine"],
    type_handles: ["hoa-hong", "bo-hoa-tron"],
    tiers: [
      { name: "Standard", name_en: "Standard", stem_count: 12, price: 350000, weight_grams: 500 },
      { name: "Cao Cấp", name_en: "Premium", stem_count: 24, price: 550000, weight_grams: 900 },
      { name: "Sang Trọng", name_en: "Deluxe", stem_count: 36, price: 850000, weight_grams: 1300 },
    ],
    delivery_available: true,
    care_tips: ["Thay nước mỗi ngày", "Cắt gốc 45 độ", "Tránh ánh nắng trực tiếp", "Để nơi thoáng mát"],
    care_tips_en: ["Change water daily", "Trim stems at 45°", "Avoid direct sunlight", "Keep in cool area"],
    photo_match_percent: 90,
    colors: ["Đỏ"],
    images: ROSE_IMAGES,
  },
  {
    title: "Bó Hoa Hồng Hồng Dịu Dàng",
    title_en: "Soft Pink Rose Bouquet",
    handle: "bo-hoa-hong-hong-diu-dang",
    subtitle: "Thanh lịch và nữ tính",
    description: "Hoa hồng hồng pastel nhập khẩu, gói trong giấy lụa mềm mại.",
    description_en: "Pastel pink imported roses, wrapped in soft tissue paper.",
    occasion_handles: ["sinh-nhat", "ky-niem", "cam-on"],
    type_handles: ["hoa-hong", "bo-hoa-tron"],
    tiers: [
      { name: "Standard", name_en: "Standard", stem_count: 12, price: 380000, weight_grams: 500 },
      { name: "Cao Cấp", name_en: "Premium", stem_count: 24, price: 580000, weight_grams: 900 },
      { name: "Sang Trọng", name_en: "Deluxe", stem_count: 36, price: 880000, weight_grams: 1300 },
    ],
    delivery_available: true,
    care_tips: ["Thay nước mỗi ngày", "Cắt gốc 45 độ", "Tránh ánh nắng trực tiếp"],
    care_tips_en: ["Change water daily", "Trim stems at 45°", "Avoid direct sunlight"],
    photo_match_percent: 90,
    colors: ["Hồng"],
    images: PINK_ROSE_IMAGES,
  },
  // ... 48 more products: 8 more roses, 8 mixed, 6 lily, 6 orchid, 5 chrysanthemum,
  //     5 baskets, 5 table arrangements, 5 Tet-specific
];

// Seed function
async function seedProducts(client: Medusa) {
  const categoryMap = await buildCategoryMap(client); // handle → id

  for (const product of PRODUCTS) {
    // Create product with variants
    const created = await client.admin.product.create({
      title: product.title,
      handle: product.handle,
      subtitle: product.subtitle,
      description: product.description,
      is_giftcard: false,
      discountable: true,
      options: [
        {
          title: "Gói",
          values: product.tiers.map(t => t.name),
        },
      ],
      variants: product.tiers.map((tier, i) => ({
        title: `${tier.name} — ${tier.stem_count} bông`,
        options: { "Gói": tier.name },
        prices: [{ amount: tier.price, currency_code: "vnd" }],
        manage_inventory: true,
        inventory_quantity: 999,
        weight: tier.weight_grams,
        metadata: {
          tier: tier.name_en.toLowerCase(),
          stem_count: tier.stem_count,
          tier_name_en: tier.name_en,
        },
      })),
      images: product.images.map(url => ({ url })),
      categories: [
        ...product.occasion_handles.map(h => ({ id: categoryMap.get(h)! })),
        ...product.type_handles.map(h => ({ id: categoryMap.get(h)! })),
      ],
      metadata: {
        title_en: product.title_en,
        description_en: product.description_en,
        care_tips: JSON.stringify(product.care_tips),
        care_tips_en: JSON.stringify(product.care_tips_en),
        photo_match_percent: product.photo_match_percent,
        delivery_available: product.delivery_available,
        colors: JSON.stringify(product.colors),
      },
      tags: product.delivery_available
        ? [{ value: "same-day-delivery" }]
        : [],
    });
  }
}
```

### Product Variant Metadata Shape (used by storefront)

```ts
// Each variant carries this metadata:
interface VariantMetadata {
  tier: "standard" | "premium" | "deluxe";  // For tier selector
  stem_count: number;                         // For stem count display
  tier_name_en: string;                       // For EN locale display
  weight_grams: number;                       // For GHN shipping calc
}
```

## 2.5 Run Seed

```bash
cd apps/backend
pnpm seed   # runs seed-categories then seed-products
```

## Acceptance Criteria

- [ ] All 16+ occasion categories + 7 type categories exist
- [ ] 50+ products visible in Medusa admin
- [ ] Each product has 3 variants (tiers) with stem count
- [ ] Each product has categories assigned (occasion + type)
- [ ] Each product has 6 images
- [ ] No white flowers in Tet category
- [ ] Store API `/store/products` returns products with correct VND prices
- [ ] Store API `/store/product-categories` returns full tree
- [ ] Cart creation + adding product variant works via API
- [ ] VND region configured with 10% tax
