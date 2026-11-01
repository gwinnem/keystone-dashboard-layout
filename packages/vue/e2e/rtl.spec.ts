import { expect, test } from '@playwright/test';
import {
  LAB_GEOMETRY,
  colStep,
  dragItem,
  expectCell,
  grid,
  item,
  layoutItem,
  near,
  openLab,
  resizeItem,
  setGrid,
  settledBox,
} from './lab-helpers';

/**
 * User-level RTL (`isMirrored`) behaviour on the props lab: where mirrored items sit, which way a drag, a resize
 * handle or an arrow key moves them, and which edge stays put. Layout coordinates stay logical (x:0 is the first
 * column in reading order); only what is drawn is mirrored. The property-level checks (the `dir` attribute, per-item
 * opt-out) live in `props-geometry.spec.ts`.
 */

const COL = colStep(LAB_GEOMETRY);

test.describe('isMirrored (RTL)', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'isMirrored', true);
    await expect(grid(page)).toHaveAttribute('dir', 'rtl');
    await expect(item(page, '0')).toHaveClass(/render-rtl/);
  });

  test('renders with the rtl class and positions via a transform, not a literal left style', async ({ page }) => {
    const target = item(page, '0');
    await expect(target).toHaveClass(/render-rtl/);

    const style = await target.evaluate(el => ({
      left: (el as HTMLElement).style.left,
      transform: (el as HTMLElement).style.transform,
    }));
    expect(style.left).toBe('');
    expect(style.transform).toContain('translate3d');
  });

  test('mirroring is visual only: layout coordinates stay logical, reading order runs right to left', async ({ page }) => {
    expect(await layoutItem(page, '0')).toMatchObject({ x: 0, y: 0 });
    expect(await layoutItem(page, '1')).toMatchObject({ x: 3, y: 0 });
    expect(await layoutItem(page, '2')).toMatchObject({ x: 7, y: 0 });

    const first = await settledBox(item(page, '0'));
    const second = await settledBox(item(page, '1'));
    const third = await settledBox(item(page, '2'));
    expect(second.x).toBeLessThan(first.x);
    expect(third.x).toBeLessThan(second.x);
  });

  test('dragging left moves the item visually left, in a real browser', async ({ page }) => {
    const before = await settledBox(item(page, '1'));

    await dragItem(page, item(page, '1'), -(2 * COL), 0);

    await expect.poll(async () => (await item(page, '1').boundingBox())!.x).toBeLessThan(before.x - 50);
    // Two columns further along the (right-to-left) row.
    await expectCell(page, '1', { x: 5 });
  });

  test('dragging right moves the item visually right, back towards the right-hand origin', async ({ page }) => {
    const before = await settledBox(item(page, '2'));

    await dragItem(page, item(page, '2'), 2 * COL, 0);

    await expect.poll(async () => (await item(page, '2').boundingBox())!.x).toBeGreaterThan(before.x + 50);
    await expectCell(page, '2', { x: 5 });
  });

  test('a drag towards the right wall stops at x:0 instead of leaving the grid', async ({ page }) => {
    await dragItem(page, item(page, '0'), 3 * COL, 0);
    await page.waitForTimeout(250);

    await expectCell(page, '0', { x: 0 });
    const container = await settledBox(grid(page));
    const box = await settledBox(item(page, '0'));
    near(box.x + box.width, container.x + container.width - LAB_GEOMETRY.marginX);
  });

  test('resizing from the left edge grows the item without moving its own right edge on screen', async ({ page }) => {
    const before = await settledBox(item(page, '0'));
    const rightEdgeBefore = before.x + before.width;

    await resizeItem(page, item(page, '0'), 'w', -100, 0);

    // Growing from the left edge widens the item while its own right edge, the RTL anchor, stays fixed on screen.
    await expect.poll(async () => (await item(page, '0').boundingBox())!.width).toBeGreaterThan(before.width);
    const after = await settledBox(item(page, '0'));
    near(after.x + after.width, rightEdgeBefore);
    await expectCell(page, '0', { w: 4, x: 0 });
  });

  test('resizing from the left edge back inwards shrinks it, still anchored at its right edge', async ({ page }) => {
    const before = await settledBox(item(page, '0'));
    const rightEdgeBefore = before.x + before.width;

    await resizeItem(page, item(page, '0'), 'w', COL, 0);

    await expect.poll(async () => (await item(page, '0').boundingBox())!.width).toBeLessThan(before.width);
    const after = await settledBox(item(page, '0'));
    near(after.x + after.width, rightEdgeBefore);
    await expectCell(page, '0', { w: 2, x: 0 });
  });

  test('ArrowLeft moves a focused item visually left, ArrowRight visually right', async ({ page }) => {
    const before = await settledBox(item(page, '1'));
    await item(page, '1').focus();

    await page.keyboard.press('ArrowLeft');
    await expectCell(page, '1', { x: 4 });
    await expect.poll(async () => (await item(page, '1').boundingBox())!.x).toBeLessThan(before.x);

    await page.keyboard.press('ArrowRight');
    await expectCell(page, '1', { x: 3 });
    await expect.poll(async () => (await item(page, '1').boundingBox())!.x).toBeCloseTo(before.x, 0);
  });

  test('ArrowRight at the right-hand boundary clamps at x:0 rather than leaving the grid', async ({ page }) => {
    const before = await settledBox(item(page, '0'));
    await item(page, '0').focus();

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    await expectCell(page, '0', { x: 0 });
    const after = await settledBox(item(page, '0'));
    near(after.x, before.x, 0.5);
  });

  test('Shift+ArrowLeft grows a focused item towards the left, keeping its right edge in place', async ({ page }) => {
    const before = await settledBox(item(page, '1'));
    const rightEdgeBefore = before.x + before.width;
    await item(page, '1').focus();

    await page.keyboard.press('Shift+ArrowLeft');

    await expectCell(page, '1', { w: 3, x: 3 });
    await expect.poll(async () => (await item(page, '1').boundingBox())!.width).toBeGreaterThan(before.width);
    const after = await settledBox(item(page, '1'));
    near(after.x + after.width, rightEdgeBefore);
  });

  test('switching mirroring off again puts items back against the left edge', async ({ page }) => {
    await setGrid(page, 'isMirrored', false);
    await expect(grid(page)).not.toHaveAttribute('dir', 'rtl');
    await expect(item(page, '0')).not.toHaveClass(/render-rtl/);

    const container = await settledBox(grid(page));
    const box = await settledBox(item(page, '0'));
    near(box.x, container.x + LAB_GEOMETRY.marginX);
  });
});
