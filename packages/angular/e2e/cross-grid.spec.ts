import { expect, test } from '@playwright/test';
import { stableBoundingBox } from './helpers';

test.describe('allowCrossGridDrag', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-cross-grid').click();
    await expect(page.locator('[data-grid-item-id="a0"]')).toHaveClass(/kdl-grid-item--draggable/);
  });

  test('dragging an item from grid A into grid B moves it there — removed from A, appears in B', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="a0"]');
    const itemBox = await stableBoundingBox(item);
    expect(itemBox).not.toBeNull();

    // Target grid B's own *actual* rendered `.kdl-grid-layout` element,
    // not the wrapping `cross-grid-b` div — grid B starts empty
    // (layoutB: []), and heightMode's own default ('auto') computes an
    // empty grid's height as 0-ish, collapsing the real grid to a
    // sliver at the top of the wrapping div. Dropping at the wrapping
    // div's own vertical center would land below the real grid's own
    // hit area entirely.
    const gridBRoot = page.getByTestId('cross-grid-b').locator('.kdl-grid-layout');
    const gridBBox = await gridBRoot.boundingBox();
    expect(gridBBox).not.toBeNull();

    await page.mouse.move(itemBox!.x + itemBox!.width / 2, itemBox!.y + itemBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      gridBBox!.x + gridBBox!.width / 2,
      gridBBox!.y + Math.max(gridBBox!.height / 2, 20),
      { steps: 15 },
    );
    await page.mouse.up();

    // "removed from grid A" needs to be checked scoped to grid A
    // specifically, not globally — the item still exists on the page
    // once it moves into grid B, so an unscoped locator would find it
    // regardless of which grid it's actually in.
    await expect(page.getByTestId('cross-grid-a').locator('[data-grid-item-id="a0"]')).toHaveCount(0);
    const movedItem = page.getByTestId('cross-grid-b').locator('[data-grid-item-id="a0"]');
    await expect(movedItem).toBeVisible();
  });

  test('a drag that stays within grid A the whole time does not move it to grid B', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="a0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width / 2 + 40, before!.y + before!.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect(page.locator('[data-grid-item-id="a0"]')).toBeVisible();
    await expect(page.getByTestId('cross-grid-b').locator('[data-grid-item-id="a0"]')).toHaveCount(0);
  });

  test('a static item has a permanently lower z-index, so a dragged item stays visible above it', async ({ page }) => {
    const dragged = page.locator('[data-grid-item-id="a0"]');
    const locked = page.locator('[data-grid-item-id="locked"]');

    const draggedZ = await dragged.evaluate(el => getComputedStyle(el).zIndex);
    const lockedZ = await locked.evaluate(el => getComputedStyle(el).zIndex);

    expect(Number(lockedZ)).toBeLessThan(0);
    expect(draggedZ === `auto` || Number(draggedZ) > Number(lockedZ)).toBe(true);
  });

  test('a static item stays visually paintable even when the grid container has its own background', async ({ page }) => {
    const grid = page.getByTestId('cross-grid-a').locator('.kdl-grid-layout');
    await grid.evaluate(el => {
      (el as HTMLElement).style.background = `red`;
    });

    const locked = page.locator('[data-grid-item-id="locked"]');
    // Bug fix: a real, confirmed flake, not a hypothetical — reading
    // `boundingBox()` immediately after navigation occasionally caught
    // "locked" and "a0" still sharing the exact same transient position
    // (both items' own CSS transform not yet settled to their final,
    // distinct grid-unit positions), making this test's own center-point
    // check ambiguous between the two. `stableBoundingBox` (already used
    // elsewhere in this same file) waits for a genuinely settled reading
    // first.
    const box = await stableBoundingBox(locked);
    const centerX = box!.x + box!.width / 2;
    const centerY = box!.y + box!.height / 2;

    const paintedTag = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest('[data-grid-item-id="locked"]') ? `static-item` : (el?.className ?? `unknown`);
    }, { x: centerX, y: centerY });

    expect(paintedTag).toBe(`static-item`);
  });

  test('dragging "a0" out to grid B then back lands it in the gap above the static "locked" item, not pushed below it (bin-pack, not push-and-compact)', async ({ page }) => {
    const itemA = page.locator('[data-grid-item-id="a0"]');
    const boxA = await stableBoundingBox(itemA);
    const gridBRoot = page.getByTestId('cross-grid-b').locator('.kdl-grid-layout');
    const gridBBox = await gridBRoot.boundingBox();

    await page.mouse.move(boxA!.x + boxA!.width / 2, boxA!.y + boxA!.height / 2);
    await page.mouse.down();
    await page.mouse.move(gridBBox!.x + gridBBox!.width / 2, gridBBox!.y + Math.max(gridBBox!.height / 2, 20), { steps: 15 });
    await page.mouse.up();
    await expect(page.getByTestId('cross-grid-b').locator('[data-grid-item-id="a0"]')).toBeVisible();

    const itemAInB = page.getByTestId('cross-grid-b').locator('[data-grid-item-id="a0"]');
    const boxAInB = await stableBoundingBox(itemAInB);
    const gridARoot = page.getByTestId('cross-grid-a').locator('.kdl-grid-layout');
    const gridABox = await gridARoot.boundingBox();

    await page.mouse.move(boxAInB!.x + boxAInB!.width / 2, boxAInB!.y + boxAInB!.height / 2);
    await page.mouse.down();
    await page.mouse.move(gridABox!.x + gridABox!.width / 2, gridABox!.y + 20, { steps: 15 });
    await page.mouse.up();

    const finalA = page.getByTestId('cross-grid-a').locator('[data-grid-item-id="a0"]');
    await expect(finalA).toBeVisible();
    const finalLocked = page.locator('[data-grid-item-id="locked"]');
    const finalABox = await finalA.boundingBox();
    const finalLockedBox = await finalLocked.boundingBox();

    expect(finalABox!.y).toBeLessThan(finalLockedBox!.y);
  });

  test('a dragged item stays visually paintable above a sibling grid it is currently being dragged over', async ({ page }) => {
    const itemA = page.locator('[data-grid-item-id="a0"]');
    const boxA = await stableBoundingBox(itemA);
    const gridBRoot = page.getByTestId('cross-grid-b').locator('.kdl-grid-layout');
    const gridBBox = await gridBRoot.boundingBox();

    await page.mouse.move(boxA!.x + boxA!.width / 2, boxA!.y + boxA!.height / 2);
    await page.mouse.down();
    await page.mouse.move(gridBBox!.x + gridBBox!.width / 2, gridBBox!.y + Math.max(gridBBox!.height / 2, 20), { steps: 15 });
    await page.waitForTimeout(200);

    const draggedItem = page.locator('[data-grid-item-id="a0"]');
    const draggedBox = await draggedItem.boundingBox();
    const centerX = draggedBox!.x + draggedBox!.width / 2;
    const centerY = draggedBox!.y + draggedBox!.height / 2;

    const paintedTag = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest('[data-grid-item-id="a0"]') ? `dragged-item` : (el?.className ?? `unknown`);
    }, { x: centerX, y: centerY });

    await page.mouse.up();

    expect(paintedTag).toBe(`dragged-item`);
  });
});
