import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  ALL_EDGES,
  CLS,
  LAB_GEOMETRY,
  clearEvents,
  click,
  colStep,
  dragItem,
  eventLocator,
  expectCell,
  grabPoint,
  hint,
  item,
  layoutItem,
  openLab,
  pressOnItem,
  resizeItem,
  rowStep,
  setControl,
  setItem,
  settledBox,
} from './lab-helpers';

/**
 * Per-item settings: size limits, aspect ratio, drag/resize filters, drag activation distance, zIndex, autoHeight,
 * autoScroll and the header / resize-handle templates. Mirrors the React and Vue packages' `e2e/props-item.spec.ts`. In
 * Angular every per-item setting is an input on `<kdl-grid-item>`; the lab's `item-*` controls bind it, and also merge the
 * size limits and `isStatic` into the layout entry, because that is where the layout engine (collision, group resize) reads
 * them. Where Angular's DOM or events differ the assertion follows Angular:
 *
 *   - hint spans are `.kdl-resize-hint--*`, the header regions are `kdl-grid-item-header` / `kdl-grid-item-body`;
 *   - `autoHeight` commits through `layoutChange`, so the "tells the consumer" assertion looks for a layout change.
 */

/*
 * Item "1" (x3 y0 w2 h3) and "2" (x7 y0 w4 h4) are the resize workhorses: item "1" has free columns to its
 * right up to item "2", and item "2" has free columns to its right up to the edge of the 12-column grid.
 */

const COL = colStep(LAB_GEOMETRY);
const ROW = rowStep(LAB_GEOMETRY);

test.describe('minW / maxW / minH / maxH', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setControl(page, 'item-target', '1');
  });

  test('without them an item may grow and shrink freely (down to 1 unit)', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', 4 * COL, 0);
    await expectCell(page, '1', { w: 6 });

    await resizeItem(page, item(page, '1'), 'e', -10 * COL, 0);
    await expectCell(page, '1', { w: 1 });
  });

  test('maxW stops growth to the right', async ({ page }) => {
    await setItem(page, 'maxW', '4');
    await resizeItem(page, item(page, '1'), 'e', 5 * COL, 0);
    await expectCell(page, '1', { w: 4 });
  });

  test('maxW also stops growth to the left (resizing from the west edge)', async ({ page }) => {
    // Item "2" (x:7, w:4) dragged two columns left would become w:6; the cap holds it at 5.
    await setControl(page, 'item-target', '2');
    await setItem(page, 'maxW', '5');
    await resizeItem(page, item(page, '2'), 'w', -2 * COL, 0);
    await expectCell(page, '2', { w: 5 });
  });

  test('minW stops shrinking', async ({ page }) => {
    await setItem(page, 'minW', '2');
    await resizeItem(page, item(page, '1'), 'e', -4 * COL, 0);
    await expectCell(page, '1', { w: 2 });
  });

  test('maxH stops growth downwards', async ({ page }) => {
    await setItem(page, 'maxH', '4');
    await resizeItem(page, item(page, '1'), 's', 0, 4 * ROW);
    await expectCell(page, '1', { h: 4 });
  });

  test('minH stops shrinking', async ({ page }) => {
    await setItem(page, 'minH', '2');
    await resizeItem(page, item(page, '1'), 's', 0, -5 * ROW);
    await expectCell(page, '1', { h: 2 });
  });

  test('minH/maxH also stop a resize from the top edge', async ({ page }) => {
    // Move "1" down first so there is room above it to grow into.
    await dragItem(page, item(page, '1'), 0, 4 * ROW);
    await expectCell(page, '1', { y: 4 });

    await setItem(page, 'maxH', '4');
    await resizeItem(page, item(page, '1'), 'n', 0, -4 * ROW);
    await expect.poll(async () => (await layoutItem(page, '1'))!.h).toBe(4);
  });

  test('limits can be loosened again: clearing maxW lets the item grow past the old cap', async ({ page }) => {
    await setItem(page, 'maxW', '3');
    await resizeItem(page, item(page, '1'), 'e', 3 * COL, 0);
    await expectCell(page, '1', { w: 3 });

    await setItem(page, 'maxW', '');
    await resizeItem(page, item(page, '1'), 'e', 3 * COL, 0);
    await expect.poll(async () => (await layoutItem(page, '1'))!.w).toBeGreaterThan(3);
  });
});

test.describe('preserveAspectRatio', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setControl(page, 'item-target', '1');
  });

  test('off (the default): dragging only the east edge changes only the width', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', 2 * COL, 0);
    await expectCell(page, '1', { h: 3, w: 4 });
  });

  test('on: dragging only the east edge also grows the height, keeping the ratio', async ({ page }) => {
    await setItem(page, 'preserveAspectRatio', true);
    const before = await settledBox(item(page, '1'));
    const startRatio = before.width / before.height;

    await resizeItem(page, item(page, '1'), 'e', 2 * COL, 0);

    await expect.poll(async () => (await layoutItem(page, '1'))!.h).toBeGreaterThan(3);
    const after = await settledBox(item(page, '1'));
    expect(after.width).toBeGreaterThan(before.width);
    expect(Math.abs(after.width / after.height - startRatio)).toBeLessThan(0.35);
  });

  test('on: dragging only the south edge also grows the width', async ({ page }) => {
    await setItem(page, 'preserveAspectRatio', true);
    const before = await settledBox(item(page, '1'));
    const startRatio = before.width / before.height;

    await resizeItem(page, item(page, '1'), 's', 0, 2 * ROW);

    await expect.poll(async () => (await layoutItem(page, '1'))!.w).toBeGreaterThan(2);
    const after = await settledBox(item(page, '1'));
    expect(Math.abs(after.width / after.height - startRatio)).toBeLessThan(0.35);
  });

  test('on: a corner drag keeps the ratio too', async ({ page }) => {
    await setItem(page, 'preserveAspectRatio', true);
    const before = await settledBox(item(page, '1'));
    const startRatio = before.width / before.height;

    await resizeItem(page, item(page, '1'), 'se', 2 * COL, 2 * ROW);

    await expect.poll(async () => (await layoutItem(page, '1'))!.w).toBeGreaterThan(2);
    const after = await settledBox(item(page, '1'));
    expect(Math.abs(after.width / after.height - startRatio)).toBeLessThan(0.35);
  });

  test('only applies to the item that sets it', async ({ page }) => {
    await setItem(page, 'preserveAspectRatio', true);
    await resizeItem(page, item(page, '2'), 'e', COL, 0);
    await expectCell(page, '2', { h: 4, w: 5 });
  });
});

test.describe('dragAllowFrom, dragIgnoreFrom and resizeIgnoreFrom', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setControl(page, 'item-target', '1');
  });

  const buttonOf = (page: Page, id: string): Locator => item(page, id).locator('.lab-inner-button');

  async function dragFromButton(page: Page, id: string, dx: number): Promise<void> {
    // The centre of the button, verified to really be under that point (see grabPoint) before pressing on it.
    const start = await grabPoint(page, buttonOf(page, id), { fx: 0.5, fy: 0.5 });
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + dx, start.y, { steps: 12 });
    await page.mouse.up();
  }

  test('dragIgnoreFrom excludes the matching element from starting a drag — and only that element', async ({ page }) => {
    await setItem(page, 'dragIgnoreFrom', '.lab-inner-button');
    await dragFromButton(page, '1', 2 * COL);
    await page.waitForTimeout(250);
    await expectCell(page, '1', { x: 3 });

    await dragItem(page, item(page, '1'), 2 * COL, 0);
    await expectCell(page, '1', { x: 5 });
  });

  test('dragIgnoreFrom can exclude the whole item body, so nothing inside it starts a drag', async ({ page }) => {
    await setItem(page, 'dragIgnoreFrom', '.lab-item');
    await dragItem(page, item(page, '1'), 2 * COL, 0);
    await page.waitForTimeout(250);
    await expectCell(page, '1', { x: 3 });
  });

  test('a selector that matches nothing in the item changes nothing', async ({ page }) => {
    await setItem(page, 'dragIgnoreFrom', '.does-not-exist');
    await dragItem(page, item(page, '1'), 2 * COL, 0);
    await expectCell(page, '1', { x: 5 });
  });

  test('dragAllowFrom restricts dragging to the matching handle', async ({ page }) => {
    await setItem(page, 'dragAllowFrom', '.lab-inner-button');

    await dragItem(page, item(page, '1'), 2 * COL, 0);
    await page.waitForTimeout(250);
    await expectCell(page, '1', { x: 3 });

    await dragFromButton(page, '1', 2 * COL);
    await expectCell(page, '1', { x: 5 });
  });

  test('dragAllowFrom wins over the default dragIgnoreFrom ("a, button"), even for a <button> handle', async ({ page }) => {
    await setItem(page, 'dragAllowFrom', '.lab-inner-button');
    await dragFromButton(page, '1', 2 * COL);
    await expectCell(page, '1', { x: 5 });
  });

  test('resizeIgnoreFrom disables just the matching handle', async ({ page }) => {
    await setItem(page, 'resizeIgnoreFrom', '.kdl-resize-hint--se');

    await resizeItem(page, item(page, '1'), 'se', COL, ROW);
    await page.waitForTimeout(250);
    await expectCell(page, '1', { h: 3, w: 2 });

    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });
  });
});

test.describe('dragActivationDistance', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setControl(page, 'item-target', '1');
    await clearEvents(page);
  });

  const dragStarts = (page: Page): Locator => eventLocator(page, 'dragstart');

  /** Presses on item "1", moves `distance` pixels right, reports whether a drag began, then releases. */
  async function movePixels(page: Page, distance: number): Promise<number> {
    const start = await pressOnItem(page, item(page, '1'));
    await page.mouse.move(start.x + distance, start.y, { steps: Math.max(2, Math.round(distance / 6)) });
    await page.waitForTimeout(150);
    const started = await dragStarts(page).count();
    await page.mouse.up();
    return started;
  }

  test('by default a drag starts after about 3 pixels of movement', async ({ page }) => {
    expect(await movePixels(page, 12)).toBe(1);
  });

  test('...and not for a smaller jiggle', async ({ page }) => {
    expect(await movePixels(page, 1)).toBe(0);
  });

  test('a number sets the distance for every pointer: a short move is no longer a drag', async ({ page }) => {
    await setItem(page, 'dragActivationDistance-mode', 'number');
    await setItem(page, 'dragActivationDistance-value', '40');
    expect(await movePixels(page, 20)).toBe(0);
  });

  test('...but a long enough move still is', async ({ page }) => {
    await setItem(page, 'dragActivationDistance-mode', 'number');
    await setItem(page, 'dragActivationDistance-value', '40');
    expect(await movePixels(page, 70)).toBe(1);
  });

  test('the object form sets the mouse distance on its own', async ({ page }) => {
    await setItem(page, 'dragActivationDistance-mode', 'object');
    await setItem(page, 'dragActivationDistance-mouse', '40');
    expect(await movePixels(page, 20)).toBe(0);
  });

  test('a pointer type left unset in the object form falls back to 3px, not 0', async ({ page }) => {
    await setItem(page, 'dragActivationDistance-mode', 'object');
    await setItem(page, 'dragActivationDistance-touch', '40');
    // The mouse is unset: it keeps the default threshold, so a 12px move starts a drag...
    expect(await movePixels(page, 12)).toBe(1);
    await clearEvents(page);
    // ...and a 1px jiggle still does not.
    expect(await movePixels(page, 1)).toBe(0);
  });

  test('a drag past the threshold still lands where the pointer went', async ({ page }) => {
    await setItem(page, 'dragActivationDistance-mode', 'number');
    await setItem(page, 'dragActivationDistance-value', '10');
    await dragItem(page, item(page, '1'), 2 * COL, 0);
    await expectCell(page, '1', { x: 5 });
  });
});

test.describe('zIndex', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  const inlineZ = (page: Page, id: string): Promise<string> =>
    item(page, id).evaluate(el => (el as HTMLElement).style.zIndex);

  test('unset by default: no inline z-index', async ({ page }) => {
    expect(await inlineZ(page, '0')).toBe('');
  });

  test('an explicit value is applied as an inline z-index', async ({ page }) => {
    await setItem(page, 'zIndex', '42');
    await expect.poll(() => inlineZ(page, '0')).toBe('42');
    expect(await inlineZ(page, '1')).toBe('');
  });

  test('it wins over the implicit negative z-index of a static item', async ({ page }) => {
    await setItem(page, 'isStatic', true);
    expect(Number(await item(page, '0').evaluate(el => getComputedStyle(el).zIndex))).toBeLessThan(0);

    await setItem(page, 'zIndex', '9');
    await expect.poll(() => item(page, '0').evaluate(el => getComputedStyle(el).zIndex)).toBe('9');
  });

  test('it holds for the whole of a resize, not just at rest', async ({ page }) => {
    await setControl(page, 'item-target', '1');
    await setItem(page, 'zIndex', '77');
    await settledBox(item(page, '1'));

    const handle = hint(page, '1', 'e');
    await handle.hover();
    await page.mouse.down();
    const box = await handle.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2 + COL, box!.y + box!.height / 2, { steps: 10 });
    await expect(item(page, '1')).toHaveClass(new RegExp(CLS.resizing));
    expect(await item(page, '1').evaluate(el => getComputedStyle(el).zIndex)).toBe('77');
    await page.mouse.up();
  });

  test('clearing it returns the item to its implicit stacking', async ({ page }) => {
    await setItem(page, 'zIndex', '42');
    await expect.poll(() => inlineZ(page, '0')).toBe('42');
    await setItem(page, 'zIndex', '');
    await expect.poll(() => inlineZ(page, '0')).toBe('');
  });
});

test.describe('autoHeight', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  const wrapper = (page: Page): Locator => item(page, '0').locator('.kdl-grid-item-auto-height-wrapper');

  async function addLines(page: Page, count: number): Promise<void> {
    for(let line = 0; line < count; line += 1) {
      await click(page, 'item-add-line');
    }
  }

  test('off (the default): no measuring wrapper, and content growth does not resize the item', async ({ page }) => {
    await expect(wrapper(page)).toHaveCount(0);
    await addLines(page, 14);
    await page.waitForTimeout(300);
    expect((await layoutItem(page, '0'))!.h).toBe(2);
  });

  test('on: the item is wrapped in an auto-height element', async ({ page }) => {
    await setItem(page, 'autoHeight', true);
    await expect(wrapper(page)).toHaveCount(1);
  });

  test('on: the item grows, in whole rows, as its content grows', async ({ page }) => {
    await setItem(page, 'autoHeight', true);
    await clearEvents(page);

    await addLines(page, 14);

    await expect.poll(async () => (await layoutItem(page, '0'))!.h).toBeGreaterThan(2);
    // ...and tells the consumer through layoutChange.
    await expect.poll(async () => eventLocator(page, 'layout-change').count()).toBeGreaterThan(0);
  });

  test('switching it off stops the observing: later content growth leaves the height alone', async ({ page }) => {
    await setItem(page, 'autoHeight', true);
    await addLines(page, 14);
    await expect.poll(async () => (await layoutItem(page, '0'))!.h).toBeGreaterThan(2);

    await setItem(page, 'autoHeight', false);
    await expect(wrapper(page)).toHaveCount(0);
    const settled = (await layoutItem(page, '0'))!.h;
    await addLines(page, 10);
    await page.waitForTimeout(300);
    expect((await layoutItem(page, '0'))!.h).toBe(settled);
  });
});

test.describe('autoScroll', () => {
  test('enabling it does not get in the way of an ordinary drag', async ({ page }) => {
    // The scroll behaviour itself needs a scrollable ancestor and is exercised in item-overrides.spec.ts;
    // here, the prop is switched on and the basic gesture must be unaffected.
    await openLab(page);
    await setControl(page, 'item-target', '1');
    await setItem(page, 'autoScroll', true);
    await dragItem(page, item(page, '1'), 2 * COL, 0);
    await expectCell(page, '1', { x: 5 });
  });
});

test.describe('header template', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('absent by default', async ({ page }) => {
    await expect(item(page, '0').locator('.kdl-grid-item-header')).toHaveCount(0);
    await expect(item(page, '0').locator('.kdl-grid-item-body')).toHaveCount(0);
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.hasHeader));
  });

  test('renders a header region above a separate body, and marks the item', async ({ page }) => {
    await setItem(page, 'slot-header', true);

    await expect(item(page, '0')).toHaveClass(new RegExp(CLS.hasHeader));
    await expect(item(page, '0').locator('.kdl-grid-item-header')).toContainText('header slot');
    const header = await settledBox(item(page, '0').locator('.kdl-grid-item-header'));
    const body = await settledBox(item(page, '0').locator('.kdl-grid-item-body'));
    expect(header.y).toBeLessThan(body.y);
    await expect(item(page, '0').locator('.kdl-grid-item-body')).toContainText('Item 0');
  });

  test('only the item that supplies it gets one', async ({ page }) => {
    await setItem(page, 'slot-header', true);
    await expect(item(page, '1').locator('.kdl-grid-item-header')).toHaveCount(0);
  });

  test('removing it restores the plain layout', async ({ page }) => {
    await setItem(page, 'slot-header', true);
    await expect(item(page, '0').locator('.kdl-grid-item-header')).toHaveCount(1);
    await setItem(page, 'slot-header', false);
    await expect(item(page, '0').locator('.kdl-grid-item-header')).toHaveCount(0);
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.hasHeader));
  });
});

test.describe('resize handle template', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('absent by default', async ({ page }) => {
    await expect(page.getByTestId('lab-custom-handle')).toHaveCount(0);
  });

  test('is rendered inside every resize hint and told which edge it is for', async ({ page }) => {
    await setItem(page, 'slot-resize-handle', true);

    await expect(page.getByTestId('lab-custom-handle')).toHaveCount(8);
    for(const edge of ALL_EDGES) {
      const inside = hint(page, '0', edge).getByTestId('lab-custom-handle');
      await expect(inside).toHaveCount(1);
      await expect(inside).toHaveAttribute('data-edge', edge);
    }
  });

  test('follows resizeHandles: only the enabled edges get one', async ({ page }) => {
    await setItem(page, 'slot-resize-handle', true);
    await setControl(page, 'item-resizeHandles-inherit', false);
    for(const edge of ALL_EDGES.filter(candidate => candidate !== 'e' && candidate !== 'se')) {
      await setControl(page, `item-resize-handle-${edge}`, false);
    }
    await expect(page.getByTestId('lab-custom-handle')).toHaveCount(2);
  });

  test('does not interfere with resizing', async ({ page }) => {
    await setControl(page, 'item-target', '1');
    await setItem(page, 'slot-resize-handle', true);
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });
  });
});
