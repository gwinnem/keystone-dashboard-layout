import { expect, test, type Page } from '@playwright/test';
import { stableBoundingBox } from './helpers';

/** The size an item last reported through `onItemResized`, or `null` while it has reported nothing. */
const reportedSize = async (page: Page, id: string): Promise<{ height: number; width: number } | null> => {
  const text = (await page.getByTestId(`reported-${id}`).textContent()) ?? ``;
  const match = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(text);
  return match ? { height: Number(match[2]), width: Number(match[1]) } : null;
};

/** Resolves once what the item reported equals what the browser drew, to within rounding. */
const expectReportToMatchDrawnSize = async (page: Page, id: string): Promise<void> => {
  const item = page.locator(`[data-grid-item-id="${id}"]`);
  await expect.poll(async () => {
    const reported = await reportedSize(page, id);
    const box = await item.boundingBox();
    return reported !== null && box !== null && Math.abs(reported.width - box.width) < 1.5 && Math.abs(reported.height - box.height) < 1.5;
  }).toBe(true);
};

test.describe('Maximize: reporting the pixel size', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-maximize').click();
    await expect(page.locator('[data-grid-item-id="0"]')).toHaveClass(/kdl-grid-item--draggable/);
  });

  test('nothing is reported until an item is maximized', async ({ page }) => {
    await stableBoundingBox(page.locator('[data-grid-item-id="1"]'));

    for(const id of ['0', '1', '2']) {
      await expect(page.getByTestId(`reported-${id}`)).toHaveText('none');
    }
  });

  test('maximizing reports the size the item is now drawn at', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="1"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();

    await item.locator('.btn-maximize').click();

    await expect(item).toHaveClass(/kdl-grid-item--maximized/);
    await expect.poll(async () => (await item.boundingBox())!.width).toBeGreaterThan(before!.width);
    await expectReportToMatchDrawnSize(page, '1');
  });

  test('restoring reports the size of the item\'s own cell again', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="1"]');
    const before = await stableBoundingBox(item);
    expect(before).not.toBeNull();
    await item.locator('.btn-maximize').click();
    await expect(item).toHaveClass(/kdl-grid-item--maximized/);
    await expectReportToMatchDrawnSize(page, '1');
    const maximized = await reportedSize(page, '1');

    await item.locator('.btn-maximize').click();

    await expect(item).not.toHaveClass(/kdl-grid-item--maximized/);
    await expect.poll(async () => (await reportedSize(page, '1'))!.width).toBeLessThan(maximized!.width);
    await expectReportToMatchDrawnSize(page, '1');
    expect((await reportedSize(page, '1'))!.width).toBeCloseTo(before!.width, 0);
  });

  test('Escape restores and reports the cell size', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="2"]');
    await stableBoundingBox(item);
    await item.locator('.btn-maximize').click();
    await expect(item).toHaveClass(/kdl-grid-item--maximized/);
    await expectReportToMatchDrawnSize(page, '2');
    const maximized = await reportedSize(page, '2');

    // No focus() here on purpose: WebKit does not focus a button on click, so this only passes if the button focuses itself.
    await page.keyboard.press('Escape');

    await expect(item).not.toHaveClass(/kdl-grid-item--maximized/);
    await expect.poll(async () => (await reportedSize(page, '2'))!.width).toBeLessThan(maximized!.width);
    await expectReportToMatchDrawnSize(page, '2');
  });

  test('the report follows the window while the item is maximized', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="0"]');
    await stableBoundingBox(item);
    await item.locator('.btn-maximize').click();
    await expect(item).toHaveClass(/kdl-grid-item--maximized/);
    await expectReportToMatchDrawnSize(page, '0');
    const wide = await reportedSize(page, '0');

    await page.setViewportSize({ height: 700, width: 800 });

    await expect.poll(async () => (await reportedSize(page, '0'))!.width).toBeLessThan(wide!.width);
    await expectReportToMatchDrawnSize(page, '0');
  });

  test('the items that stay hidden report nothing', async ({ page }) => {
    const item = page.locator('[data-grid-item-id="1"]');
    await stableBoundingBox(item);

    await item.locator('.btn-maximize').click();
    await expectReportToMatchDrawnSize(page, '1');
    await item.locator('.btn-maximize').click();
    await expect(item).not.toHaveClass(/kdl-grid-item--maximized/);
    await expectReportToMatchDrawnSize(page, '1');

    await expect(page.getByTestId('reported-0')).toHaveText('none');
    await expect(page.getByTestId('reported-2')).toHaveText('none');
  });
});
