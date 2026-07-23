# Phase 7 Testing Guide

## Prerequisites

```bash
docker compose up -d
pnpm dev
```

Open `http://localhost:8000`.

## Cart Testing

### 1. Add to Cart

Navigate to any product detail page. Trigger `useAddToCart` (typically via an "Add to Cart" button).

**Verify:**
- Cart badge appears in header with correct count
- `medusa_cart_id` present in localStorage (DevTools Application tab)
- Network: POST to `/store/carts/.../line-items` returns 200

### 2. Cart Drawer

Click the cart icon in header.

**Verify:**
- Items render with thumbnail, title, variant name, unit price
- Quantity counter shows correct count
- Subtotal, shipping ("Calculated at checkout"), and total display
- Badge count in header matches item count in drawer

### 3. Quantity Increment/Decrement

Click plus and minus buttons on a cart item.

**Verify:**
- Quantity updates immediately
- Subtotal recalculates
- Minus button disabled when quantity reaches 1
- Item removed from drawer when quantity goes to 0

### 4. Remove Item

Click the trash icon on a cart item.

**Verify:**
- Toast shows "Da xoa san pham"
- Item vanishes from drawer
- Badge count updates
- If last item removed, empty state with "Browse Occasions" link appears

### 5. Empty Cart State

Remove all items from cart.

**Verify:**
- Shopping bag icon with muted styling
- "Browse Occasions" link navigates to `/products`

### 6. Cart Persistence

Add items to cart. Close the browser tab. Reopen `localhost:8000`.

**Verify:**
- Cart still loads with same items
- Badge count correct
- `medusa_cart_id` in localStorage matches previous value

## Checkout Testing

### 1. Navigate

With items in cart, click "Thanh toan" button in cart drawer.

**Verify:**
- Lands on `/checkout`

### 2. Step 1 -- Shipping Address

Fill in all shipping fields:
- Name, phone, email
- Street address
- District (text input), province (text input)

Click "Tiep tuc."

**Verify:**
- Form data preserved
- Advances to payment step

### 3. Step 2 -- Payment

Select payment method (COD/VNPay/Momo). Select delivery time. Optionally enter card message (max 100 chars).

Click "Tiep tuc."

**Verify:**
- Selected method highlighted
- Advances to review step

### 4. Step 3 -- Review

**Verify:**
- Summary shows correct shipping address
- Items list matches cart
- Subtotal/total match cart drawer
- Payment method displayed
- Delivery time displayed
- Card message displayed if entered

### 5. Place Order

Click "Dat hang."

**Verify:**
- COD: order completes, success state or redirect
- VNPay/Momo: redirects to payment gateway

### 6. Edge Cases

**Guest checkout:**
- Log out (or use incognito window)
- Add items to cart
- Go through checkout
- Order should complete without requiring login

**Auth checkout:**
- Log in first
- Add items to cart
- Shipping form should pre-fill customer name/email if available
- Order history should appear in account area after purchase

**Empty cart checkout:**
- Navigate to `/checkout` with no items in cart
- Should redirect or show "cart is empty" message

## Key Architecture Notes

- Cart uses `currency_code: "vnd"` -- Medusa auto-assigns default region
- Cart ID stored in `localStorage` under `medusa_cart_id`
- Cart auto-expires after 7 days on the Medusa server
- `useClearCart` only clears localStorage (no server-side delete -- SDK has no `cart.delete` method)
- `useCustomer` returns null on 401 (not authenticated), throws on other errors
- COD orders call `cart.complete` directly; gateway payments create a payment session first

## What Is NOT Yet Implemented

The plan in `plans/260723-1305-flower-shop/phase-07-storefront-full.md` specifies additional
components not in the current codebase:

- **AddressAutocomplete** -- province/district/ward cascading selects (current: plain text inputs)
- **DeliveryTimeStep** -- zone-based time slots with 5pm cutoff
- **RecipientToggle** -- "send to self" vs "someone else" form switch
- **CardMessageInput** -- 100-char counter with preview
- **PhotoConfirmation** -- checkbox for pre-delivery photo
- **OrderSummarySidebar** -- desktop sidebar during checkout
- **Zod schema validation** -- form schema with inline Vietnamese error messages
- **Account page** -- order history with status badges
- **Seasonal banner** -- upcoming occasion with countdown
- **Search** -- Cmd+K with diacritics-insensitive Vietnamese
- **Optimistic updates** -- `useUpdateCartItem` lacks `onMutate` rollback logic in the plan spec

Test what exists before building the missing pieces.
