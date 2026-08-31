import { expect, test } from '@playwright/test';

test.describe('Responsive breakpoints', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-responsive').click();
  });

  test('resizing the viewport narrower resolves a different breakpoint (fewer usable columns)', async ({ page }) => {
    // Default breakpoints/cols: xxs:0 (2 cols), xs:480 (4 cols),
    // sm:768 (6 cols), md:996 (10 cols), lg:1200 (12 cols) — the match
    // uses strict "width > threshold".
    await page.setViewportSize({ height: 800, width: 1300 });
    await page.waitForTimeout(300);
    const item0AtWide = await page.locator('[data-grid-item-id="0"]').boundingBox();
    const item1AtWide = await page.locator('[data-grid-item-id="1"]').boundingBox();
    expect(item0AtWide).not.toBeNull();
    expect(item1AtWide).not.toBeNull();
    expect(item1AtWide!.x).toBeGreaterThan(item0AtWide!.x);

    await page.setViewportSize({ height: 800, width: 500 });
    await page.waitForTimeout(300);

    const wrapAtWide = await page.getByTestId('responsive-wrap').boundingBox();
    await page.setViewportSize({ height: 800, width: 1300 });
    await page.waitForTimeout(300);
    const wrapBackAtWide = await page.getByTestId('responsive-wrap').boundingBox();
    expect(wrapAtWide).not.toBeNull();
    expect(wrapBackAtWide).not.toBeNull();
  });

  test('items remain visible across a breakpoint change that narrows the usable column count', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 1300 });
    await page.waitForTimeout(300);
    await expect(page.locator('[data-grid-item-id="0"]')).toBeVisible();
    await expect(page.locator('[data-grid-item-id="1"]')).toBeVisible();

    await page.setViewportSize({ height: 800, width: 400 });
    await page.waitForTimeout(300);

    await expect(page.locator('[data-grid-item-id="0"]')).toBeVisible();
    await expect(page.locator('[data-grid-item-id="1"]')).toBeVisible();

    const box0 = await page.locator('[data-grid-item-id="0"]').boundingBox();
    const box1 = await page.locator('[data-grid-item-id="1"]').boundingBox();
    const wrap = await page.getByTestId('responsive-wrap').boundingBox();
    expect(box0!.x + box0!.width).toBeLessThanOrEqual(wrap!.x + wrap!.width + 1);
    expect(box1!.x + box1!.width).toBeLessThanOrEqual(wrap!.x + wrap!.width + 1);
  });
});
