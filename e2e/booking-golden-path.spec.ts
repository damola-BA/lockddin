import { test, expect } from "@playwright/test";

// The golden path (BUILD_PLAN M8): a client books an appointment end to end
// on a provider's public page. Requires a running app and a seeded provider
// with availability; pass the slug via E2E_SLUG.
const SLUG = process.env.E2E_SLUG ?? "diagprovider";

test("client books an appointment end to end", async ({ page }) => {
  await page.goto(`/b/${SLUG}`);

  // Service step (multi-select): pick the first service, then continue.
  const firstService = page.locator("button", { hasText: /min/ }).first();
  await firstService.click();
  await page.getByRole("button", { name: /Continue/ }).click();

  // Slot picker: tap the first available time chip (HH:MM).
  const firstSlot = page.locator("button", { hasText: /^\d{2}:\d{2}$/ }).first();
  await expect(firstSlot).toBeVisible();
  await firstSlot.click();

  // Details step (hold placed): email is the only identity field now (DD39).
  await page.fill("input[name=first_name]", "Golden");
  await page.fill("input[name=email]", "golden@example.com");
  await page.getByRole("button", { name: /Confirm/ }).click();

  // Confirmation screen.
  await expect(page.getByText(/booked|confirmed/i)).toBeVisible();
  await expect(page.getByText(/Confirmation sent/i)).toBeVisible();
});
