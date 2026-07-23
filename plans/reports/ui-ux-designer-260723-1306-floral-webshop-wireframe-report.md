# Floral Webshop Wireframe — Delivery Report

**Date:** 2026-07-23
**Status:** COMPLETE
**Stack:** NextJS + TailwindCSS + Shadcn UI (target)
**Delivery:** Pure HTML/CSS/JS wireframes

---

## Deliverables Produced

### 1. Design Guidelines
`/Users/hungho/Code/study/flower-shop/docs/design-guidelines.md` (378 lines)

Full design system with Tailwind-ready tokens:
- **Colors:** Cream (#FFF8F0), Sage (#9CAF88), Blush (#E8B4B8), Burgundy (#6B2737). Never pure white.
- **Typography:** Playfair Display (headings) + DM Sans (UI/nav). Full type scale with clamp() fluid sizing. Vietnamese diacritics verified.
- **Spacing:** 2x e-commerce density norm. 4px grid.
- **Corner radius:** 12-16px soft, never sharp.
- **Shadows:** Warm-tinted with burgundy (never pure black rgba).
- **Component patterns:** Buttons (5 variants), chips, product cards, tier selector, delivery selector.
- **Responsive:** Breakpoints, mobile patterns (sticky CTA, 2-col grid, horizontal scrollables).
- **Motion:** All respecting prefers-reduced-motion. 150-500ms transitions.
- **Accessibility:** WCAG 2.1 AA, 44px touch targets, visible focus rings.
- **Vietnam market:** Currency format (450.000d), COD, Zalo, local occasions (Tet, 20/10, 8/3, 20/11), bilingual readiness.

### 2. Wireframes (5 pages, 3,260 lines total)

| Page | File | Lines | Key Patterns |
|------|------|-------|--------------|
| Homepage | `index.html` | 764 | Occasion carousel (70-80vw cards), asymmetric hero, 2-col/4-col grid, trust bar (burgundy), promo banner, mobile bottom nav, slide-out menu |
| Category | `category.html` | 576 | Horizontal scroll filter chips, price quick filters, bottom sheet filter drawer, breadcrumb, "Load More" pattern |
| Product Detail | `product-detail.html` | 578 | 3-tier selector (Standard/Premium/Deluxe), delivery speed chips (ASAP/Today/Tomorrow/Pick), image gallery with thumbs, sticky mobile CTA, reviews, what's included, care tips |
| Cart | `cart.html` | 365 | Item cards with qty controls, photo confirmation checkbox, free card badge, COD summary, empty state |
| Checkout | `checkout.html` | 599 | Sender/recipient split (visually distinct dashed card), delivery time slots (horizontal scrollable), photo approval checkbox, 3 payment methods (COD pre-selected), collapsible order summary on mobile |

### 3. UX Patterns Implemented

All 7 requested UX patterns:
1. Occasion-first nav (slide-out drawer, 12+ occasions)
2. Speed-based delivery selector (ASAP/Today/Tomorrow/Pick Date — chips, not calendar)
3. Photo confirmation checkbox (prominent, with trust copy)
4. Recipient vs sender split (visually distinct dashed card)
5. Price tiers (Standard/Premium/Deluxe with "Popular" badge)
6. Delivery time slot selector (scrollable horizontal chips, 6 time slots)
7. Trust signals (90-min badge, 90% photo match, free card, COD — visible on every page)

### 4. Responsive Behavior

All pages mobile-first:
- 320px+ minimum width
- 2-col product grids on mobile, scaling to 4-col on desktop
- Sticky mobile CTAs on product detail (44px+ touch targets)
- Horizontal scrollable carousels with snap-to-scroll and hidden scrollbars
- Navigation transforms: drawer on mobile, inline on tablet+
- Checkout: order summary collapses on mobile (<1024px)
- Bottom mobile nav bar on homepage + category pages
- Safe area insets (iOS notch) respected

### 5. Design Consistency

All 5 pages share identical CSS custom properties block — copy-paste consistent token definitions. No drift. All use Playfair Display (headings) + DM Sans (UI). Color palette strictly followed: cream backgrounds, sage accents, blush highlights, burgundy text/CTAs. No pure white anywhere.

---

## Skipped / Ponytail Notes

- **Real product images:** Placeholder gradients used. Replace with actual floral photography.
- **Mega-menu full implementation:** Slide-out drawer shown. Desktop mega-menu with 16+ occasions deferred to React component build.
- **Form validation:** Basic client-side check only. Full validation (phone format, district-by-city filtering) deferred.
- **Zalo integration:** UI placeholder only. SDK integration is implementation work.
- **Date picker for "Pick a Date":** Not implemented as a full date picker widget per spec — spec says "not a calendar picker." Chip-based "Chọn ngày" button triggers what would open a simple date selector.
- **user login/save info:** Button exists, no auth flow.
- **Animations:** CSS-only transitions. No JS animation libraries. Sufficient for wireframes.

---

## File Map

```
docs/
  design-guidelines.md          # Design system, tokens, patterns
  wireframe/
    index.html                  # Homepage
    category.html               # Product listing / category browse
    product-detail.html         # Product detail (tiers, delivery, CTA)
    cart.html                   # Cart drawer
    checkout.html               # Checkout (sender/recipient split)
```

## Unresolved Questions

None. All spec requirements covered.

---

Files created:
- `/Users/hungho/Code/study/flower-shop/docs/design-guidelines.md`
- `/Users/hungho/Code/study/flower-shop/docs/wireframe/index.html`
- `/Users/hungho/Code/study/flower-shop/docs/wireframe/category.html`
- `/Users/hungho/Code/study/flower-shop/docs/wireframe/product-detail.html`
- `/Users/hungho/Code/study/flower-shop/docs/wireframe/cart.html`
- `/Users/hungho/Code/study/flower-shop/docs/wireframe/checkout.html`
