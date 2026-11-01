import { expect, test } from '@playwright/test';
import { stableBoundingBox } from './helpers';

// The native drag/resize engine is built on the Pointer Events API
// specifically because it unifies mouse/touch/pen input — every other
// e2e test in this project exercises it via `page.mouse`, which drives
// real Chrome mouse input (and so real `pointerdown`/`pointermove`/
// `pointerup` events too), but never actually confirms the *touch*
// input path specifically. `hasTouch: true` plus CDP's own
// `Input.dispatchTouchEvent` genuinely exercises that — a touch point
// dispatched this way is what a real touchscreen tap/drag produces,
// translated by Chromium into the same Pointer Events the engine
// listens for, not a synthetic DOM-level TouchEvent dispatched via
// `element.dispatchEvent()` (which wouldn't reliably trigger that same
// native translation). Matches the Vue/React packages' own
// `touch-input.spec.ts`. `GridItemComponent` wires up the very same
// `createNativeDraggable`/`createNativeResizable` engine from
// `keystone-dashboard-layout-core` those packages use, so the same
// gestures apply unchanged.
test.use({ hasTouch: true });

test.describe('Touch input (native engine)', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // CDP's `Input.dispatchTouchEvent` (this file's whole reason for
    // existing over a plain synthetic DOM TouchEvent) is only available
    // through a Chromium CDP session. Firefox and WebKit have no
    // equivalent Playwright exposes; skipping there rather than letting
    // `newCDPSession` throw keeps this an intentional, documented gap.
    test.skip(browserName !== `chromium`, `CDP touch events are Chromium-only`);
    await page.goto('/');
    await page.getByTestId('nav-drag-resize').click();
    await expect(page.locator('[data-grid-item-id="0"]')).toHaveClass(/kdl-grid-item--draggable/);
  });

  test('a touch drag moves an item, the same way a mouse drag does', async ({ page }) => {
    // Only the horizontal axis is asserted here, unlike Vue's/React's
    // own equivalent test: this fixture's `kdl-grid-layout` uses the
    // default VERTICAL compactType (no compactType control in this
    // scenario, unlike React's), which pulls a dropped item straight
    // back up to y:0 in a column range still free at the top — masking
    // any vertical movement. A horizontal move is never compacted away
    // (item "1" sits far to the right at x:8), so it alone is a
    // reliable signal that the touch drag itself worked.
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    const client = await page.context().newCDPSession(page);
    const startX = before!.x + before!.width / 2;
    const startY = before!.y + before!.height / 2;

    await client.send(`Input.dispatchTouchEvent`, {
      touchPoints: [{ x: startX, y: startY }],
      type: `touchStart`,
    });
    await page.waitForTimeout(50);
    await client.send(`Input.dispatchTouchEvent`, {
      touchPoints: [{ x: startX + 120, y: startY + 60 }],
      type: `touchMove`,
    });
    await page.waitForTimeout(50);
    await client.send(`Input.dispatchTouchEvent`, {
      touchPoints: [],
      type: `touchEnd`,
    });
    await page.waitForTimeout(300);

    const after = await item.boundingBox();
    expect(after!.x).toBeGreaterThan(before!.x);
  });

  test('a touch drag on the bottom-right resize handle resizes an item, the same way a mouse drag does', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="1"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    const handle = item.locator(`.kdl-resize-hint--se`);
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    const client = await page.context().newCDPSession(page);
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;

    await client.send(`Input.dispatchTouchEvent`, {
      touchPoints: [{ x: startX, y: startY }],
      type: `touchStart`,
    });
    await page.waitForTimeout(50);
    await client.send(`Input.dispatchTouchEvent`, {
      touchPoints: [{ x: startX + 80, y: startY + 60 }],
      type: `touchMove`,
    });
    await page.waitForTimeout(50);
    await client.send(`Input.dispatchTouchEvent`, {
      touchPoints: [],
      type: `touchEnd`,
    });
    await page.waitForTimeout(300);

    const after = await item.boundingBox();
    expect(after!.width).toBeGreaterThan(before!.width);
    expect(after!.height).toBeGreaterThan(before!.height);
  });
});
