import { expect, test, type Page } from '@playwright/test';
import {
  LAB_GEOMETRY,
  clearEvents,
  dragItem,
  eventLocator,
  eventPayloads,
  expectCell,
  gridB,
  gridBox,
  gridItemB,
  item,
  openLab,
  pressOnItem,
  readLayout,
  rowStep,
  setControl,
  setGrid,
} from './lab-helpers';

/**
 * allowCrossGridDrag, disableExternalDrop and layoutId. Mirrors the Vue package's `e2e/props-cross-grid.spec.ts`.
 * `GridLayout` takes no `data-testid`, so grid B is found through `gridB(page)` and measured with `gridBox(page, 'b')`;
 * the event names and payloads (`{ item, sourceLayoutId }`, `{ itemId, sourceLayoutId }`) come from the shared core
 * types and are the same as Vue's.
 */

const ROW = rowStep(LAB_GEOMETRY);

/**
 * Two grids, A (the lab's main grid, `layoutId` "lab-grid-a") and B (below it, `layoutId` "lab-grid-b", empty).
 * `allowCrossGridDrag` is what makes a grid part of the cross-grid registry at all; `disableExternalDrop`
 * additionally stops a registered grid from *receiving* items, without stopping its own items leaving.
 */

async function setUp(page: Page, options: { aAllows?: boolean; bAllows?: boolean } = {}): Promise<void> {
  await openLab(page);
  await setControl(page, 'lab-show-grid-b', true);
  await expect(gridB(page)).toBeVisible();
  await setGrid(page, 'allowCrossGridDrag', options.aAllows ?? true);
  // With autoSize, dragging an item down makes grid A taller, which pushes grid B down by the same amount — so the
  // pointer is always a little above B's top edge and can never be inside it. A fixed height keeps B where it is.
  await setGrid(page, 'heightMode', 'fixed');
  await setControl(page, 'gridB-allowCrossGridDrag', options.bAllows ?? true);
}

/** Drags an item of grid A, holding it over grid B's body before releasing. */
async function dragAIntoB(page: Page, id = '0'): Promise<void> {
  const target = await gridBox(page, 'b');
  await pressOnItem(page, item(page, id));
  await page.mouse.move(target.x + 300, target.y + 60, { steps: 20 });
  await page.waitForTimeout(100);
  await page.mouse.up();
}

/** Drags an item of grid B across into grid A. */
async function dragBIntoA(page: Page, id: string): Promise<void> {
  const target = await gridBox(page, 'a');
  await pressOnItem(page, gridItemB(page, id));
  await page.mouse.move(target.x + 300, target.y + 60, { steps: 20 });
  await page.waitForTimeout(100);
  await page.mouse.up();
}

const idsIn = async (page: Page, testId: string): Promise<string[]> => (await readLayout(page, testId)).map(cell => String(cell.i)).sort();

test.describe('allowCrossGridDrag', () => {
  test('an item dragged from A onto B moves there: gone from A, present in B', async ({ page }) => {
    await setUp(page);
    await dragAIntoB(page);

    await expect.poll(() => idsIn(page, 'lab-layout-b-json')).toStrictEqual(['0']);
    expect(await idsIn(page, 'lab-layout-json')).toStrictEqual(['1', '2', '3']);
    await expect(gridItemB(page, '0')).toBeVisible();
    await expect(item(page, '0')).toHaveCount(0);
  });

  test('it keeps its size, and is placed in the first free slot of the (empty) target', async ({ page }) => {
    await setUp(page);
    await dragAIntoB(page);
    await expectCell(page, '0', { h: 2, w: 3, x: 0, y: 0 }, 'lab-layout-b-json');
  });

  test('the target is told which grid it came from and which item it was', async ({ page }) => {
    await setUp(page);
    await clearEvents(page);
    await dragAIntoB(page);

    await expect(eventLocator(page, 'b:cross-grid-item-dropped')).toHaveCount(1);
    const [[payload]] = await eventPayloads(page, 'b:cross-grid-item-dropped') as [[{ item: { i: string; w: number; h: number }; sourceLayoutId: string }]];
    expect(payload.sourceLayoutId).toBe('lab-grid-a');
    expect(payload.item.i).toBe('0');
    expect(payload.item.w).toBe(3);
  });

  test('the source reports the drag ending', async ({ page }) => {
    await setUp(page);
    await clearEvents(page);
    await dragAIntoB(page);
    await expect.poll(async () => eventLocator(page, 'dragend').count()).toBeGreaterThan(0);
    expect((await eventPayloads(page, 'dragend')).at(-1)).toStrictEqual(['0']);
  });

  test('a drag that stays inside A is an ordinary drag: no cross-grid events at all', async ({ page }) => {
    await setUp(page);
    await clearEvents(page);

    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });

    await expect(eventLocator(page, 'b:cross-grid-item-dropped')).toHaveCount(0);
    await expect(eventLocator(page, 'cross-grid-item-dropped')).toHaveCount(0);
    expect(await idsIn(page, 'lab-layout-b-json')).toStrictEqual([]);
  });

  test('without allowCrossGridDrag on A, its items cannot leave it', async ({ page }) => {
    await setUp(page, { aAllows: false });
    await dragAIntoB(page);
    await page.waitForTimeout(300);

    expect(await idsIn(page, 'lab-layout-json')).toStrictEqual(['0', '1', '2', '3']);
    expect(await idsIn(page, 'lab-layout-b-json')).toStrictEqual([]);
    await expect(eventLocator(page, 'b:cross-grid-item-dropped')).toHaveCount(0);
  });

  test('without allowCrossGridDrag on B, it is not a drop target', async ({ page }) => {
    await setUp(page, { bAllows: false });
    await dragAIntoB(page);
    await page.waitForTimeout(300);

    expect(await idsIn(page, 'lab-layout-json')).toStrictEqual(['0', '1', '2', '3']);
    expect(await idsIn(page, 'lab-layout-b-json')).toStrictEqual([]);
  });

  test('switching allowCrossGridDrag off on B afterwards takes it out of the registry again', async ({ page }) => {
    await setUp(page);
    await setControl(page, 'gridB-allowCrossGridDrag', false);
    await dragAIntoB(page);
    await page.waitForTimeout(300);
    expect(await idsIn(page, 'lab-layout-b-json')).toStrictEqual([]);
  });

  test('switching it back on makes the grid a target again', async ({ page }) => {
    await setUp(page);
    await setControl(page, 'gridB-allowCrossGridDrag', false);
    await setControl(page, 'gridB-allowCrossGridDrag', true);
    await dragAIntoB(page);
    await expect.poll(() => idsIn(page, 'lab-layout-b-json')).toStrictEqual(['0']);
  });

  test('items travel both ways', async ({ page }) => {
    await setUp(page);
    await dragAIntoB(page);
    await expect.poll(() => idsIn(page, 'lab-layout-b-json')).toStrictEqual(['0']);
    await clearEvents(page);

    await dragBIntoA(page, '0');

    await expect.poll(() => idsIn(page, 'lab-layout-json')).toStrictEqual(['0', '1', '2', '3']);
    expect(await idsIn(page, 'lab-layout-b-json')).toStrictEqual([]);
    const [[payload]] = await eventPayloads(page, 'cross-grid-item-dropped') as [[{ sourceLayoutId: string }]];
    expect(payload.sourceLayoutId).toBe('lab-grid-b');
  });

  test('a static item cannot be dragged out', async ({ page }) => {
    await setUp(page);
    await setControl(page, 'item-isStatic', true);
    await dragAIntoB(page);
    await page.waitForTimeout(300);
    expect(await idsIn(page, 'lab-layout-b-json')).toStrictEqual([]);
    expect(await idsIn(page, 'lab-layout-json')).toContain('0');
  });
});

test.describe('disableExternalDrop', () => {
  test('a grid with it set refuses the drop: the item stays in its source grid', async ({ page }) => {
    await setUp(page);
    await setControl(page, 'gridB-disableExternalDrop', true);
    await dragAIntoB(page);
    await page.waitForTimeout(300);

    expect(await idsIn(page, 'lab-layout-json')).toStrictEqual(['0', '1', '2', '3']);
    expect(await idsIn(page, 'lab-layout-b-json')).toStrictEqual([]);
    await expect(eventLocator(page, 'b:cross-grid-item-dropped')).toHaveCount(0);
  });

  test('the refusing grid is told which item and which grid it came from', async ({ page }) => {
    await setUp(page);
    await setControl(page, 'gridB-disableExternalDrop', true);
    await clearEvents(page);
    await dragAIntoB(page);

    await expect(eventLocator(page, 'b:cross-grid-drop-rejected')).toHaveCount(1);
    expect((await eventPayloads(page, 'b:cross-grid-drop-rejected'))[0]).toStrictEqual([
      { itemId: '0', sourceLayoutId: 'lab-grid-a' },
    ]);
  });

  test('it only blocks incoming drops: a refusing grid\'s own items can still leave', async ({ page }) => {
    await setUp(page);
    // First let an item in, then close the door behind it.
    await dragAIntoB(page);
    await expect.poll(() => idsIn(page, 'lab-layout-b-json')).toStrictEqual(['0']);
    await setControl(page, 'gridB-disableExternalDrop', true);

    await dragBIntoA(page, '0');

    await expect.poll(() => idsIn(page, 'lab-layout-json')).toStrictEqual(['0', '1', '2', '3']);
    expect(await idsIn(page, 'lab-layout-b-json')).toStrictEqual([]);
  });

  test('the same switch on A refuses items coming back', async ({ page }) => {
    await setUp(page);
    await dragAIntoB(page);
    await expect.poll(() => idsIn(page, 'lab-layout-b-json')).toStrictEqual(['0']);
    await setGrid(page, 'disableExternalDrop', true);
    await clearEvents(page);

    await dragBIntoA(page, '0');
    await page.waitForTimeout(300);

    expect(await idsIn(page, 'lab-layout-b-json')).toStrictEqual(['0']);
    await expect(eventLocator(page, 'cross-grid-drop-rejected')).toHaveCount(1);
    expect((await eventPayloads(page, 'cross-grid-drop-rejected'))[0]).toStrictEqual([
      { itemId: '0', sourceLayoutId: 'lab-grid-b' },
    ]);
  });

  test('it has no effect on a grid that is not part of the registry at all', async ({ page }) => {
    await setUp(page, { bAllows: false });
    await setControl(page, 'gridB-disableExternalDrop', true);
    await clearEvents(page);
    await dragAIntoB(page);
    await page.waitForTimeout(300);
    // B is not registered, so it is neither a target nor a rejecter: nothing is reported.
    await expect(eventLocator(page, 'b:cross-grid-drop-rejected')).toHaveCount(0);
  });

  test('turning it off again lets drops through', async ({ page }) => {
    await setUp(page);
    await setControl(page, 'gridB-disableExternalDrop', true);
    await setControl(page, 'gridB-disableExternalDrop', false);
    await dragAIntoB(page);
    await expect.poll(() => idsIn(page, 'lab-layout-b-json')).toStrictEqual(['0']);
  });
});

test.describe('layoutId', () => {
  test('a custom id is what the target reports as the source', async ({ page }) => {
    await setUp(page);
    await setGrid(page, 'layoutId', 'my-source-grid');
    await clearEvents(page);
    await dragAIntoB(page);

    await expect(eventLocator(page, 'b:cross-grid-item-dropped')).toHaveCount(1);
    const [[payload]] = await eventPayloads(page, 'b:cross-grid-item-dropped') as [[{ sourceLayoutId: string }]];
    expect(payload.sourceLayoutId).toBe('my-source-grid');
  });

  test('a custom id also appears in a rejection', async ({ page }) => {
    await setUp(page);
    await setGrid(page, 'layoutId', 'my-source-grid');
    await setControl(page, 'gridB-disableExternalDrop', true);
    await clearEvents(page);
    await dragAIntoB(page);

    await expect(eventLocator(page, 'b:cross-grid-drop-rejected')).toHaveCount(1);
    expect((await eventPayloads(page, 'b:cross-grid-drop-rejected'))[0]).toStrictEqual([
      { itemId: '0', sourceLayoutId: 'my-source-grid' },
    ]);
  });

  test('left blank, a unique id is generated', async ({ page }) => {
    await setUp(page);
    await setGrid(page, 'layoutId', '');
    await clearEvents(page);
    await dragAIntoB(page);

    await expect(eventLocator(page, 'b:cross-grid-item-dropped')).toHaveCount(1);
    const [[payload]] = await eventPayloads(page, 'b:cross-grid-item-dropped') as [[{ sourceLayoutId: string }]];
    expect(payload.sourceLayoutId).toBeTruthy();
    expect(payload.sourceLayoutId).not.toBe('lab-grid-b');
    expect(payload.sourceLayoutId).not.toBe('lab-grid-a');
  });

  test('a grid with a generated id still receives items back, and reports the other grid\'s id', async ({ page }) => {
    await setUp(page);
    await setGrid(page, 'layoutId', '');
    await dragAIntoB(page);
    await expect.poll(() => idsIn(page, 'lab-layout-b-json')).toStrictEqual(['0']);
    await clearEvents(page);
    await dragBIntoA(page, '0');

    // The item came back from B, whose id is fixed ("lab-grid-b"), into A, whose id was generated.
    await expect.poll(async () => eventLocator(page, 'cross-grid-item-dropped').count()).toBe(1);
    const [[payload]] = await eventPayloads(page, 'cross-grid-item-dropped') as [[{ sourceLayoutId: string }]];
    expect(payload.sourceLayoutId).toBe('lab-grid-b');
  });
});
