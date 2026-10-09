import { expect, test, type Page } from '@playwright/test';
import {
  LAB_GEOMETRY,
  clearEvents,
  click,
  colStep,
  dragItem,
  eventLocator,
  eventNames,
  eventPayloads,
  expectCell,
  item,
  near,
  openLab,
  pressOnItem,
  resizeItem,
  rowStep,
  setControl,
  setGrid,
} from './lab-helpers';

/**
 * The events `GridLayout` and `GridItem` report, with the payload each one documents. Mirrors the Vue package's
 * `e2e/props-events.spec.ts`. The lab logs each callback as `<li data-event="name" data-payload="[...args]">`, so a payload
 * is exactly the argument list the handler got.
 *
 * Covered elsewhere, next to the property that causes them: onSelectionChanged (props-multiselect), onBreakpointChange /
 * onColumnsChanged (props-responsive), onCrossGridItemDropped / onCrossGridDropRejected (props-cross-grid), onOutsideDrop
 * (props-outside-drop), onMoveBlockedByCollision (props-interaction), onItemClose (props-cascade).
 *
 * Vue events that have no React counterpart, so are not ported (these are API differences, not gaps in behaviour):
 *   - `layout-updated` and `update:layout` (the v-model pair): React reports a layout change through `onLayoutChange`;
 *   - `item-move` / `resize` (per-item ticks while a gesture is in progress): React has `onDragMove` on the grid and the
 *     live placeholder, and per-item callbacks only at the end of a gesture (`onItemMoved` / `onItemResized`);
 *   - `item-clicked`: there is no per-item click callback; a consumer puts an `onClick` on its own content. What it guarded
 *     against, the click that trails a drag or resize being taken for a selection click, is asserted below through multiSelect;
 *   - `container-resized`.
 *
 * Payload differences: `onItemResized` is logged as `item-resized`, and its payload is (id, h, w, heightPx, widthPx).
 */

const COL = colStep(LAB_GEOMETRY);
const ROW = rowStep(LAB_GEOMETRY);

/** The current selection, sorted — a `Set` keeps insertion order, which is not what most assertions are about. */
async function selected(page: Page): Promise<string[]> {
  const text = (await page.getByTestId('lab-selected').textContent()) ?? '';
  return text === '' ? [] : text.split(',').sort();
}

test.describe('GridLayout lifecycle events', () => {
  test('onLayoutReady fires once, after mount, with the full layout', async ({ page }) => {
    await openLab(page);
    await expect(eventLocator(page, 'layout-ready')).toHaveCount(1);

    const [[layout]] = await eventPayloads(page, 'layout-ready') as [[{ i: string }[]]];
    expect(layout.map(entry => entry.i)).toStrictEqual(['0', '1', '2', '3']);
  });

  test('onLayoutReady does not fire again as the layout changes later', async ({ page }) => {
    await openLab(page);
    await expect(eventLocator(page, 'layout-ready')).toHaveCount(1);
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await expect(eventLocator(page, 'layout-ready')).toHaveCount(1);
  });

  test('onLayoutChange fires after a drag, and its payload is the new layout', async ({ page }) => {
    await openLab(page);
    await clearEvents(page);

    await dragItem(page, item(page, '0'), 0, 5 * ROW);

    await expect.poll(async () => eventLocator(page, 'layout-change').count()).toBeGreaterThan(0);
    const payloads = await eventPayloads(page, 'layout-change') as [{ i: string; y: number }[]][];
    expect(payloads.at(-1)![0].find(entry => entry.i === '0')!.y).toBe(5);
  });

  test('onLayoutChange also fires for compactNow', async ({ page }) => {
    await openLab(page);
    await clearEvents(page);

    await click(page, 'lab-compact-now');

    await expect.poll(async () => eventLocator(page, 'layout-change').count()).toBeGreaterThan(0);
  });
});

test.describe('drag events', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await clearEvents(page);
  });

  test('dragstart, dragmove and dragend fire in order, each carrying the item id', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expect.poll(async () => eventLocator(page, 'dragend').count()).toBeGreaterThan(0);

    expect((await eventPayloads(page, 'dragstart'))[0]).toStrictEqual(['0']);
    expect((await eventPayloads(page, 'dragend')).at(-1)).toStrictEqual(['0']);
    const moves = await eventPayloads(page, 'dragmove');
    expect(moves.length).toBeGreaterThan(0);
    for(const payload of moves) {
      expect(payload).toStrictEqual(['0']);
    }

    const order = await eventNames(page);
    const started = order.indexOf('dragstart');
    const firstMove = order.indexOf('dragmove');
    const ended = order.lastIndexOf('dragend');
    expect(started).toBeGreaterThanOrEqual(0);
    expect(firstMove).toBeGreaterThan(started);
    expect(ended).toBeGreaterThan(firstMove);
  });

  test('dragmove keeps firing while the item is held and moved', async ({ page }) => {
    const start = await pressOnItem(page, item(page, '0'));
    await page.mouse.move(start.x + 20, start.y + 20, { steps: 5 });
    const early = await eventLocator(page, 'dragmove').count();
    await page.mouse.move(start.x + 3 * COL, start.y + 2 * ROW, { steps: 15 });
    await expect.poll(async () => eventLocator(page, 'dragmove').count()).toBeGreaterThan(early);
    await page.mouse.up();
  });

  test('onItemMoved fires exactly once, at the end, with the final cell', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });

    await expect(eventLocator(page, 'item-moved')).toHaveCount(1);
    expect((await eventPayloads(page, 'item-moved'))[0]).toStrictEqual(['0', 0, 5]);
  });

  test('onItemMoved does not fire for a drag that ends in the cell it started in', async ({ page }) => {
    // Well under half a column: the item snaps back to where it was.
    await dragItem(page, item(page, '0'), 12, 0);
    await expect.poll(async () => eventLocator(page, 'dragend').count()).toBeGreaterThan(0);
    await page.waitForTimeout(200);
    await expect(eventLocator(page, 'item-moved')).toHaveCount(0);
  });

  test('keyboard moves call onItemMoved too', async ({ page }) => {
    await item(page, '1').focus();
    await page.keyboard.press('ArrowRight');
    await expectCell(page, '1', { x: 4 });

    expect((await eventPayloads(page, 'item-moved')).at(-1)).toStrictEqual(['1', 4, 0]);
  });

  test('a group move reports the anchor; passengers move without events of their own', async ({ page }) => {
    await setGrid(page, 'multiSelect', true);
    await item(page, '0').click();
    await item(page, '3').click({ modifiers: ['Control'] });
    await clearEvents(page);

    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '3', { y: 8 });

    expect((await eventPayloads(page, 'item-moved')).map(([id]) => id)).toStrictEqual(['0']);
  });
});

test.describe('resize events', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await clearEvents(page);
  });

  test('onItemResized fires once, at the end of a resize', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });

    await expect(eventLocator(page, 'item-resized')).toHaveCount(1);
  });

  test('the payload is (id, h, w, heightPx, widthPx) — height before width', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });

    const [id, rows, columns, heightPx, widthPx] = (await eventPayloads(page, 'item-resized'))[0] as [string, number, number, number, number];
    expect(id).toBe('1');
    expect(rows).toBe(3);
    expect(columns).toBe(3);
    // h:3 -> 60 * 3 + 2 * 10 = 200px; w:3 -> round-ish(89.17 * 3 + 2 * 10) = ~288px.
    near(heightPx, 200, 2);
    near(widthPx, 288, 2);
  });

  test('a south-edge resize reports the new height', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 's', 0, ROW);
    await expectCell(page, '1', { h: 4 });

    const [id, rows, columns] = (await eventPayloads(page, 'item-resized')).at(-1) as [string, number, number];
    expect([id, rows, columns]).toStrictEqual(['1', 4, 2]);
  });

  test('onItemResized does not fire for a resize that ends at the size it started', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', 8, 0);
    await page.waitForTimeout(250);
    await expect(eventLocator(page, 'item-resized')).toHaveCount(0);
  });

  test('a plain click on a resize handle reports no resize', async ({ page }) => {
    const handle = item(page, '1').locator('.kdl-resize-hint--e');
    await handle.click();
    await page.waitForTimeout(250);
    await expect(eventLocator(page, 'item-resized')).toHaveCount(0);
  });

  test('keyboard resizes call onItemResized too', async ({ page }) => {
    await item(page, '1').focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expectCell(page, '1', { w: 3 });

    const [id, rows, columns] = (await eventPayloads(page, 'item-resized')).at(-1) as [string, number, number];
    expect([id, rows, columns]).toStrictEqual(['1', 3, 3]);
  });

  test('a left-edge resize changes the position as well as the size, and both are in the layout', async ({ page }) => {
    // Item "2" (x:7 w:4): dragging its west edge one column left grows it to w:5 starting at x:6.
    await resizeItem(page, item(page, '2'), 'w', -COL, 0);
    await expectCell(page, '2', { w: 5, x: 6 });
    expect((await eventPayloads(page, 'item-resized')).at(-1)!.slice(0, 3)).toStrictEqual(['2', 4, 5]);
  });
});

test.describe('the click that trails a drag or resize', () => {
  // React has no per-item click callback, so this is observed through multiSelect, where a click means "select this item".
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
    await item(page, '0').click();
    await expect.poll(() => selected(page)).toStrictEqual(['0']);
  });

  test('a drag\'s trailing click does not change the selection', async ({ page }) => {
    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '1', { y: 5 });
    await page.waitForTimeout(300);
    expect(await selected(page)).toStrictEqual(['0']);
  });

  test('...and a resize\'s trailing click does not either', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });
    await page.waitForTimeout(300);
    expect(await selected(page)).toStrictEqual(['0']);
  });

  test('a genuine click a moment after a drag is not swallowed', async ({ page }) => {
    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '1', { y: 5 });
    await page.waitForTimeout(400);
    await item(page, '2').click();
    await expect.poll(() => selected(page)).toStrictEqual(['2']);
  });
});

test.describe('onColumnsChanged', () => {
  test('fires with the new column count when colNum changes', async ({ page }) => {
    await openLab(page);
    await clearEvents(page);

    await setGrid(page, 'colNum', 14);

    await expect.poll(async () => (await eventPayloads(page, 'columns-changed')).at(-1)).toStrictEqual([14]);
    await expect(page.getByTestId('lab-columns')).toHaveText('14');
  });
});

test.describe('events from a second item control', () => {
  test('selecting a different target item routes overrides to it without disturbing the event stream', async ({ page }) => {
    await openLab(page);
    await setControl(page, 'item-target', '2');
    await clearEvents(page);

    await dragItem(page, item(page, '2'), 0, 5 * ROW);
    await expect.poll(async () => eventLocator(page, 'item-moved').count()).toBe(1);
    expect((await eventPayloads(page, 'item-moved'))[0][0]).toBe('2');
  });
});
