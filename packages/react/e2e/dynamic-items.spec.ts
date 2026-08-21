import { expect, test } from '@playwright/test';

test.describe('Dynamic items (add/remove)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-dynamic').click();
  });

  test('adding an item renders it in the grid', async ({ page }) => {
    await expect(page.locator('[data-grid-item-id="0"]')).toBeVisible();
    await expect(page.locator('[data-grid-item-id="1"]')).toHaveCount(0);

    await page.getByTestId('add-item').click();

    await expect(page.locator('[data-grid-item-id="1"]')).toBeVisible();
  });

  test('adding several items compacts each new one into place (y: Infinity placement convention)', async ({ page }) => {
    await page.getByTestId('add-item').click();
    await page.getByTestId('add-item').click();
    await page.getByTestId('add-item').click();

    await expect(page.locator('[data-grid-item-id="1"]')).toBeVisible();
    await expect(page.locator('[data-grid-item-id="2"]')).toBeVisible();
    await expect(page.locator('[data-grid-item-id="3"]')).toBeVisible();

    // Each new item was pushed in at y: Infinity — vertical compaction
    // (the default compactType) should have pulled every one of them
    // up into a real, finite row, not left floating far below.
    const box3 = await page.locator('[data-grid-item-id="3"]').boundingBox();
    expect(box3).not.toBeNull();
    expect(box3!.y).toBeLessThan(500);
  });

  test('removing an item removes it from the rendered grid', async ({ page }) => {
    await page.getByTestId('add-item').click();
    await expect(page.locator('[data-grid-item-id="1"]')).toBeVisible();

    await page.getByTestId('remove-item').click();

    await expect(page.locator('[data-grid-item-id="1"]')).toHaveCount(0);
    await expect(page.locator('[data-grid-item-id="0"]')).toBeVisible();
  });
});
