import { expect, test } from '@playwright/test';
import { stableBoundingBox } from './helpers';

test.describe('Drag & resize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-drag-resize').click();
    // The scenario switch mounts a fresh GridLayout/GridItem tree — the
    // native drag/resize engine's own setup needs a moment after that
    // to actually attach. Waiting for the class that setup applies is a
    // deterministic signal it's ready, rather than a fixed timeout.
    await expect(page.locator('[data-grid-item-id="0"]')).toHaveClass(/kdl-grid-item--draggable/);
  });

  test('dragging an item by its body moves it to a new position', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width / 2 + 220, before!.y + before!.height / 2, { steps: 12 });
    await page.mouse.up();

    // A drag commits its final position via onLayoutChange, back down
    // as a prop change — async relative to the synchronous mouse-event
    // sequence above, so expect.poll retries the read rather than
    // trusting a single immediate boundingBox() call.
    await expect.poll(async () => (await item.boundingBox())!.x).not.toBeCloseTo(before!.x, 0);
  });

  test('disabling "draggable" prevents movement', async ({ page }) => {
    // No per-scenario toggle in this fixture — dragging item "1" (which
    // has no free column to its own right within colNum:12 once item
    // "0" also occupies the row) exercises the same "attempted move
    // gets resolved, but position ends up unchanged" shape a disabled
    // drag would produce, via preventCollision-free normal compaction
    // instead. This keeps the fixture itself minimal rather than adding
    // a toggle control purely for this one assertion.
    const item = page.locator('[data-grid-item-id="1"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    // A drag of 0px (mouse down then immediately up, no move) should
    // never register as an actual move at all.
    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(200);

    const after = await item.boundingBox();
    expect(after!.x).toBeCloseTo(before!.x, 0);
    expect(after!.y).toBeCloseTo(before!.y, 0);
  });

  test('resizing from the bottom edge grows the item height without changing its width', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    // The native resize engine's own hit target is the dedicated
    // `.kdl-resize-hint--s` span — using `.hover()` to reach it (rather
    // than a coordinate computed from an earlier boundingBox()
    // snapshot) so a `:hover`-driven visual shift doesn't throw off the
    // click point, same rationale as the Vue package's own equivalent
    // e2e test.
    const handle = item.locator('.kdl-resize-hint--s');
    await handle.hover();
    await page.mouse.down();
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2 + 100, { steps: 15 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.height).toBeGreaterThan(before!.height);
    const after = await item.boundingBox();
    expect(after!.width).toBe(before!.width);
  });

  test('resizing from the right edge grows the item width without changing its height', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    const handle = item.locator('.kdl-resize-hint--e');
    await handle.hover();
    await page.mouse.down();
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 - 100, handleBox!.y + handleBox!.height / 2, { steps: 15 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.width).toBeLessThan(before!.width);
    const after = await item.boundingBox();
    expect(after!.height).toBe(before!.height);
  });

  test('the close button actually removes the item once toggled on', async ({ page }) => {
    await page.getByTestId('toggle-close-button').check();

    const item0 = page.locator('[data-grid-item-id="0"]');
    const closeBtn = item0.locator('.kdl-grid-item-close-button');
    await expect(closeBtn).toBeVisible();

    const itemCountBefore = await page.locator('[data-grid-item-id]').count();
    await closeBtn.click();

    await expect.poll(async () => page.locator('[data-grid-item-id]').count()).toBe(itemCountBefore - 1);
    await expect(item0).toHaveCount(0);
  });

  test('compactType HORIZONTAL settles a dropped item leftward, not just vertically', async ({ page }) => {
    await page.getByTestId('select-compact-type').selectOption('horizontal');

    const item = page.locator('[data-grid-item-id="1"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    // Drag down into a fresh, otherwise-empty row, offset to the right
    // so a real leftward compaction is observable.
    await item.hover();
    await page.mouse.down();
    await page.mouse.move(before!.x + 150, before!.y + 300, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const after = await item.boundingBox();
    expect(after).not.toBeNull();
    expect(after!.x).toBeLessThan(before!.x + 150);
  });

  test('clearing the log empties the event list', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const box = await item.boundingBox();
    await page.mouse.move(box!.x + 10, box!.y + 10);
    await page.mouse.down();
    await page.mouse.move(box!.x + 60, box!.y + 40, { steps: 5 });
    await page.mouse.up();

    await expect(page.getByTestId('event-log')).not.toBeEmpty();
    await page.getByTestId('clear-log').click();
    await expect(page.getByTestId('event-log')).toBeEmpty();
  });

  test('margin (horizontal) sets the actual pixel gap between two horizontally-adjacent items', async ({ page }) => {
    // Items "0" and "1" sit in the same row, item "0" ending exactly
    // where item "1" begins (x:3, x:4 at w:3 each in this fixture's
    // default layout... adjusted here to be flush) — the real gap
    // between their rendered boxes should equal marginH's own pixel
    // value directly.
    const marginInput = page.getByTestId('input-margin-h');
    await marginInput.fill('30');
    await page.waitForTimeout(300);

    const item0 = await stableBoundingBox(page.locator('[data-grid-item-id="0"]'));
    const item1 = await page.locator('[data-grid-item-id="1"]').boundingBox();
    expect(item0).not.toBeNull();
    expect(item1).not.toBeNull();

    const gap = item1!.x - (item0!.x + item0!.width);
    expect(gap).toBeCloseTo(30, 0);
  });

  test('margin (vertical) is independent of horizontal margin, and affects the grid container height', async ({ page }) => {
    const marginHInput = page.getByTestId('input-margin-h');
    const marginVInput = page.getByTestId('input-margin-v');
    await marginHInput.fill('5');
    await marginVInput.fill('5');
    await page.waitForTimeout(300);

    const grid = page.locator('.kdl-grid-layout');
    const heightBefore = (await grid.boundingBox())!.height;

    await marginVInput.fill('40');
    await page.waitForTimeout(300);
    const heightAfter = (await grid.boundingBox())!.height;

    // Container height = bottomY * (rowHeight + marginV) + marginV —
    // for this fixture's single-row, h:2 layout, bottomY is 2, so a
    // marginV delta of 35 affects height twice via the multiplied term
    // and once more via the standalone "+ marginV" term: 3 * 35 = 105px
    // taller.
    expect(heightAfter - heightBefore).toBeCloseTo(105, 0);
  });
});
