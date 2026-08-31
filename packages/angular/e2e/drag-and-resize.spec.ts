import { expect, test } from '@playwright/test';
import { stableBoundingBox } from './helpers';

test.describe('Drag & resize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-drag-resize').click();
    // The scenario switch mounts a fresh GridLayout/GridItem tree — the
    // native drag/resize engine's own setup needs a moment after that
    // to actually attach. Waiting for the class that setup applies is a
    // deterministic signal it's ready, rather than a fixed timeout.
    await expect(page.locator('[data-grid-item-id="0"]')).toHaveClass(/kdl-grid-item--draggable/);
  });

  test('dragging an item by its body moves it to a new position', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2 + 200, { steps: 12 });
    await page.mouse.up();

    // A drag commits its final position via layoutChange, back down as
    // an input change — async relative to the synchronous mouse-event
    // sequence above, so expect.poll retries the read rather than
    // trusting a single immediate boundingBox() call.
    await expect.poll(async () => (await item.boundingBox())!.y).not.toBeCloseTo(before!.y, 0);
  });

  test('a zero-distance drag (down then immediately up) never registers as a move', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(200);

    const after = await item.boundingBox();
    expect(after!.x).toBeCloseTo(before!.x, 0);
    expect(after!.y).toBeCloseTo(before!.y, 0);
  });

  test('resizing from the bottom edge grows the item height without changing its width', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    // The native resize engine's own hit target is the dedicated
    // `.kdl-resize-hint--s` span — using `.hover()` to reach it (rather
    // than a coordinate computed from an earlier boundingBox()
    // snapshot) so a `:hover`-driven visual shift doesn't throw off the
    // click point, matching Vue/React's own equivalent tests.
    const handle = item.locator('.kdl-resize-hint--s');
    await handle.hover();
    await page.mouse.down();
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2 + 100, { steps: 15 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.height).toBeGreaterThan(before!.height);
    const after = await item.boundingBox();
    expect(after!.width).toBe(before!.width);
  });

  test('resizing from the right edge grows the item width without changing its height', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    const handle = item.locator('.kdl-resize-hint--e');
    await handle.hover();
    await page.mouse.down();
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 90, handleBox!.y + handleBox!.height / 2, { steps: 15 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.width).toBeGreaterThan(before!.width);
    const after = await item.boundingBox();
    expect(after!.height).toBe(before!.height);
  });
});
