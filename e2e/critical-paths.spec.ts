import { test, expect } from "@playwright/test";

test.describe("Bloom Wedding — E2E critical paths", () => {
  test("homepage loads with hero and occasions", async ({ page }) => {
    await page.goto("/vi");
    await expect(page.locator("h1")).toBeVisible();
    // Occasion grid renders
    await expect(page.locator('a[href^="/occasions/"]').first()).toBeVisible();
  });

  test("browse products page", async ({ page }) => {
    await page.goto("/vi/products");
    await expect(page.locator("h1")).toBeVisible();
    // Product cards render
    const productLinks = page.locator('a[href^="/products/"]');
    await expect(productLinks.first()).toBeVisible({ timeout: 10000 });
  });

  test("navigate to product detail", async ({ page }) => {
    await page.goto("/vi/products");
    // Click first product card
    const firstProduct = page.locator('a[href^="/products/"]').first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    const productUrl = await firstProduct.getAttribute("href");
    await firstProduct.click();
    // Verify product detail page loaded
    await expect(page.locator("h1")).toBeVisible();
    // Add to cart button visible
    await expect(page.getByText("Thêm vào giỏ hàng")).toBeVisible();
  });

  test("add to cart flow", async ({ page }) => {
    await page.goto("/vi/products");
    // Navigate to first product
    const firstProduct = page.locator('a[href^="/products/"]').first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    await firstProduct.click();

    // Wait for page to load
    await expect(page.getByText("Thêm vào giỏ hàng")).toBeVisible({ timeout: 10000 });

    // Click add to cart
    await page.getByText("Thêm vào giỏ hàng").click();

    // Cart drawer should open with checkout link
    await expect(page.getByRole("link", { name: /thanh toán|checkout/i })).toBeVisible({ timeout: 5000 });
  });

  test("checkout page loads from cart", async ({ page }) => {
    // First add item to cart
    await page.goto("/vi/products");
    const firstProduct = page.locator('a[href^="/products/"]').first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    await firstProduct.click();
    await expect(page.getByText("Thêm vào giỏ hàng")).toBeVisible({ timeout: 10000 });
    await page.getByText("Thêm vào giỏ hàng").click();

    // Navigate to checkout
    await expect(page.getByRole("link", { name: /thanh toán|checkout/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("link", { name: /thanh toán|checkout/i }).click();

    // Checkout page loaded
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("i18n — English pages load", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("h1")).toBeVisible();
    await page.goto("/en/products");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
  });

  test("sitemap returns XML", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
    const text = await response?.text();
    expect(text).toContain("<urlset");
    expect(text).toContain("bloomwedding.vn");
  });

  test("robots.txt returns correct rules", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
    const text = await response?.text();
    expect(text).toContain("User-agent");
  });
});
