import { expect, test, type Page } from '@playwright/test';
import {
  CLS,
  LAB_GEOMETRY,
  addItem,
  clearEvents,
  click,
  colStep,
  dragItem,
  eventLocator,
  eventPayloads,
  expectBoxNear,
  expectCell,
  expectedBox,
  grid,
  gridBox,
  item,
  layoutItem,
  openLab,
  patchTargetEntry,
  pressOnItem,
  readLayout,
  resizeItem,
  rowStep,
  setControl,
  setGrid,
  settledBox,
} from './lab-helpers';

/**
 * Compaction, collisions, snapping, guides and the live placeholder. Mirrors the Vue package's
 * `e2e/props-interaction.spec.ts`. React-specific differences: guides/spacing badges/placeholder are `kdl-*` classes,
 * the dragged/resizing item states are `kdl-grid-item--dragging`/`--resizing` (text selection is read from the computed
 * `user-select`, there is no class for it), and there is no per-item `GridItem` prop for static-ness — the "static
 * through the item control" test below exercises the entry override instead.
 */

/*
 * The lab's starting layout (compactType "none", 12 columns):
 *
 *   "0": x0  y0 w3 h2     "1": x3 y0 w2 h3     "2": x7 y0 w4 h4
 *   "3": x0  y3 w3 h2     (row 2 above it is empty — a gap for compaction to close)
 */

test.describe('compactType: the five built-in strategies', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  // Adding an item changes the layout's length, which always triggers a compaction pass under the active compactType.
  // The new item "added-1" lands at x:0, y:5 (just below everything), w:3, h:2.

  test('none: nothing moves — gaps are left exactly as they are', async ({ page }) => {
    await setGrid(page, 'compactType', 'none');
    await addItem(page);
    await expectCell(page, 'added-1', { x: 0, y: 5 });
    await expectCell(page, '3', { y: 3 });
  });

  test('vertical: items float up into every gap above them', async ({ page }) => {
    await setGrid(page, 'compactType', 'vertical');
    await addItem(page);
    await expectCell(page, '3', { y: 2 });
    await expectCell(page, 'added-1', { y: 4 });
    // Items already touching the top stay put.
    await expectCell(page, '0', { y: 0 });
    await expectCell(page, '2', { y: 0 });
  });

  test('horizontal: items float left into every gap beside them', async ({ page }) => {
    await setGrid(page, 'compactType', 'horizontal');
    await addItem(page);
    // "1" is already flush against "0"; "2" slides left until it meets "1".
    await expectCell(page, '1', { x: 3 });
    await expectCell(page, '2', { x: 5 });
    await expectCell(page, 'added-1', { x: 0 });
  });

  test('vertical-overlap: every item goes straight to y:0, overlapping if it must', async ({ page }) => {
    await setGrid(page, 'compactType', 'vertical-overlap');
    await addItem(page);
    for(const id of ['0', '1', '2', '3', 'added-1']) {
      await expectCell(page, id, { y: 0 });
    }
    // Only y is touched.
    await expectCell(page, '2', { x: 7 });
  });

  test('horizontal-overlap: every item goes straight to x:0, overlapping if it must', async ({ page }) => {
    await setGrid(page, 'compactType', 'horizontal-overlap');
    await addItem(page);
    for(const id of ['0', '1', '2', '3', 'added-1']) {
      await expectCell(page, id, { x: 0 });
    }
    await expectCell(page, '2', { y: 0 });
  });

  test('compactType decides what a drag leaves behind: vertical closes the gap a moved item left', async ({ page }) => {
    await setGrid(page, 'compactType', 'vertical');
    await click(page, 'lab-compact-now');
    await expectCell(page, '3', { y: 2 });

    // Move item "0" well away: "3", which sat under it, now has nothing above and floats to the top.
    await dragItem(page, item(page, '0'), 0, 6 * rowStep(LAB_GEOMETRY));
    await expectCell(page, '3', { y: 0 });
  });
});

test.describe('compactor: replacing the compaction algorithm', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('a custom compactor runs instead of the built-in one: compactNow pushes items downwards', async ({ page }) => {
    await setGrid(page, 'compactor', 'downward');
    await click(page, 'lab-compact-now');

    // The built-in compactors only ever move things up/left, so a lower y can only come from the custom one.
    await expect.poll(async () => (await layoutItem(page, '0'))!.y).toBeGreaterThan(0);
    for(const cell of await readLayout(page)) {
      expect(cell.y + cell.h).toBeLessThanOrEqual(10);
    }
  });

  test('with the compactor null, the same button compacts upwards', async ({ page }) => {
    await click(page, 'lab-compact-now');
    await expectCell(page, '3', { y: 2 });
    await expectCell(page, '0', { y: 0 });
  });

  test('switching the compactor back to null restores built-in behaviour', async ({ page }) => {
    await setGrid(page, 'compactor', 'downward');
    await click(page, 'lab-compact-now');
    await expect.poll(async () => (await layoutItem(page, '0'))!.y).toBeGreaterThan(0);

    await setGrid(page, 'compactor', 'builtin');
    await click(page, 'lab-compact-now');
    await expectCell(page, '0', { y: 0 });
  });
});

test.describe('preventCollision', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('off (the default): dropping onto a neighbour pushes the neighbour out of the way', async ({ page }) => {
    await dragItem(page, item(page, '0'), 3 * colStep(LAB_GEOMETRY), 0);
    await expectCell(page, '0', { x: 3 });
    await expect.poll(async () => (await layoutItem(page, '1'))!.y).toBeGreaterThan(0);
  });

  test('on: dropping onto a neighbour is refused and the neighbour does not move', async ({ page }) => {
    await setGrid(page, 'preventCollision', true);
    const before = await layoutItem(page, '1');

    await dragItem(page, item(page, '0'), 3 * colStep(LAB_GEOMETRY), 0);
    await page.waitForTimeout(250);

    expect(await layoutItem(page, '1')).toMatchObject({ x: before!.x, y: before!.y });
    expect((await layoutItem(page, '0'))!.x).toBeLessThan(3);
  });

  test('on: a refused move calls onMoveBlockedByCollision with the dragged item\'s id', async ({ page }) => {
    await setGrid(page, 'preventCollision', true);
    await clearEvents(page);

    await dragItem(page, item(page, '0'), 3 * colStep(LAB_GEOMETRY), 0);

    await expect.poll(async () => (await eventPayloads(page, 'move-blocked-by-collision')).length).toBeGreaterThan(0);
    for(const payload of await eventPayloads(page, 'move-blocked-by-collision')) {
      expect(payload).toStrictEqual(['0']);
    }
  });

  test('on: a move into free space is not blocked and emits nothing', async ({ page }) => {
    await setGrid(page, 'preventCollision', true);
    await clearEvents(page);

    // A single jump, not a sweep: a straight drag from row 0 to row 5 passes over item "3" on the way, and every
    // intermediate position that overlaps it is (correctly) reported as blocked.
    await dragItem(page, item(page, '0'), 0, 5 * rowStep(LAB_GEOMETRY), { steps: 1 });

    await expectCell(page, '0', { y: 5 });
    await expect(eventLocator(page, 'move-blocked-by-collision')).toHaveCount(0);
  });

  test('off: resizing into a neighbour is allowed', async ({ page }) => {
    await resizeItem(page, item(page, '0'), 'e', colStep(LAB_GEOMETRY), 0);
    await expectCell(page, '0', { w: 4 });
  });

  test('on: resizing into a neighbour is refused and reported', async ({ page }) => {
    await setGrid(page, 'preventCollision', true);
    await clearEvents(page);

    await resizeItem(page, item(page, '0'), 'e', colStep(LAB_GEOMETRY), 0);
    await page.waitForTimeout(250);

    await expectCell(page, '0', { w: 3 });
    await expect.poll(async () => (await eventPayloads(page, 'move-blocked-by-collision')).length).toBeGreaterThan(0);
  });

  test('a static item can never be displaced, even with preventCollision off', async ({ page }) => {
    await patchTargetEntry(page, '1', { isStatic: true });
    const before = await layoutItem(page, '1');

    await dragItem(page, item(page, '0'), 3 * colStep(LAB_GEOMETRY), 0);
    await page.waitForTimeout(250);

    expect(await layoutItem(page, '1')).toMatchObject({ x: before!.x, y: before!.y });
  });

  test('an item made static through the item control (an entry override) is not displaced either', async ({ page }) => {
    // In React there is no `GridItem` prop for this; the control writes the entry that `GridLayout` actually reads.
    await setControl(page, 'item-target', '1');
    await setControl(page, 'item-isStatic', true);
    const before = await layoutItem(page, '1');

    await dragItem(page, item(page, '0'), 3 * colStep(LAB_GEOMETRY), 0);
    await page.waitForTimeout(250);

    expect(await layoutItem(page, '1')).toMatchObject({ x: before!.x, y: before!.y });
  });
});

test.describe('horizontalShift', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('off (the default): a collided item is pushed down', async ({ page }) => {
    await dragItem(page, item(page, '0'), 3 * colStep(LAB_GEOMETRY), 0);
    await expectCell(page, '0', { x: 3 });
    await expect.poll(async () => (await layoutItem(page, '1'))!.y).toBeGreaterThan(0);
  });

  test('on: a collided item is moved along x instead of simply being pushed down', async ({ page }) => {
    await setGrid(page, 'horizontalShift', true);
    await dragItem(page, item(page, '0'), 3 * colStep(LAB_GEOMETRY), 0);
    await expectCell(page, '0', { x: 3 });
    // The contrast with the default ("off" above) is what horizontalShift changes: "1" no longer stays at x:3 with a
    // lower row, it is moved along x. Where it ends up vertically depends on what it then meets, so only that and
    // "no longer overlapping 0" are asserted.
    await expect.poll(async () => (await layoutItem(page, '1'))!.x).not.toBe(3);
    const shifted = (await layoutItem(page, '1'))!;
    // ...and no longer overlaps "0" (x 3..5).
    expect(shifted.x + shifted.w <= 3 || shifted.x >= 6).toBe(true);
  });
});

test.describe('restoreOnDrag', () => {
  /**
   * Item "3" sits directly under "0". Drag "0" far away while the button is held: by default "3" floats
   * straight up into the space "0" left. With restoreOnDrag it may not rise past where it started until
   * the drag ends — and then it does.
   */
  async function dragZeroAwayAndReadThree(page: Page): Promise<{ whileHeld: number; afterDrop: number }> {
    await setGrid(page, 'compactType', 'vertical');
    await click(page, 'lab-compact-now');
    await expectCell(page, '3', { y: 2 });

    const start = await pressOnItem(page, item(page, '0'));
    // One jump, not a sweep. Sliding "0" down through "3" makes the library swap them (moveElement moves the collided
    // item up into the vacated slot) before compaction, and so before restoreOnDrag's minimum row, is ever consulted.
    await page.mouse.move(start.x, start.y + 6 * rowStep(LAB_GEOMETRY), { steps: 1 });
    await page.waitForTimeout(250);
    const whileHeld = (await layoutItem(page, '3'))!.y;
    await page.mouse.up();
    // Not waited on to reach row 0: with restoreOnDrag the drop's own compaction is restricted as well (the minimum row
    // applies at drag end too), so "3" stays where it was until a later layout pass lets it rise.
    await page.waitForTimeout(250);
    return { afterDrop: (await layoutItem(page, '3'))!.y, whileHeld };
  }

  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('off: the item below rises into the gap straight away, mid-drag', async ({ page }) => {
    const { whileHeld, afterDrop } = await dragZeroAwayAndReadThree(page);
    expect(whileHeld).toBe(0);
    expect(afterDrop).toBe(0);
  });

  test('on: the item below holds its pre-drag row, through the drop, until a later layout pass', async ({ page }) => {
    await setGrid(page, 'restoreOnDrag', true);
    const { whileHeld, afterDrop } = await dragZeroAwayAndReadThree(page);
    expect(whileHeld).toBe(2);
    expect(afterDrop).toBe(2);

    // A pass that does not go through the drag path is unrestricted, and only then does "3" rise into the gap.
    await click(page, 'lab-compact-now');
    await expectCell(page, '3', { y: 0 });
  });
});

test.describe('snapToGrid and snapThreshold', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  // Dropping item "0" (w:3) at x:1 puts its right edge (4) one column from item "1"'s left edge (3) and
  // from item "3"'s right edge (3): within a threshold of 1, so it snaps to an aligned x (0 or 2, depending on which
  // neighbouring edge it picks first). Un-snapped it simply stays at x:1.

  test('off (the default): the item lands exactly where it was dropped', async ({ page }) => {
    await dragItem(page, item(page, '0'), colStep(LAB_GEOMETRY), 0);
    await expectCell(page, '0', { x: 1 });
  });

  test('on: a drop within the threshold of another item\'s edge snaps onto it', async ({ page }) => {
    await setGrid(page, 'snapToGrid', true);
    await dragItem(page, item(page, '0'), colStep(LAB_GEOMETRY), 0);

    await expect.poll(async () => [0, 2].includes((await layoutItem(page, '0'))!.x)).toBe(true);
  });

  test('on, but snapThreshold 0: only an exact alignment counts, so the drop is left alone', async ({ page }) => {
    await setGrid(page, 'snapToGrid', true);
    await setGrid(page, 'snapThreshold', 0);
    await dragItem(page, item(page, '0'), colStep(LAB_GEOMETRY), 0);
    await expectCell(page, '0', { x: 1 });
  });

  test('a wider threshold reaches further: dropping two columns away still snaps', async ({ page }) => {
    await setGrid(page, 'snapToGrid', true);
    await setGrid(page, 'snapThreshold', 3);
    await dragItem(page, item(page, '0'), colStep(LAB_GEOMETRY), 0);
    // With a threshold of 3 something is in range; the result is an aligned column, not the raw drop.
    await expect.poll(async () => (await layoutItem(page, '0'))!.x).not.toBe(1);
  });

  test('snapping applies live, while the item is still being dragged', async ({ page }) => {
    await setGrid(page, 'snapToGrid', true);
    const start = await pressOnItem(page, item(page, '0'));
    await page.mouse.move(start.x + colStep(LAB_GEOMETRY), start.y, { steps: 12 });
    await expect.poll(async () => [0, 2].includes((await layoutItem(page, '0'))!.x)).toBe(true);
    await page.mouse.up();
  });
});

test.describe('showAlignmentGuides', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  const guides = (page: Page) => page.locator('.kdl-grid-alignment-guide');

  test('off (the default): no guide is drawn while dragging', async ({ page }) => {
    const start = await pressOnItem(page, item(page, '0'));
    await page.mouse.move(start.x + 3 * colStep(LAB_GEOMETRY), start.y, { steps: 12 });
    await page.waitForTimeout(250);
    await expect(guides(page)).toHaveCount(0);
    await page.mouse.up();
  });

  test('on: a vertical guide appears where the dragged item\'s edge lines up with another item\'s', async ({ page }) => {
    await setGrid(page, 'showAlignmentGuides', true);
    const start = await pressOnItem(page, item(page, '0'));
    // x:3 puts item "0"'s left edge exactly on item "1"'s left edge.
    await page.mouse.move(start.x + 3 * colStep(LAB_GEOMETRY), start.y, { steps: 12 });

    const expectedLeft = 3 * colStep(LAB_GEOMETRY) + LAB_GEOMETRY.marginX;
    await expect.poll(async () => {
      const lefts = await guides(page).evaluateAll(nodes => nodes.map(node => parseFloat((node as HTMLElement).style.left)));
      return lefts.some(left => Math.abs(left - expectedLeft) <= 1.5);
    }).toBe(true);
    await page.mouse.up();
  });

  test('on: a horizontal guide spans the full width where top edges line up', async ({ page }) => {
    await setGrid(page, 'showAlignmentGuides', true);
    const start = await pressOnItem(page, item(page, '0'));
    await page.mouse.move(start.x + 3 * colStep(LAB_GEOMETRY), start.y, { steps: 12 });

    // Row 0's top edge: 0 * (rowHeight + margin) + margin.
    await expect.poll(async () => {
      const found = await guides(page).evaluateAll(nodes => nodes.map(node => ({
        top: parseFloat((node as HTMLElement).style.top),
        width: (node as HTMLElement).style.width,
      })));
      return found.some(guide => guide.width === '100%' && Math.abs(guide.top - LAB_GEOMETRY.marginY) <= 1.5);
    }).toBe(true);
    await page.mouse.up();
  });

  test('guides disappear when the drag ends', async ({ page }) => {
    await setGrid(page, 'showAlignmentGuides', true);
    const start = await pressOnItem(page, item(page, '0'));
    await page.mouse.move(start.x + 3 * colStep(LAB_GEOMETRY), start.y, { steps: 12 });
    await expect.poll(async () => guides(page).count()).toBeGreaterThan(0);

    await page.mouse.up();
    await expect(guides(page)).toHaveCount(0);
  });

  test('guides also show while resizing', async ({ page }) => {
    await setGrid(page, 'showAlignmentGuides', true);
    await settledBox(item(page, '1'));
    const handle = item(page, '1').locator('.kdl-resize-hint--s');
    await handle.hover();
    await page.mouse.down();
    const box = await handle.boundingBox();
    // Growing "1" (y:0, h:3) by one row lines its bottom edge up with item "2"'s (y:0, h:4).
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + rowStep(LAB_GEOMETRY), { steps: 12 });

    await expect.poll(async () => guides(page).count()).toBeGreaterThan(0);
    await page.mouse.up();
    await expect(guides(page)).toHaveCount(0);
  });
});

test.describe('showSpacingGuides', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  const indicators = (page: Page) => page.locator('.kdl-grid-spacing-indicator');

  test('off (the default): no distance badge is drawn while dragging', async ({ page }) => {
    const start = await pressOnItem(page, item(page, '2'));
    await page.mouse.move(start.x + 10, start.y, { steps: 5 });
    await page.waitForTimeout(250);
    await expect(indicators(page)).toHaveCount(0);
    await page.mouse.up();
  });

  test('on: a badge labels the gap to the nearest neighbour, in columns', async ({ page }) => {
    await setGrid(page, 'showSpacingGuides', true);
    const start = await pressOnItem(page, item(page, '2'));
    await page.mouse.move(start.x + 10, start.y, { steps: 5 });

    // Item "2" (x:7) and item "1" (ends at column 5) have two empty columns between them.
    await expect.poll(async () => indicators(page).allTextContents()).toContain('2 cols');
    await page.mouse.up();
  });

  test('a gap of exactly one uses the singular: "1 col"', async ({ page }) => {
    await setGrid(page, 'showSpacingGuides', true);
    // Move "1" one column right, leaving a one-column gap on each side of it.
    await dragItem(page, item(page, '1'), colStep(LAB_GEOMETRY), 0);
    await expectCell(page, '1', { x: 4 });

    const start = await pressOnItem(page, item(page, '1'));
    await page.mouse.move(start.x + 10, start.y, { steps: 5 });

    await expect.poll(async () => indicators(page).allTextContents()).toContain('1 col');
    expect(await indicators(page).allTextContents()).not.toContain('1 cols');
    await page.mouse.up();
  });

  test('badges are removed when the drag ends', async ({ page }) => {
    await setGrid(page, 'showSpacingGuides', true);
    const start = await pressOnItem(page, item(page, '2'));
    await page.mouse.move(start.x + 10, start.y, { steps: 5 });
    await expect.poll(async () => indicators(page).count()).toBeGreaterThan(0);

    await page.mouse.up();
    await expect(indicators(page)).toHaveCount(0);
  });
});

test.describe('The live drag placeholder and drag state', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  const placeholder = (page: Page) => page.locator('.kdl-grid-placeholder');

  test('is hidden until a drag starts', async ({ page }) => {
    await expect(placeholder(page)).toBeHidden();
  });

  test('shows where the dragged item will land, sized like it, and goes away on drop', async ({ page }) => {
    const container = await gridBox(page);
    const start = await pressOnItem(page, item(page, '0'));
    await page.mouse.move(start.x, start.y + 5 * rowStep(LAB_GEOMETRY), { steps: 12 });

    await expect(placeholder(page)).toBeVisible();
    // The drop target is cell (x:0, y:5), still 3 wide and 2 tall.
    await expect.poll(async () => {
      const box = await placeholder(page).boundingBox();
      const want = expectedBox(LAB_GEOMETRY, container, { h: 2, w: 3, x: 0, y: 5 });
      return box !== null && Math.abs(box.y - want.y) <= 2 && Math.abs(box.x - want.x) <= 2
        && Math.abs(box.width - want.width) <= 2 && Math.abs(box.height - want.height) <= 2;
    }).toBe(true);

    await page.mouse.up();
    await expect(placeholder(page)).toBeHidden();
  });

  test('the container, the readout and the dragged item all report the drag while it lasts', async ({ page }) => {
    const start = await pressOnItem(page, item(page, '0'));
    await page.mouse.move(start.x + 40, start.y + 40, { steps: 8 });

    await expect(grid(page)).toHaveClass(/kdl-grid-layout--active-drag/);
    await expect(page.getByTestId('lab-is-dragging')).toHaveText('true');
    await expect(item(page, '0')).toHaveClass(new RegExp(CLS.dragging));
    // No class for this in React: the dragging item simply opts out of text selection. Read as either spelling: Safari/WebKit
    // exposes only the prefixed one (the stylesheet sets both), and reports the unprefixed one as undefined.
    expect(await item(page, '0').evaluate(el => {
      const style = getComputedStyle(el) as Partial<CSSStyleDeclaration>;
      return style.userSelect ?? style.webkitUserSelect;
    })).toBe('none');

    await page.mouse.up();
    await expect(grid(page)).not.toHaveClass(/kdl-grid-layout--active-drag/);
    await expect(page.getByTestId('lab-is-dragging')).toHaveText('false');
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.dragging));
  });

  test('a custom renderPlaceholder replaces the default content, and is told a drag is under way', async ({ page }) => {
    await setControl(page, 'grid-slot-placeholder', true);
    const custom = page.getByTestId('lab-placeholder-content');
    await expect(custom).toBeHidden();

    const start = await pressOnItem(page, item(page, '0'));
    await page.mouse.move(start.x, start.y + 3 * rowStep(LAB_GEOMETRY), { steps: 10 });

    await expect(custom).toBeVisible();
    await expect(custom).toHaveAttribute('data-dragging', 'true');
    await page.mouse.up();
    await expect(custom).toBeHidden();
  });

  test('a resize shows the placeholder too, at the size being resized to, and clears it at the end', async ({ page }) => {
    const container = await gridBox(page);
    await settledBox(item(page, '1'));
    const handle = item(page, '1').locator('.kdl-resize-hint--e');
    await handle.hover();
    await page.mouse.down();
    const box = await handle.boundingBox();
    // Item "1" is x:3 w:2 h:3; one more column makes it w:3.
    await page.mouse.move(box!.x + box!.width / 2 + colStep(LAB_GEOMETRY), box!.y + box!.height / 2, { steps: 10 });

    await expect(item(page, '1')).toHaveClass(new RegExp(CLS.resizing));
    await expect(placeholder(page)).toBeVisible();
    await expect.poll(async () => {
      const live = await placeholder(page).boundingBox();
      const want = expectedBox(LAB_GEOMETRY, container, { h: 3, w: 3, x: 3, y: 0 });
      return live !== null && Math.abs(live.width - want.width) <= 2 && Math.abs(live.height - want.height) <= 2;
    }).toBe(true);

    await page.mouse.up();
    await expect(item(page, '1')).not.toHaveClass(new RegExp(CLS.resizing));
    await expect(placeholder(page)).toBeHidden();
    await expectCell(page, '1', { w: 3 });
  });
});

test.describe('compactNow keeps the geometry intact', () => {
  test('a forced compaction leaves every item on the pixel grid', async ({ page }) => {
    await openLab(page);
    await click(page, 'lab-compact-now');
    await expectCell(page, '3', { y: 2 });
    const container = await gridBox(page);
    await expectBoxNear(item(page, '3'), expectedBox(LAB_GEOMETRY, container, { h: 2, w: 3, x: 0, y: 2 }));
  });
});
