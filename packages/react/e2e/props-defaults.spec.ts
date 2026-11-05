import { expect, test } from '@playwright/test';
import {
  ALL_EDGES,
  CLS,
  LIBRARY_GEOMETRY,
  addItem,
  colStep,
  dragItem,
  expectAllItemsPlaced,
  expectCell,
  grid,
  hint,
  item,
  layoutItem,
  openLab,
  readLayout,
  settledBox,
} from './lab-helpers';

/**
 * Every documented default. The lab's "bind nothing" switch renders the grid with *no* behaviour props at all (only
 * callbacks), so these are the values `GridLayout`'s and `GridItem`'s own defaults produce — asserted in the real DOM,
 * not just read from the source. Mirrors the Vue package's `e2e/props-defaults.spec.ts`; the assertions that differ
 * are the ones about React's own DOM (`kdl-*` classes, `--kdl-*` custom properties, no `dir` attribute).
 */
test.describe('Library defaults (nothing bound)', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page, { libraryDefaults: true });
  });

  test('colNum 12, rowHeight 150 and a 10px margin place every item exactly', async ({ page }) => {
    await expectAllItemsPlaced(page, LIBRARY_GEOMETRY);
  });

  test('the default compactType (vertical) pulls an item up into the gap above it on the next layout pass', async ({ page }) => {
    // The lab mounts with compactType "none", so its own mount-time pass left the gap in place; switching to
    // library defaults afterwards changes the prop but does not by itself re-run compaction. Adding an item is a
    // layout pass, and it now runs under the library's own default.
    await addItem(page);
    // Item "3" starts at y:3 with row 2 empty above it; vertical compaction closes that gap.
    await expectCell(page, '3', { y: 2 });
  });

  test('autoSize (the default) sizes the container to its content: bottomY * (rowHeight + margin) + margin', async ({ page }) => {
    // Recomputed on every poll: the layout may still be compacting when the test first looks.
    await expect.poll(async () => {
      const bottom = (await readLayout(page)).reduce((max, cell) => Math.max(max, cell.y + cell.h), 0);
      const height = await grid(page).evaluate(el => getComputedStyle(el).height);
      return height === `${bottom * (150 + 10) + 10}px`;
    }).toBe(true);
  });

  test('transitions default to 200ms with an "ease" timing function', async ({ page }) => {
    const vars = await grid(page).evaluate(el => ({
      duration: (el as HTMLElement).style.getPropertyValue('--kdl-transition-duration').trim(),
      timing: (el as HTMLElement).style.getPropertyValue('--kdl-transition-timing').trim(),
    }));
    expect(vars).toStrictEqual({ duration: '200ms', timing: 'ease' });
  });

  test('the container has no grid lines and no active-drag class, and no item is mirrored', async ({ page }) => {
    // React has no `dir` attribute on the root: mirroring is a per-item class, not a container-level one.
    await expect(grid(page)).not.toHaveClass(/kdl-grid-layout--grid-lines/);
    await expect(grid(page)).not.toHaveClass(/kdl-grid-layout--active-drag/);
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.rtl));
  });

  test('items are draggable and resizable, positioned with CSS transforms, and neither static nor rounded', async ({ page }) => {
    const target = item(page, '0');
    await expect(target).toHaveClass(new RegExp(CLS.draggable));
    // No `--resizable` class exists in React: "resizable" is the presence of resize-hint spans.
    await expect(hint(page, '0', 'se')).toHaveCount(1);
    await expect(target).not.toHaveClass(new RegExp(`${CLS.static}`));
    expect(await target.evaluate(el => (el as HTMLElement).style.transform)).toContain('translate3d');
    expect(await target.evaluate(el => (el as HTMLElement).style.borderRadius)).toBe('');
  });

  test('all eight resize handles render, and no close button does', async ({ page }) => {
    for(const edge of ALL_EDGES) {
      await expect(hint(page, '0', edge)).toHaveCount(1);
    }
    await expect(item(page, '0').locator(`.${CLS.closeButton}`)).toHaveCount(0);
  });

  test('resize handles are invisible by default: nothing sets --kdl-resize-handle-color', async ({ page }) => {
    expect(await grid(page).evaluate(el => (el as HTMLElement).style.getPropertyValue('--kdl-resize-handle-color'))).toBe('');
    expect(await item(page, '0').evaluate(el => (el as HTMLElement).style.getPropertyValue('--kdl-resize-handle-color'))).toBe('');
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.showResizeHandles));
  });

  test('multiSelect is off: clicking an item selects nothing', async ({ page }) => {
    await item(page, '0').click();
    await expect(page.getByTestId('lab-selected')).toHaveText('');
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.selected));
  });

  test('undo/redo is off: a committed drag leaves nothing to undo', async ({ page }) => {
    await dragItem(page, item(page, '1'), 2 * colStep(LIBRARY_GEOMETRY), 0);
    await expectCell(page, '1', { x: 5 });
    await expect(page.getByTestId('lab-can-undo')).toHaveText('false');
    await expect(page.getByTestId('lab-undo')).toBeDisabled();
  });

  test('English ARIA strings, a "group" role and keyboard instructions on an interactive item', async ({ page }) => {
    const target = item(page, '0');
    await expect(target).toHaveAttribute('role', 'group');
    await expect(target).toHaveAttribute('tabindex', '0');
    await expect(target).toHaveAttribute('aria-roledescription', 'Draggable, resizable item');
    const describedBy = await target.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const instructions = await page.locator(`[id="${describedBy}"]`).textContent();
    expect(instructions).toContain('Press arrow keys to move.');
    expect(instructions).toContain('Press shift plus arrow keys to resize.');
  });

  test('dragIgnoreFrom defaults to "a, button": a drag started on the inner button does not move the item', async ({ page }) => {
    const target = item(page, '1');
    const before = await layoutItem(page, '1');
    const buttonBox = await settledBox(target.locator('.lab-inner-button'));

    await page.mouse.move(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(buttonBox.x + buttonBox.width / 2 + 2 * colStep(LIBRARY_GEOMETRY), buttonBox.y + buttonBox.height / 2, { steps: 12 });
    await page.mouse.up();

    // Give a (wrongly started) drag every chance to commit before asserting it did not.
    await page.waitForTimeout(250);
    expect(await layoutItem(page, '1')).toMatchObject({ x: before!.x, y: before!.y });

    // ...while the item itself, grabbed away from the button, does drag.
    await dragItem(page, target, 2 * colStep(LIBRARY_GEOMETRY), 0);
    await expectCell(page, '1', { x: before!.x + 2 });
  });

  test('items inherit isMirrored: true as their own default, which only matters once the grid itself mirrors', async ({ page }) => {
    await expect(item(page, '0')).not.toHaveClass(new RegExp(CLS.rtl));
  });
});
