import { expect, test } from '@playwright/test';
import {
  LAB_GEOMETRY,
  addItem,
  click,
  colStep,
  dragItem,
  eventLocator,
  expectCell,
  expectNoPageErrors,
  item,
  layoutItem,
  openLab,
  readLayout,
  resizeItem,
  rowStep,
  selectIds,
  setControl,
  setGrid,
} from './lab-helpers';

const COL = colStep(LAB_GEOMETRY);
const ROW = rowStep(LAB_GEOMETRY);

test.describe('compactNow() and rearrange()', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('compactNow closes gaps even though compactType is "none"', async ({ page }) => {
    await setGrid(page, 'compactType', 'none');
    await expectCell(page, '3', { y: 3 });

    await click(page, 'lab-compact-now');

    // A manual tidy-up always tidies up: item "3" rises into the empty row above it.
    await expectCell(page, '3', { y: 2 });
  });

  test('rearrange() is an alias for compactNow()', async ({ page }) => {
    await click(page, 'lab-rearrange');
    await expectCell(page, '3', { y: 2 });
  });

  test('compactNow keeps the chosen direction: horizontal compaction closes gaps sideways', async ({ page }) => {
    await setGrid(page, 'compactType', 'horizontal');
    await click(page, 'lab-compact-now');
    // "2" (x:7) slides left until it meets "1", which ends at column 5.
    await expectCell(page, '2', { x: 5 });
    // ...and does not also pull things up.
    await expectCell(page, '3', { y: 3 });
  });

  test('compactNow leaves an already-compact layout alone', async ({ page }) => {
    await click(page, 'lab-compact-now');
    await expectCell(page, '3', { y: 2 });
    const settled = await readLayout(page);
    await click(page, 'lab-compact-now');
    await page.waitForTimeout(200);
    expect(await readLayout(page)).toStrictEqual(settled);
  });

  test('compactNow does not touch the horizontal position of items in "vertical" mode', async ({ page }) => {
    await setGrid(page, 'compactType', 'vertical');
    await click(page, 'lab-compact-now');
    await expectCell(page, '2', { x: 7 });
    await expectCell(page, '1', { x: 3 });
  });
});

test.describe('duplicateItem(id)', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setControl(page, 'item-target', '1');
  });

  test('adds "<id>-copy" directly below the source, the same size', async ({ page }) => {
    await click(page, 'lab-duplicate');

    // Item "1" is x:3 y:0 w:2 h:3, so the copy starts at y: 0 + 3.
    await expectCell(page, '1-copy', { h: 3, w: 2, x: 3, y: 3 });
    expect((await readLayout(page)).length).toBe(5);
  });

  test('the original is left exactly as it was', async ({ page }) => {
    const before = await layoutItem(page, '1');
    await click(page, 'lab-duplicate');
    await expectCell(page, '1-copy', { w: 2 });
    expect(await layoutItem(page, '1')).toStrictEqual(before);
  });

  test('a second copy gets a different, collision-free id', async ({ page }) => {
    await click(page, 'lab-duplicate');
    await expectCell(page, '1-copy', { w: 2 });
    await click(page, 'lab-duplicate');

    await expect.poll(async () => (await readLayout(page)).map(cell => cell.i).sort()).toStrictEqual(['0', '1', '1-copy', '1-copy-2', '2', '3']);
  });

  test('a copy can itself be duplicated', async ({ page }) => {
    await click(page, 'lab-duplicate');
    await expectCell(page, '1-copy', { w: 2 });

    await setControl(page, 'item-target', '1-copy');
    await click(page, 'lab-duplicate');
    await expectCell(page, '1-copy-copy', { w: 2 });
  });

  test('the copy is a live item: it renders, is draggable and can be dragged', async ({ page }) => {
    await click(page, 'lab-duplicate');
    await expect(item(page, '1-copy')).toBeVisible();
    await expect(item(page, '1-copy')).toHaveClass(/vue-draggable/);

    await dragItem(page, item(page, '1-copy'), 0, 4 * ROW);
    await expectCell(page, '1-copy', { y: 7 });
  });
});

test.describe('undo() / redo() / canUndo / canRedo', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'enableUndoRedo', true);
  });

  test('start with nothing to undo or redo', async ({ page }) => {
    await expect(page.getByTestId('lab-can-undo')).toHaveText('false');
    await expect(page.getByTestId('lab-can-redo')).toHaveText('false');
    await expect(page.getByTestId('lab-undo')).toBeDisabled();
    await expect(page.getByTestId('lab-redo')).toBeDisabled();
  });

  test('a drag can be undone and redone', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await expect(page.getByTestId('lab-can-undo')).toHaveText('true');
    await expect(page.getByTestId('lab-can-redo')).toHaveText('false');

    await click(page, 'lab-undo');
    await expectCell(page, '0', { y: 0 });
    await expect(page.getByTestId('lab-can-undo')).toHaveText('false');
    await expect(page.getByTestId('lab-can-redo')).toHaveText('true');

    await click(page, 'lab-redo');
    await expectCell(page, '0', { y: 5 });
    await expect(page.getByTestId('lab-can-undo')).toHaveText('true');
    await expect(page.getByTestId('lab-can-redo')).toHaveText('false');
  });

  test('a whole resize is one undo step', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });

    await click(page, 'lab-undo');
    await expectCell(page, '1', { w: 2 });
  });

  test('adding an item is undoable: undo removes it again', async ({ page }) => {
    await addItem(page);
    await expect.poll(async () => (await readLayout(page)).length).toBe(5);

    await click(page, 'lab-undo');
    await expect.poll(async () => (await readLayout(page)).length).toBe(4);
  });

  test('compactNow is undoable', async ({ page }) => {
    await click(page, 'lab-compact-now');
    await expectCell(page, '3', { y: 2 });

    await click(page, 'lab-undo');
    await expectCell(page, '3', { y: 3 });
  });

  test('duplicateItem is undoable', async ({ page }) => {
    await click(page, 'lab-duplicate');
    await expect.poll(async () => (await readLayout(page)).length).toBe(5);

    await click(page, 'lab-undo');
    await expect.poll(async () => (await readLayout(page)).length).toBe(4);
  });

  test('several steps unwind in reverse order', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '1', { y: 5 });

    await click(page, 'lab-undo');
    await expectCell(page, '1', { y: 0 });
    await expectCell(page, '0', { y: 5 });

    await click(page, 'lab-undo');
    await expectCell(page, '0', { y: 0 });
  });

  test('a fresh change after an undo discards what could have been redone', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await click(page, 'lab-undo');
    await expect(page.getByTestId('lab-can-redo')).toHaveText('true');

    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '1', { y: 5 });
    await expect(page.getByTestId('lab-can-redo')).toHaveText('false');
  });

  test('undo and redo are reported as layout changes', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await click(page, 'lab-clear-log');

    await click(page, 'lab-undo');

    await expect.poll(async () => eventLocator(page, 'layout-updated').count()).toBeGreaterThan(0);
    await expect.poll(async () => eventLocator(page, 'update:layout').count()).toBeGreaterThan(0);
  });

  test('undoHistoryLimit caps how many steps can be undone: the oldest is dropped', async ({ page }) => {
    await setGrid(page, 'undoHistoryLimit', 2);
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '1', { y: 5 });
    await dragItem(page, item(page, '2'), 0, 5 * ROW);
    await expectCell(page, '2', { y: 5 });

    await click(page, 'lab-undo');
    await click(page, 'lab-undo');
    await expectCell(page, '2', { y: 0 });
    await expectCell(page, '1', { y: 0 });

    // The first drag's snapshot was dropped: there is nothing left to undo, and item "0" stays where it went.
    await expect(page.getByTestId('lab-can-undo')).toHaveText('false');
    await expect(page.getByTestId('lab-undo')).toBeDisabled();
    await expectCell(page, '0', { y: 5 });
  });

  test('with a generous limit every step is available', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '1', { y: 5 });
    await dragItem(page, item(page, '2'), 0, 5 * ROW);
    await expectCell(page, '2', { y: 5 });

    for(let step = 0; step < 3; step += 1) {
      await click(page, 'lab-undo');
    }
    await expectCell(page, '0', { y: 0 });
    await expect(page.getByTestId('lab-can-undo')).toHaveText('false');
  });
});

test.describe('undo/redo off (the default)', () => {
  test('nothing is recorded, so there is nothing to undo', async ({ page }) => {
    await openLab(page);
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await expect(page.getByTestId('lab-can-undo')).toHaveText('false');
    await expect(page.getByTestId('lab-undo')).toBeDisabled();
  });

  test('switching it on starts recording from that point', async ({ page }) => {
    await openLab(page);
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });

    await setGrid(page, 'enableUndoRedo', true);
    await expect(page.getByTestId('lab-can-undo')).toHaveText('false');

    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '1', { y: 5 });
    await expect(page.getByTestId('lab-can-undo')).toHaveText('true');
  });
});

test.describe('alignSelected(edge)', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
    await click(page, 'lab-load-align-layout');
    await expectCell(page, 'p', { x: 2 });
  });

  /*
   * p is the anchor (x2 w4 y0 h2); q (x8 w2 y3 h2) is on another row. r is the second anchor
   * (x0 w3 y6 h4); s (x6 w2 y9 h2) is in another column. Nothing can overlap after aligning.
   */

  test('left: the other item takes the anchor\'s left edge; only x changes', async ({ page }) => {
    await selectIds(page, 'p', 'q');
    await click(page, 'lab-align-left');
    await expectCell(page, 'q', { x: 2, y: 3 });
  });

  test('right: the other item\'s right edge meets the anchor\'s', async ({ page }) => {
    await selectIds(page, 'p', 'q');
    await click(page, 'lab-align-right');
    // 2 + 4 - 2
    await expectCell(page, 'q', { x: 4, y: 3 });
  });

  test('center-x: the other item is centred on the anchor, rounded to a whole column', async ({ page }) => {
    await selectIds(page, 'p', 'q');
    await click(page, 'lab-align-center-x');
    // round(2 + 4/2 - 2/2)
    await expectCell(page, 'q', { x: 3, y: 3 });
  });

  test('top: the other item takes the anchor\'s top edge; only y changes', async ({ page }) => {
    await selectIds(page, 'r', 's');
    await click(page, 'lab-align-top');
    await expectCell(page, 's', { x: 6, y: 6 });
  });

  test('bottom: the other item\'s bottom edge meets the anchor\'s', async ({ page }) => {
    await selectIds(page, 'r', 's');
    await click(page, 'lab-align-bottom');
    // 6 + 4 - 2
    await expectCell(page, 's', { x: 6, y: 8 });
  });

  test('center-y: the other item is centred on the anchor, rounded to a whole row', async ({ page }) => {
    await selectIds(page, 'r', 's');
    await click(page, 'lab-align-center-y');
    // round(6 + 4/2 - 2/2)
    await expectCell(page, 's', { x: 6, y: 7 });
  });

  test('the anchor never moves', async ({ page }) => {
    const before = await layoutItem(page, 'p');
    await selectIds(page, 'p', 'q');
    await click(page, 'lab-align-right');
    await expectCell(page, 'q', { x: 4 });
    expect(await layoutItem(page, 'p')).toStrictEqual(before);
  });

  test('the anchor is the first item selected, not the first in the layout', async ({ page }) => {
    await selectIds(page, 'q', 'p');
    await click(page, 'lab-align-left');
    // q (x:8) is the anchor now, so p moves to it.
    await expectCell(page, 'p', { x: 8 });
    await expectCell(page, 'q', { x: 8 });
  });

  test('every other selected item moves, not just one', async ({ page }) => {
    await selectIds(page, 'p', 'q', 'r');
    await click(page, 'lab-align-left');
    await expectCell(page, 'q', { x: 2 });
    await expectCell(page, 'r', { x: 2 });
  });

  test('items outside the selection are left alone', async ({ page }) => {
    const bystander = await layoutItem(page, 's');
    await selectIds(page, 'p', 'q');
    await click(page, 'lab-align-left');
    await expectCell(page, 'q', { x: 2 });
    expect(await layoutItem(page, 's')).toStrictEqual(bystander);
  });

  test('an item that is already aligned is not disturbed', async ({ page }) => {
    await selectIds(page, 'p', 'q');
    await click(page, 'lab-align-left');
    await expectCell(page, 'q', { x: 2 });
    await click(page, 'lab-align-left');
    await page.waitForTimeout(200);
    await expectCell(page, 'q', { x: 2, y: 3 });
  });

  test('with fewer than two items selected it does nothing', async ({ page }) => {
    const before = await readLayout(page);
    await selectIds(page, 'p');
    await click(page, 'lab-align-left');
    await page.waitForTimeout(250);
    expect(await readLayout(page)).toStrictEqual(before);
  });

  test('with nothing selected it does nothing', async ({ page }) => {
    const before = await readLayout(page);
    await click(page, 'lab-align-bottom');
    await page.waitForTimeout(250);
    expect(await readLayout(page)).toStrictEqual(before);
  });

  test('an alignment is undoable as one step', async ({ page }) => {
    await setGrid(page, 'enableUndoRedo', true);
    await selectIds(page, 'p', 'q', 'r');
    await click(page, 'lab-align-left');
    await expectCell(page, 'q', { x: 2 });

    await click(page, 'lab-undo');
    await expectCell(page, 'q', { x: 8 });
    await expectCell(page, 'r', { x: 0 });
  });
});

test.describe('distributeSelected(axis)', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
    await click(page, 'lab-load-align-layout');
    await expectCell(page, 't2', { x: 3 });
  });

  /*
   * t1/t2/t3 share a row: t1 spans x0..2 and t3 x10..12, leaving 6 free columns, so equal gaps of 3 put t2 on x5.
   * v1/v2/v3 share a column: v1 spans y0..2 and v3 y8..10, leaving 4 free rows, so equal gaps of 2 put v2 on y4.
   */

  test('horizontal: the middle item moves so the gaps are equal; the outer two stay put', async ({ page }) => {
    await selectIds(page, 't1', 't2', 't3');
    await click(page, 'lab-distribute-horizontal');

    await expectCell(page, 't2', { x: 5, y: 12 });
    await expectCell(page, 't1', { x: 0 });
    await expectCell(page, 't3', { x: 10 });
  });

  test('vertical: the same on the other axis', async ({ page }) => {
    await selectIds(page, 'v1', 'v2', 'v3');
    await click(page, 'lab-distribute-vertical');

    await expectCell(page, 'v2', { x: 11, y: 4 });
    await expectCell(page, 'v1', { y: 0 });
    await expectCell(page, 'v3', { y: 8 });
  });

  test('selection order does not matter — items are ordered by position', async ({ page }) => {
    await selectIds(page, 't3', 't1', 't2');
    await click(page, 'lab-distribute-horizontal');
    await expectCell(page, 't2', { x: 5 });
  });

  test('with only two items selected there is nothing in between, so nothing moves', async ({ page }) => {
    await selectIds(page, 't1', 't3');
    await click(page, 'lab-distribute-horizontal');
    await page.waitForTimeout(250);
    await expectCell(page, 't2', { x: 3 });
  });

  test('unselected items are not moved to make room', async ({ page }) => {
    const bystander = await layoutItem(page, 'p');
    await selectIds(page, 't1', 't2', 't3');
    await click(page, 'lab-distribute-horizontal');
    await expectCell(page, 't2', { x: 5 });
    expect(await layoutItem(page, 'p')).toStrictEqual(bystander);
  });

  test('a distribution is undoable', async ({ page }) => {
    await setGrid(page, 'enableUndoRedo', true);
    await selectIds(page, 't1', 't2', 't3');
    await click(page, 'lab-distribute-horizontal');
    await expectCell(page, 't2', { x: 5 });

    await click(page, 'lab-undo');
    await expectCell(page, 't2', { x: 3 });
  });
});

test.describe('focusItem(id) and scrollToItem(id)', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  const focusedId = (page: import('@playwright/test').Page) =>
    page.evaluate(() => document.activeElement?.getAttribute('data-grid-item-id') ?? null);

  test('focusItem moves keyboard focus to the item', async ({ page }) => {
    await page.getByTestId('lab-method-id').fill('2');
    await click(page, 'lab-focus-item');
    await expect.poll(() => focusedId(page)).toBe('2');
  });

  test('...and the focused item then responds to the keyboard', async ({ page }) => {
    await page.getByTestId('lab-method-id').fill('1');
    await click(page, 'lab-focus-item');
    await expect.poll(() => focusedId(page)).toBe('1');
    await page.keyboard.press('ArrowRight');
    await expectCell(page, '1', { x: 4 });
  });

  test('focusing an item that cannot take focus (static) leaves focus where it was', async ({ page }) => {
    await setControl(page, 'item-target', '2');
    await setControl(page, 'item-isStatic', true);
    await item(page, '0').focus();
    await expect.poll(() => focusedId(page)).toBe('0');

    await page.getByTestId('lab-method-id').fill('2');
    await click(page, 'lab-focus-item');
    await page.waitForTimeout(200);
    expect(await focusedId(page)).not.toBe('2');
  });

  test('focusing an id that does not exist is a harmless no-op', async ({ page }) => {
    await page.getByTestId('lab-method-id').fill('nope');
    await expectNoPageErrors(page, async () => {
      await click(page, 'lab-focus-item');
      await page.waitForTimeout(200);
    });
  });

  test('focusItem works for an item added a moment ago', async ({ page }) => {
    await addItem(page);
    await expect(item(page, 'added-1')).toBeVisible();
    await page.getByTestId('lab-method-id').fill('added-1');
    await click(page, 'lab-focus-item');
    await expect.poll(() => focusedId(page)).toBe('added-1');
  });

  test('scrollToItem on a rendered item does not throw', async ({ page }) => {
    await page.getByTestId('lab-method-id').fill('3');
    await expectNoPageErrors(page, async () => {
      await click(page, 'lab-scroll-to-item');
      await page.waitForTimeout(300);
    });
    await expect(item(page, '3')).toBeVisible();
  });

  test('scrollToItem on an id that does not exist is a harmless no-op', async ({ page }) => {
    await page.getByTestId('lab-method-id').fill('nope');
    await expectNoPageErrors(page, async () => {
      await click(page, 'lab-scroll-to-item');
      await page.waitForTimeout(200);
    });
  });
});
