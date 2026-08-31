import { expect, test } from '@playwright/test';
import { stableBoundingBox } from './helpers';

test.describe('Layout tools & feedback (edge cases)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-advanced-features').click();
    await expect(page.locator('[data-grid-item-id="0"]')).toHaveClass(/kdl-grid-item--draggable/);
  });

  test('dragging item "0" onto the static "wall" item is blocked when preventCollision is on, and fires the feedback event', async ({ page }) => {
    await page.getByTestId('toggle-prevent-collision').check();

    const item = page.locator('[data-grid-item-id="0"]');
    const wall = page.locator('[data-grid-item-id="wall"]');
    const itemBefore = await stableBoundingBox(item);
    const wallBox = await stableBoundingBox(wall);
    expect(itemBefore).not.toBeNull();
    expect(wallBox).not.toBeNull();

    await page.mouse.move(itemBefore!.x + itemBefore!.width / 2, itemBefore!.y + itemBefore!.height / 2);
    await page.mouse.down();
    await page.mouse.move(wallBox!.x + wallBox!.width / 2, wallBox!.y + wallBox!.height / 2, { steps: 12 });
    await page.mouse.up();

    await page.waitForTimeout(300);
    const itemAfter = await item.boundingBox();
    expect(itemAfter!.x).not.toBeCloseTo(wallBox!.x, 0);

    await expect(page.getByTestId('blocked-feedback')).toContainText('last: "0"');
    await expect(page.getByTestId('blocked-feedback')).not.toContainText('Blocked moves: 0');
  });

  test('compactor input: a custom compactor replaces the built-in logic entirely — items settle downward instead of up', async ({ page }) => {
    await page.getByTestId('toggle-custom-compactor').check();

    const item0 = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item0);
    expect(before).not.toBeNull();

    await page.getByTestId('compact-now').click();

    await expect.poll(async () => (await item0.boundingBox())!.y).toBeGreaterThan(before!.y);
  });

  test('undo()/redo(): dragging an item, then undo, restores its pre-drag position; redo restores the drag', async ({ page }) => {
    const item0 = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item0);
    expect(before).not.toBeNull();

    await expect(page.getByTestId('undo-button')).toBeDisabled();

    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width / 2 + 150, before!.y + before!.height / 2, { steps: 12 });
    await page.mouse.up();

    await expect.poll(async () => (await item0.boundingBox())!.x).toBeGreaterThan(before!.x);
    const afterDrag = await stableBoundingBox(item0);
    expect(afterDrag).not.toBeNull();

    await expect(page.getByTestId('undo-button')).toBeEnabled();
    await page.getByTestId('undo-button').click();

    await expect.poll(async () => (await item0.boundingBox())!.x).toBeCloseTo(before!.x, 0);

    await expect(page.getByTestId('redo-button')).toBeEnabled();
    await page.getByTestId('redo-button').click();

    await expect.poll(async () => (await item0.boundingBox())!.x).toBeCloseTo(afterDrag!.x, 0);
    await expect(page.getByTestId('redo-button')).toBeDisabled();
  });

  test('compactNow() re-packs a layout that drifted apart with compactType set to NONE', async ({ page }) => {
    // compactType:NONE means a drag doesn't auto-compact on every tick
    // (unlike the default VERTICAL, which would already pull the item
    // right back up during the drag itself, leaving nothing for
    // compactNow() to actually do) — dragging "growable" down leaves a
    // real gap above it, exactly the scenario compactNow() exists for.
    await page.getByTestId('select-compact-type').selectOption('none');
    await page.setViewportSize({ width: 1280, height: 1400 });
    const growable = page.locator('[data-grid-item-id="growable"]');
    const before = await stableBoundingBox(growable);
    expect(before).not.toBeNull();

    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2 + 200, { steps: 12 });
    await page.mouse.up();

    await expect.poll(async () => (await growable.boundingBox())!.y).toBeGreaterThan(before!.y);
    const scattered = await growable.boundingBox();

    await page.getByTestId('compact-now').click();

    await expect.poll(async () => (await growable.boundingBox())!.y).toBeLessThan(scattered!.y);
  });

  test('duplicateItem adds a new item with a "-copy" suffixed id', async ({ page }) => {
    const items = page.locator('[data-grid-item-id]');
    const initialCount = await items.count();

    await page.getByTestId('duplicate-item').click();

    await expect(items).toHaveCount(initialCount + 1);
    await expect(page.locator('[data-grid-item-id="0-copy"]')).toBeVisible();
  });

  test('snapToGrid magnetically aligns a dragged item with another item\'s edge', async ({ page }) => {
    await page.getByTestId('toggle-snap-to-grid').check();

    const item = page.locator('[data-grid-item-id="0"]');
    const wall = page.locator('[data-grid-item-id="wall"]');
    const itemBefore = await stableBoundingBox(item);
    const wallBox = await stableBoundingBox(wall);
    expect(itemBefore).not.toBeNull();
    expect(wallBox).not.toBeNull();

    await page.mouse.move(itemBefore!.x + itemBefore!.width / 2, itemBefore!.y + itemBefore!.height / 2);
    await page.mouse.down();
    await page.mouse.move(wallBox!.x + itemBefore!.width / 2 + 5, itemBefore!.y + itemBefore!.height / 2, { steps: 12 });
    await page.mouse.up();

    await page.waitForTimeout(300);
    const itemAfter = await item.boundingBox();
    expect(itemAfter!.x).toBeCloseTo(wallBox!.x, 0);
  });

  test('saving and loading a preset restores a previous layout', async ({ page }) => {
    await page.getByTestId('save-preset-compact').click();
    await expect(page.getByTestId('load-preset-compact')).toBeVisible();

    await page.getByTestId('duplicate-item').click();
    const items = page.locator('[data-grid-item-id]');
    const changedCount = await items.count();

    await page.getByTestId('load-preset-compact').click();

    await expect(items).toHaveCount(changedCount - 1);
  });

  test('autoHeight actually grows the item as its content grows, not just visually clip/overflow', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="growable"]');
    const boxBefore = await item.boundingBox();

    const growButton = page.getByTestId('grow-content');
    for(let i = 0; i < 15; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await growButton.click();
    }
    await page.waitForTimeout(300);

    const boxAfter = await item.boundingBox();
    expect(boxAfter!.height).toBeGreaterThan(boxBefore!.height);
  });

  test('showGridLines toggle renders visible column/row gridlines behind the items', async ({ page }) => {
    // Bug fix, in this test itself: `.kdl-grid-lines` (and its own
    // `::before` pseudo-element carrying the actual gridline pattern)
    // is bound on `GridLayoutComponent`'s own *inner* `<div #container>`
    // — confirmed via a direct source read — not on the `.kdl-grid-layout`
    // host element itself (which is what `data-testid`/class selectors
    // from *outside* the component naturally reach first). Querying the
    // host's own `::before` was always going to read "none": the host
    // never has this pseudo-element at all, regardless of the toggle's
    // own state. `> div` reaches the real, load-bearing inner element,
    // the same fix already applied to this fixture's own cross-grid/
    // external-drop CSS for the identical reason.
    const grid = page.locator('.kdl-grid-layout > div').first();
    const bgBefore = await grid.evaluate(el => getComputedStyle(el, `::before`).backgroundImage);
    expect(bgBefore).toBe(`none`);

    await page.getByTestId('toggle-show-grid-lines').check();

    const bgAfter = await grid.evaluate(el => getComputedStyle(el, `::before`).backgroundImage);
    expect(bgAfter).toContain(`linear-gradient`);
  });
});
