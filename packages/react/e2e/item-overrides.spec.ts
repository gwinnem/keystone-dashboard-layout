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

  test('re-checking a previously-unchecked resizeHandles edge makes that handle actually resize again, not just re-render its own span', async ({ page }) => {
    // Regression test for a real, confirmed bug found in the Angular
    // package specifically (GridItemComponent wires its native resize
    // engine to a fixed set of @ViewChild element references, captured
    // once — a newly re-enabled handle's own <span> rendered correctly
    // but never got a pointer listener attached, until
    // checkResizeHandlesContentChange() was added there directly). This
    // package's own React refs/effect-driven wiring wasn't confirmed
    // broken the same way, but the test is kept here too so a future
    // refactor to this package's own resize-handle wiring can't silently
    // reintroduce that same class of bug unnoticed.
    const item = page.locator('[data-grid-item-id="0"]');
    await page.getByTestId('toggle-resize-handle-w').uncheck();
    await expect(item.locator('.kdl-resize-hint--w')).toHaveCount(0);

    await page.getByTestId('toggle-resize-handle-w').check();
    await expect(item.locator('.kdl-resize-hint--w')).toHaveCount(1);

    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    const handle = item.locator('.kdl-resize-hint--w');
    await handle.hover();
    await page.mouse.down();
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 - 80, handleBox!.y + handleBox!.height / 2, { steps: 15 });
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

  test.skip('isBounded meaningfully restricts how far down this item can be dragged, compared to the unbounded default', async ({ page }) => {
    // PAUSED (confirmed with the person maintaining this repo), matching
    // the Vue package's own identical pause — not abandoned silently.
    // isBounded itself is a real, working feature (unit-tested
    // thoroughly in GridItemPerItemOverrides.spec.tsx, and in Angular's
    // own equivalent) — the blocker is specific to *this demo view*, not
    // the feature. Same root cause confirmed in Vue's own equivalent
    // test, after the same class of attempts here: this view's own grid
    // has autoSize on, which almost certainly recalculates the
    // container's own height reactively on every drag tick — including
    // the *live, in-progress* drag position, not just a committed one.
    // isBounded's own clamp reads clientHeight live, on every dragmove,
    // so the boundary it's supposed to enforce is never actually static
    // once a drag begins here. Even overriding the container's own
    // height via a direct DOM style assignment produced results
    // identical to not overriding it at all in Vue's own run —
    // confirming the framework's own reactive re-render silently
    // overwrites a manual override, so this can't be fixed from outside
    // the component. See the Vue package's own item-overrides.spec.ts
    // for the full, numbered history of what was tried.
    //
    // Real paths forward, not attempted here: add a genuine autoSize:
    // false toggle to this demo view (a real code change, not test
    // code — none exists currently), or exercise this against a
    // different, non-autoSize demo view instead. Skipped rather than
    // deleted so this intent and history survive for whoever picks it
    // back up.
    await page.getByTestId('select-isBounded').selectOption('true');

    // No `data-testid` exists on this package's own GridLayout container
    // itself (confirmed by reading ItemOverridesView.tsx directly), so
    // `.demo-grid-area` is the override target instead.
    const container = page.locator('.demo-grid-area');
    const fixedContainerHeight = 400;
    await container.evaluate((el, height) => {
      (el as HTMLElement).style.height = `${height}px`;
      (el as HTMLElement).style.overflow = `hidden`;
    }, fixedContainerHeight);
    const dragMagnitude = fixedContainerHeight + 500;

    const item = page.locator('[data-grid-item-id="0"]');
    const itemBefore = await stableBoundingBox(item);
    expect(itemBefore).not.toBeNull();
    await page.setViewportSize({ width: 1280, height: Math.ceil(itemBefore!.y + dragMagnitude + 300) });

    // Unbounded first (isBounded left at its own default).
    await page.mouse.move(itemBefore!.x + itemBefore!.width / 2, itemBefore!.y + itemBefore!.height / 2);
    await page.mouse.down();
    await page.mouse.move(itemBefore!.x + itemBefore!.width / 2, itemBefore!.y + itemBefore!.height / 2 + dragMagnitude, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const unboundedAfter = await item.boundingBox();
    expect(unboundedAfter).not.toBeNull();

    // Reset, then repeat the identical drag with isBounded now true.
    // page.reload() alone doesn't work here — confirmed directly in the
    // Vue package's own equivalent test, not assumed: it timed out
    // waiting for the isBounded select to ever appear at all. This demo
    // switches views via client-side JS state (clicking
    // nav-item-overrides), not a real URL route, so reloading resets
    // the page back to whatever its own default view is, not back to
    // item-overrides — the same full re-navigation sequence this file's
    // own beforeEach already uses is needed here too, not just a reload.
    await page.goto('/');
    await page.setViewportSize({ width: 1280, height: Math.ceil(itemBefore!.y + dragMagnitude + 300) });
    await page.getByTestId('nav-item-overrides').click();
    await expect(page.locator('[data-grid-item-id="0"]')).toHaveClass(/kdl-grid-item--draggable/);
    await page.getByTestId('select-isBounded').selectOption('true');
    await container.evaluate((el, height) => {
      (el as HTMLElement).style.height = `${height}px`;
      (el as HTMLElement).style.overflow = `hidden`;
    }, fixedContainerHeight);
    const itemBefore2 = await stableBoundingBox(item);
    expect(itemBefore2).not.toBeNull();

    await page.mouse.move(itemBefore2!.x + itemBefore2!.width / 2, itemBefore2!.y + itemBefore2!.height / 2);
    await page.mouse.down();
    await page.mouse.move(itemBefore2!.x + itemBefore2!.width / 2, itemBefore2!.y + itemBefore2!.height / 2 + dragMagnitude, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const boundedAfter = await item.boundingBox();
    expect(boundedAfter).not.toBeNull();

    // The bounded drag should have landed meaningfully higher (smaller
    // y) than the unbounded one, given the exact same drag magnitude —
    // a purely relative comparison, not an absolute pixel guess.
    expect(boundedAfter!.y).toBeLessThan(unboundedAfter!.y - 100);
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
