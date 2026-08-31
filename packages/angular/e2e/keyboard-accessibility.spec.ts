import { expect, test } from '@playwright/test';
import { stableBoundingBox } from './helpers';

test.describe('Keyboard accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-keyboard').click();
    await expect(page.locator('[data-grid-item-id="0"]')).toHaveClass(/kdl-grid-item--draggable/);
  });

  test('a focused, draggable item moves one grid unit per arrow key press', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    await item.focus();
    await page.keyboard.press('ArrowRight');

    await expect.poll(async () => (await item.boundingBox())!.x).toBeGreaterThan(before!.x);
  });

  test('Shift+arrow resizes a focused, resizable item by one grid unit', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    await item.focus();
    await page.keyboard.press('Shift+ArrowRight');

    await expect.poll(async () => (await item.boundingBox())!.width).toBeGreaterThan(before!.width);
  });

  test('the item is reachable via Tab (not just programmatic .focus())', async ({ page }) => {
    await page.keyboard.press('Tab');
    // The nav's own "basic"/"drag-resize"/etc. buttons come first in
    // DOM order — Tab enough times to reach the grid item itself,
    // rather than assuming a specific tab-stop count that would break
    // if the nav's own button count ever changes.
    const item = page.locator('[data-grid-item-id="0"]');
    let reachedItem = false;
    for(let i = 0; i < 10; i += 1) {
      const focused = await page.evaluate(() => document.activeElement?.getAttribute(`data-grid-item-id`));
      if(focused === `0`) {
        reachedItem = true;
        break;
      }
      await page.keyboard.press('Tab');
    }
    expect(reachedItem).toBe(true);
    await expect(item).toBeFocused();
  });

  test('a non-arrow key press does not move or resize the item', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    await item.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    const after = await item.boundingBox();
    expect(after!.x).toBeCloseTo(before!.x, 0);
    expect(after!.y).toBeCloseTo(before!.y, 0);
    expect(after!.width).toBe(before!.width);
    expect(after!.height).toBe(before!.height);
  });
});
