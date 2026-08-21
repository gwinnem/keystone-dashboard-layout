import { expect, test } from '@playwright/test';
import { stableBoundingBox } from './helpers';

test.describe('Per-item overrides (edge cases)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-item-overrides').click();
    await expect(page.locator('[data-grid-item-id="0"]')).toHaveClass(/kdl-grid-item--draggable/);
  });

  test('dragging a corner resize handle changes both width and height at once', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    const handle = item.locator('.kdl-resize-hint--se');
    await handle.hover();
    await page.mouse.down();
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 100, handleBox!.y + handleBox!.height / 2 + 60, { steps: 15 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.width).toBeGreaterThan(before!.width);
    const after = await item.boundingBox();
    expect(after!.height).toBeGreaterThan(before!.height);
  });

  test('preserveAspectRatio grows height proportionally when only the right edge is dragged', async ({ page }) => {
    await page.getByTestId('toggle-preserve-aspect-ratio').check();

    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();
    const startRatio = before!.width / before!.height;

    const handle = item.locator('.kdl-resize-hint--e');
    await handle.hover();
    await page.mouse.down();
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 150, handleBox!.y + handleBox!.height / 2, { steps: 15 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.width).toBeGreaterThan(before!.width);
    const after = await item.boundingBox();
    expect(after!.height).toBeGreaterThan(before!.height);
    const afterRatio = after!.width / after!.height;
    expect(Math.abs(afterRatio - startRatio)).toBeLessThan(0.35);
  });

  test('setting isResizable to false via the tri-state select removes every resize-hint span', async ({ page }) => {
    await page.getByTestId('select-is-resizable').selectOption(`false`);

    const item = page.locator('[data-grid-item-id="0"]');
    // React's own classNames array has no `--resizable` equivalent to
    // Vue's `.vue-resizable` (confirmed by reading GridItem.tsx directly
    // — only `--draggable`/`--dragging`/`--resizing`/etc. exist), so
    // "not resizable" is checked via the absence of every resize-hint
    // span instead, the same observable effect a real user would see.
    for(const edgeClass of [`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`]) {
      await expect(item.locator(`.kdl-resize-hint--${edgeClass}`)).toHaveCount(0);
    }
  });

  test('setting isDraggable to false via the tri-state select prevents movement', async ({ page }) => {
    await page.getByTestId('select-is-draggable').selectOption(`false`);

    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    const box = (await item.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2 + 60, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const after = await item.boundingBox();
    expect(after!.x).toBeCloseTo(before!.x, 0);
    expect(after!.y).toBeCloseTo(before!.y, 0);
  });

  test('the default dragIgnoreFrom prevents a drag from starting on the inner button, but the item itself still drags', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    const button = item.locator(`.item-inner-button`);
    await button.hover();
    await page.mouse.down();
    const buttonBox = await button.boundingBox();
    await page.mouse.move(buttonBox!.x + 100, buttonBox!.y + 60, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const afterIgnoredDrag = await item.boundingBox();
    expect(afterIgnoredDrag!.x).toBeCloseTo(before!.x, 0);
    expect(afterIgnoredDrag!.y).toBeCloseTo(before!.y, 0);

    // The item itself (outside the ignored button) should still drag
    // normally.
    const box = (await item.boundingBox())!;
    const clickX = box.x + box.width * 0.3;
    const clickY = box.y + box.height * 0.75;
    await page.mouse.move(clickX, clickY);
    await page.mouse.down();
    await page.mouse.move(clickX + 100, clickY + 30, { steps: 15 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.x).toBeGreaterThan(before!.x);
  });

  test('dragAllowFrom set to a button handle works even with the default dragIgnoreFrom="a, button" still in place', async ({ page }) => {
    await page.getByTestId('input-drag-allow-from').fill('.item-inner-button');

    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    const button = item.locator('.item-inner-button');
    await button.hover();
    await page.mouse.down();
    const buttonBox = await button.boundingBox();
    await page.mouse.move(buttonBox!.x + 100, buttonBox!.y + 60, { steps: 15 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.x).toBeGreaterThan(before!.x);
  });

  test('resizeIgnoreFrom matching a specific resize-hint class disables just that handle', async ({ page }) => {
    await page.getByTestId('input-resize-ignore-from').fill(`.kdl-resize-hint--se`);

    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    const seHandle = item.locator('.kdl-resize-hint--se');
    await seHandle.hover();
    await page.mouse.down();
    const seBox = await seHandle.boundingBox();
    await page.mouse.move(seBox!.x + seBox!.width / 2 + 100, seBox!.y + seBox!.height / 2 + 60, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const afterIgnored = await item.boundingBox();
    expect(afterIgnored!.width).toBe(before!.width);
    expect(afterIgnored!.height).toBe(before!.height);

    // A different handle, not matched by resizeIgnoreFrom, should still work.
    const sHandle = item.locator('.kdl-resize-hint--s');
    await sHandle.hover();
    await page.mouse.down();
    const sBox = await sHandle.boundingBox();
    await page.mouse.move(sBox!.x + sBox!.width / 2, sBox!.y + sBox!.height / 2 + 60, { steps: 15 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.height).toBeGreaterThan(before!.height);
  });

  test('unchecking a resizeHandles edge removes that handle from the item, without disabling resize entirely', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    for(const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      await expect(item.locator(`.kdl-resize-hint--${edge}`)).toHaveCount(1);
    }

    await page.getByTestId('toggle-resize-handle-se').uncheck();
    await page.getByTestId('toggle-resize-handle-sw').uncheck();

    await expect(item.locator('.kdl-resize-hint--se')).toHaveCount(0);
    await expect(item.locator('.kdl-resize-hint--sw')).toHaveCount(0);
    for(const edge of ['n', 's', 'e', 'w', 'ne', 'nw']) {
      await expect(item.locator(`.kdl-resize-hint--${edge}`)).toHaveCount(1);
    }
    // Same class-parity note as the isResizable:false test above —
    // React has no `--resizable` class to check; the remaining, still-
    // present resize-hint spans are the actual, observable confirmation
    // that resize itself is still enabled overall.
  });

  test('a resize gesture still works from a handle that remains checked after unchecking others', async ({ page }) => {
    await page.getByTestId('toggle-resize-handle-n').uncheck();
    await page.getByTestId('toggle-resize-handle-w').uncheck();
    await page.getByTestId('toggle-resize-handle-ne').uncheck();
    await page.getByTestId('toggle-resize-handle-nw').uncheck();
    await page.getByTestId('toggle-resize-handle-sw').uncheck();

    const item = page.locator('[data-grid-item-id="0"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    const handle = item.locator('.kdl-resize-hint--e');
    await handle.hover();
    await page.mouse.down();
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 100, handleBox!.y + handleBox!.height / 2, { steps: 15 });
    await page.mouse.up();

    await expect.poll(async () => (await item.boundingBox())!.width).toBeGreaterThan(before!.width);
  });

  test('the header prop renders a distinct header region above the item content', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    await expect(item.locator('.kdl-grid-item-header')).toHaveCount(0);
    await expect(item).not.toHaveClass(/kdl-grid-item--has-header/);

    await page.getByTestId('toggle-item-header').check();

    await expect(item).toHaveClass(/kdl-grid-item--has-header/);
    const header = item.locator('.kdl-grid-item-header');
    await expect(header).toHaveCount(1);
    await expect(header).toContainText('header slot');
    await expect(item.locator('.kdl-grid-item-body')).toContainText('Item 0');
  });

  test('an explicit zIndex on item "0" keeps it visually above item "1" while dragged over it', async ({ page }) => {
    await page.getByTestId('input-item-z-index').fill('999');

    const item0 = page.locator('[data-grid-item-id="0"]');
    const item1 = page.locator('[data-grid-item-id="1"]');
    await expect(item0).toHaveCSS('z-index', '999');

    const box0 = (await item0.boundingBox())!;
    const box1 = (await item1.boundingBox())!;
    await page.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2);
    await page.mouse.down();
    await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2, { steps: 15 });

    await expect(item0).toHaveCSS('z-index', '999');

    await page.mouse.up();
  });
});
