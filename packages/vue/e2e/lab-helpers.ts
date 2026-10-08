import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Shared helpers for the `props-*.spec.ts` suite, which drives the demo's
 * "Props lab" view (`demo/views/PropsLabView.vue`) — a fixture that binds
 * every `GridLayout`/`GridItem` property to a control, logs every emitted
 * event, and has a button for every exposed method.
 *
 * The lab's stage is a fixed 1200px wide, so pixel maths is deterministic:
 *
 *   colWidth = (width - marginX * (colNum + 1)) / colNum
 *   left     = round(colWidth * x + (x + 1) * marginX)
 *   top      = round(rowHeight * y + (y + 1) * marginY)
 *   width    = round(colWidth * w + (w - 1) * marginX)
 *   height   = round(rowHeight * h + (h - 1) * marginY)
 *
 * Positions are asserted in *grid units* wherever possible (via the lab's
 * `lab-layout-json` readout), because that is the library's actual
 * contract; pixel boxes are only used where the pixels themselves are what
 * a property controls (margins, rowHeight, colNum, mirroring, scale...).
 */

export const LAB_VIEWPORT = { height: 1300, width: 1900 } as const;

export interface ILabBox {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface ILabItem {
  h: number;
  i: string;
  w: number;
  x: number;
  y: number;
}

export interface IGeometry {
  colNum: number;
  marginX: number;
  marginY: number;
  rowHeight: number;
  width: number;
}

/** The lab's own starting geometry (what its controls are initialised to). */
export const LAB_GEOMETRY: IGeometry = { colNum: 12, marginX: 10, marginY: 10, rowHeight: 60, width: 1200 };

/** What `GridLayout` itself uses when nothing is bound (its `withDefaults()` values). */
export const LIBRARY_GEOMETRY: IGeometry = { colNum: 12, marginX: 10, marginY: 10, rowHeight: 150, width: 1200 };

export const colWidth = (g: IGeometry): number => (g.width - g.marginX * (g.colNum + 1)) / g.colNum;
export const colStep = (g: IGeometry): number => colWidth(g) + g.marginX;
export const rowStep = (g: IGeometry): number => g.rowHeight + g.marginY;

/** The pixel box a grid cell should occupy, given where the grid itself sits on the page. */
export function expectedBox(g: IGeometry, gridBox: ILabBox, cell: { h: number; w: number; x: number; y: number }): ILabBox {
  const cw = colWidth(g);
  return {
    height: Math.round(g.rowHeight * cell.h + Math.max(0, cell.h - 1) * g.marginY),
    width: Math.round(cw * cell.w + Math.max(0, cell.w - 1) * g.marginX),
    x: gridBox.x + Math.round(cw * cell.x + (cell.x + 1) * g.marginX),
    y: gridBox.y + Math.round(g.rowHeight * cell.y + (cell.y + 1) * g.marginY),
  };
}

export const ALL_EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const;

// ------------------------------------------------------------------ navigation

export async function openLab(page: Page, options: { libraryDefaults?: boolean } = {}): Promise<void> {
  await page.setViewportSize(LAB_VIEWPORT);
  await page.goto('/');
  await page.getByTestId('nav-props-lab').click();
  await expect(page.getByTestId('grid-item-0')).toBeVisible();
  if(options.libraryDefaults) {
    await page.getByTestId('lab-use-library-defaults').check();
  }
  // The grid's own container-width measurement is what every item's pixel position derives from.
  await expect(page.getByTestId('lab-grid-width')).toHaveText('1200');
  await expect(page.getByTestId('grid-item-0')).toHaveClass(/vue-draggable/);
}

// ------------------------------------------------------------------ controls

export const item = (page: Page, id: string): Locator => page.getByTestId(`grid-item-${id}`);
export const gridItemB = (page: Page, id: string): Locator => page.getByTestId(`b-grid-item-${id}`);
export const grid = (page: Page): Locator => page.getByTestId('lab-grid');
export const hint = (page: Page, id: string, edge: string): Locator => item(page, id).locator(`.vue-resize-hint--${edge}`);

/** Sets a control by its test id — a checkbox, a `<select>`, or a text/number input, decided from the value's type and the element itself. */
export async function setControl(page: Page, testId: string, value: boolean | number | string): Promise<void> {
  const control = page.getByTestId(testId);
  if(typeof value === `boolean`) {
    if(value) {
      await control.check();
    } else {
      await control.uncheck();
    }
    return;
  }
  const tag = await control.evaluate(el => el.tagName.toLowerCase());
  if(tag === `select`) {
    await control.selectOption(String(value));
    return;
  }
  await control.fill(String(value));
}

export const setGrid = (page: Page, name: string, value: boolean | number | string): Promise<void> => setControl(page, `grid-${name}`, value);
export const setItem = (page: Page, name: string, value: boolean | number | string): Promise<void> => setControl(page, `item-${name}`, value);
export const click = (page: Page, testId: string): Promise<void> => page.getByTestId(testId).click();

// ------------------------------------------------------------------ readouts

export async function readLayout(page: Page, testId = 'lab-layout-json'): Promise<ILabItem[]> {
  const raw = await page.getByTestId(testId).textContent();
  return JSON.parse(raw ?? '[]') as ILabItem[];
}

export async function layoutItem(page: Page, id: string, testId = 'lab-layout-json'): Promise<ILabItem | undefined> {
  return (await readLayout(page, testId)).find(entry => String(entry.i) === id);
}

/** Polls the lab's layout readout until an item matches — drags/resizes commit asynchronously through `v-model:layout`. */
export async function expectCell(page: Page, id: string, expected: Partial<ILabItem>, testId = 'lab-layout-json'): Promise<void> {
  await expect.poll(async () => layoutItem(page, id, testId)).toMatchObject(expected);
}

export const eventLocator = (page: Page, name: string): Locator => page.locator(`[data-testid="event-log"] li[data-event="${name}"]`);

export async function eventPayloads(page: Page, name: string): Promise<unknown[][]> {
  return eventLocator(page, name).evaluateAll(nodes => nodes.map(node => JSON.parse(node.getAttribute(`data-payload`) ?? `[]`) as unknown[]));
}

export const clearEvents = (page: Page): Promise<void> => click(page, 'lab-clear-log');

/** Every event name in the log, in order — for asserting sequence. */
export async function eventNames(page: Page): Promise<string[]> {
  return page.locator(`[data-testid="event-log"] li`).evaluateAll(nodes => nodes.map(node => node.getAttribute(`data-event`) ?? ``));
}

// ------------------------------------------------------------------ geometry on the page

/** Waits for an element's box to stop changing (4 identical reads in a row) — polling, not a fixed sleep. */
export async function settledBox(locator: Locator): Promise<ILabBox> {
  const page = locator.page();
  let previous = await locator.boundingBox();
  let stable = 0;
  await expect.poll(async () => {
    await page.waitForTimeout(50);
    const current = await locator.boundingBox();
    const same = previous !== null && current !== null
      && previous.x === current.x && previous.y === current.y
      && previous.width === current.width && previous.height === current.height;
    stable = same ? stable + 1 : 0;
    previous = current;
    return stable;
  }, { timeout: 15_000 }).toBeGreaterThanOrEqual(4);
  const box = await locator.boundingBox();
  if(box === null) {
    throw new Error(`element has no bounding box`);
  }
  return box;
}

export async function gridBox(page: Page, testId = 'lab-grid'): Promise<ILabBox> {
  await scrollToTop(page);
  return settledBox(page.getByTestId(testId));
}

/**
 * Puts the page back at the top before a pointer gesture.
 *
 * The lab's control column is thousands of pixels tall, so reaching a control near its bottom scrolls the
 * document far enough that the grid is above the viewport. A gesture then computes a box with a negative `y`,
 * `mouse.move` goes to the wrong place, and the press lands on page text (the failure screenshots show the whole
 * column highlighted). Every gesture helper calls this first so its pixel maths always starts from the same frame.
 */
export async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => {
    // A focused form control makes Firefox scroll it back into view once the page re-renders, undoing the scroll below
    // between measuring an item and pressing on it (Chromium does not). Let go of focus first. No gesture helper
    // depends on focus: the keyboard tests focus their own item after any of these have run.
    (document.activeElement as HTMLElement | null)?.blur?.();
    window.scrollTo({ behavior: `instant` as ScrollBehavior, left: 0, top: 0 });
  });
}

export const near = (actual: number, expected: number, tolerance = 1.5): void => {
  expect(Math.abs(actual - expected), `${actual} should be within ${tolerance}px of ${expected}`).toBeLessThanOrEqual(tolerance);
};

export async function expectBoxNear(locator: Locator, expected: ILabBox, tolerance = 1.5): Promise<void> {
  const box = await settledBox(locator);
  near(box.x, expected.x, tolerance);
  near(box.y, expected.y, tolerance);
  near(box.width, expected.width, tolerance);
  near(box.height, expected.height, tolerance);
}

/**
 * Polls until every item in the lab's layout sits exactly where the geometry maths says it should.
 * Recomputes from the live layout on every attempt (items may still be compacting or settling),
 * and on failure reports *which* item and axis is off, rather than a bare "false".
 */
export async function expectAllItemsPlaced(
  page: Page,
  g: IGeometry,
  options: { gridTestId?: string; itemTestId?: (id: string) => Locator; layoutTestId?: string; tolerance?: number } = {},
): Promise<void> {
  const tolerance = options.tolerance ?? 1.5;
  const locate = options.itemTestId ?? ((id: string): Locator => item(page, id));
  await expect.poll(async () => {
    const base = await page.getByTestId(options.gridTestId ?? 'lab-grid').boundingBox();
    if(base === null) {
      return `grid has no box`;
    }
    for(const cell of await readLayout(page, options.layoutTestId ?? 'lab-layout-json')) {
      const box = await locate(String(cell.i)).boundingBox();
      if(box === null) {
        return `item ${cell.i} has no box`;
      }
      const want = expectedBox(g, base, cell);
      const axes: [string, number, number][] = [
        ['x', box.x, want.x],
        ['y', box.y, want.y],
        ['width', box.width, want.width],
        ['height', box.height, want.height],
      ];
      const off = axes.find(([, actual, expected]) => Math.abs(actual - expected) > tolerance);
      if(off) {
        return `item ${cell.i} ${off[0]}: ${off[1]} but expected ${off[2]}`;
      }
    }
    return `ok`;
  }, { timeout: 15_000 }).toBe(`ok`);
}

// ------------------------------------------------------------------ gestures

/**
 * Where on an item to grab it for a drag: low and to the left, well clear of the item's inner
 * button (which `dragIgnoreFrom` excludes by default), its resize hints on the edges, and any
 * header/handle content.
 */
export const BODY_GRAB = { fx: 0.2, fy: 0.8 } as const;

export interface IPoint {
  x: number;
  y: number;
}

/**
 * Scrolls to the top and returns the point to press on `target`, after checking that the point really is over it.
 *
 * The position is measured, then used a moment later; if anything moves the page in between (Firefox sometimes scrolls
 * back to the control that was just typed into, for a reason not pinned down), the press lands somewhere else and the
 * "drag" does nothing. Hit-testing the point and measuring again makes the press independent of whatever did that.
 */
export async function grabPoint(page: Page, target: Locator, grab: { fx: number; fy: number } = BODY_GRAB): Promise<IPoint> {
  let point: IPoint = { x: 0, y: 0 };
  for(let attempt = 0; attempt < 5; attempt += 1) {
    await scrollToTop(page);
    const box = await settledBox(target);
    point = { x: box.x + box.width * grab.fx, y: box.y + box.height * grab.fy };
    const isOverTarget = await target.evaluate((element, position) => {
      const hit = document.elementFromPoint(position.x, position.y);
      return hit !== null && element.contains(hit);
    }, point);
    if(isOverTarget) {
      return point;
    }
  }
  return point;
}

/** Presses the mouse on an item and leaves it down — pair with `page.mouse.move(...)` and `page.mouse.up()` to assert mid-gesture. */
export async function pressOnItem(page: Page, target: Locator, grab: { fx: number; fy: number } = BODY_GRAB): Promise<IPoint> {
  const start = await grabPoint(page, target, grab);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  return start;
}

export async function dragItem(
  page: Page,
  target: Locator,
  dx: number,
  dy: number,
  options: { grab?: { fx: number; fy: number }; steps?: number } = {},
): Promise<void> {
  const start = await pressOnItem(page, target, options.grab);
  await page.mouse.move(start.x + dx, start.y + dy, { steps: options.steps ?? 12 });
  await page.mouse.up();
}

/** Drags a resize handle by (dx, dy) from its own centre. Positive dx on `e`/`se`, positive dy on `s`/`se` grow the item. */
export async function resizeItem(page: Page, target: Locator, edge: string, dx: number, dy: number, steps = 15): Promise<void> {
  await scrollToTop(page);
  await settledBox(target);
  const handle = target.locator(`.vue-resize-hint--${edge}`);
  await handle.hover();
  await page.mouse.down();
  const box = await handle.boundingBox();
  if(box === null) {
    throw new Error(`resize handle "${edge}" has no bounding box`);
  }
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps });
  await page.mouse.up();
}

/** Adds an item below everything else (which, with `compactType` `none`, leaves it exactly there) and triggers a compaction pass. */
export async function addItem(page: Page): Promise<void> {
  await click(page, 'lab-add-item');
}

/**
 * Selects ids through the exposed API — handy when a test is about what selection *does*, not how a click produces it.
 * `selectItem` replaces the selection (its documented default), so only the first id uses it; the rest go through
 * `toggleItemSelection`, which adds.
 */
export async function selectIds(page: Page, ...ids: string[]): Promise<void> {
  for(const [index, id] of ids.entries()) {
    await page.getByTestId('lab-method-id').fill(id);
    await click(page, index === 0 ? 'lab-select-item' : 'lab-toggle-item');
  }
}

/**
 * Merges `patch` into the layout *entry* of item `id` (not into the `GridItem`'s props). Group move/resize read
 * `isStatic`, `isDraggable`, `isResizable` and the min/max sizes from the entry, so that is where they must be set.
 */
export async function patchTargetEntry(page: Page, id: string, patch: Record<string, unknown>): Promise<void> {
  await setControl(page, 'item-target', id);
  await page.getByTestId('lab-layout-patch').fill(JSON.stringify(patch));
  await click(page, 'lab-apply-layout-patch');
}

/** Fails the test if the page throws an uncaught error while `run` executes. */
export async function expectNoPageErrors(page: Page, run: () => Promise<void>): Promise<void> {
  const errors: Error[] = [];
  const listener = (error: Error): void => {
    errors.push(error);
  };
  page.on(`pageerror`, listener);
  try {
    await run();
  } finally {
    page.off(`pageerror`, listener);
  }
  expect(errors.map(error => error.message)).toStrictEqual([]);
}
