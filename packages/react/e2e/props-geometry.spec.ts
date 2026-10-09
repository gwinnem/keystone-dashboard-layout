import { expect, test } from '@playwright/test';
import {
  CLS,
  LAB_GEOMETRY,
  addItem,
  colStep,
  dragItem,
  expectAllItemsPlaced,
  expectCell,
  grid,
  gridBox,
  item,
  layoutItem,
  near,
  openLab,
  readLayout,
  resizeItem,
  rowStep,
  setControl,
  setGrid,
  setItem,
  settledBox,
} from './lab-helpers';

/**
 * Geometry, height, positioning, transitions, RTL and transformScale. Mirrors the Vue package's
 * `e2e/props-geometry.spec.ts`. React-specific differences: custom properties are `--kdl-*`; "CSS transforms" has no
 * class and is read from the inline `transform`; mirroring is a per-item class (`kdl-grid-item--rtl`) with no `dir`
 * attribute on the root.
 */

const bottomRow = async (page: import('@playwright/test').Page): Promise<number> =>
  (await readLayout(page)).reduce((max, cell) => Math.max(max, cell.y + cell.h), 0);

const inlineStyle = (page: import('@playwright/test').Page, property: string): Promise<string> =>
  grid(page).evaluate((el, name) => (el as HTMLElement).style.getPropertyValue(name).trim(), property);

test.describe('Geometry: colNum, rowHeight, margin, maxRows', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('the lab\'s own starting geometry places every item exactly', async ({ page }) => {
    await expectAllItemsPlaced(page, LAB_GEOMETRY);
  });

  test('colNum changes the column width of every item', async ({ page }) => {
    await setGrid(page, 'colNum', 24);
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, colNum: 24 });

    await setGrid(page, 'colNum', 16);
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, colNum: 16 });
  });

  test('rowHeight changes every item\'s height and vertical position, and the container with it', async ({ page }) => {
    await setGrid(page, 'rowHeight', 100);
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, rowHeight: 100 });

    const bottom = await bottomRow(page);
    await expect.poll(() => inlineStyle(page, 'height')).toBe(`${bottom * (100 + 10) + 10}px`);
  });

  test('margin is two independent values: horizontal and vertical', async ({ page }) => {
    await setGrid(page, 'marginX', 30);
    await setGrid(page, 'marginY', 20);
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, marginX: 30, marginY: 20 });

    // Items "0" (x:0, w:3) and "1" (x:3) are flush neighbours, so the real gap between them is exactly marginX.
    const left = await settledBox(item(page, '0'));
    const right = await settledBox(item(page, '1'));
    near(right.x - (left.x + left.width), 30);
  });

  test('changing only the vertical margin leaves the horizontal gap alone', async ({ page }) => {
    await setGrid(page, 'marginY', 40);
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, marginY: 40 });

    const left = await settledBox(item(page, '0'));
    const right = await settledBox(item(page, '1'));
    near(right.x - (left.x + left.width), 10);
  });

  test('maxRows caps how far down an item can be dragged', async ({ page }) => {
    await setGrid(page, 'maxRows', '3');
    await dragItem(page, item(page, '0'), 0, 5 * rowStep(LAB_GEOMETRY));

    // An h:2 item may start no lower than row (maxRows - h) = 1.
    await expectCell(page, '0', { y: 1 });
  });

  test('without maxRows (Infinity) the same drag lands five rows down', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * rowStep(LAB_GEOMETRY));
    await expectCell(page, '0', { y: 5 });
  });
});

test.describe('Height: autoSize and heightMode', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('autoSize on sizes the container to its content', async ({ page }) => {
    const bottom = await bottomRow(page);
    await expect.poll(() => inlineStyle(page, 'height')).toBe(`${bottom * 70 + 10}px`);
  });

  test('the container follows the layout: adding a row of content makes it taller', async ({ page }) => {
    const before = await bottomRow(page);
    await addItem(page);
    // The new item is h:2 and placed below everything, so the bottom row moves down by two.
    await expect.poll(() => inlineStyle(page, 'height')).toBe(`${(before + 2) * 70 + 10}px`);
  });

  test('autoSize off leaves the height to the consumer', async ({ page }) => {
    await setGrid(page, 'autoSize', false);
    await expect.poll(() => inlineStyle(page, 'height')).toBe('');
  });

  test('heightMode "auto" behaves like autoSize on', async ({ page }) => {
    await setGrid(page, 'autoSize', false);
    await setGrid(page, 'heightMode', 'auto');
    const bottom = await bottomRow(page);
    await expect.poll(() => inlineStyle(page, 'height')).toBe(`${bottom * 70 + 10}px`);
  });

  test('heightMode "fixed" applies no height and no overflow', async ({ page }) => {
    await setGrid(page, 'heightMode', 'fixed');
    await expect.poll(() => inlineStyle(page, 'height')).toBe('');
    expect(await inlineStyle(page, 'overflow-y')).toBe('');
  });

  test('heightMode "scroll" applies no height but makes the container scroll vertically', async ({ page }) => {
    await setGrid(page, 'heightMode', 'scroll');
    await expect.poll(() => inlineStyle(page, 'height')).toBe('');
    expect(await inlineStyle(page, 'overflow-y')).toBe('auto');
  });

  test('heightMode "fit" locks the height to 100% of the parent and scrolls vertically', async ({ page }) => {
    await setGrid(page, 'heightMode', 'fit');
    await expect.poll(() => inlineStyle(page, 'height')).toBe('100%');
    expect(await inlineStyle(page, 'overflow-y')).toBe('auto');
  });

  test('an explicit heightMode wins outright over autoSize — in both directions', async ({ page }) => {
    await setGrid(page, 'autoSize', true);
    await setGrid(page, 'heightMode', 'fixed');
    await expect.poll(() => inlineStyle(page, 'height')).toBe('');

    await setGrid(page, 'autoSize', false);
    await setGrid(page, 'heightMode', 'auto');
    const bottom = await bottomRow(page);
    await expect.poll(() => inlineStyle(page, 'height')).toBe(`${bottom * 70 + 10}px`);
  });

  test('returning heightMode to null defers to autoSize again', async ({ page }) => {
    await setGrid(page, 'heightMode', 'fixed');
    await expect.poll(() => inlineStyle(page, 'height')).toBe('');
    await setGrid(page, 'heightMode', '');
    const bottom = await bottomRow(page);
    await expect.poll(() => inlineStyle(page, 'height')).toBe(`${bottom * 70 + 10}px`);
  });
});

test.describe('Positioning: useCssTransforms and showGridLines', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('useCssTransforms on positions items with translate3d', async ({ page }) => {
    // React has no `css-transforms` class (Vue does); the inline transform is the observable.
    const target = item(page, '1');
    expect(await target.evaluate(el => (el as HTMLElement).style.transform)).toContain('translate3d');
  });

  test('useCssTransforms off positions items with top/left instead — to the same pixels', async ({ page }) => {
    await setGrid(page, 'useCssTransforms', false);
    const target = item(page, '1');

    await expect.poll(() => target.evaluate(el => (el as HTMLElement).style.transform)).toBe('');
    const style = await target.evaluate(el => ({
      left: (el as HTMLElement).style.left,
      top: (el as HTMLElement).style.top,
    }));
    expect(style.left).not.toBe('');
    expect(style.top).not.toBe('');

    // Same place on the page either way.
    await expectAllItemsPlaced(page, LAB_GEOMETRY);
  });

  test('showGridLines draws column/row lines sized to the real column step and row step', async ({ page }) => {
    await expect(grid(page)).not.toHaveClass(/kdl-grid-layout--grid-lines/);
    expect(await grid(page).evaluate(el => getComputedStyle(el, '::before').backgroundImage)).toBe('none');

    await setGrid(page, 'showGridLines', true);
    await expect(grid(page)).toHaveClass(/kdl-grid-layout--grid-lines/);
    expect(await grid(page).evaluate(el => getComputedStyle(el, '::before').backgroundImage)).toContain('linear-gradient');

    near(parseFloat(await inlineStyle(page, '--kdl-grid-line-column-size')), colStep(LAB_GEOMETRY), 0.5);
    near(parseFloat(await inlineStyle(page, '--kdl-grid-line-row-size')), rowStep(LAB_GEOMETRY), 0.5);
  });

  test('grid line sizes follow colNum, rowHeight and margin', async ({ page }) => {
    await setGrid(page, 'showGridLines', true);
    await setGrid(page, 'colNum', 24);
    await setGrid(page, 'rowHeight', 100);
    await setGrid(page, 'marginX', 20);
    await setGrid(page, 'marginY', 30);

    const geometry = { ...LAB_GEOMETRY, colNum: 24, marginX: 20, marginY: 30, rowHeight: 100 };
    await expect.poll(async () => parseFloat(await inlineStyle(page, '--kdl-grid-line-column-size'))).toBeCloseTo(colStep(geometry), 0);
    await expect.poll(async () => parseFloat(await inlineStyle(page, '--kdl-grid-line-row-size'))).toBeCloseTo(rowStep(geometry), 0);
  });
});

test.describe('Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('transitionDurationMs and transitionTimingFunction reach the container as CSS custom properties', async ({ page }) => {
    await setGrid(page, 'transitionDurationMs', 750);
    await setGrid(page, 'transitionTimingFunction', 'linear');

    await expect.poll(() => inlineStyle(page, '--kdl-transition-duration')).toBe('750ms');
    await expect.poll(() => inlineStyle(page, '--kdl-transition-timing')).toBe('linear');
  });

  test('...and every item\'s own transition actually uses them', async ({ page }) => {
    await setGrid(page, 'transitionDurationMs', 750);
    await setGrid(page, 'transitionTimingFunction', 'linear');

    await expect.poll(() => item(page, '0').evaluate(el => getComputedStyle(el).transitionDuration)).toContain('0.75s');
    expect(await item(page, '0').evaluate(el => getComputedStyle(el).transitionTimingFunction)).toContain('linear');
  });
});

test.describe('isMirrored (RTL)', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('every item renders mirrored', async ({ page }) => {
    // No `dir="rtl"` on the root in React: mirroring is expressed per item, as a class.
    await setGrid(page, 'isMirrored', true);
    await expect(item(page, '0')).toHaveClass(new RegExp(CLS.rtl));
    await expect(item(page, '1')).toHaveClass(new RegExp(CLS.rtl));
  });

  test('x:0 sits against the right edge and x grows leftwards', async ({ page }) => {
    const container = await gridBox(page);
    await setGrid(page, 'isMirrored', true);

    await expect.poll(async () => (await settledBox(item(page, '0'))).x).toBeGreaterThan(container.x + container.width / 2);
    const first = await settledBox(item(page, '0'));
    const wide = await settledBox(item(page, '2'));

    // Item "0" (x:0) hugs the right edge, one margin in.
    near(first.x + first.width, container.x + container.width - 10);
    // Item "2" (x:7) is further along the layout, so further left.
    expect(wide.x).toBeLessThan(first.x);
  });

  test('a drag still follows the pointer: dragging an item leftwards under RTL moves it visually left', async ({ page }) => {
    await setGrid(page, 'isMirrored', true);
    await settledBox(item(page, '1'));
    const before = await settledBox(item(page, '1'));

    await dragItem(page, item(page, '1'), -(2 * colStep(LAB_GEOMETRY)), 0);

    await expect.poll(async () => (await item(page, '1').boundingBox())!.x).toBeLessThan(before.x - 50);
  });

  test('a single item can opt out of mirroring while the rest of the grid mirrors', async ({ page }) => {
    await setGrid(page, 'isMirrored', true);
    await setItem(page, 'isMirrored', 'false');

    const container = await gridBox(page);
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.rtl));
    await expect(item(page, '1')).toHaveClass(new RegExp(CLS.rtl));
    // The opted-out item is laid out left-to-right: against the LEFT edge.
    near((await settledBox(item(page, '0'))).x, container.x + 10);
  });

  test('item isMirrored has no effect while the grid itself is not mirrored', async ({ page }) => {
    await setItem(page, 'isMirrored', 'false');
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.rtl));
    await expectAllItemsPlaced(page, LAB_GEOMETRY);
  });
});

test.describe('transformScale', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setControl(page, 'lab-stage-scale', 0.5);
  });

  test('with transformScale matching the scaled ancestor, a pointer drag maps to the right number of columns', async ({ page }) => {
    await setGrid(page, 'transformScale', 0.5);
    await settledBox(item(page, '0'));

    // Two columns on screen are 2 * colStep * 0.5 pixels wide.
    await dragItem(page, item(page, '0'), 2 * colStep(LAB_GEOMETRY) * 0.5, 0);

    await expectCell(page, '0', { x: 2 });
  });

  test('without it (transformScale 1), the same screen drag is read as unscaled pixels: only one column', async ({ page }) => {
    await settledBox(item(page, '0'));

    await dragItem(page, item(page, '0'), 2 * colStep(LAB_GEOMETRY) * 0.5, 0);

    await expectCell(page, '0', { x: 1 });
  });

  test('transformScale also corrects resizing', async ({ page }) => {
    await setGrid(page, 'transformScale', 0.5);
    await settledBox(item(page, '2'));
    const before = await layoutItem(page, '2');

    // One column on screen is colStep * 0.5 pixels; growing the right-hand edge by that adds one column.
    await resizeItem(page, item(page, '2'), 'e', colStep(LAB_GEOMETRY) * 0.5, 0);

    await expectCell(page, '2', { w: before!.w + 1 });
  });
});
