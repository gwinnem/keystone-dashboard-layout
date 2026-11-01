import { expect, test, type Locator, type Page } from '@playwright/test';
import { pressOnItem, settledBox } from './lab-helpers';

/**
 * User-level cross-grid behaviour on the demo's "Cross-grid drag/drop" view (`demo/views/CrossGridView.vue`):
 * a left grid holding "A", "B" and a static "locked" item, and an initially empty right grid. Both grids render
 * `grid-item-<id>` test ids, so every item locator is scoped to its own grid.
 *
 * The prop-by-prop matrix (layoutId, event payloads, registry switching...) lives in `props-cross-grid.spec.ts`.
 */

const left = (page: Page): Locator => page.getByTestId('cross-grid-left');
const right = (page: Page): Locator => page.getByTestId('cross-grid-right');
const inLeft = (page: Page, id: string): Locator => left(page).getByTestId(`grid-item-${id}`);
const inRight = (page: Page, id: string): Locator => right(page).getByTestId(`grid-item-${id}`);

/** Presses on `source`, sweeps it over the middle of `target` and releases there. */
async function dragOnto(page: Page, source: Locator, target: Locator): Promise<void> {
  const targetBox = await settledBox(target);
  await pressOnItem(page, source);
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 60, { steps: 20 });
  await page.waitForTimeout(100);
  await page.mouse.up();
}

test.describe('allowCrossGridDrag', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-cross-grid').click();
    await expect(inLeft(page, 'A')).toHaveClass(/vue-draggable/);
  });

  test('dragging an item from the left grid into the right grid moves it there: removed from left, appears in right', async ({ page }) => {
    await dragOnto(page, inLeft(page, 'A'), right(page));

    await expect(inLeft(page, 'A')).toHaveCount(0);
    await expect(inRight(page, 'A')).toBeVisible();
    await expect(inLeft(page, 'B')).toBeVisible();
    await expect(page.getByTestId('event-log')).toContainText('dropped: "A" moved into right (from left)');
  });

  test('a drag that stays within the left grid the whole time does not move it to the right grid', async ({ page }) => {
    const target = inLeft(page, 'A');
    const start = await pressOnItem(page, target);
    await page.mouse.move(start.x + 40, start.y, { steps: 8 });
    await page.mouse.up();

    await expect(inLeft(page, 'A')).toBeVisible();
    await expect(inRight(page, 'A')).toHaveCount(0);
    await expect(page.getByTestId('event-log')).not.toContainText('dropped:');
  });

  test('releasing below both grids does not hand the item to the right grid', async ({ page }) => {
    const start = await pressOnItem(page, inLeft(page, 'A'));
    // Straight down, staying in the left grid's own column of the page and clear of the right grid's box.
    await page.mouse.move(start.x, 700, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    await expect(inRight(page, 'A')).toHaveCount(0);
    await expect(page.getByTestId('event-log')).not.toContainText('dropped:');
  });

  test('a static item cannot be dragged out of its grid', async ({ page }) => {
    await dragOnto(page, inLeft(page, 'locked'), right(page));
    await page.waitForTimeout(300);

    await expect(inLeft(page, 'locked')).toBeVisible();
    await expect(inRight(page, 'locked')).toHaveCount(0);
    await expect(page.getByTestId('event-log')).not.toContainText('dropped:');
  });

  test('without allowCrossGridDrag on the left grid, its items cannot leave it', async ({ page }) => {
    await page.getByTestId('toggle-left-enabled').uncheck();
    await dragOnto(page, inLeft(page, 'A'), right(page));
    await page.waitForTimeout(300);

    await expect(inLeft(page, 'A')).toBeVisible();
    await expect(inRight(page, 'A')).toHaveCount(0);
  });

  test('without allowCrossGridDrag on the right grid, it is not a drop target and reports nothing', async ({ page }) => {
    await page.getByTestId('toggle-right-enabled').uncheck();
    await dragOnto(page, inLeft(page, 'A'), right(page));
    await page.waitForTimeout(300);

    await expect(inLeft(page, 'A')).toBeVisible();
    await expect(inRight(page, 'A')).toHaveCount(0);
    await expect(page.getByTestId('event-log')).not.toContainText('rejected:');
  });

  test('a grid with disableExternalDrop refuses the drop: the item stays put and the refusal is logged', async ({ page }) => {
    await page.getByTestId('toggle-right-rejects').check();
    await dragOnto(page, inLeft(page, 'A'), right(page));

    await expect(page.getByTestId('event-log')).toContainText('rejected: right refused "A" from left');
    await expect(inLeft(page, 'A')).toBeVisible();
    await expect(inRight(page, 'A')).toHaveCount(0);
    await expect(page.getByTestId('event-log')).not.toContainText('dropped:');
  });

  test('turning disableExternalDrop off again lets the same drop through', async ({ page }) => {
    await page.getByTestId('toggle-right-rejects').check();
    await page.getByTestId('toggle-right-rejects').uncheck();
    await dragOnto(page, inLeft(page, 'A'), right(page));

    await expect(inRight(page, 'A')).toBeVisible();
    await expect(inLeft(page, 'A')).toHaveCount(0);
  });

  test('items travel both ways, and a refusing grid can still send its own items out', async ({ page }) => {
    await dragOnto(page, inLeft(page, 'A'), right(page));
    await expect(inRight(page, 'A')).toBeVisible();

    await page.getByTestId('toggle-right-rejects').check();
    await dragOnto(page, inRight(page, 'A'), left(page));

    await expect(inLeft(page, 'A')).toBeVisible();
    await expect(inRight(page, 'A')).toHaveCount(0);
    await expect(page.getByTestId('event-log')).toContainText('dropped: "A" moved into left (from right)');
  });

  test('dragging "A" out to the right grid then back lands it in the gap above the static "locked" item, not pushed below it (bin-pack, not push-and-compact)', async ({ page }) => {
    // "locked" occupies rows 2-3 of the left grid; the gap "A" left behind is rows 0-1, directly above it.
    await dragOnto(page, inLeft(page, 'A'), right(page));
    await expect(inRight(page, 'A')).toBeVisible();

    const leftBox = await settledBox(left(page));
    await pressOnItem(page, inRight(page, 'A'));
    await page.mouse.move(leftBox.x + 20, leftBox.y + 20, { steps: 20 });
    await page.waitForTimeout(100);
    await page.mouse.up();

    await expect(inLeft(page, 'A')).toBeVisible();
    const finalA = await settledBox(inLeft(page, 'A'));
    const finalLocked = await settledBox(inLeft(page, 'locked'));
    expect(finalA.y).toBeLessThan(finalLocked.y);
  });

  test('a static item has a permanently lower z-index, so a dragged item stays visible above it', async ({ page }) => {
    const draggedZ = await inLeft(page, 'A').evaluate(el => getComputedStyle(el).zIndex);
    const lockedZ = await inLeft(page, 'locked').evaluate(el => getComputedStyle(el).zIndex);

    expect(Number(lockedZ)).toBeLessThan(0);
    expect(draggedZ === `auto` || Number(draggedZ) > Number(lockedZ)).toBe(true);
  });

  test('a static item stays visually paintable even when the grid container has its own background', async ({ page }) => {
    await left(page).evaluate(el => {
      (el as HTMLElement).style.background = `red`;
    });

    const box = await settledBox(inLeft(page, 'locked'));
    const paintedTag = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest('[data-testid="grid-item-locked"]') ? `static-item` : (el?.className ?? `unknown`);
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });

    expect(paintedTag).toBe(`static-item`);
  });

  test('a dragged item stays visually paintable above the sibling grid it is currently being dragged over', async ({ page }) => {
    const targetBox = await settledBox(right(page));
    await pressOnItem(page, inLeft(page, 'A'));
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 60, { steps: 20 });
    await page.waitForTimeout(200);

    const draggedBox = await inLeft(page, 'A').boundingBox();
    expect(draggedBox).not.toBeNull();
    const paintedTag = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest('[data-testid="grid-item-A"]') ? `dragged-item` : (el?.className ?? `unknown`);
    }, { x: draggedBox!.x + draggedBox!.width / 2, y: draggedBox!.y + draggedBox!.height / 2 });

    await page.mouse.up();

    expect(paintedTag).toBe(`dragged-item`);
  });
});
