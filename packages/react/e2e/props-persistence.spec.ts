import { expect, test, type Page } from '@playwright/test';
import {
  LAB_GEOMETRY,
  addItem,
  click,
  colWidth,
  dragItem,
  expectCell,
  item,
  near,
  openLab,
  readLayout,
  rowStep,
  setGrid,
} from './lab-helpers';

/**
 * Layout presets (`useLayoutPresets`), single-slot storage (`useLayoutStorage`) and `exportLayoutAsSvg`. Mirrors the Vue
 * package's `e2e/props-persistence.spec.ts`: all three go through the lab's own buttons and the same localStorage keys, so
 * the assertions are unchanged and any difference between the React hooks and Vue's composables shows up as a failure.
 */

const ROW = rowStep(LAB_GEOMETRY);

const presetList = async (page: Page): Promise<string[]> => {
  const text = (await page.getByTestId('lab-presets').textContent()) ?? '';
  return text === '' ? [] : text.split(',');
};

const storageKey = (page: Page, key: string): Promise<string | null> => page.evaluate(name => localStorage.getItem(name), key);

test.describe('layout presets (useLayoutPresets)', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('start empty', async ({ page }) => {
    expect(await presetList(page)).toStrictEqual([]);
    await expect(page.getByTestId('lab-preset-loaded')).toHaveText('null');
  });

  test('saving adds the name to the list', async ({ page }) => {
    await click(page, 'lab-save-preset');
    await expect.poll(() => presetList(page)).toStrictEqual(['lab']);
  });

  test('loading restores the saved arrangement, item for item', async ({ page }) => {
    const original = await readLayout(page);
    await click(page, 'lab-save-preset');

    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await addItem(page);
    await expect.poll(async () => (await readLayout(page)).length).toBe(5);

    await click(page, 'lab-load-preset');

    await expect(page.getByTestId('lab-preset-loaded')).toHaveText('true');
    await expect.poll(async () => readLayout(page)).toStrictEqual(original);
  });

  test('a preset keeps where items were, not just which items exist', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await click(page, 'lab-save-preset');

    await click(page, 'lab-reset-layout');
    await expectCell(page, '0', { y: 0 });

    await click(page, 'lab-load-preset');
    await expectCell(page, '0', { y: 5 });
  });

  test('loading a preset that does not exist returns false and leaves the layout alone', async ({ page }) => {
    const before = await readLayout(page);
    await click(page, 'lab-load-missing-preset');
    await expect(page.getByTestId('lab-preset-loaded')).toHaveText('false');
    expect(await readLayout(page)).toStrictEqual(before);
  });

  test('saving again under the same name overwrites it', async ({ page }) => {
    await click(page, 'lab-save-preset');
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await click(page, 'lab-save-preset');
    expect(await presetList(page)).toStrictEqual(['lab']);

    await click(page, 'lab-reset-layout');
    await click(page, 'lab-load-preset');
    await expectCell(page, '0', { y: 5 });
  });

  test('deleting removes it, after which it cannot be loaded', async ({ page }) => {
    await click(page, 'lab-save-preset');
    await expect.poll(() => presetList(page)).toStrictEqual(['lab']);

    await click(page, 'lab-delete-preset');
    await expect.poll(() => presetList(page)).toStrictEqual([]);

    await click(page, 'lab-load-preset');
    await expect(page.getByTestId('lab-preset-loaded')).toHaveText('false');
  });

  test('deleting one that does not exist is harmless', async ({ page }) => {
    await click(page, 'lab-delete-preset');
    expect(await presetList(page)).toStrictEqual([]);
  });

  test('presets survive a page reload', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await click(page, 'lab-save-preset');
    await expect.poll(() => presetList(page)).toStrictEqual(['lab']);

    await page.reload();
    await openLab(page);

    expect(await presetList(page)).toStrictEqual(['lab']);
    await expectCell(page, '0', { y: 0 });
    await click(page, 'lab-load-preset');
    await expectCell(page, '0', { y: 5 });
  });

  test('a corrupt stored value is treated as "nothing there", not an error', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('lab-presets', 'this is not json'));
    await page.reload();
    await openLab(page);
    expect(await presetList(page)).toStrictEqual([]);
    await click(page, 'lab-load-preset');
    await expect(page.getByTestId('lab-preset-loaded')).toHaveText('false');
  });
});

test.describe('layout storage (useLayoutStorage)', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('nothing is stored to begin with', async ({ page }) => {
    await expect(page.getByTestId('lab-storage-has')).toHaveText('false');
    expect(await storageKey(page, 'lab-storage')).toBeNull();
  });

  test('save writes the layout to localStorage', async ({ page }) => {
    await click(page, 'lab-save-storage');
    await expect(page.getByTestId('lab-storage-has')).toHaveText('true');

    const raw = await storageKey(page, 'lab-storage');
    expect(raw).not.toBeNull();
    for(const id of ['0', '1', '2', '3']) {
      expect(raw).toContain(`"i":"${id}"`);
    }
  });

  test('the internal "moved" bookkeeping flag is never written', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await click(page, 'lab-save-storage');
    expect(await storageKey(page, 'lab-storage')).not.toContain('moved');
  });

  test('load puts the saved layout back and reports success', async ({ page }) => {
    const original = await readLayout(page);
    await click(page, 'lab-save-storage');

    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });

    await click(page, 'lab-load-storage');
    await expect(page.getByTestId('lab-storage-loaded')).toHaveText('true');
    await expect.poll(async () => readLayout(page)).toStrictEqual(original);
  });

  test('load with nothing saved returns false and leaves the layout alone', async ({ page }) => {
    const before = await readLayout(page);
    await click(page, 'lab-load-storage');
    await expect(page.getByTestId('lab-storage-loaded')).toHaveText('false');
    expect(await readLayout(page)).toStrictEqual(before);
  });

  test('clear removes what was saved', async ({ page }) => {
    await click(page, 'lab-save-storage');
    await expect(page.getByTestId('lab-storage-has')).toHaveText('true');
    await click(page, 'lab-clear-storage');
    await expect(page.getByTestId('lab-storage-has')).toHaveText('false');
    expect(await storageKey(page, 'lab-storage')).toBeNull();

    await click(page, 'lab-load-storage');
    await expect(page.getByTestId('lab-storage-loaded')).toHaveText('false');
  });

  test('a saved layout survives a page reload', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await click(page, 'lab-save-storage');

    await page.reload();
    await openLab(page);

    await expect(page.getByTestId('lab-storage-has')).toHaveText('true');
    await expectCell(page, '0', { y: 0 });
    await click(page, 'lab-load-storage');
    await expect(page.getByTestId('lab-storage-loaded')).toHaveText('true');
    await expectCell(page, '0', { y: 5 });
  });

  test('a corrupt stored value is refused: load returns false and the layout is untouched', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('lab-storage', '{"this is": not valid'));
    const before = await readLayout(page);

    await click(page, 'lab-load-storage');

    await expect(page.getByTestId('lab-storage-loaded')).toHaveText('false');
    expect(await readLayout(page)).toStrictEqual(before);
  });

  test('valid JSON that is not a layout is refused too', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('lab-storage', JSON.stringify({ hello: 'world' })));
    const before = await readLayout(page);
    await click(page, 'lab-load-storage');
    await expect(page.getByTestId('lab-storage-loaded')).toHaveText('false');
    expect(await readLayout(page)).toStrictEqual(before);
  });

  test('presets and single-slot storage are independent', async ({ page }) => {
    await click(page, 'lab-save-preset');
    await expect(page.getByTestId('lab-storage-has')).toHaveText('false');
    await click(page, 'lab-save-storage');
    await click(page, 'lab-delete-preset');
    await expect(page.getByTestId('lab-storage-has')).toHaveText('true');
  });
});

test.describe('exportLayoutAsSvg', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  interface IRect {
    height: number;
    width: number;
    x: number;
    y: number;
  }

  /** Every `<rect ...>` that carries a position, as numbers. */
  async function rects(page: Page): Promise<IRect[]> {
    const svg = (await page.getByTestId('lab-svg-output').textContent()) ?? '';
    return [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(match => ({
      height: Number(match[4]),
      width: Number(match[3]),
      x: Number(match[1]),
      y: Number(match[2]),
    }));
  }

  test('produces a complete SVG document', async ({ page }) => {
    await click(page, 'lab-export-svg');
    const svg = (await page.getByTestId('lab-svg-output').textContent()) ?? '';
    expect(svg.trim().startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });

  test('draws one rectangle per item, each labelled with its id', async ({ page }) => {
    await click(page, 'lab-export-svg');
    expect((await rects(page)).length).toBe(4);
    const svg = (await page.getByTestId('lab-svg-output').textContent()) ?? '';
    for(const id of ['0', '1', '2', '3']) {
      expect(svg).toContain(`>${id}</text>`);
    }
  });

  test('each rectangle is at the item\'s real pixel position and size', async ({ page }) => {
    await click(page, 'lab-export-svg');
    const [first, second] = await rects(page);
    const cw = colWidth(LAB_GEOMETRY);

    // Item "0": x0 y0 w3 h2.
    // The SVG writes whole pixels, so allow the rounding (< 1px), not floating-point noise.
    near(first.x, 10, 1);
    near(first.y, 10, 1);
    near(first.width, cw * 3 + 2 * 10, 1);
    near(first.height, 60 * 2 + 10, 1);
    // Item "1": x3 y0 w2 h3.
    near(second.x, cw * 3 + 4 * 10, 1);
    near(second.width, cw * 2 + 10, 1);
    near(second.height, 60 * 3 + 2 * 10, 1);
  });

  test('follows the grid\'s own settings: colNum, rowHeight and margin', async ({ page }) => {
    await setGrid(page, 'colNum', 6);
    await setGrid(page, 'rowHeight', 100);
    await setGrid(page, 'marginX', 20);
    await setGrid(page, 'marginY', 30);
    await click(page, 'lab-export-svg');

    const [first] = await rects(page);
    const cw = (1200 - 20 * 7) / 6;
    near(first.x, 20, 1);
    near(first.y, 30, 1);
    near(first.width, cw * 3 + 2 * 20, 1);
    near(first.height, 100 * 2 + 30, 1);
  });

  test('reflects the current layout, not the original one', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await click(page, 'lab-export-svg');

    const [first] = await rects(page);
    near(first.y, 60 * 5 + 6 * 10, 1);
  });

  test('an added item is drawn too', async ({ page }) => {
    await addItem(page);
    await expect.poll(async () => (await readLayout(page)).length).toBe(5);
    await click(page, 'lab-export-svg');
    expect((await rects(page)).length).toBe(5);
    expect((await page.getByTestId('lab-svg-output').textContent()) ?? '').toContain('>added-1</text>');
  });

  test('an empty layout still gives a valid, empty SVG', async ({ page }) => {
    for(let removal = 0; removal < 4; removal += 1) {
      await click(page, 'lab-remove-last-item');
    }
    await expect.poll(async () => (await readLayout(page)).length).toBe(0);

    await click(page, 'lab-export-svg');
    const svg = (await page.getByTestId('lab-svg-output').textContent()) ?? '';
    expect(svg.trim().startsWith('<svg')).toBe(true);
    expect(await rects(page)).toStrictEqual([]);
  });
});
