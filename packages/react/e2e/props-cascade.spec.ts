import { expect, test, type Page } from '@playwright/test';
import {
  ALL_EDGES,
  CLS,
  LAB_GEOMETRY,
  colStep,
  dragItem,
  eventPayloads,
  expectCell,
  grid,
  gridBox,
  hint,
  item,
  layoutItem,
  openLab,
  pressOnItem,
  readLayout,
  resizeItem,
  rowStep,
  setControl,
  setGrid,
  setItem,
  settledBox,
} from './lab-helpers';

/**
 * The inherit-or-override rules. `GridLayout` sets a grid-wide default; a layout ENTRY may override it for itself (React
 * has no per-item props — see `PropsLab.tsx`). The lab applies the `item-*` controls to the *target* item ("0" unless
 * changed) only, so the untouched neighbours ("1", "2", "3") show what plain inheritance looks like. Mirrors the Vue
 * package's `e2e/props-cascade.spec.ts`; where React's DOM differs the assertion follows React's actual behaviour:
 *
 *   - resize-handle colour is a custom property on each *item* that shows handles, never on the container, and an item
 *     that opts out simply gets none (Vue sets `transparent`);
 *   - border radius is an inline style only (no `use-radius` class, no close-button inset);
 *   - there is no `--resizable` class, so "resizable" means the resize-hint spans exist.
 */

const FIVE_ROWS = 5 * rowStep(LAB_GEOMETRY);

/** Drags an item five rows down — into free space for every item in the lab's layout. */
const dragDown = (page: Page, id: string): Promise<void> => dragItem(page, item(page, id), 0, FIVE_ROWS);

async function expectDraggable(page: Page, id: string): Promise<void> {
  await dragDown(page, id);
  await expectCell(page, id, { y: 5 });
}

async function expectNotDraggable(page: Page, id: string): Promise<void> {
  const before = await layoutItem(page, id);
  await dragDown(page, id);
  // A drag that wrongly started would commit within this window; prove the negative by waiting it out.
  await page.waitForTimeout(250);
  expect(await layoutItem(page, id)).toMatchObject({ x: before!.x, y: before!.y });
}

/** Grows an item one column through its east handle — free space to the right for items "1" and "2". */
const growEast = (page: Page, id: string): Promise<void> => resizeItem(page, item(page, id), 'e', colStep(LAB_GEOMETRY), 0);

async function expectResizable(page: Page, id: string): Promise<void> {
  const before = await layoutItem(page, id);
  await growEast(page, id);
  await expectCell(page, id, { w: before!.w + 1 });
}

async function expectNotResizable(page: Page, id: string): Promise<void> {
  await expect(hint(page, id, 'e')).toHaveCount(0);
}

test.describe('isDraggable: grid default and per-item override', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('on by default for every item', async ({ page }) => {
    await expectDraggable(page, '0');
    await expectDraggable(page, '1');
  });

  test('grid false: no item can be dragged', async ({ page }) => {
    await setGrid(page, 'isDraggable', false);
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.draggable));
    await expectNotDraggable(page, '0');
    await expectNotDraggable(page, '1');
  });

  test('grid false, item true: only the overriding item can be dragged', async ({ page }) => {
    await setGrid(page, 'isDraggable', false);
    await setItem(page, 'isDraggable', 'true');
    await expect(item(page, '0')).toHaveClass(new RegExp(CLS.draggable));
    await expectDraggable(page, '0');
    await expectNotDraggable(page, '1');
  });

  test('grid true, item false: only the overriding item is locked', async ({ page }) => {
    await setItem(page, 'isDraggable', 'false');
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.draggable));
    await expectNotDraggable(page, '0');
    await expectDraggable(page, '1');
  });

  test('item "inherit" follows later changes to the grid default', async ({ page }) => {
    await setGrid(page, 'isDraggable', false);
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.draggable));
    await setGrid(page, 'isDraggable', true);
    await expect(item(page, '0')).toHaveClass(new RegExp(CLS.draggable));
    await expectDraggable(page, '0');
  });
});

test.describe('isResizable: grid default and per-item override', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setControl(page, 'item-target', '2');
  });

  test('on by default for every item', async ({ page }) => {
    await expectResizable(page, '2');
    await expectResizable(page, '1');
  });

  test('grid false: no item has resize handles or can be resized', async ({ page }) => {
    await setGrid(page, 'isResizable', false);
    await expectNotResizable(page, '1');
    await expectNotResizable(page, '2');
    for(const edge of ALL_EDGES) {
      await expect(hint(page, '1', edge)).toHaveCount(0);
    }
  });

  test('grid false, item true: only the overriding item can be resized', async ({ page }) => {
    await setGrid(page, 'isResizable', false);
    await setItem(page, 'isResizable', 'true');
    await expect(hint(page, '2', 'e')).toHaveCount(1);
    await expectResizable(page, '2');
    await expectNotResizable(page, '1');
  });

  test('grid true, item false: only the overriding item loses its handles', async ({ page }) => {
    await setItem(page, 'isResizable', 'false');
    await expectNotResizable(page, '2');
    await expectResizable(page, '1');
  });
});

test.describe('isBounded: grid default and per-item override', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  /** Holds a drag far past the container's top-left corner and reports where the item is while still held. */
  async function leftTopWhileDragging(page: Page, id: string): Promise<{ x: number; y: number }> {
    const start = await pressOnItem(page, item(page, id));
    // Kept inside the viewport: the pointer is captured, but events outside the window are not reliably delivered.
    await page.mouse.move(Math.max(start.x - 500, 5), Math.max(start.y - 500, 5), { steps: 12 });
    // Poll until the live position stops changing, then read it, still holding the button.
    const settled = await settledBox(item(page, id));
    await page.mouse.up();
    return { x: settled.x, y: settled.y };
  }

  test('unbounded (the default): an item can be dragged outside the container', async ({ page }) => {
    const container = await gridBox(page);
    const position = await leftTopWhileDragging(page, '1');
    expect(position.x).toBeLessThan(container.x - 20);
  });

  test('grid isBounded: the dragged item cannot leave the container on its left or top', async ({ page }) => {
    await setGrid(page, 'isBounded', true);
    const container = await gridBox(page);
    const position = await leftTopWhileDragging(page, '1');
    expect(position.x).toBeGreaterThanOrEqual(container.x - 1);
    expect(position.y).toBeGreaterThanOrEqual(container.y - 1);
  });

  test('grid isBounded: nor on its right', async ({ page }) => {
    await setGrid(page, 'isBounded', true);
    const container = await gridBox(page);
    const start = await pressOnItem(page, item(page, '2'));
    await page.mouse.move(start.x + 400, start.y, { steps: 12 });
    const live = await settledBox(item(page, '2'));
    await page.mouse.up();
    expect(live.x + live.width).toBeLessThanOrEqual(container.x + container.width + 1);
  });

  test('grid isBounded, item false: the overriding item may leave while its neighbours may not', async ({ page }) => {
    await setGrid(page, 'isBounded', true);
    await setItem(page, 'isBounded', 'false');
    const container = await gridBox(page);

    const free = await leftTopWhileDragging(page, '0');
    expect(free.x).toBeLessThan(container.x - 20);

    const bound = await leftTopWhileDragging(page, '1');
    expect(bound.x).toBeGreaterThanOrEqual(container.x - 1);
  });

  test('grid unbounded, item true: only the overriding item is bounded', async ({ page }) => {
    await setItem(page, 'isBounded', 'true');
    const container = await gridBox(page);

    const bound = await leftTopWhileDragging(page, '0');
    expect(bound.x).toBeGreaterThanOrEqual(container.x - 1);

    const free = await leftTopWhileDragging(page, '1');
    expect(free.x).toBeLessThan(container.x - 20);
  });
});

test.describe('enableEditMode: the master interactivity switch', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  const closeButton = (page: Page, id: string) => item(page, id).locator(`.${CLS.closeButton}`);

  test('grid false: nothing can be dragged, resized, focused or closed', async ({ page }) => {
    await setGrid(page, 'showCloseButton', true);
    await setGrid(page, 'enableEditMode', false);

    await expectNotDraggable(page, '0');
    await expect(item(page, '0')).not.toHaveAttribute('tabindex', /.*/);
    await expect(item(page, '0')).not.toHaveAttribute('role', /.*/);
    await expect(closeButton(page, '0')).toHaveCount(0);
  });

  test('grid false, item true: the overriding item stays fully interactive', async ({ page }) => {
    await setGrid(page, 'showCloseButton', true);
    await setGrid(page, 'enableEditMode', false);
    await setItem(page, 'enableEditMode', 'true');

    await expectDraggable(page, '0');
    await expect(item(page, '0')).toHaveAttribute('tabindex', '0');
    await expect(closeButton(page, '0')).toHaveCount(1);
    await expectNotDraggable(page, '1');
    await expect(closeButton(page, '1')).toHaveCount(0);
  });

  test('grid true, item false: only the overriding item is locked', async ({ page }) => {
    await setItem(page, 'enableEditMode', 'false');
    await expectNotDraggable(page, '0');
    await expect(item(page, '0')).not.toHaveAttribute('tabindex', /.*/);
    await expectDraggable(page, '1');
  });

  test('it beats isDraggable/isResizable: an item that is explicitly draggable still is not, in view mode', async ({ page }) => {
    await setItem(page, 'isDraggable', 'true');
    await setItem(page, 'isResizable', 'true');
    await setItem(page, 'enableEditMode', 'false');
    await expectNotDraggable(page, '0');
    await expect(item(page, '0')).not.toHaveAttribute('tabindex', /.*/);
  });

  test('toggling it back on restores interactivity', async ({ page }) => {
    await setGrid(page, 'enableEditMode', false);
    await expectNotDraggable(page, '1');
    await setGrid(page, 'enableEditMode', true);
    await expectDraggable(page, '1');
  });
});

test.describe('showCloseButton: grid default and per-item override', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  const closeButton = (page: Page, id: string) => item(page, id).locator(`.${CLS.closeButton}`);

  test('hidden by default', async ({ page }) => {
    await expect(closeButton(page, '0')).toHaveCount(0);
  });

  test('grid true: every item shows one', async ({ page }) => {
    await setGrid(page, 'showCloseButton', true);
    for(const id of ['0', '1', '2', '3']) {
      await expect(closeButton(page, id)).toHaveCount(1);
    }
  });

  test('grid true, item false: only the overriding item hides it', async ({ page }) => {
    await setGrid(page, 'showCloseButton', true);
    await setItem(page, 'showCloseButton', 'false');
    await expect(closeButton(page, '0')).toHaveCount(0);
    await expect(closeButton(page, '1')).toHaveCount(1);
  });

  test('grid false, item true: only the overriding item shows it', async ({ page }) => {
    await setItem(page, 'showCloseButton', 'true');
    await expect(closeButton(page, '0')).toHaveCount(1);
    await expect(closeButton(page, '1')).toHaveCount(0);
  });

  test('a static item never shows one, whatever is configured', async ({ page }) => {
    await setGrid(page, 'showCloseButton', true);
    await setItem(page, 'showCloseButton', 'true');
    await setItem(page, 'isStatic', true);
    await expect(closeButton(page, '0')).toHaveCount(0);
  });

  test('clicking it removes that item and calls onItemClose with its id', async ({ page }) => {
    await setGrid(page, 'showCloseButton', true);
    await page.getByTestId('lab-clear-log').click();

    await closeButton(page, '1').click();

    await expect(item(page, '1')).toHaveCount(0);
    expect((await readLayout(page)).map(cell => cell.i)).toStrictEqual(['0', '2', '3']);
    expect(await eventPayloads(page, 'remove-grid-item')).toStrictEqual([['1']]);
  });
});

test.describe('showResizeHandles and resizeHandleColor', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  // React sets the colour on each ITEM that shows handles (never on the container), so only items are read here.
  const gridVar = (page: Page): Promise<string> =>
    grid(page).evaluate(el => (el as HTMLElement).style.getPropertyValue('--kdl-resize-handle-color').trim());
  const itemVar = (page: Page, id: string): Promise<string> =>
    item(page, id).evaluate(el => (el as HTMLElement).style.getPropertyValue('--kdl-resize-handle-color').trim());
  const hintVar = (page: Page, id: string): Promise<string> =>
    hint(page, id, 'se').evaluate(el => getComputedStyle(el).getPropertyValue('--kdl-resize-handle-color').trim());

  test('off by default: no colour is set anywhere', async ({ page }) => {
    expect(await gridVar(page)).toBe('');
    expect(await itemVar(page, '0')).toBe('');
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.showResizeHandles));
  });

  test('grid showResizeHandles gives every item the (default grey) colour', async ({ page }) => {
    await setGrid(page, 'showResizeHandles', true);
    await expect.poll(() => itemVar(page, '1')).toBe('rgb(94 94 94 / 45%)');
    await expect(item(page, '1')).toHaveClass(new RegExp(CLS.showResizeHandles));
    expect(await hintVar(page, '1')).toBe('rgb(94 94 94 / 45%)');
    // Never on the container itself.
    expect(await gridVar(page)).toBe('');
  });

  test('grid resizeHandleColor sets the colour', async ({ page }) => {
    await setGrid(page, 'showResizeHandles', true);
    await setGrid(page, 'resizeHandleColor', 'rebeccapurple');
    await expect.poll(() => itemVar(page, '1')).toBe('rebeccapurple');
    expect(await hintVar(page, '1')).toBe('rebeccapurple');
  });

  test('grid resizeHandleColor has no effect while showResizeHandles is off', async ({ page }) => {
    await setGrid(page, 'resizeHandleColor', 'rebeccapurple');
    expect(await itemVar(page, '1')).toBe('');
    await expect(item(page, '1')).not.toHaveClass(new RegExp(CLS.showResizeHandles));
  });

  test('grid on, item false: the overriding item shows no handles while its neighbours do', async ({ page }) => {
    await setGrid(page, 'showResizeHandles', true);
    await setItem(page, 'showResizeHandles', 'false');
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.showResizeHandles));
    // Unlike Vue (which sets `transparent`), React just sets nothing for an item that opts out.
    expect(await itemVar(page, '0')).toBe('');
    await expect(item(page, '1')).toHaveClass(new RegExp(CLS.showResizeHandles));
    expect(await itemVar(page, '1')).toBe('rgb(94 94 94 / 45%)');
  });

  test('grid off, item true: the overriding item shows handles in the default colour', async ({ page }) => {
    await setItem(page, 'showResizeHandles', 'true');
    await expect.poll(() => itemVar(page, '0')).toBe('rgb(94 94 94 / 45%)');
    await expect(item(page, '0')).toHaveClass(new RegExp(CLS.showResizeHandles));
    expect(await itemVar(page, '1')).toBe('');
  });

  test('item resizeHandleColor overrides the grid colour for that item only', async ({ page }) => {
    await setGrid(page, 'showResizeHandles', true);
    await setGrid(page, 'resizeHandleColor', 'rebeccapurple');
    await setItem(page, 'showResizeHandles', 'true');
    await setItem(page, 'resizeHandleColor', '#ff0000');
    await expect.poll(() => itemVar(page, '0')).toBe('#ff0000');
    expect(await hintVar(page, '1')).toBe('rebeccapurple');
  });
});

test.describe('useBorderRadius and borderRadiusPx', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  // The radius is an inline style only: React has no `use-radius` class and no close-button inset custom property.
  const radius = (page: Page, id: string): Promise<string> => item(page, id).evaluate(el => (el as HTMLElement).style.borderRadius);

  test('off by default: no radius', async ({ page }) => {
    expect(await radius(page, '0')).toBe('');
  });

  test('grid on: every item is rounded by the grid\'s borderRadiusPx', async ({ page }) => {
    await setGrid(page, 'useBorderRadius', true);
    await setGrid(page, 'borderRadiusPx', 25);
    await expect.poll(() => radius(page, '1')).toBe('25px');
    expect(await radius(page, '0')).toBe('25px');
  });

  test('grid off, item true: only the overriding item is rounded, using the grid\'s radius', async ({ page }) => {
    await setGrid(page, 'borderRadiusPx', 14);
    await setItem(page, 'useBorderRadius', 'true');
    await expect.poll(() => radius(page, '0')).toBe('14px');
    expect(await radius(page, '1')).toBe('');
  });

  test('item borderRadiusPx overrides the grid\'s radius for that item', async ({ page }) => {
    await setGrid(page, 'useBorderRadius', true);
    await setGrid(page, 'borderRadiusPx', 25);
    await setItem(page, 'borderRadiusPx', '40');
    await expect.poll(() => radius(page, '0')).toBe('40px');
    expect(await radius(page, '1')).toBe('25px');
  });

  test('grid on, item false: the overriding item stays square', async ({ page }) => {
    await setGrid(page, 'useBorderRadius', true);
    await setItem(page, 'useBorderRadius', 'false');
    await expect.poll(() => radius(page, '0')).toBe('');
    expect(await radius(page, '1')).toBe('10px');
  });
});

test.describe('resizeHandles: grid default and per-item override', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('all eight by default', async ({ page }) => {
    for(const edge of ALL_EDGES) {
      await expect(hint(page, '0', edge)).toHaveCount(1);
    }
  });

  test('the grid-wide set restricts every item', async ({ page }) => {
    await setControl(page, 'grid-resize-handle-se', false);
    await setControl(page, 'grid-resize-handle-sw', false);
    for(const id of ['0', '1']) {
      await expect(hint(page, id, 'se')).toHaveCount(0);
      await expect(hint(page, id, 'sw')).toHaveCount(0);
      for(const edge of ['n', 's', 'e', 'w', 'ne', 'nw']) {
        await expect(hint(page, id, edge)).toHaveCount(1);
      }
    }
  });

  test('an item can set its own set, ignoring the grid\'s', async ({ page }) => {
    await setControl(page, 'grid-resize-handle-se', false);
    await setControl(page, 'item-resizeHandles-inherit', false);
    for(const edge of ALL_EDGES.filter(candidate => candidate !== 'e')) {
      await setControl(page, `item-resize-handle-${edge}`, false);
    }

    for(const edge of ALL_EDGES) {
      await expect(hint(page, '0', edge)).toHaveCount(edge === 'e' ? 1 : 0);
    }
    // The neighbour still follows the grid: everything but "se".
    await expect(hint(page, '1', 'se')).toHaveCount(0);
    await expect(hint(page, '1', 'n')).toHaveCount(1);
  });

  test('an empty set removes every handle without making the item un-resizable', async ({ page }) => {
    await setControl(page, 'item-resizeHandles-inherit', false);
    for(const edge of ALL_EDGES) {
      await setControl(page, `item-resize-handle-${edge}`, false);
    }
    for(const edge of ALL_EDGES) {
      await expect(hint(page, '0', edge)).toHaveCount(0);
    }

    // ...so keyboard resizing still works (the item is still resizable, it just has no handles to grab).
    const before = await layoutItem(page, '0');
    await item(page, '0').focus();
    await page.keyboard.press('Shift+ArrowDown');
    await expectCell(page, '0', { h: before!.h + 1 });
  });

  test('a handle that is switched off and back on resizes again, not just re-renders', async ({ page }) => {
    await setControl(page, 'grid-resize-handle-e', false);
    await expect(hint(page, '1', 'e')).toHaveCount(0);
    await setControl(page, 'grid-resize-handle-e', true);
    await expect(hint(page, '1', 'e')).toHaveCount(1);

    await expectResizable(page, '1');
  });
});

test.describe('isStatic', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setItem(page, 'isStatic', true);
  });

  test('is marked static, sits behind everything, and is neither draggable nor resizable', async ({ page }) => {
    await expect(item(page, '0')).toHaveClass(new RegExp(CLS.static));
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.draggable));
    expect(Number(await item(page, '0').evaluate(el => getComputedStyle(el).zIndex))).toBeLessThan(0);
    await expectNotDraggable(page, '0');
    await expect(hint(page, '0', 'se')).toHaveCount(0);
  });

  test('has no role, tab stop or keyboard instructions — there is nothing to operate', async ({ page }) => {
    await expect(item(page, '0')).not.toHaveAttribute('tabindex', /.*/);
    await expect(item(page, '0')).not.toHaveAttribute('role', /.*/);
    await expect(item(page, '0')).not.toHaveAttribute('aria-describedby', /.*/);
  });

  test('does not respond to the keyboard', async ({ page }) => {
    const before = await layoutItem(page, '0');
    await item(page, '0').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(250);
    expect(await layoutItem(page, '0')).toMatchObject(before!);
  });

  test('turning it off again makes the item interactive', async ({ page }) => {
    await setItem(page, 'isStatic', false);
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.static));
    await expectDraggable(page, '0');
    // The resize handles were removed while static and re-created afterwards: they must be wired up again.
    await expectResizable(page, '0');
  });
});
