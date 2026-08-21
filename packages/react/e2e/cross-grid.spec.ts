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
    // sliver at the *top* of the wrapping div (which only has a
    // min-height applied to itself, not to the grid element inside
    // it). Dropping at the wrapping div's own vertical center would
    // land below the real grid's own hit area entirely — confirmed via
    // a fresh test run that this was landing the drop outside grid B's
    // own collapsed bounds, not a rejection by the library itself.
    const gridBRoot = page.getByTestId('cross-grid-b').locator('.kdl-grid-layout');
    const gridBBox = await gridBRoot.boundingBox();
    expect(gridBBox).not.toBeNull();

    await page.mouse.move(itemBox!.x + itemBox!.width / 2, itemBox!.y + itemBox!.height / 2);
    await page.mouse.down();
    // Move in several steps toward the center of grid B's own *real*
    // element — a real, gradual mouse movement, not a single jump,
    // matching how an actual user drag behaves and giving the native
    // engine's own move handler multiple ticks to process, the same
    // way every other drag test in this suite already does.
    await page.mouse.move(
      gridBBox!.x + gridBBox!.width / 2,
      gridBBox!.y + Math.max(gridBBox!.height / 2, 20),
      { steps: 15 },
    );
    await page.mouse.up();

    // Item "a0" should no longer exist in grid A at all, and should now
    // be rendered somewhere inside grid B's own container.
    //
    // Confirmed gap via a fresh e2e run: the drag itself actually
    // succeeds (the screenshot on the earlier failure showed "Item a0"
    // rendered correctly inside grid B, with grid A empty) — the test
    // assertion below was the bug, not the library. A page-wide,
    // unscoped locator was always going to find the item *somewhere*
    // once it moved into grid B, since it still exists on the page;
    // "removed from grid A" needs to be checked scoped to grid A
    // specifically, not globally.
    await expect(page.getByTestId('cross-grid-a').locator('[data-grid-item-id="a0"]')).toHaveCount(0);
    const movedItem = page.getByTestId('cross-grid-b').locator('[data-grid-item-id="a0"]');
    await expect(movedItem).toBeVisible();
  });

  test('a drag that stays within grid A the whole time does not move it to grid B', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="a0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    // A small, entirely-within-grid-A move — should behave like an
    // ordinary in-grid drag, not trigger any cross-grid handoff.
    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width / 2 + 40, before!.y + before!.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect(page.locator('[data-grid-item-id="a0"]')).toBeVisible();
    await expect(page.getByTestId('cross-grid-b').locator('[data-grid-item-id="a0"]')).toHaveCount(0);
  });

  test('a static item has a permanently lower z-index, so a dragged item stays visible above it', async ({ page }) => {
    // Regression coverage matching the Vue package's own history for
    // this exact bug class: reactively toggling z-index on the dragged
    // item itself (tied to isDragging) silently releases the browser's
    // own pointer capture mid-gesture. Giving static items a
    // permanently *lower* z-index instead (never mutated mid-gesture)
    // achieves the same visible result without touching any
    // stacking-related property on the element actually holding
    // pointer capture.
    const dragged = page.locator('[data-grid-item-id="a0"]');
    const locked = page.locator('[data-grid-item-id="locked"]');

    const draggedZ = await dragged.evaluate(el => getComputedStyle(el).zIndex);
    const lockedZ = await locked.evaluate(el => getComputedStyle(el).zIndex);

    expect(Number(lockedZ)).toBeLessThan(0);
    expect(draggedZ === `auto` || Number(draggedZ) > Number(lockedZ)).toBe(true);
  });

  test('a static item stays visually paintable even when the grid container has its own background', async ({ page }) => {
    // Regression coverage: a static item's own negative z-index alone
    // doesn't guarantee it paints correctly — without the grid root's
    // own `isolation: isolate` establishing its own stacking context,
    // a `-1` child's paint order can escape to compete with the
    // *entire page's* stacking order instead of just this element's
    // own background. Checked via `elementFromPoint` at the static
    // item's own center — the real, observable question, not a
    // computed style value that could stay "correct" throughout this
    // exact class of bug.
    const grid = page.getByTestId('cross-grid-a').locator('.kdl-grid-layout');
    await grid.evaluate(el => {
      (el as HTMLElement).style.background = `red`;
    });

    const locked = page.locator('[data-grid-item-id="locked"]');
    const box = await locked.boundingBox();
    const centerX = box!.x + box!.width / 2;
    const centerY = box!.y + box!.height / 2;

    const paintedTag = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest('[data-grid-item-id="locked"]') ? `static-item` : (el?.className ?? `unknown`);
    }, { x: centerX, y: centerY });

    expect(paintedTag).toBe(`static-item`);
  });

  test('dragging "a0" out to grid B then back lands it in the gap above the static "locked" item, not pushed below it (bin-pack, not push-and-compact)', async ({ page }) => {
    // Regression coverage: a naive "drop at y:999, let vertical
    // compaction settle it" placement can't jump over a static
    // obstacle in the same column to reach a real gap further up —
    // compaction only ever rises until the first collision, landing
    // just below "locked" instead of in the actual empty gap above it.
    // A real first-fit bin-pack (`findFirstFitSlot`) finds that gap
    // directly. "locked" occupies rows 2-3 in this fixture; the gap
    // "a0" should land back in is rows 0-1, directly above it.
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

    // Back above "locked", not pushed below it.
    expect(finalABox!.y).toBeLessThan(finalLockedBox!.y);
  });

  test('a dragged item stays visually paintable above a sibling grid it is currently being dragged over', async ({ page }) => {
    // Regression coverage: `isolation: isolate` (needed for the static-
    // item paint-order fix above) makes every grid its own stacking
    // context — meaning two sibling grids with no z-index of their own
    // stack purely by DOM order. Mid cross-grid-drag, the dragged item
    // stays a DOM child of its own *source* grid the whole time, so
    // once the pointer moves over the *target* grid (rendered later in
    // the DOM, in this fixture's own side-by-side layout), the dragged
    // item could visually disappear behind the target grid's own
    // background without a source-grid z-index boost while dragging.
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
