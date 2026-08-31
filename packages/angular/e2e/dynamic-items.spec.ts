import { expect, test } from '@playwright/test';
import { stableBoundingBox } from './helpers';

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
    // Asserts the *relative* offset between item "0" and item "3", not
    // an absolute page coordinate — a real, confirmed bug this exact
    // pattern already caught once in the React port's own equivalent
    // test (packages/react/e2e/dynamic-items.spec.ts): an absolute
    // threshold silently baked in an assumption about the fixture's own
    // page layout (nav bar height, button placement), which has nothing
    // to do with the grid's own compaction behavior. Comparing two
    // items' own bounding boxes against each other sidesteps that
    // entirely.
    const box0 = await stableBoundingBox(page.locator('[data-grid-item-id="0"]'));
    expect(box0).not.toBeNull();

    await page.getByTestId('add-item').click();
    await page.getByTestId('add-item').click();
    await page.getByTestId('add-item').click();

    await expect(page.locator('[data-grid-item-id="1"]')).toBeVisible();
    await expect(page.locator('[data-grid-item-id="2"]')).toBeVisible();
    await expect(page.locator('[data-grid-item-id="3"]')).toBeVisible();

    // Bug fix: a real, confirmed flake, not a hypothetical — a plain
    // `.boundingBox()` read caught item "3" still 10px short of its own
    // final, settled position (CSS transition still in progress at the
    // moment of measurement — see `.kdl-grid-item`'s own `transition:
    // ... transform ...` rule), consistently enough to fail on every
    // browser. `stableBoundingBox` (already used by every other spec
    // file in this suite for exactly this class of issue) waits for a
    // genuinely settled reading instead.
    const box3 = await stableBoundingBox(page.locator('[data-grid-item-id="3"]'));
    expect(box3).not.toBeNull();
    // Item "3" is the fourth item stacked in the same x:0..3 column
    // range, each h:2 — three full item-heights (rowHeight + margin,
    // per grid row) below item "0".
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
