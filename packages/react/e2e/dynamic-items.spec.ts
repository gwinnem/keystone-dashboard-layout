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
    // Real, confirmed bug in this test itself, not in the library: this
    // used to assert `box3!.y` (an absolute, viewport-relative page
    // coordinate) against a hardcoded `< 500` threshold — which never
    // accounted for this fixture's own real page layout (App.tsx's own
    // 11-button scenario nav, plus this scenario's own two "Add item"/
    // "Remove item" buttons, both rendered *above* the grid itself).
    // Even the tightest possible in-grid compaction for a 4th stacked
    // item (h: 2 each, rowHeight: 80, default margin [10, 10]) already
    // lands at 550px *within the grid alone* — over the old 500px
    // threshold before the page's own nav/button offset is even added,
    // which is what actually produced the real, observed ~680px and
    // failed this assertion on every browser (confirmed via a live CI
    // run: chromium/firefox/webkit all failed identically). Fixed the
    // same way the Vue port's own equivalent test already does
    // (`vue/e2e/dynamic-items.spec.ts`): assert the *relative* offset
    // between two items' own bounding boxes, which is completely
    // independent of wherever the grid happens to sit on the page.
    const box0 = await page.locator('[data-grid-item-id="0"]').boundingBox();
    expect(box0).not.toBeNull();

    await page.getByTestId('add-item').click();
    await page.getByTestId('add-item').click();
    await page.getByTestId('add-item').click();

    await expect(page.locator('[data-grid-item-id="1"]')).toBeVisible();
    await expect(page.locator('[data-grid-item-id="2"]')).toBeVisible();
    await expect(page.locator('[data-grid-item-id="3"]')).toBeVisible();

    // Each new item was pushed in at y: Infinity — vertical compaction
    // (the default compactType) should have pulled every one of them
    // up into a real, finite row directly below the previous one, not
    // left floating with a gap below it. Item "3" is the fourth item
    // stacked in the same x: 0..3 column range, each with h: 2 — three
    // full item-heights (rowHeight + margin, per grid row) below item
    // "0", not an absolute page position.
    const box3 = await page.locator('[data-grid-item-id="3"]').boundingBox();
    expect(box3).not.toBeNull();
    const expectedDeltaPerItem = 2 * (80 + 10); // h: 2 rows, rowHeight: 80, margin: 10
    expect(box3!.y - box0!.y).toBeCloseTo(3 * expectedDeltaPerItem, 0);
  });

  test('removing an item removes it from the rendered grid', async ({ page }) => {
    await page.getByTestId('add-item').click();
    await expect(page.locator('[data-grid-item-id="1"]')).toBeVisible();

    await page.getByTestId('remove-item').click();

    await expect(page.locator('[data-grid-item-id="1"]')).toHaveCount(0);
    await expect(page.locator('[data-grid-item-id="0"]')).toBeVisible();
  });
});
