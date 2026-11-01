import { expect, test, type Locator, type Page } from '@playwright/test';
import { stableBoundingBox } from './helpers';

const itemOf = (page: Page, id: string): Locator => page.locator(`[data-grid-item-id="${id}"]`);

/**
 * These tests never call `focus()` themselves, on purpose: Safari/WebKit does not focus a button on click, so Escape only
 * reaches the grid if the maximize button focuses itself. The other two browsers focus it either way.
 */
test.describe('Maximize: focus and Escape', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-maximize').click();
    await expect(itemOf(page, '0')).toHaveClass(/kdl-grid-item--draggable/);
  });

  test('the maximize button takes focus when it is clicked', async ({ page }) => {
    const item = itemOf(page, '1');
    await stableBoundingBox(item);

    await item.locator('.btn-maximize').click();

    await expect(item).toHaveClass(/kdl-grid-item--maximized/);
    await expect(item.locator('.btn-maximize')).toBeFocused();
  });

  test('Escape restores right after a click maximized the item', async ({ page }) => {
    const item = itemOf(page, '2');
    const before = await stableBoundingBox(item);
    await item.locator('.btn-maximize').click();
    await expect(item).toHaveClass(/kdl-grid-item--maximized/);
    await expect.poll(async () => (await item.boundingBox())!.width).toBeGreaterThan(before!.width);

    await page.keyboard.press('Escape');

    await expect(item).not.toHaveClass(/kdl-grid-item--maximized/);
    await expect(itemOf(page, '0')).toBeVisible();
    await expect.poll(async () => (await item.boundingBox())!.width).toBeCloseTo(before!.width, 0);
  });

  test('the button keeps focus when a second click restores the item', async ({ page }) => {
    const item = itemOf(page, '0');
    await stableBoundingBox(item);
    await item.locator('.btn-maximize').click();
    await expect(item).toHaveClass(/kdl-grid-item--maximized/);

    await item.locator('.btn-maximize').click();

    await expect(item).not.toHaveClass(/kdl-grid-item--maximized/);
    await expect(item.locator('.btn-maximize')).toBeFocused();
  });

  test('Escape does nothing while nothing is maximized', async ({ page }) => {
    const item = itemOf(page, '1');
    const before = await stableBoundingBox(item);
    await item.locator('.btn-maximize').focus();

    await page.keyboard.press('Escape');

    await expect(item).not.toHaveClass(/kdl-grid-item--maximized/);
    expect((await item.boundingBox())!.width).toBeCloseTo(before!.width, 0);
  });
});
