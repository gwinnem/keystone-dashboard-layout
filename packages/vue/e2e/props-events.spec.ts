import { expect, test } from '@playwright/test';
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

const COL = colStep(LAB_GEOMETRY);
const ROW = rowStep(LAB_GEOMETRY);

/**
 * Every event `GridLayout` and `GridItem` emit, with the payload each one documents. The lab logs each as
 * `<li data-event="name" data-payload="[...args]">`, so a payload is exactly the argument list the handler got.
 *
 * Events covered elsewhere, next to the property that causes them: selection-changed (props-multiselect),
 * breakpoint-changed / columns-changed (props-responsive), cross-grid-item-dropped / cross-grid-drop-rejected
 * (props-cross-grid), item-dropped-from-outside (props-outside-drop), move-blocked-by-collision
 * (props-interaction), remove-grid-item (props-cascade).
 */

test.describe('GridLayout lifecycle events', () => {
  test('layout-ready fires once, after mount, with the full layout', async ({ page }) => {
    await openLab(page);
    await expect(eventLocator(page, 'layout-ready')).toHaveCount(1);

    const [[layout]] = await eventPayloads(page, 'layout-ready') as [[{ i: string }[]]];
    expect(layout.map(entry => entry.i)).toStrictEqual(['0', '1', '2', '3']);
  });

  test('layout-ready does not fire again as the layout changes later', async ({ page }) => {
    await openLab(page);
    await expect(eventLocator(page, 'layout-ready')).toHaveCount(1);
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await expect(eventLocator(page, 'layout-ready')).toHaveCount(1);
  });

  test('layout-updated fires once the layout has settled after mount', async ({ page }) => {
    await openLab(page);
    await expect.poll(async () => eventLocator(page, 'layout-updated').count()).toBeGreaterThan(0);
  });

  test('layout-updated fires after a drag, and its payload is the new layout', async ({ page }) => {
    await openLab(page);
    await clearEvents(page);

    await dragItem(page, item(page, '0'), 0, 5 * ROW);

    await expect.poll(async () => eventLocator(page, 'layout-updated').count()).toBeGreaterThan(0);
    const payloads = await eventPayloads(page, 'layout-updated') as [{ i: string; y: number }[]][];
    const last = payloads.at(-1)![0];
    expect(last.find(entry => entry.i === '0')!.y).toBe(5);
  });

  test('update:layout (the v-model event) fires when a drag commits, with the new layout', async ({ page }) => {
    await openLab(page);
    await clearEvents(page);

    await dragItem(page, item(page, '0'), 0, 5 * ROW);

    await expect.poll(async () => eventLocator(page, 'update:layout').count()).toBeGreaterThan(0);
    const payloads = await eventPayloads(page, 'update:layout') as [{ i: string; y: number }[]][];
    expect(payloads.at(-1)![0].find(entry => entry.i === '0')!.y).toBe(5);
  });

  test('layout-updated and update:layout also fire for compactNow', async ({ page }) => {
    await openLab(page);
    await clearEvents(page);

    await click(page, 'lab-compact-now');

    await expect.poll(async () => eventLocator(page, 'layout-updated').count()).toBeGreaterThan(0);
    await expect.poll(async () => eventLocator(page, 'update:layout').count()).toBeGreaterThan(0);
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

  test('item-move fires while a drag crosses grid cells, with (id, x, y)', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expect.poll(async () => eventLocator(page, 'item-move').count()).toBeGreaterThan(0);

    for(const [id, x, y] of await eventPayloads(page, 'item-move')) {
      expect(id).toBe('0');
      expect(x).toBe(0);
      expect(typeof y).toBe('number');
    }
    expect((await eventPayloads(page, 'item-move')).at(-1)).toStrictEqual(['0', 0, 5]);
  });

  test('item-moved fires exactly once, at the end, with the final cell', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });

    await expect(eventLocator(page, 'item-moved')).toHaveCount(1);
    expect((await eventPayloads(page, 'item-moved'))[0]).toStrictEqual(['0', 0, 5]);
  });

  test('item-moved does not fire for a drag that ends in the cell it started in', async ({ page }) => {
    // Well under half a column: the item snaps back to where it was.
    await dragItem(page, item(page, '0'), 12, 0);
    await expect.poll(async () => eventLocator(page, 'dragend').count()).toBeGreaterThan(0);
    await page.waitForTimeout(200);
    await expect(eventLocator(page, 'item-moved')).toHaveCount(0);
  });

  test('keyboard moves emit item-move and item-moved too', async ({ page }) => {
    await item(page, '1').focus();
    await page.keyboard.press('ArrowRight');
    await expectCell(page, '1', { x: 4 });

    expect((await eventPayloads(page, 'item-moved')).at(-1)).toStrictEqual(['1', 4, 0]);
    await expect.poll(async () => eventLocator(page, 'item-move').count()).toBeGreaterThan(0);
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

  test('resize fires while resizing, and resized once at the end', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });

    await expect.poll(async () => eventLocator(page, 'resize').count()).toBeGreaterThan(0);
    await expect(eventLocator(page, 'resized')).toHaveCount(1);
  });

  test('the payload is (id, h, w, heightPx, widthPx) — height before width', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });

    const [id, rows, columns, heightPx, widthPx] = (await eventPayloads(page, 'resized'))[0] as [string, number, number, number, number];
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

    const [id, rows, columns] = (await eventPayloads(page, 'resized')).at(-1) as [string, number, number];
    expect([id, rows, columns]).toStrictEqual(['1', 4, 2]);
  });

  test('resized does not fire for a resize that ends at the size it started', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', 8, 0);
    await page.waitForTimeout(250);
    await expect(eventLocator(page, 'resized')).toHaveCount(0);
  });

  test('keyboard resizes emit resize and resized too', async ({ page }) => {
    await item(page, '1').focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expectCell(page, '1', { w: 3 });

    const [id, rows, columns] = (await eventPayloads(page, 'resized')).at(-1) as [string, number, number];
    expect([id, rows, columns]).toStrictEqual(['1', 3, 3]);
  });

  test('a left-edge resize changes the position as well as the size, and both are in the layout', async ({ page }) => {
    // Item "2" (x:7 w:4): dragging its west edge one column left grows it to w:5 starting at x:6.
    await resizeItem(page, item(page, '2'), 'w', -COL, 0);
    await expectCell(page, '2', { w: 5, x: 6 });
    expect((await eventPayloads(page, 'resized')).at(-1)!.slice(0, 3)).toStrictEqual(['2', 4, 5]);
  });
});

test.describe('item-clicked', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await clearEvents(page);
  });

  test('a plain click reports the id and the mouse event, with no modifiers', async ({ page }) => {
    await item(page, '0').click();
    await expect(eventLocator(page, 'item-clicked')).toHaveCount(1);
    expect((await eventPayloads(page, 'item-clicked'))[0]).toStrictEqual([
      '0',
      { ctrlKey: false, metaKey: false, shiftKey: false, type: 'click' },
    ]);
  });

  test('modifier keys are carried in the event', async ({ page }) => {
    await item(page, '0').click({ modifiers: ['Shift'] });
    await item(page, '0').click({ modifiers: ['Control'] });
    await item(page, '0').click({ modifiers: ['Meta'] });

    const payloads = await eventPayloads(page, 'item-clicked');
    expect(payloads.map(([, event]) => event)).toStrictEqual([
      { ctrlKey: false, metaKey: false, shiftKey: true, type: 'click' },
      { ctrlKey: true, metaKey: false, shiftKey: false, type: 'click' },
      { ctrlKey: false, metaKey: true, shiftKey: false, type: 'click' },
    ]);
  });

  test('it fires whether or not multiSelect is on', async ({ page }) => {
    await setGrid(page, 'multiSelect', true);
    await item(page, '1').click();
    await expect(eventLocator(page, 'item-clicked')).toHaveCount(1);
  });

  test('the trailing click a browser dispatches after a drag is suppressed', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await page.waitForTimeout(150);
    await expect(eventLocator(page, 'item-clicked')).toHaveCount(0);
  });

  test('...and a resize\'s trailing click is suppressed too', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });
    await page.waitForTimeout(150);
    await expect(eventLocator(page, 'item-clicked')).toHaveCount(0);
  });

  test('a genuine click straight after a drag is not swallowed', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await page.waitForTimeout(400);
    await item(page, '1').click();
    await expect(eventLocator(page, 'item-clicked')).toHaveCount(1);
  });
});

test.describe('container-resized', () => {
  test('fires for every item when their rendered size changes, with the item\'s id first', async ({ page }) => {
    await openLab(page);
    await clearEvents(page);

    await setGrid(page, 'rowHeight', 100);

    await expect.poll(async () => {
      const ids = (await eventPayloads(page, 'container-resized')).map(([id]) => id);
      return ['0', '1', '2', '3'].every(id => ids.includes(id));
    }).toBe(true);
  });

  test('carries (id, h, w, heightPx, widthPx) for the new size', async ({ page }) => {
    await openLab(page);
    await clearEvents(page);

    await setGrid(page, 'rowHeight', 100);

    await expect.poll(async () => (await eventPayloads(page, 'container-resized'))
      .some(([id, rows, columns, heightPx]) => id === '0' && rows === 2 && columns === 3 && Math.abs(Number(heightPx) - 210) <= 2)).toBe(true);
  });
});

test.describe('columns-changed', () => {
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
