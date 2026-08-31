import { expect, test } from '@playwright/test';
import { stableBoundingBox } from './helpers';

test.describe('multiSelect', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-multi-select').click();
    await expect(page.locator('[data-grid-item-id="0"]')).toHaveClass(/kdl-grid-item--draggable/);
  });

  test('a plain click selects exactly one item', async ({ page }) => {
    await page.locator('[data-grid-item-id="0"]').click();

    await expect(page.getByTestId('selected-count')).toHaveText('1');
  });

  test('Ctrl+click adds to the selection instead of replacing it', async ({ page }) => {
    await page.locator('[data-grid-item-id="0"]').click();
    await page.locator('[data-grid-item-id="1"]').click({ modifiers: ['Control'] });

    await expect(page.getByTestId('selected-count')).toHaveText('2');
  });

  test('clicking the grid\'s own empty background clears the selection', async ({ page }) => {
    await page.locator('[data-grid-item-id="0"]').click();
    await expect(page.getByTestId('selected-count')).toHaveText('1');

    // Items sit at grid-columns 0-3, 4-7, and 8-11 of a 12-column grid
    // — the gap between item "0" (ends at column 3) and item "1"
    // (starts at column 4) is genuine empty background. Computed as a
    // fraction of the grid root's own *actual measured* width, since
    // exact column-pixel-width isn't known until the container is
    // measured.
    const gridRoot = page.locator('.kdl-grid-layout');
    const box = await gridRoot.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width * (3.5 / 12), box!.y + box!.height / 2);

    await expect(page.getByTestId('selected-count')).toHaveText('0');
  });

  test('dragging a selected anchor moves every other selected item by the same delta (group move)', async ({ page }) => {
    await page.locator('[data-grid-item-id="0"]').click();
    await page.locator('[data-grid-item-id="1"]').click({ modifiers: ['Control'] });
    await expect(page.getByTestId('selected-count')).toHaveText('2');

    const anchor = page.locator('[data-grid-item-id="0"]');
    const passenger = page.locator('[data-grid-item-id="1"]');
    const anchorBefore = await stableBoundingBox(anchor);
    const passengerBefore = await stableBoundingBox(passenger);
    expect(anchorBefore).not.toBeNull();
    expect(passengerBefore).not.toBeNull();

    await page.mouse.move(anchorBefore!.x + anchorBefore!.width / 2, anchorBefore!.y + anchorBefore!.height / 2);
    await page.mouse.down();
    await page.mouse.move(anchorBefore!.x + anchorBefore!.width / 2, anchorBefore!.y + anchorBefore!.height / 2 + 100, { steps: 12 });
    await page.mouse.up();

    await expect.poll(async () => (await anchor.boundingBox())!.y).toBeGreaterThan(anchorBefore!.y);
    await expect.poll(async () => (await passenger.boundingBox())!.y).toBeGreaterThan(passengerBefore!.y);
  });

  test('a non-selected item is unaffected by another item\'s group move', async ({ page }) => {
    await page.locator('[data-grid-item-id="0"]').click();
    await page.locator('[data-grid-item-id="1"]').click({ modifiers: ['Control'] });

    const bystander = page.locator('[data-grid-item-id="2"]');
    const bystanderBefore = await stableBoundingBox(bystander);
    expect(bystanderBefore).not.toBeNull();

    const anchor = page.locator('[data-grid-item-id="0"]');
    const anchorBefore = await stableBoundingBox(anchor);
    expect(anchorBefore).not.toBeNull();

    await page.mouse.move(anchorBefore!.x + anchorBefore!.width / 2, anchorBefore!.y + anchorBefore!.height / 2);
    await page.mouse.down();
    await page.mouse.move(anchorBefore!.x + anchorBefore!.width / 2, anchorBefore!.y + anchorBefore!.height / 2 + 100, { steps: 12 });
    await page.mouse.up();

    await expect.poll(async () => (await anchor.boundingBox())!.y).toBeGreaterThan(anchorBefore!.y);
    const bystanderAfter = await bystander.boundingBox();
    expect(bystanderAfter!.x).toBeCloseTo(bystanderBefore!.x, 0);
    expect(bystanderAfter!.y).toBeCloseTo(bystanderBefore!.y, 0);
  });
});
