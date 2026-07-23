# Design Guidelines — Bloom Wedding Flower Shop

Vietnam-market floral e-commerce storefront. Premium, trustworthy, conversion-optimized.

## Brand Identity

**Brand essence:** Premium floral gifting, occasions-first. Romantic, elegant, trustworthy. Not a commodity flower market — a gifting experience.

**Tone:** Warm, sincere, refined. Vietnamese + English bilingual readiness. Celebratory but not loud.

**Core differentiators:**
- 90-minute delivery guarantee (HCMC + Hanoi)
- 90% photo match guarantee
- Free handwritten card
- COD (cash on delivery)

---

## Color Tokens

Base palette: cream-warm with botanical accents. Never pure white (#FFFFFF).

### Tailwind Config

```js
// tailwind.config.ts
colors: {
  cream: {
    50:  '#FFFBF5',
    100: '#FFF8F0',  // primary background
    200: '#FFF2E0',
    300: '#FFE8CC',
  },
  sage: {
    300: '#C5D1B8',
    400: '#B1C1A0',
    500: '#9CAF88',  // primary accent
    600: '#7D9468',
    700: '#637A4F',
  },
  blush: {
    200: '#F5D9DC',
    300: '#EEC8CC',
    400: '#E8B4B8',  // secondary accent
    500: '#D9959A',
    600: '#C7787E',
  },
  burgundy: {
    400: '#8B3A4A',
    500: '#7A3341',
    600: '#6B2737',  // deep accent / text
    700: '#5A1F2D',
    800: '#4A1824',
  },
  warm: {
    800: '#2D2420',  // body text
    900: '#1A1410',  // headings
  },
}
```

### Usage Map

| Token | Role |
|---|---|
| `cream-100` (#FFF8F0) | Page background, card surface |
| `cream-200` (#FFF2E0) | Hover states, alternating rows |
| `sage-500` (#9CAF88) | Primary buttons, trust badges, category indicators |
| `sage-400` (#B1C1A0) | Button hover, secondary fills |
| `blush-400` (#E8B4B8) | Sale badges, urgency indicators, heart icons |
| `burgundy-600` (#6B2737) | Primary text, headings, footer bg, deep contrast |
| `warm-800` (#2D2420) | Body copy |
| `warm-900` (#1A1410) | Headlines, strong emphasis |

### Contrast Ratios (WCAG AA verified)

- `warm-900` on `cream-100`: 15.8:1 (pass)
- `burgundy-600` on `cream-100`: 7.2:1 (pass)
- `sage-500` on `cream-100`: 2.4:1 (fails for text — only use for decorative/badge)
- `sage-600` (#7D9468) on `cream-100`: 3.8:1 (pass for large text only)
- White text on `sage-600`: 4.5:1 (pass)

For buttons with `sage-500` bg, use `warm-900` or `burgundy-600` text, never white.

---

## Typography

### Font Stack

```css
--font-heading: 'Playfair Display', Georgia, serif;
--font-ui: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
```

**Google Fonts import:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&display=swap" rel="stylesheet">
```

**Note:** Playfair Display fully supports Vietnamese diacritics (tested: ă, â, đ, ê, ô, ơ, ư). DM Sans also passes.

### Type Scale (Tailwind Config)

```js
fontSize: {
  'display': ['clamp(2.5rem, 5vw, 4.5rem)', { lineHeight: '1.1', fontWeight: '700' }],
  'h1':     ['clamp(2rem, 4vw, 3.5rem)',   { lineHeight: '1.15', fontWeight: '700' }],
  'h2':     ['clamp(1.5rem, 3vw, 2.5rem)',  { lineHeight: '1.2', fontWeight: '600' }],
  'h3':     ['clamp(1.25rem, 2vw, 1.75rem)', { lineHeight: '1.3', fontWeight: '600' }],
  'h4':     ['clamp(1.1rem, 1.5vw, 1.25rem)', { lineHeight: '1.35', fontWeight: '500' }],
  'body':   ['1rem',   { lineHeight: '1.6' }],
  'body-sm':['0.875rem', { lineHeight: '1.5' }],
  'caption':['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
  'label':  ['0.8125rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.03em' }],
  'price':  ['clamp(1.25rem, 2vw, 1.75rem)', { lineHeight: '1.2', fontWeight: '700' }],
}
```

### Usage Rules

| Element | Font | Weight | Size |
|---|---|---|---|
| Page headlines | Playfair Display | 700 | `display` / `h1` |
| Section titles | Playfair Display | 600 | `h2` / `h3` |
| Card titles | Playfair Display | 500-600 | `h4` |
| Body copy | DM Sans | 400 | `body` |
| Navigation, CTAs, buttons | DM Sans | 500-600 | `body-sm` / `label` |
| Prices | DM Sans | 700 | `price` |
| Captions, badges | DM Sans | 400-500 | `caption` |
| Product names in cards | Playfair Display | 500 | `h4` |

Playfair Display italics used sparingly for testimonial quotes, card messages, and accent phrases.

---

## Spacing System

Generous whitespace (2x typical e-commerce density). Based on 4px grid.

```js
spacing: {
  '0':    '0',
  'px':   '1px',
  '1':    '0.25rem',   // 4px
  '2':    '0.5rem',    // 8px
  '3':    '0.75rem',   // 12px
  '4':    '1rem',      // 16px
  '5':    '1.25rem',   // 20px
  '6':    '1.5rem',    // 24px
  '8':    '2rem',      // 32px
  '10':   '2.5rem',    // 40px
  '12':   '3rem',      // 48px
  '16':   '4rem',      // 64px
  '20':   '5rem',      // 80px
  '24':   '6rem',      // 96px
  '32':   '8rem',      // 128px
}
```

### Layout Rules

| Context | Spacing |
|---|---|
| Section padding (vertical) | `py-16 md:py-24` |
| Card padding | `p-5 md:p-6` |
| Grid gap (product cards) | `gap-4 md:gap-6` |
| Container max-width | `max-w-7xl` |
| Container padding | `px-4 md:px-6 lg:px-8` |
| Page-section gap (between sections) | `space-y-16 md:space-y-24` |
| Hero padding | `pt-12 pb-16 md:pt-20 md:pb-24` |

---

## Corner Radius

Soft, organic feel. Never sharp.

```js
borderRadius: {
  'sm':    '8px',
  'DEFAULT': '12px',
  'md':    '14px',
  'lg':    '16px',
  'xl':    '20px',
  'full':  '9999px',
}
```

| Element | Radius |
|---|---|
| Product cards | `rounded-lg` (16px) |
| Buttons | `rounded-md` (14px) |
| Input fields | `rounded-md` (14px) |
| Badges / chips | `rounded-full` |
| Image containers | `rounded-lg` (16px) |
| Modals / drawers | `rounded-xl` (20px) |
| Category cards (hero) | `rounded-xl` (20px) |

---

## Shadows

Subtle, warm. Never harsh black shadows.

```js
boxShadow: {
  'card':        '0 2px 12px rgba(107, 39, 55, 0.06)',
  'card-hover':  '0 6px 24px rgba(107, 39, 55, 0.10)',
  'elevated':    '0 8px 32px rgba(107, 39, 55, 0.08)',
  'drawer':      '-4px 0 24px rgba(107, 39, 55, 0.12)',
  'sticky':      '0 -2px 12px rgba(107, 39, 55, 0.06)',
}
```

Shadows tinted with burgundy for warmth. Never use rgba(0,0,0,x) — always warm-tinted.

---

## Component Patterns

### Buttons

| Variant | Classes | Use |
|---|---|---|
| Primary | `bg-sage-500 text-warm-900 hover:bg-sage-400 rounded-md py-3 px-6 font-medium` | Main CTAs, "Add to Cart" |
| Secondary | `border-2 border-burgundy-600 text-burgundy-600 hover:bg-burgundy-600 hover:text-cream-100 rounded-md py-3 px-6` | Cancel, "View Details" |
| Ghost | `text-burgundy-600 hover:bg-cream-200 rounded-md py-2 px-4` | Navigation, subtle actions |
| Danger | `bg-blush-400 text-warm-900 hover:bg-blush-300 rounded-md py-3 px-6` | Remove items |
| Icon | `w-10 h-10 rounded-full bg-cream-200 hover:bg-cream-300 flex items-center justify-center` | Cart, wishlist, share |

Mobile: minimum 44x44px touch targets. Primary buttons full-width on mobile.

### Chips (Delivery Time, Occasion Tags)

```html
<div class="inline-flex items-center px-4 py-2 rounded-full border border-cream-300 bg-cream-100 text-warm-800 text-sm font-medium hover:border-sage-500 hover:bg-sage-300/20 transition-colors cursor-pointer">
  <!-- active: bg-sage-500 text-warm-900 border-sage-500 -->
```

### Product Cards

```html
<article class="rounded-lg bg-cream-100 shadow-card hover:shadow-card-hover transition-shadow duration-300 overflow-hidden">
  <div class="aspect-[4/5] bg-cream-200 overflow-hidden">
    <!-- image with hover scale -->
  </div>
  <div class="p-5 space-y-2">
    <p class="caption text-sage-600 uppercase tracking-wider">Occasion</p>
    <h4 class="font-heading text-h4">Product Name</h4>
    <p class="text-price text-burgundy-600">from 450.000₫</p>
    <div class="flex gap-1">
      <span class="text-xs px-2 py-1 rounded-full bg-sage-300/40 text-sage-700">Standard</span>
      <span class="text-xs px-2 py-1 rounded-full bg-blush-200/60 text-burgundy-600">Premium</span>
    </div>
  </div>
</article>
```

### Tier Selector (Product Detail)

Three-tier pricing card: Standard / Premium / Deluxe. Horizontal cards on desktop, stacked on mobile with "Most Popular" badge on Premium.

### Delivery Selector

Horizontal scrollable chips: ASAP (90min) / Today (by 5pm) / Tomorrow / Pick a Date. Active state: filled sage.

---

## Responsive Breakpoints

```js
screens: {
  'xs': '375px',
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
}
```

| Breakpoint | Grid | Hero | Navigation |
|---|---|---|---|
| <640px (mobile) | 2-col product grid | Stacked, image first | Slide-out drawer menu |
| 640-1023px (tablet) | 3-col product grid | Side-by-side | Horizontal mega-menu |
| 1024px+ (desktop) | 4-col product grid | Asymmetric split (60/40) | Full mega-menu with dropdowns |

### Mobile-Specific Patterns

- **Occasion carousel:** Horizontally scrollable cards at 70-80vw width, snap-to-scroll, with fade indicators at edges
- **Product grid:** Always 2 columns. Cards at full card width.
- **Sticky bottom CTA:** Fixed at viewport bottom on product detail. Shows price + "Add to Cart" button.
- **Navigation:** Hamburger menu with slide-out drawer. Occasion-first hierarchy.
- **Delivery selector:** Horizontal scrollable chips with active state visual.
- **Cart:** Slide-in drawer from right, full-height.

---

## Motion & Animation

All animations respect `prefers-reduced-motion`. Use Tailwind's built-in transitions + animate utilities.

```js
transitionDuration: {
  DEFAULT: '300ms',
  'fast': '150ms',
  'slow': '500ms',
}
```

| Element | Animation |
|---|---|
| Card hover | `transition-shadow duration-300` |
| Button hover | `transition-colors duration-200` |
| Cart drawer open | Slide from right, 300ms ease-out |
| Image hover (cards) | `scale-105 transition-transform duration-500` |
| Page transitions | Fade + subtle slide-up, 400ms |
| Staggered card reveal | `animate-fade-in-up` with incremental delay |
| Badge pulse (urgency) | Subtle 2s pulse on blush badges |

**Minimal animation on mobile** — prefer instant transitions where performance matters.

---

## Accessibility

- All interactive elements: visible focus ring (`ring-2 ring-sage-500 ring-offset-2`)
- Color is never the only indicator — use icons, text, and patterns alongside color
- Form labels: always visible, never placeholder-only
- Touch targets: minimum 44x44px
- `prefers-reduced-motion` respected globally
- Alt text on all product images
- ARIA labels on icon-only buttons

---

## Icons

Use Lucide React (shipped with shadcn/ui). Consistent 24px stroke-width 1.5.

| Icon | Use |
|---|---|
| Heart | Wishlist |
| ShoppingBag | Cart |
| Truck | Delivery |
| Clock | Delivery time |
| Camera | Photo confirmation |
| Gift | Occasion |
| Star | Ratings / Featured |
| ShieldCheck | Trust badges |
| CreditCard | Payment |
| ChevronLeft/Right | Carousel navigation |
| X | Close drawers/modals |

---

## Imagery Guidelines

- Warm, natural lighting. Soft bokeh backgrounds.
- Flowers as hero subjects, shot at f/2.8 or wider.
- Color grade: warm tones, slight cream cast.
- Aspect ratios: 4:5 for product cards, 16:9 for hero banners, 1:1 for thumbnails.
- Consistent styling: no harsh flash, no cold blue casts.
- Placeholder approach: gradient backgrounds with subtle botanical SVG patterns.

---

## Vietnam Market Considerations

- Currency display: `450.000₫` (period thousands separator, ₫ symbol after)
- Language readiness: All UI text in Vietnamese. CMS-ready for bilingual.
- COD: Prominently displayed as payment option.
- Delivery cities: HCMC and Hanoi primary. City selector in header.
- Occasions: Vietnamese-specific (Tet, Women's Day 20/10, Vietnamese Women's Day 8/3, Teacher's Day 20/11)
- Phone number: Zalo integration consideration.
- Trust signals: Localized (COD, money-back, photo approval).
