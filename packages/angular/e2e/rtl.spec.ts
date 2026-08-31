import { expect, test } from '@playwright/test';
import { stableBoundingBox } from './helpers';

test.describe('isMirrored (RTL)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-rtl').click();
    await expect(page.locator('[data-grid-item-id="0"]')).toHaveClass(/kdl-grid-item--draggable/);
  });

  test('renders with the rtl class and positions via a transform, not a literal left style', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    await expect(item).toHaveClass(/kdl-grid-item--rtl/);

    const left = await item.evaluate(el => (el as HTMLElement).style.left);
    expect(left).toBe(``);
  });

  test('dragging left moves the item visually left, in a real browser', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    // Extra settle margin on top of stableBoundingBox's own 1500ms
    // wait — same rationale as the Vue/React packages' own identical
    // RTL test: right-anchored positioning is plausibly more sensitive
    // to a wrong, still-settling container width than left-anchored
    // positioning is.
    await page.waitForTimeout(1000);
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width / 2 - 150, before!.y + before!.height / 2, { steps: 12 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.x).toBeLessThan(before!.x);
  });

  test('resizing from the left edge grows the item without moving its own right edge on screen', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    await page.waitForTimeout(1000);
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();
    const rightEdgeBefore = before!.x + before!.width;

    const handle = item.locator('.kdl-resize-hint--w');
    await handle.hover();
    await page.mouse.down();
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 - 100, handleBox!.y + handleBox!.height / 2, { steps: 15 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.width).toBeGreaterThan(before!.width);
    // Bug fix: a real, confirmed flake, not a hypothetical — a plain
    // `.boundingBox()` read immediately after the poll above resolves
    // occasionally caught the item still mid-transition on webkit
    // specifically (its own resize-end settling apparently taking
    // consistently longer there than on chromium/firefox), reporting a
    // right edge that had drifted ~35px from its own final, settled
    // position. `stableBoundingBox` (already used elsewhere in this same
    // file for the identical class of issue) waits for a genuinely
    // settled reading instead.
    const after = await stableBoundingBox(item);
    expect(after!.x + after!.width).toBeCloseTo(rightEdgeBefore, 0);
  });
});
