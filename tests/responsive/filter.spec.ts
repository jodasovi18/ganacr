import { test, expect } from '@playwright/test';

// Requires seeded data (npm run seed) and a Firebase test account.
// Set TEST_EMAIL and TEST_PASSWORD env vars to your Firebase login credentials.
const TEST_EMAIL    = process.env.TEST_EMAIL    ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

test.describe('Arete filter', () => {
  test.setTimeout(30_000);

  test.beforeEach(async ({}, testInfo) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      testInfo.skip(true, 'Set TEST_EMAIL and TEST_PASSWORD env vars to run responsive filter tests.');
    }
  });

  async function login(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/');
  }

  test('shows search input and filters animal rows in real time', async ({ page }) => {
    await login(page);

    // Navigate to first lote
    await page.locator('.lote-card').first().click();
    await page.waitForURL(/\/lote\//);

    // Search input must be present
    const searchInput = page.locator('input.arete-search');
    await expect(searchInput).toBeVisible();

    // Count total animal rows in the table (table is always in DOM, even if CSS-hidden on mobile)
    const rows = page.locator('table tbody tr');
    const totalCount = await rows.count();
    expect(totalCount).toBeGreaterThan(0);

    // Get the arete from the first row
    const firstArete = (await rows.first().locator('td').first().innerText()).trim();

    // Filter to just that one animal
    await searchInput.fill(firstArete);
    await expect(rows).toHaveCount(1);
    const visibleArete = (await rows.first().locator('td').first().innerText()).trim();
    expect(visibleArete).toBe(firstArete);

    // Clear — all animals reappear
    await searchInput.fill('');
    await expect(rows).toHaveCount(totalCount);
  });

  test('shows empty-state when no animals match filter', async ({ page }) => {
    await login(page);

    await page.locator('.lote-card').first().click();
    await page.waitForURL(/\/lote\//);

    await page.locator('input.arete-search').fill('ZZZZ-NO-EXISTE');
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('table')).not.toBeVisible();
  });

  test('mobile cards are in the DOM when animals exist', async ({ page }) => {
    await login(page);

    await page.locator('.lote-card').first().click();
    await page.waitForURL(/\/lote\//);

    // .animals-cards is always in the DOM (CSS hides it on desktop, shows on mobile)
    // Wait for table rows to confirm data loaded (desktop viewport), then count cards from DOM
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const cards = page.locator('.animal-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Card count must equal table row count
    const rowCount = await page.locator('table tbody tr').count();
    expect(cardCount).toBe(rowCount);
  });
});
