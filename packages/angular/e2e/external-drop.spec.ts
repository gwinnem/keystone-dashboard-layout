import { expect, test } from '@playwright/test';

// Same Playwright+WebKit limitation the Vue/React packages' own
// external-drop.spec.ts documents: Chromium has CDP support translating
// synthetic page.mouse events into real dragstart/dragover/drop events
// for a native-draggable element; WebKit has no equivalent, so a native
// HTML5 drag-and-drop sequence never fires there at all. Only tests
// that drag a palette widget (native draggable="true") need this skip —
// the cross-grid test at the bottom, using the library's own
// pointer-based allowCrossGridDrag instead, is unaffected.
const SKIP_ON_WEBKIT_REASON = 'Native HTML5 drag-and-drop cannot be simulated via page.mouse in WebKit (no CDP-equivalent translation layer) — a Playwright/browser limitation, not an app bug.';

test.describe('allowOutsideDrop (drag & drop from outside)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-external-drop').click();
    await expect(page.locator('[data-grid-item-id="left-0"]')).toBeVisible();
  });

  test('dropping a widget onto the right (initially empty) grid adds it there', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', SKIP_ON_WEBKIT_REASON);

    const widget = page.getByTestId('drop-widget-a');
    const widgetBox = await widget.boundingBox();
    expect(widgetBox).not.toBeNull();

    const rightGrid = page.getByTestId('drop-grid-right').locator('.kdl-grid-layout');
    const rightBox = await rightGrid.boundingBox();
    expect(rightBox).not.toBeNull();

    await widget.hover();
    await page.mouse.down();
    await page.mouse.move(rightBox!.x + rightBox!.width / 2, rightBox!.y + Math.max(rightBox!.height / 2, 20), { steps: 10 });
    await page.mouse.up();

    await expect(page.getByTestId('drop-grid-right').locator('.demo-item')).toHaveText(['A']);
    await expect(page.getByTestId('drop-grid-left').locator('.demo-item')).toHaveText(['left-0']);
  });

  test('dropping a widget onto the left grid adds it alongside the existing item', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', SKIP_ON_WEBKIT_REASON);

    const widget = page.getByTestId('drop-widget-b');
    const widgetBox = await widget.boundingBox();
    const leftGrid = page.getByTestId('drop-grid-left').locator('.kdl-grid-layout');
    const leftBox = await leftGrid.boundingBox();
    expect(widgetBox).not.toBeNull();
    expect(leftBox).not.toBeNull();

    await widget.hover();
    await page.mouse.down();
    await page.mouse.move(leftBox!.x + leftBox!.width / 2, leftBox!.y + leftBox!.height - 10, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByTestId('drop-grid-left').locator('.demo-item')).toHaveText(['left-0', 'B']);
  });

  test('releasing a widget away from either grid drops nothing', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', SKIP_ON_WEBKIT_REASON);

    const widget = page.getByTestId('drop-widget-a');
    const widgetBox = await widget.boundingBox();
    expect(widgetBox).not.toBeNull();

    await widget.hover();
    await page.mouse.down();
    await page.mouse.move(widgetBox!.x, widgetBox!.y - 300, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByTestId('drop-grid-left').locator('.demo-item')).toHaveText(['left-0']);
    await expect(page.getByTestId('drop-grid-right').locator('.demo-item')).toHaveCount(0);
  });

  test('reset clears both grids back to their starting layout', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', SKIP_ON_WEBKIT_REASON);

    const widget = page.getByTestId('drop-widget-a');
    const rightGrid = page.getByTestId('drop-grid-right').locator('.kdl-grid-layout');
    const rightBox = await rightGrid.boundingBox();

    await widget.hover();
    await page.mouse.down();
    await page.mouse.move(rightBox!.x + rightBox!.width / 2, rightBox!.y + Math.max(rightBox!.height / 2, 20), { steps: 10 });
    await page.mouse.up();
    await expect(page.getByTestId('drop-grid-right').locator('.demo-item')).toHaveText(['A']);

    await page.getByTestId('reset-grids').click();

    await expect(page.getByTestId('drop-grid-left').locator('.demo-item')).toHaveText(['left-0']);
    await expect(page.getByTestId('drop-grid-right').locator('.demo-item')).toHaveCount(0);
  });

  test('compactType controls whether a dropped item settles upward into a gap or stays exactly where it was dropped', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', SKIP_ON_WEBKIT_REASON);

    await page.getByTestId('toggle-vertical-compact').uncheck();

    const widget = page.getByTestId('drop-widget-b');
    const leftGrid = page.getByTestId('drop-grid-left').locator('.kdl-grid-layout');
    const leftBox = await leftGrid.boundingBox();
    expect(leftBox).not.toBeNull();

    await widget.hover();
    await page.mouse.down();
    await page.mouse.move(leftBox!.x + leftBox!.width / 2, leftBox!.y + leftBox!.height - 10, { steps: 10 });
    await page.mouse.up();

    const droppedItem = page.getByTestId('drop-grid-left').locator('[data-grid-item-id]').last();
    const droppedBoxNoCompact = await droppedItem.boundingBox();
    const item0Box = await page.locator('[data-grid-item-id="left-0"]').boundingBox();
    expect(droppedBoxNoCompact!.y).toBeGreaterThan(item0Box!.y + item0Box!.height);

    await page.getByTestId('reset-grids').click();
    await page.getByTestId('toggle-vertical-compact').check();

    await widget.hover();
    await page.mouse.down();
    await page.mouse.move(leftBox!.x + leftBox!.width / 2, leftBox!.y + leftBox!.height - 10, { steps: 10 });
    await page.mouse.up();

    const droppedBoxCompact = await page.getByTestId('drop-grid-left').locator('[data-grid-item-id]').last().boundingBox();
    const item0BoxAfter = await page.locator('[data-grid-item-id="left-0"]').boundingBox();
    expect(droppedBoxCompact!.y).toBeCloseTo(item0BoxAfter!.y, 0);
  });

  test('dragging an existing item already in one grid moves it into the other grid, not just new items from the palette', async ({ page }) => {
    // Not skipped on WebKit — this is the library's own pointer-based
    // allowCrossGridDrag, not native HTML5 drag-and-drop, so the CDP
    // limitation the other tests in this file need doesn't apply here.
    const item = page.locator('[data-grid-item-id="left-0"]');
    const itemBox = await item.boundingBox();
    const rightGrid = page.getByTestId('drop-grid-right').locator('.kdl-grid-layout');
    const rightBox = await rightGrid.boundingBox();
    expect(itemBox).not.toBeNull();
    expect(rightBox).not.toBeNull();

    await page.mouse.move(itemBox!.x + itemBox!.width / 2, itemBox!.y + itemBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(rightBox!.x + rightBox!.width / 2, rightBox!.y + Math.max(rightBox!.height / 2, 20), { steps: 15 });
    await page.mouse.up();

    await expect(page.getByTestId('drop-grid-left').locator('.demo-item')).toHaveCount(0);
    await expect(page.getByTestId('drop-grid-right').locator('.demo-item')).toHaveText(['left-0']);
  });
});
