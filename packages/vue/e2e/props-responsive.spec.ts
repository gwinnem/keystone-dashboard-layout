import { expect, test, type Page } from '@playwright/test';
import {
  LAB_GEOMETRY,
  clearEvents,
  dragItem,
  eventLocator,
  eventPayloads,
  expectAllItemsPlaced,
  expectCell,
  item,
  openLab,
  readLayout,
  rowStep,
  setControl,
  setGrid,
} from './lab-helpers';

const ROW = rowStep(LAB_GEOMETRY);

/**
 * The lab's container width is a control, so a "resize" is deterministic: change it, and the grid's
 * ResizeObserver sees a new width exactly as it would for a real viewport change.
 *
 * Custom breakpoints/cols keep the widths below unambiguous (and independent of the library's own
 * thresholds, which a separate group of tests covers):
 *
 *   width > 1000 -> lg, 12 columns     > 800 -> md, 10     > 600 -> sm, 6     > 400 -> xs, 4     else xxs, 2
 */
const BREAKPOINTS = '{"xxl":3000,"xl":2500,"lg":1000,"md":800,"sm":600,"xs":400,"xxs":0}';
const COLS = '{"xxl":12,"xl":12,"lg":12,"md":10,"sm":6,"xs":4,"xxs":2}';

const setWidth = (page: Page, width: number): Promise<void> => setControl(page, 'lab-stage-width', width);

async function enableResponsive(page: Page, options: { breakpoints?: string; cols?: string } = {}): Promise<void> {
  await page.getByTestId('grid-breakpoints').fill(options.breakpoints ?? BREAKPOINTS);
  await page.getByTestId('grid-cols').fill(options.cols ?? COLS);
  await setGrid(page, 'responsive', true);
}

/** Every item sits within the current column count. */
async function expectFitsColumns(page: Page, columns: number): Promise<void> {
  await expect.poll(async () => (await readLayout(page)).every(cell => cell.x >= 0 && cell.x + cell.w <= columns)).toBe(true);
}

test.describe('responsive off (the default)', () => {
  test('changing the container width never switches breakpoint or columns', async ({ page }) => {
    await openLab(page);
    await clearEvents(page);

    await setWidth(page, 700);
    await expect(page.getByTestId('lab-grid-width')).toHaveText('700');
    await setWidth(page, 400);
    await expect(page.getByTestId('lab-grid-width')).toHaveText('400');

    await expect(eventLocator(page, 'breakpoint-changed')).toHaveCount(0);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('');
  });

  test('items are laid out with the plain colNum at any width', async ({ page }) => {
    await openLab(page);
    await setWidth(page, 900);
    await expect(page.getByTestId('lab-grid-width')).toHaveText('900');
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, width: 900 });
  });
});

test.describe('responsive on: breakpoints and columns', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await enableResponsive(page);
  });

  test('starts on the breakpoint the current width falls in, and says so', async ({ page }) => {
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('lg');
    const payloads = await eventPayloads(page, 'breakpoint-changed');
    expect(payloads.at(-1)![0]).toBe('lg');
    // The second argument is the layout for that breakpoint.
    expect(Array.isArray(payloads.at(-1)![1])).toBe(true);
  });

  for(const [width, breakpoint, columns] of [[900, 'md', 10], [700, 'sm', 6], [500, 'xs', 4], [300, 'xxs', 2]] as const) {
    test(`at ${width}px: breakpoint "${breakpoint}", ${columns} columns`, async ({ page }) => {
      await setWidth(page, width);

      await expect(page.getByTestId('lab-breakpoint')).toHaveText(breakpoint);
      // The effective column count is not exposed by an event (columns-changed reports the colNum prop only),
      // so it is proven where it matters: every item sits where that many columns put it.
      await expectFitsColumns(page, columns);
      // The grid is genuinely laid out with that many columns, at that width.
      await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, colNum: columns, width });
    });
  }

  test('a change of breakpoint is reported once, with the new name', async ({ page }) => {
    await clearEvents(page);
    await setWidth(page, 900);
    await expect.poll(async () => (await eventPayloads(page, 'breakpoint-changed')).map(([name]) => name)).toStrictEqual(['md']);
  });

  test('a width change inside the same breakpoint reports nothing', async ({ page }) => {
    await setWidth(page, 900);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('md');
    await clearEvents(page);

    await setWidth(page, 850);
    await expect(page.getByTestId('lab-grid-width')).toHaveText('850');
    await page.waitForTimeout(250);
    await expect(eventLocator(page, 'breakpoint-changed')).toHaveCount(0);
  });

  test('columns-changed reports the colNum prop, not the breakpoint\'s column count', async ({ page }) => {
    await clearEvents(page);
    await setWidth(page, 700);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('sm');
    await page.waitForTimeout(250);
    // A breakpoint change alone is not a colNum change.
    await expect(eventLocator(page, 'columns-changed')).toHaveCount(0);
  });

  test('going back to a wider breakpoint restores the layout it had', async ({ page }) => {
    await expectFitsColumns(page, 12);
    const wide = await readLayout(page);

    await setWidth(page, 700);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('sm');
    await setWidth(page, 1200);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('lg');

    await expect.poll(async () => readLayout(page)).toStrictEqual(wide);
  });

  test('changes made at one breakpoint are remembered when you return to it', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });

    await setWidth(page, 900);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('md');
    await setWidth(page, 1200);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('lg');

    await expectCell(page, '0', { y: 5 });
  });

  test('every item survives a trip through all the breakpoints', async ({ page }) => {
    for(const width of [900, 700, 500, 300, 1200]) {
      await setWidth(page, width);
      await expect(page.getByTestId('lab-grid-width')).toHaveText(String(width));
    }
    await expect.poll(async () => (await readLayout(page)).map(cell => cell.i).sort()).toStrictEqual(['0', '1', '2', '3']);
  });
});

test.describe('breakpoints and cols', () => {
  test('custom breakpoint thresholds move where the switch happens', async ({ page }) => {
    await openLab(page);
    // Raising "lg" to 1300 puts a 1200px container in "md" instead.
    await enableResponsive(page, { breakpoints: '{"xxl":3000,"xl":2500,"lg":1300,"md":800,"sm":600,"xs":400,"xxs":0}' });
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('md');
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, colNum: 10 });
  });

  test('custom column counts change how many columns a breakpoint has', async ({ page }) => {
    await openLab(page);
    await enableResponsive(page, { cols: '{"xxl":12,"xl":12,"lg":12,"md":10,"sm":8,"xs":4,"xxs":2}' });
    await setWidth(page, 700);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('sm');
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, colNum: 8, width: 700 });
  });

  test('left blank, the library\'s own default breakpoints and columns apply', async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'responsive', true);

    for(const [width, breakpoint, columns] of [[300, 'xxs', 2], [600, 'xs', 4], [900, 'sm', 6], [1100, 'md', 10]] as const) {
      await setWidth(page, width);
      await expect(page.getByTestId('lab-breakpoint')).toHaveText(breakpoint);
      await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, colNum: columns, width });
    }
  });
});

test.describe('colNum as a ceiling', () => {
  test('colNum caps whatever the breakpoint would give', async ({ page }) => {
    await openLab(page);
    await enableResponsive(page);
    await setGrid(page, 'colNum', 8);

    // At "lg" the breakpoint says 12, but colNum caps it at 8.
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, colNum: 8 });
    await setWidth(page, 900);
    // "md" says 10: still capped.
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('md');
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, colNum: 8, width: 900 });
  });

  test('a breakpoint with fewer columns than colNum is not raised to it', async ({ page }) => {
    await openLab(page);
    await enableResponsive(page);
    await setGrid(page, 'colNum', 8);
    await setWidth(page, 500);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('xs');
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, colNum: 4, width: 500 });
  });
});

test.describe('responsiveLayouts', () => {
  const MD_LAYOUT = '{"md":[{"i":"0","x":0,"y":0,"w":10,"h":2},{"i":"1","x":0,"y":2,"w":5,"h":2},{"i":"2","x":5,"y":2,"w":5,"h":2},{"i":"3","x":0,"y":4,"w":10,"h":2}]}';

  test('a layout supplied for a breakpoint is used exactly as given when it is entered', async ({ page }) => {
    await openLab(page);
    await page.getByTestId('grid-responsiveLayouts').fill(MD_LAYOUT);
    await enableResponsive(page);

    await setWidth(page, 900);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('md');
    await expect.poll(async () => readLayout(page)).toStrictEqual([
      { h: 2, i: '0', w: 10, x: 0, y: 0 },
      { h: 2, i: '1', w: 5, x: 0, y: 2 },
      { h: 2, i: '2', w: 5, x: 5, y: 2 },
      { h: 2, i: '3', w: 10, x: 0, y: 4 },
    ]);
  });

  test('breakpoints without a supplied layout are still generated', async ({ page }) => {
    await openLab(page);
    await page.getByTestId('grid-responsiveLayouts').fill(MD_LAYOUT);
    await enableResponsive(page);

    await setWidth(page, 500);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('xs');
    await expectFitsColumns(page, 4);
    await expect.poll(async () => (await readLayout(page)).length).toBe(4);
  });

  test('the supplied layout is laid out on the real pixel grid', async ({ page }) => {
    await openLab(page);
    await page.getByTestId('grid-responsiveLayouts').fill(MD_LAYOUT);
    await enableResponsive(page);
    await setWidth(page, 900);
    await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, colNum: 10, width: 900 });
  });
});

test.describe('distributeEvenly', () => {
  for(const distribute of [false, true]) {
    test(`distributeEvenly ${distribute}: a narrow breakpoint still holds every item within its columns`, async ({ page }) => {
      await openLab(page);
      await setGrid(page, 'distributeEvenly', distribute);
      await enableResponsive(page);

      await setWidth(page, 500);
      await expect(page.getByTestId('lab-breakpoint')).toHaveText('xs');
      await expectFitsColumns(page, 4);
      await expect.poll(async () => (await readLayout(page)).map(cell => cell.i).sort()).toStrictEqual(['0', '1', '2', '3']);
      await expectAllItemsPlaced(page, { ...LAB_GEOMETRY, colNum: 4, width: 500 });
    });
  }
});

test.describe('turning responsive off again', () => {
  test('stops reacting to the container width, and goes back to colNum columns', async ({ page }) => {
    await openLab(page);
    await enableResponsive(page);
    await setWidth(page, 700);
    await expect(page.getByTestId('lab-breakpoint')).toHaveText('sm');

    await setGrid(page, 'responsive', false);
    await clearEvents(page);
    await setWidth(page, 400);
    await expect(page.getByTestId('lab-grid-width')).toHaveText('400');
    await page.waitForTimeout(250);

    await expect(eventLocator(page, 'breakpoint-changed')).toHaveCount(0);
  });
});
