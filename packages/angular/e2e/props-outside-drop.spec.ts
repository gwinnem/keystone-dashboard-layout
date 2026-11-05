import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  CLS,
  LAB_GEOMETRY,
  clearEvents,
  colStep,
  eventLocator,
  eventPayloads,
  expectedBox,
  gridBox,
  item,
  near,
  openLab,
  readLayout,
  rowStep,
  setGrid,
} from './lab-helpers';

/**
 * allowOutsideDrop, outsideDropWidth/Height, the live placeholder and outsideDropAccept. Mirrors the React and Vue packages'
 * `e2e/props-outside-drop.spec.ts`. During an outside drop Angular shows `.kdl-grid-placeholder` (the same element the in-grid
 * drag/resize placeholder uses; React has a separate `.kdl-grid-outside-drop-placeholder`), and the drop is reported through
 * the `itemDroppedFromOutside` output, which the lab logs as `item-dropped-from-outside`.
 */

const COL = colStep(LAB_GEOMETRY);
const ROW = rowStep(LAB_GEOMETRY);

const SKIP_ON_WEBKIT_REASON = 'Native HTML5 drag-and-drop cannot be simulated via page.mouse in WebKit (no CDP-equivalent translation layer) — a Playwright/browser limitation, not an app bug.';

const LAB_MIME = 'application/x-lab-widget';

const placeholder = (page: Page): Locator => page.locator('.kdl-grid-placeholder');

/** Picks up a palette widget and carries it to a point, optionally letting go there. */
async function carry(page: Page, widgetTestId: string, to: { x: number; y: number }, release = true): Promise<void> {
  await page.getByTestId(widgetTestId).hover();
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  if(release) {
    await page.mouse.up();
  }
}

/** A point inside the lab grid, `col` columns and `row` rows from its top-left corner. */
async function pointIn(page: Page, col: number, row: number): Promise<{ x: number; y: number }> {
  const box = await gridBox(page);
  return { x: box.x + LAB_GEOMETRY.marginX + COL * col + 10, y: box.y + LAB_GEOMETRY.marginY + ROW * row + 10 };
}

test.describe('allowOutsideDrop', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', SKIP_ON_WEBKIT_REASON);
    await openLab(page);
    await clearEvents(page);
  });

  test('off (the default): a dropped widget does nothing — no event, no new item, no placeholder', async ({ page }) => {
    await carry(page, 'lab-widget', await pointIn(page, 5, 1), false);
    await page.waitForTimeout(200);
    await expect(placeholder(page)).toBeHidden();
    await page.mouse.up();

    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(0);
    expect((await readLayout(page)).length).toBe(4);
  });

  test('on: dropping a widget emits itemDroppedFromOutside once', async ({ page }) => {
    await setGrid(page, 'allowOutsideDrop', true);
    await carry(page, 'lab-widget', await pointIn(page, 5, 1));
    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(1);
  });

  test('the payload has the resolved cell, the configured size and the native DataTransfer', async ({ page }) => {
    await setGrid(page, 'allowOutsideDrop', true);
    await carry(page, 'lab-widget', await pointIn(page, 5, 1));
    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(1);

    const [[payload]] = await eventPayloads(page, 'item-dropped-from-outside') as [[{ x: number; y: number; w: number; h: number; dataTransfer: { types: string[] } }]];
    expect(payload.w).toBe(2);
    expect(payload.h).toBe(2);
    expect(payload.x).toBeGreaterThanOrEqual(0);
    expect(payload.y).toBeGreaterThanOrEqual(0);
    expect(payload.dataTransfer.types).toContain(LAB_MIME);
  });

  test('nothing is added by the library itself — the consumer\'s handler decides (here it adds an item)', async ({ page }) => {
    await setGrid(page, 'allowOutsideDrop', true);
    await carry(page, 'lab-widget', await pointIn(page, 5, 1));
    await expect.poll(async () => (await readLayout(page)).length).toBe(5);

    const added = (await readLayout(page)).find(cell => String(cell.i).startsWith('drop-'))!;
    expect(added.w).toBe(2);
    expect(added.h).toBe(2);
    await expect(item(page, added.i)).toBeVisible();
  });

  test('the dropped item is a normal grid item: draggable like any other', async ({ page }) => {
    await setGrid(page, 'allowOutsideDrop', true);
    await carry(page, 'lab-widget', await pointIn(page, 5, 1));
    await expect.poll(async () => (await readLayout(page)).length).toBe(5);
    const added = (await readLayout(page)).find(cell => String(cell.i).startsWith('drop-'))!;
    await expect(item(page, added.i)).toHaveClass(new RegExp(CLS.draggable));
  });

  test('releasing away from the grid drops nothing', async ({ page }) => {
    await setGrid(page, 'allowOutsideDrop', true);
    const palette = await page.getByTestId('lab-widget').boundingBox();
    await carry(page, 'lab-widget', { x: palette!.x + 20, y: Math.max(palette!.y - 150, 10) });

    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(0);
    expect((await readLayout(page)).length).toBe(4);
  });

  test('turning it off again stops accepting drops', async ({ page }) => {
    await setGrid(page, 'allowOutsideDrop', true);
    await setGrid(page, 'allowOutsideDrop', false);
    await carry(page, 'lab-widget', await pointIn(page, 5, 1));
    await page.waitForTimeout(200);
    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(0);
  });
});

test.describe('outsideDropWidth and outsideDropHeight', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', SKIP_ON_WEBKIT_REASON);
    await openLab(page);
    await setGrid(page, 'allowOutsideDrop', true);
    await clearEvents(page);
  });

  test('default to 2 x 2 columns/rows', async ({ page }) => {
    await carry(page, 'lab-widget', await pointIn(page, 5, 1));
    const [[payload]] = await eventPayloads(page, 'item-dropped-from-outside') as [[{ w: number; h: number }]];
    expect([payload.w, payload.h]).toStrictEqual([2, 2]);
  });

  test('set the size reported on drop and given to the new item', async ({ page }) => {
    await setGrid(page, 'outsideDropWidth', 4);
    await setGrid(page, 'outsideDropHeight', 3);
    await carry(page, 'lab-widget', await pointIn(page, 5, 1));

    const [[payload]] = await eventPayloads(page, 'item-dropped-from-outside') as [[{ w: number; h: number }]];
    expect([payload.w, payload.h]).toStrictEqual([4, 3]);
    await expect.poll(async () => (await readLayout(page)).find(cell => String(cell.i).startsWith('drop-'))).toMatchObject({ h: 3, w: 4 });
  });

  test('also size the live placeholder shown while the widget hovers', async ({ page }) => {
    await setGrid(page, 'outsideDropWidth', 4);
    await setGrid(page, 'outsideDropHeight', 3);
    await carry(page, 'lab-widget', await pointIn(page, 5, 1), false);

    await expect(placeholder(page)).toBeVisible();
    const want = expectedBox(LAB_GEOMETRY, { height: 0, width: 0, x: 0, y: 0 }, { h: 3, w: 4, x: 0, y: 0 });
    await expect.poll(async () => {
      const box = await placeholder(page).boundingBox();
      return box !== null && Math.abs(box.width - want.width) <= 3 && Math.abs(box.height - want.height) <= 3;
    }).toBe(true);
    await page.mouse.up();
  });
});

test.describe('the live placeholder while a widget hovers', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', SKIP_ON_WEBKIT_REASON);
    await openLab(page);
    await setGrid(page, 'allowOutsideDrop', true);
  });

  test('appears over the grid, sized to the drop size, and goes away when the widget is released', async ({ page }) => {
    await expect(placeholder(page)).toBeHidden();
    await carry(page, 'lab-widget', await pointIn(page, 5, 1), false);

    await expect(placeholder(page)).toBeVisible();
    await expect.poll(async () => {
      const box = await placeholder(page).boundingBox();
      return box !== null && Math.abs(box.width - 188) <= 3 && Math.abs(box.height - 130) <= 3;
    }).toBe(true);

    await page.mouse.up();
    await expect(placeholder(page)).toBeHidden();
  });

  test('follows the pointer: further right gives a larger x', async ({ page }) => {
    await clearEvents(page);
    await carry(page, 'lab-widget', await pointIn(page, 0, 4));
    await carry(page, 'lab-widget', await pointIn(page, 8, 4));

    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(2);
    const payloads = await eventPayloads(page, 'item-dropped-from-outside') as [{ x: number }][];
    expect(payloads[0][0].x).toBeLessThan(payloads[1][0].x);
  });

  test('a drop is kept within the grid\'s columns', async ({ page }) => {
    await clearEvents(page);
    const box = await gridBox(page);
    // The very right-hand edge: a 2-wide item must still fit within the 12 columns.
    await carry(page, 'lab-widget', { x: box.x + box.width - 5, y: box.y + 200 });
    const [[payload]] = await eventPayloads(page, 'item-dropped-from-outside') as [[{ x: number; w: number }]];
    expect(payload.x + payload.w).toBeLessThanOrEqual(12);
  });

  test('leaving the grid without dropping hides the placeholder and drops nothing', async ({ page }) => {
    await clearEvents(page);
    await carry(page, 'lab-widget', await pointIn(page, 5, 1), false);
    await expect(placeholder(page)).toBeVisible();

    const palette = await page.getByTestId('lab-widget').boundingBox();
    await page.mouse.move(palette!.x + 20, Math.max(palette!.y - 120, 10), { steps: 10 });
    await expect(placeholder(page)).toBeHidden();
    await page.mouse.up();

    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(0);
  });
});

test.describe('outsideDropAccept', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', SKIP_ON_WEBKIT_REASON);
    await openLab(page);
    await setGrid(page, 'allowOutsideDrop', true);
    await clearEvents(page);
  });

  test('without a predicate every drag is accepted, including the "incompatible" widget', async ({ page }) => {
    await carry(page, 'lab-widget-incompatible', await pointIn(page, 5, 1));
    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(1);
  });

  test('with a predicate, a drag it rejects shows no placeholder', async ({ page }) => {
    await setGrid(page, 'outsideDropAccept', true);
    await carry(page, 'lab-widget-incompatible', await pointIn(page, 5, 1), false);
    await page.waitForTimeout(250);
    await expect(placeholder(page)).toBeHidden();
    await page.mouse.up();
  });

  test('...and dropping it does nothing', async ({ page }) => {
    await setGrid(page, 'outsideDropAccept', true);
    await carry(page, 'lab-widget-incompatible', await pointIn(page, 5, 1));
    await page.waitForTimeout(250);

    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(0);
    expect((await readLayout(page)).length).toBe(4);
  });

  test('a drag the predicate accepts works as normal', async ({ page }) => {
    await setGrid(page, 'outsideDropAccept', true);
    await carry(page, 'lab-widget', await pointIn(page, 5, 1), false);
    await expect(placeholder(page)).toBeVisible();
    await page.mouse.up();
    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(1);
  });

  test('the predicate sees the drag\'s data types, which is how it tells the two widgets apart', async ({ page }) => {
    await setGrid(page, 'outsideDropAccept', true);
    await carry(page, 'lab-widget', await pointIn(page, 5, 1));
    const [[payload]] = await eventPayloads(page, 'item-dropped-from-outside') as [[{ dataTransfer: { types: string[] } }]];
    expect(payload.dataTransfer.types).toContain(LAB_MIME);
  });

  test('clearing the predicate goes back to accepting everything', async ({ page }) => {
    await setGrid(page, 'outsideDropAccept', true);
    await setGrid(page, 'outsideDropAccept', false);
    await carry(page, 'lab-widget-incompatible', await pointIn(page, 5, 1));
    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(1);
  });
});

test.describe('geometry of a dropped item', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', SKIP_ON_WEBKIT_REASON);
    await openLab(page);
    await setGrid(page, 'allowOutsideDrop', true);
  });

  test('lands exactly on the grid\'s pixel maths at the cell the drop reported', async ({ page }) => {
    await clearEvents(page);
    await carry(page, 'lab-widget', await pointIn(page, 0, 4));
    await expect.poll(async () => (await readLayout(page)).length).toBe(5);

    const added = (await readLayout(page)).find(cell => String(cell.i).startsWith('drop-'))!;
    const container = await gridBox(page);
    const want = expectedBox(LAB_GEOMETRY, container, added);
    await expect.poll(async () => {
      const box = await item(page, added.i).boundingBox();
      return box !== null && Math.abs(box.x - want.x) <= 1.5 && Math.abs(box.y - want.y) <= 1.5;
    }).toBe(true);
    near(want.width, 188, 1.5);
  });
});

// Angular-specific. Not in the React/Vue specs, where the element that takes the drop is the grid root a consumer sizes.
test.describe('the drop zone is the grid\'s own element, not just the part its items fill', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', SKIP_ON_WEBKIT_REASON);
    await openLab(page);
    await setGrid(page, 'allowOutsideDrop', true);
    // `fixed` hands the height to the consumer: the inner container gets none, and the host (which the consumer sizes, and the
    // lab gives a 160px minimum) is what is actually visible. Columns 5-6 are empty at every row, so a point there is over the
    // host and over no item.
    await setGrid(page, 'heightMode', 'fixed');
    await clearEvents(page);
  });

  const emptyAreaPoint = async (page: Page): Promise<{ x: number; y: number }> => {
    const box = await gridBox(page);
    return { x: box.x + LAB_GEOMETRY.marginX + COL * 5.5, y: box.y + 60 };
  };

  test('a widget dropped on an empty part of a consumer-sized grid is accepted', async ({ page }) => {
    await carry(page, 'lab-widget', await emptyAreaPoint(page));
    await expect(eventLocator(page, 'item-dropped-from-outside')).toHaveCount(1);
  });

  test('...and the placeholder is shown there while it hovers', async ({ page }) => {
    await carry(page, 'lab-widget', await emptyAreaPoint(page), false);
    await expect(placeholder(page)).toBeVisible();
    await page.mouse.up();
  });
});
