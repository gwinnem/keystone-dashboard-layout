import { expect, test } from '@playwright/test';
import { stableBoundingBox } from './helpers';

test.describe('Basic grid rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-basic').click();
  });

  test('renders every configured item', async ({ page }) => {
    await expect(page.locator('[data-grid-item-id="0"]')).toBeVisible();
    await expect(page.locator('[data-grid-item-id="1"]')).toBeVisible();
    await expect(page.locator('[data-grid-item-id="2"]')).toBeVisible();
  });

  test('positions items left-to-right in the same row, matching their configured x order', async ({ page }) => {
    // Layout: item "0" at x:0, "1" at x:3, "2" at x:6, all w:3/h:2/y:0 —
    // three equal-width items side by side in a single row.
    //
    // Bug fix: a real, confirmed flake, not a hypothetical — reading
    // `boundingBox()` immediately (no settling wait at all) occasionally
    // caught two items less than 1px apart on their own `y`, still just
    // outside `toBeCloseTo`'s own default 0.5px tolerance, on chromium
    // specifically (firefox/webkit happened not to hit the same narrow
    // timing window). `stableBoundingBox` (already used by every other
    // spec file in this suite for exactly this class of issue) waits
    // for a genuinely settled reading before any of these are compared.
    const box0 = await stableBoundingBox(page.locator('[data-grid-item-id="0"]'));
    const box1 = await stableBoundingBox(page.locator('[data-grid-item-id="1"]'));
    const box2 = await stableBoundingBox(page.locator('[data-grid-item-id="2"]'));
    expect(box0).not.toBeNull();
    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();

    // Same row: all three share (approximately) the same top.
    expect(box1!.y).toBeCloseTo(box0!.y, 0);
    expect(box2!.y).toBeCloseTo(box0!.y, 0);

    // Left-to-right order, matching x:0 < x:3 < x:6 — relative
    // comparison, not an absolute pixel value (see dynamic-items.spec.ts's
    // own comment on why relative assertions are the right call here).
    expect(box1!.x).toBeGreaterThan(box0!.x);
    expect(box2!.x).toBeGreaterThan(box1!.x);
  });
});
