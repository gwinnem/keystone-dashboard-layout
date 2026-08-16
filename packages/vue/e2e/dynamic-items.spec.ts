import { expect, test } from '@playwright/test';

test.describe('Add & remove items', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-dynamic').click();
    // Every other spec file in this suite either uses a retrying
    // assertion (`toHaveClass`/`toBeVisible`/`expect().toHaveCount()`)
    // or `.boundingBox()` (which auto-waits for attachment) as its
    // first read after a nav-click view switch — this one didn't,
    // and its own `initialCount = await grid.getByText(...).count()`
    // reads are a bare `.count()` call, which Playwright explicitly
    // documents as *not* retrying/waiting at all: it snapshots the
    // DOM once, immediately. Without this wait, `initialCount` could
    // be captured as `0` before the `<component :is>` view switch
    // (no `<KeepAlive>`, a full mount each time) had actually finished
    // rendering — and every later `toHaveCount(initialCount + 1)`
    // would then keep failing forever, since the *real* count never
    // equals the wrong baseline. See docs/REFACTORING.md #117.
    await expect(page.getByTestId('grid-item-0')).toBeVisible();
  });

  test('adding an item increases the grid item count', async ({ page }) => {
    // Counting by `[data-testid^="grid-item-"]` (the same selector this
    // file's own third test already relies on successfully), not text
    // content. An earlier version of this test used
    // `getByText(/^Item \d+$/)` — the page's own accessibility snapshot
    // at failure time confirmed the text genuinely was present and
    // correctly separated (`generic: Item 0`, `generic: Item 1`, ...),
    // yet `toHaveCount()` against that locator still never resolved to
    // a nonzero count even after its full retry window. Root cause not
    // pinned down beyond that; switching to the proven, already-working
    // `data-testid` attribute selector sidesteps whatever the actual
    // mechanism was rather than continuing to guess at it. See
    // docs/REFACTORING.md #117.
    const items = page.locator('[data-testid^="grid-item-"]');
    await expect(items).toHaveCount(3);

    await page.getByTestId('add-item').click();

    await expect(items).toHaveCount(4);
  });

  test('removing an item via the close button decreases the count', async ({ page }) => {
    const items = page.locator('[data-testid^="grid-item-"]');
    await expect(items).toHaveCount(3);

    await page.getByTestId('grid-item-0').locator('.btn-close').click();

    await expect(items).toHaveCount(2);
    await expect(page.getByTestId('grid-item-0')).toHaveCount(0);
  });

  test('adding an item after removing one from the middle reuses that gap, rather than always landing at the bottom', async ({ page }) => {
    // Regression test for a real, reported bug: addItem() used to
    // place every new item at `x: 0, y: Infinity` and rely on
    // compaction to settle it — but plain vertical compaction only
    // ever moves an item straight up within its own x range, it
    // doesn't search other columns for a better fit. Removing item "1"
    // (at x:3) opened a gap there that a hardcoded `x: 0` new item
    // could never reuse; it always landed in a fresh row below
    // instead. Reported as "bin-packing placement algorithm" (missing
    // one). See docs/REFACTORING.md.
    const item0BoxBefore = await page.getByTestId('grid-item-0').boundingBox();

    await page.getByTestId('grid-item-1').locator('.btn-close').click();
    await page.getByTestId('add-item').click();

    // The new item is whichever one isn't "0" or "2" now.
    const allTestIds = await page.locator('[data-testid^="grid-item-"]').evaluateAll(
      (els) => els.map((el) => el.getAttribute('data-testid')),
    );
    const newItemTestId = allTestIds.find((id) => id !== `grid-item-0` && id !== `grid-item-2`);
    expect(newItemTestId).toBeTruthy();

    const newItemBox = await page.getByTestId(newItemTestId!).boundingBox();
    const item0BoxAfter = await page.getByTestId('grid-item-0').boundingBox();

    // Item "0" itself shouldn't have moved — this is about where the
    // *new* item lands, not a side effect elsewhere.
    expect(item0BoxAfter!.y).toBeCloseTo(item0BoxBefore!.y, 0);
    // The new item should be in item "1"'s old gap: same row as item
    // "0" (not a fresh row below it).
    expect(newItemBox!.y).toBeCloseTo(item0BoxAfter!.y, 0);
    expect(newItemBox!.x).toBeGreaterThan(item0BoxAfter!.x);
  });
});
