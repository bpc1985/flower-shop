# Flower E-Commerce UX Design Patterns: Research Report

**Context:** Floral e-commerce storefront targeting Vietnam market.
**Date:** 2026-07-23
**Sources analyzed:** Bloom & Wild (UK), BloomsyBox (US), FlowerCorner.vn (VN), Flowwow (global marketplace), 1-800-Flowers (US).

---

## 1. Occasion-Based Browsing (THE primary navigation pattern)

Every successful flower shop organizes by **occasion first, product type second**. This is the single most important UX pattern.

**Pattern: Occasion mega-menu as primary nav (Bloom & Wild, 1-800-Flowers)**
- The top-level nav lists 16+ life events: Birthdays, Anniversary, Sympathy, Get Well, New Home, Congratulations, New Baby, Thank You, Wedding, "Just Because", "Treat Myself", Romantic.
- Product type (Roses, Lilies, Mixed Bouquets) is secondary navigation, tucked under a "Flowers" submenu.
- BloomsyBox puts "Birthday" and "Next Day Delivery" as top-level nav items alongside product categories.
- **Actionable:** Homepage hero should say "Shop by Occasion" with 6-8 grid tiles. Product type filters live on category pages, not the homepage.

**Pattern: Occasion reminder capture (Bloom & Wild)**
- "Add 3 occasion reminders to unlock 5 GBP credit" -- captures future intent and drives repeat purchases.
- **Actionable:** Add a "Set a Reminder" CTA in the nav or after checkout. Birthday, Anniversary, Women's Day 20/10, Tet.

## 2. Flower-Specific UX Patterns

**Delivery Date Picker Pattern**
- Bloom & Wild uses a "Available soonest" sort filter (`sortType=delivery-date`) with next-day delivery as a filter, NOT an inline calendar picker. This avoids date-picker complexity.
- FlowerCorner.vn promotes "giao nhanh trong 90p" (90-min delivery) -- speed is a headline feature, not a filter.
- Flowwow has a persistent city/delivery-time input at the top of every page (geo-targeted).
- **Actionable:** Do NOT use a generic date picker. Use a "Delivery Speed" selector: ASAP / Today / Tomorrow / Pick a Date. ASAP and Today are the default options. Full calendar optional.

**Same-Day Delivery Indicators**
- FlowerCorner: "Giao nhanh trong 90p" is a trust badge on the logo area.
- BloomsyBox: "Next Day Delivery" is its own nav item.
- **Actionable:** Show a sticky banner on product pages: "Order within XX:XX for delivery today." Show delivery window on the product card (not just the PDP).

**Photo Confirmation (Vietnam-specific)**
- FlowerCorner.vn offers "chup va gui hinh hoa de duyet truoc khi giao" (photo for approval before delivery). This is a VN trust signal.
- Flowwow also offers "Photo before delivery" as a checkable option at checkout.
- **Actionable:** Add a checkbox at checkout: "Send me a photo for approval before delivery." This is table stakes for VN market credibility.

**Recipient vs. Sender Flow**
- Standard pattern: Add to cart -> Checkout asks "Is this for you or someone else?" -> Separate recipient name, phone, address, card message fields.
- Bloom & Wild embeds this in checkout. They also sell greeting cards separately ("The card shop" with 12 occasion types).
- **Actionable:** Separate sender/recipient forms in checkout. Include a card message textarea (50-100 char limit) with preview. Option to add a physical card for upsell.

**Flower Care Instructions**
- Industry pattern: Include a small care card image or accordion on the PDP and in the delivery confirmation email.
- **Actionable:** 3-5 bullet care tips on the product page (not a separate page). "Change water daily. Keep away from direct sunlight. Trim stems at 45 degrees."

**Custom Bouquets**
- No major player offers full customization. Bouquets are pre-designed by florists. The "custom" pattern is selecting a price tier (FlowerCorner has tiered options like "Extra" upgrades).
- **Actionable:** Offer price tiers (Standard / Premium / Deluxe) per bouquet design rather than a build-your-own tool. Simpler, higher conversion.

## 3. Elegant Aesthetic Design Reference

**Color Palettes (flower-specific)**
- Soft blush / dusty rose (#E8B4B8, #D4A5A5) + sage green (#9CAF88) + cream (#FFF8F0) + deep burgundy accent (#6B2737).
- Avoid pure white backgrounds -- use warm off-white/cream (#FFF8F0 or #FAF5EF) to feel organic.
- Accent colors come from flower photography (pink, lavender, yellow, coral) -- let product photography provide the vibrancy.
- Dark mode alternative: Deep forest green (#1A3A2A) background with warm cream text.

**Typography Recommendations (NOT Inter or Poppins)**

| Role | Font | Why |
|------|------|-----|
| Headings (display) | **Playfair Display** (serif) | Elegant, high contrast, floral/editorial feel. Used by premium beauty and floral brands. |
| Subheadings / Accents | **Cormorant Garamond** (serif) | Lighter, more delicate than Playfair. Excellent for price displays and pull quotes. |
| Body text | **Lora** (serif) or **EB Garamond** (serif) | Warm, readable serif body. Avoid sans-serif for floral -- it reads cold/tech. |
| UI / Navigation | **DM Sans** (sans-serif) | Clean, geometric, pairs well with serif headings. Use only for functional UI (nav, buttons, prices). |

Fallback pairing: Playfair Display (headings) + DM Sans (UI).

**Layout Patterns**
- Generous whitespace (2x typical e-commerce padding). Floral feels cramped easily.
- Asymmetric hero layouts (image left, text right) rather than centered hero.
- Soft rounded corners on product cards (12-16px radius), subtle drop shadows.
- Product images should be soft-edged cutouts on cream backgrounds, not hard box crops.
- Background textures: subtle watercolor or linen textures if budget allows.

## 4. Mobile-First Flower Shopping

**Pattern: Swipeable bouquet carousels**
- Bloom & Wild uses horizontal scroll sections on mobile ("Summer occasions", "Trending"). Each card is a wide image + price + name.
- **Actionable:** Horizontal scroll for "Shop by Occasion" on mobile. Each card is 70-80vw wide so the next card peeks in. This signals swipeability.

**Pattern: Visual-heavy product grids**
- 2-column grid on mobile. Images are 70% of the card height. Text overlay or minimal card text (name, price, delivery badge).
- Filter bar collapses to a "Filter" button at the top (modal drawer on tap).
- Product images should load progressive JPEG or WebP with low-quality placeholder (LQIP) -- floral photography is data-heavy.

**Pattern: Thumb-friendly checkout**
- Bloom & Wild's top bar: hamburger, logo, search, account, favourites, cart -- all in the thumb zone (bottom nav on native app, top bar on mobile web).
- Sticky "Add to Cart" button on PDP that scrolls with the page.
- One-hand fields: large input targets, select dropdowns for delivery time slots (not freeform text).

**Pattern: Delivery time slot selection**
- Flowwow and FlowerCorner use time windows: "7:00-9:00", "9:00-11:00", "11:00-13:00", etc.
- Show only available time slots. Grey out and disable past/full slots.
- **Actionable:** On mobile, show time slots as horizontally scrollable chips below the date selector.

## 5. Vietnam-Specific Flower Shopping Behavior

**Peak Occasions (calendar)**

| Occasion | Date | Flower Type | Notes |
|----------|------|-------------|-------|
| Tet (Lunar New Year) | Jan/Feb (movable) | Yellow apricot blossoms, peach blossoms, Phalaenopsis orchids | Biggest flower season. Homes + offices decorated. Gifting is mandatory. |
| Vietnamese Women's Day | 20 October | Roses, lilies, mixed bouquets | Official women's day. Gift giving is expected. |
| International Women's Day | 8 March | Red roses, pink bouquets | Smaller than 20/10 but still significant. |
| Valentine's Day | 14 February | Red roses | Growing in urban areas but smaller than Tet. |
| Graduation season | May-June | Sunflowers, mixed bright bouquets | Students gift flowers at ceremonies. |
| Teacher's Day | 20 November | Chrysanthemums, lilies | Students give flowers to teachers. |
| Ghost Month (Thang Co Hon) | August (movable) | Incense, fake flowers | NOT a flower gifting period. Avoid promotions. |

**Key Vietnam-Specific Expectations**
- **Delivery speed is the #1 differentiator.** FlowerCorner promises 90-minute delivery. "Giao nhanh trong X phut" should be visible everywhere.
- **Photo confirmation** before delivery is a trust signal (explained above).
- **90% matching guarantee** -- FlowerCorner promises flowers are "dep va 90% giong nhu hinh" (beautiful and 90% match the photo). This sets customer expectations and manages returns.
- **Free inner-city delivery** is expected in major cities (HCMC, Hanoi, Da Nang).
- **Free greeting card** included with every order (FlowerCorner pattern).
- **Cash on delivery (COD)** is still widely expected in Vietnam. Must offer COD alongside card/bank transfer.
- **Zalo integration** -- Zalo is Vietnam's dominant messaging app. A "Share on Zalo" button and Zalo customer support are expected.
- **Pricing display** -- Show price in VND with "d" or "d" suffix. No decimals (VND has no sub-units). Round to nearest thousand.
- **Tet specific:** Yellow and red are lucky colors. Avoid white flowers in Tet arrangements (white is for funerals). Mai vang (yellow apricot) and hoa dao (peach blossom) are the Tet essentials.

## Summary: Architectural Recommendations

| Element | Recommendation |
|---------|---------------|
| Primary navigation | Occasion-based mega-menu (16+ events). |
| Secondary navigation | Product type filters on category pages only. |
| Delivery selector | Speed-first: ASAP / Today / Tomorrow / Date. Not a date picker. |
| Mobile layout | Horizontal occasion carousel (80vw cards). 2-col product grid. |
| Checkout flow | Sender/recipient split. Card message. Photo approval checkbox. COD option. |
| Color palette | Cream (#FFF8F0), sage (#9CAF88), blush (#E8B4B8), deep burgundy accent. |
| Typography | Playfair Display (headings) + DM Sans (UI). |
| Trust signals | 90-min delivery badge. Photo approval. 90% match guarantee. Free card. |

**Unresolved Questions:**
- What payment gateway handles COD + bank transfer + card in Vietnam cleanly? (OnePay, VNPay, MoMo?)
- What is the actual delivery radius / SLA for same-day delivery in HCMC? This constrains the time slot UI.
- Zalo Mini App vs. mobile web vs. native app -- which distribution strategy for VN users?
