import { expect, test, type Page } from '@playwright/test';
import {
  clearEvents,
  eventLocator,
  eventPayloads,
  expectCell,
  item,
  openLab,
  setControl,
  setGrid,
  setItem,
  settledBox,
} from './lab-helpers';

const DEFAULT_ROLE = 'Draggable, resizable item';
const DEFAULT_MOVE = 'Press arrow keys to move.';
const DEFAULT_RESIZE = 'Press shift plus arrow keys to resize.';
const DEFAULT_CLOSE = 'Close';

/** The item's keyboard-instruction text, whitespace-normalised (the markup puts the two sentences on separate lines). */
async function instructions(page: Page, id: string): Promise<string> {
  const describedBy = await item(page, id).getAttribute('aria-describedby');
  if(!describedBy) {
    return '';
  }
  return ((await page.locator(`[id="${describedBy}"]`).textContent()) ?? '').replace(/\s+/g, ' ').trim();
}

const closeLabel = (page: Page, id: string): Promise<string> =>
  item(page, id).locator('.btn-close .visually-hidden').innerText();

test.describe('role, tab stop and keyboard instructions', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('an interactive item is a focusable "group" described by its instructions', async ({ page }) => {
    await expect(item(page, '0')).toHaveAttribute('role', 'group');
    await expect(item(page, '0')).toHaveAttribute('tabindex', '0');
    await expect(item(page, '0')).toHaveAttribute('aria-roledescription', DEFAULT_ROLE);
    expect(await instructions(page, '0')).toBe(`${DEFAULT_MOVE} ${DEFAULT_RESIZE}`);
  });

  test('every item points at its own instruction element', async ({ page }) => {
    const ids = await Promise.all(['0', '1', '2', '3'].map(id => item(page, id).getAttribute('aria-describedby')));
    expect(new Set(ids).size).toBe(4);
    for(const id of ids) {
      await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    }
  });

  test('the instructions are hidden visually but available to assistive tech', async ({ page }) => {
    const describedBy = await item(page, '0').getAttribute('aria-describedby');
    const box = await page.locator(`[id="${describedBy}"]`).boundingBox();
    // The visually-hidden pattern clips to a 1x1 box rather than display:none, which would hide it from screen readers.
    expect(box!.width).toBeLessThanOrEqual(1.5);
    expect(box!.height).toBeLessThanOrEqual(1.5);
  });

  test('draggable but not resizable: only the move instruction', async ({ page }) => {
    await setItem(page, 'isResizable', 'false');
    expect(await instructions(page, '0')).toBe(DEFAULT_MOVE);
    await expect(item(page, '0')).toHaveAttribute('role', 'group');
  });

  test('resizable but not draggable: only the resize instruction', async ({ page }) => {
    await setItem(page, 'isDraggable', 'false');
    expect(await instructions(page, '0')).toBe(DEFAULT_RESIZE);
    await expect(item(page, '0')).toHaveAttribute('role', 'group');
  });

  test('neither draggable nor resizable: no role, no tab stop, no description', async ({ page }) => {
    await setItem(page, 'isDraggable', 'false');
    await setItem(page, 'isResizable', 'false');
    await expect(item(page, '0')).not.toHaveAttribute('role', /.*/);
    await expect(item(page, '0')).not.toHaveAttribute('tabindex', /.*/);
    await expect(item(page, '0')).not.toHaveAttribute('aria-describedby', /.*/);
    await expect(item(page, '0')).not.toHaveAttribute('aria-roledescription', /.*/);
  });

  test('a static item has none of it', async ({ page }) => {
    await setItem(page, 'isStatic', true);
    await expect(item(page, '0')).not.toHaveAttribute('role', /.*/);
    await expect(item(page, '0')).not.toHaveAttribute('tabindex', /.*/);
    await expect(item(page, '0')).not.toHaveAttribute('aria-describedby', /.*/);
  });

  test('view mode (enableEditMode off) removes it too', async ({ page }) => {
    await setGrid(page, 'enableEditMode', false);
    await expect(item(page, '0')).not.toHaveAttribute('role', /.*/);
    await expect(item(page, '0')).not.toHaveAttribute('tabindex', /.*/);
  });

  test('the resize hints are hidden from assistive tech', async ({ page }) => {
    await expect(item(page, '0').locator('.vue-resize-hint--se')).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe('ariaLabels', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('the close button\'s accessible label defaults to "Close"', async ({ page }) => {
    await setGrid(page, 'showCloseButton', true);
    expect(await closeLabel(page, '0')).toBe(DEFAULT_CLOSE);
  });

  test('grid-wide: closeButton', async ({ page }) => {
    await setGrid(page, 'showCloseButton', true);
    await setGrid(page, 'aria-closeButton', 'Schließen');
    await expect.poll(() => closeLabel(page, '1')).toBe('Schließen');
    expect(await closeLabel(page, '0')).toBe('Schließen');
  });

  test('grid-wide: itemRoleDescription', async ({ page }) => {
    await setGrid(page, 'aria-itemRoleDescription', 'Verschiebbares Element');
    await expect(item(page, '2')).toHaveAttribute('aria-roledescription', 'Verschiebbares Element');
  });

  test('grid-wide: moveInstruction and resizeInstruction', async ({ page }) => {
    await setGrid(page, 'aria-moveInstruction', 'Pfeiltasten zum Verschieben.');
    await setGrid(page, 'aria-resizeInstruction', 'Umschalt plus Pfeiltasten zum Ändern der Größe.');
    await expect.poll(() => instructions(page, '1')).toBe('Pfeiltasten zum Verschieben. Umschalt plus Pfeiltasten zum Ändern der Größe.');
  });

  test('only the keys that are set change; the rest keep their English default', async ({ page }) => {
    await setGrid(page, 'aria-moveInstruction', 'Pfeiltasten zum Verschieben.');
    await expect.poll(() => instructions(page, '1')).toBe(`Pfeiltasten zum Verschieben. ${DEFAULT_RESIZE}`);
    await expect(item(page, '1')).toHaveAttribute('aria-roledescription', DEFAULT_ROLE);
  });

  test('a translated instruction is only read for the capability the item has', async ({ page }) => {
    await setGrid(page, 'aria-moveInstruction', 'Pfeiltasten zum Verschieben.');
    await setItem(page, 'isDraggable', 'false');
    expect(await instructions(page, '0')).toBe(DEFAULT_RESIZE);
    expect(await instructions(page, '1')).toBe(`Pfeiltasten zum Verschieben. ${DEFAULT_RESIZE}`);
  });

  test('per-item labels override the grid-wide ones for that item only', async ({ page }) => {
    await setGrid(page, 'aria-itemRoleDescription', 'Grid role');
    await setItem(page, 'aria-itemRoleDescription', 'Item role');
    await expect(item(page, '0')).toHaveAttribute('aria-roledescription', 'Item role');
    await expect(item(page, '1')).toHaveAttribute('aria-roledescription', 'Grid role');
  });

  test('the three layers merge key by key: defaults, then grid, then item', async ({ page }) => {
    await setGrid(page, 'aria-moveInstruction', 'Grid move.');
    await setItem(page, 'aria-resizeInstruction', 'Item resize.');
    // The item sets only resize; move comes from the grid; the role keeps its default.
    expect(await instructions(page, '0')).toBe('Grid move. Item resize.');
    await expect(item(page, '0')).toHaveAttribute('aria-roledescription', DEFAULT_ROLE);
    // A neighbour sees the grid's move and the built-in resize.
    expect(await instructions(page, '1')).toBe(`Grid move. ${DEFAULT_RESIZE}`);
  });

  test('a per-item close label overrides the grid\'s', async ({ page }) => {
    await setGrid(page, 'showCloseButton', true);
    await setGrid(page, 'aria-closeButton', 'Fermer');
    await setItem(page, 'aria-closeButton', 'Entfernen');
    await expect.poll(() => closeLabel(page, '0')).toBe('Entfernen');
    expect(await closeLabel(page, '1')).toBe('Fermer');
  });

  test('clearing a label goes back to the next layer down', async ({ page }) => {
    await setGrid(page, 'aria-itemRoleDescription', 'Grid role');
    await setItem(page, 'aria-itemRoleDescription', 'Item role');
    await expect(item(page, '0')).toHaveAttribute('aria-roledescription', 'Item role');

    await setItem(page, 'aria-itemRoleDescription', '');
    await expect(item(page, '0')).toHaveAttribute('aria-roledescription', 'Grid role');

    await setGrid(page, 'aria-itemRoleDescription', '');
    await expect(item(page, '0')).toHaveAttribute('aria-roledescription', DEFAULT_ROLE);
  });
});

test.describe('keyboard: moving', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  // Item "1" (x3 y0 w2 h3) has free space to its right and below it.

  test('each arrow key moves a focused item one cell', async ({ page }) => {
    await item(page, '1').focus();
    await page.keyboard.press('ArrowRight');
    await expectCell(page, '1', { x: 4, y: 0 });
    await page.keyboard.press('ArrowDown');
    await expectCell(page, '1', { x: 4, y: 1 });
    await page.keyboard.press('ArrowLeft');
    await expectCell(page, '1', { x: 3, y: 1 });
    await page.keyboard.press('ArrowUp');
    await expectCell(page, '1', { x: 3, y: 0 });
  });

  test('it clamps at the left and top edges', async ({ page }) => {
    await item(page, '0').focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);
    await expectCell(page, '0', { x: 0, y: 0 });
  });

  test('it clamps at the right edge: x + w never passes the column count', async ({ page }) => {
    // Item "2" is x:7 w:4, so one move right reaches the last column and a second goes nowhere.
    await item(page, '2').focus();
    await page.keyboard.press('ArrowRight');
    await expectCell(page, '2', { x: 8 });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    await expectCell(page, '2', { x: 8 });
  });

  test('a move into the edge emits no events', async ({ page }) => {
    await clearEvents(page);
    await item(page, '0').focus();
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);
    await expect(eventLocator(page, 'item-moved')).toHaveCount(0);
  });

  test('a keyboard move reports its destination', async ({ page }) => {
    // Clearing the log clicks a button, which would take focus away from the item: do it first.
    await clearEvents(page);
    await item(page, '1').focus();
    await page.keyboard.press('ArrowDown');
    await expectCell(page, '1', { y: 1 });
    expect((await eventPayloads(page, 'item-moved')).at(-1)).toStrictEqual(['1', 3, 1]);
  });

  test('keys other than the arrows are ignored', async ({ page }) => {
    await item(page, '1').focus();
    for(const key of ['Enter', 'Space', 'a', 'T', 'Escape']) {
      await page.keyboard.press(key);
    }
    await page.waitForTimeout(200);
    await expectCell(page, '1', { h: 3, w: 2, x: 3, y: 0 });
  });

  test('Ctrl/Alt/Meta + arrow are left to the browser and the OS', async ({ page }) => {
    await item(page, '1').focus();
    for(const combo of ['Control+ArrowRight', 'Alt+ArrowDown', 'Meta+ArrowRight']) {
      await page.keyboard.press(combo);
    }
    await page.waitForTimeout(200);
    await expectCell(page, '1', { h: 3, w: 2, x: 3, y: 0 });
  });

  test('isDraggable false: arrow keys do nothing, but Shift+arrow still resizes', async ({ page }) => {
    await setControl(page, 'item-target', '1');
    await setItem(page, 'isDraggable', 'false');
    await item(page, '1').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    await expectCell(page, '1', { x: 3 });
    await page.keyboard.press('Shift+ArrowRight');
    await expectCell(page, '1', { w: 3 });
  });

  test('a static item ignores the keyboard', async ({ page }) => {
    await setControl(page, 'item-target', '1');
    await setItem(page, 'isStatic', true);
    await item(page, '1').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(200);
    await expectCell(page, '1', { h: 3, w: 2, x: 3 });
  });

  test('view mode ignores the keyboard', async ({ page }) => {
    await setGrid(page, 'enableEditMode', false);
    await item(page, '1').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    await expectCell(page, '1', { x: 3 });
  });
});

test.describe('keyboard: resizing', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setControl(page, 'item-target', '1');
  });

  test('Shift+arrow resizes by one unit and leaves the position alone', async ({ page }) => {
    await item(page, '1').focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expectCell(page, '1', { h: 3, w: 3, x: 3, y: 0 });
    await page.keyboard.press('Shift+ArrowDown');
    await expectCell(page, '1', { h: 4, w: 3 });
    await page.keyboard.press('Shift+ArrowLeft');
    await expectCell(page, '1', { w: 2 });
    await page.keyboard.press('Shift+ArrowUp');
    await expectCell(page, '1', { h: 3 });
  });

  test('it never shrinks below one unit', async ({ page }) => {
    await item(page, '1').focus();
    for(let press = 0; press < 5; press += 1) {
      await page.keyboard.press('Shift+ArrowLeft');
    }
    await expectCell(page, '1', { w: 1 });
  });

  test('it respects minW, maxW, minH and maxH', async ({ page }) => {
    await setItem(page, 'minW', '2');
    await setItem(page, 'maxW', '2');
    await setItem(page, 'minH', '3');
    await setItem(page, 'maxH', '3');
    await item(page, '1').focus();

    for(const combo of ['Shift+ArrowLeft', 'Shift+ArrowRight', 'Shift+ArrowUp', 'Shift+ArrowDown']) {
      await page.keyboard.press(combo);
    }
    await page.waitForTimeout(200);
    await expectCell(page, '1', { h: 3, w: 2 });
  });

  test('it cannot grow past the right-hand edge of the grid', async ({ page }) => {
    await setControl(page, 'item-target', '2');
    await item(page, '2').focus();
    // x:7 w:4 -> w:5 reaches column 12; a further press goes nowhere.
    await page.keyboard.press('Shift+ArrowRight');
    await expectCell(page, '2', { w: 5 });
    await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(200);
    await expectCell(page, '2', { w: 5 });
  });

  test('isResizable false: Shift+arrow does nothing, but plain arrows still move', async ({ page }) => {
    await setItem(page, 'isResizable', 'false');
    await item(page, '1').focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(200);
    await expectCell(page, '1', { w: 2 });
    await page.keyboard.press('ArrowRight');
    await expectCell(page, '1', { x: 4 });
  });

  test('a keyboard resize reports the new size', async ({ page }) => {
    await clearEvents(page);
    await item(page, '1').focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expectCell(page, '1', { w: 3 });
    expect((await eventPayloads(page, 'resized')).at(-1)!.slice(0, 3)).toStrictEqual(['1', 3, 3]);
  });
});

test.describe('keyboard: mirrored (RTL)', () => {
  test('arrow keys follow what is on screen: ArrowLeft moves the item visually left', async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'isMirrored', true);
    const before = await settledBox(item(page, '1'));

    await item(page, '1').focus();
    await page.keyboard.press('ArrowLeft');

    // In RTL, "visually left" is the direction x grows.
    await expectCell(page, '1', { x: 4 });
    await expect.poll(async () => (await item(page, '1').boundingBox())!.x).toBeLessThan(before.x);
  });

  test('ArrowRight moves it back, visually right', async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'isMirrored', true);
    await item(page, '1').focus();
    await page.keyboard.press('ArrowLeft');
    await expectCell(page, '1', { x: 4 });
    await page.keyboard.press('ArrowRight');
    await expectCell(page, '1', { x: 3 });
  });
});

test.describe('keyboard: focus order', () => {
  test('Tab reaches the next item after the one before it, passing through its inner button', async ({ page }) => {
    await openLab(page);
    await item(page, '0').focus();

    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.className)).toContain('lab-inner-button');

    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-grid-item-id'))).toBe('1');
  });

  test('Shift+Tab goes back', async ({ page }) => {
    await openLab(page);
    await item(page, '1').focus();
    await page.keyboard.press('Shift+Tab');
    // Back through item 0's inner button, then item 0 itself.
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-grid-item-id'))).toBe('0');
  });
});
