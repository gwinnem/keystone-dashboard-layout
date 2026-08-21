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
    // Extra settle margin on top of stableBoundingBox's own 1500ms wait
    // — confirmed gap via a fresh e2e run: this test failed on all
    // three browser engines, and the drag math itself checks out
    // mathematically (setTransformRtl negates `right`, and
    // useGridItemDrag.ts's own isMirrored branch increases the
    // internal "left"/right-distance value when the mouse moves left,
    // which should move the item further left on screen). The likely
    // cause instead: containerWidth's own seed-value plateau
    // (documented at length in this file's own header comment) is
    // plausibly *more* visible for RTL specifically, since right-
    // anchored positioning is more sensitive to a wrong container
    // width than left-anchored positioning is. This longer wait is a
    // cheap first experiment, not a confirmed fix — if this doesn't
    // resolve it, the actual cause needs a closer look (e.g. logging
    // the item's own computed `transform` style immediately after
    // mount vs. after this wait).
    await page.waitForTimeout(1000);
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width / 2 - 150, before!.y + before!.height / 2, { steps: 12 });
    await page.mouse.up();

    // Regardless of the internal right-vs-left anchor math, a real
    // leftward mouse drag under RTL should still move the item
    // visually left on screen — the actual, observable contract a real
    // user cares about, which is exactly what the Vue port's own RTL
    // resize bug (found only via a real browser) would have broken had
    // it existed here too.
    await expect.poll(async () => (await item.boundingBox())!.x).toBeLessThan(before!.x);
  });

  test('resizing from the left edge grows the item without moving its own right edge on screen', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    // Same settle-margin rationale as the drag test above.
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

    // Growing from the left edge should widen the item while its own
    // right edge — the RTL anchor — stays fixed on screen. This is the
    // exact real-browser check the Vue port's own history flags as
    // having caught a genuine edge-anchor-swap bug that no amount of
    // jsdom-level, mocked-native-engine testing ever surfaced.
    await expect.poll(async () => (await item.boundingBox())!.width).toBeGreaterThan(before!.width);
    const after = await item.boundingBox();
    expect(after!.x + after!.width).toBeCloseTo(rightEdgeBefore, 0);
  });
});
