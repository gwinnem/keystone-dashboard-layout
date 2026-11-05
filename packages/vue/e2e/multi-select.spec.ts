import { expect, test, type Page } from '@playwright/test';
import {
  LAB_GEOMETRY,
  colStep,
  dragItem,
  eventLocator,
  expectCell,
  gridBox,
  item,
  layoutItem,
  near,
  openLab,
  rowStep,
  setGrid,
  settledBox,
} from './lab-helpers';

/**
 * User-level multi-select behaviour on the props lab (items "0" x:0, "1" x:3, "2" x:7 on row 0, "3" below): what a
 * person does with the mouse, and the pixels that move as a result. The property-by-property matrix (selection API,
 * `selection-changed` payloads, passenger limits, group resize...) lives in `props-multiselect.spec.ts`.
 */

const COL = colStep(LAB_GEOMETRY);
const ROW = rowStep(LAB_GEOMETRY);

async function selected(page: Page): Promise<string[]> {
  const text = (await page.getByTestId('lab-selected').textContent()) ?? '';
  return text === '' ? [] : text.split(',').sort();
}

const expectSelected = (page: Page, ids: string[]): Promise<void> =>
  expect.poll(() => selected(page)).toStrictEqual([...ids].sort());

/** Clicks an empty patch of the grid: columns 5-6 of row 0 sit between items "1" and "2". */
async function clickBackground(page: Page): Promise<void> {
  const box = await gridBox(page);
  await page.mouse.click(box.x + LAB_GEOMETRY.marginX + COL * 5.5, box.y + LAB_GEOMETRY.marginY + ROW * 0.5);
}

test.describe('multiSelect', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
  });

  test('a plain click selects exactly one item', async ({ page }) => {
    await item(page, '0').click();

    await expectSelected(page, ['0']);
  });

  test('Ctrl+click adds to the selection instead of replacing it', async ({ page }) => {
    await item(page, '0').click();
    await item(page, '1').click({ modifiers: ['Control'] });

    await expectSelected(page, ['0', '1']);
  });

  test('Shift+click selects the whole run from the anchor to the clicked item', async ({ page }) => {
    await item(page, '0').click();
    await item(page, '2').click({ modifiers: ['Shift'] });

    await expectSelected(page, ['0', '1', '2']);
  });

  test('clicking the grid\'s own empty background clears the selection', async ({ page }) => {
    await item(page, '0').click();
    await expectSelected(page, ['0']);

    await clickBackground(page);

    await expectSelected(page, []);
  });

  test('clicking the background with nothing selected is harmless: still nothing selected, no selection-changed', async ({ page }) => {
    await page.getByTestId('lab-clear-log').click();

    await clickBackground(page);
    await page.waitForTimeout(200);

    await expectSelected(page, []);
    await expect(eventLocator(page, 'selection-changed')).toHaveCount(0);
  });

  test('dragging a selected anchor moves every other selected item by the same delta (group move)', async ({ page }) => {
    await item(page, '1').click();
    await item(page, '2').click({ modifiers: ['Control'] });
    await expectSelected(page, ['1', '2']);

    const anchorBefore = await settledBox(item(page, '1'));
    const passengerBefore = await settledBox(item(page, '2'));

    await dragItem(page, item(page, '1'), 0, 5 * ROW);

    // The anchor was dragged; the passenger was never touched by the mouse. Both end up five rows lower.
    await expectCell(page, '1', { y: 5 });
    await expectCell(page, '2', { y: 5 });
    const anchorAfter = await settledBox(item(page, '1'));
    const passengerAfter = await settledBox(item(page, '2'));
    near(anchorAfter.y - anchorBefore.y, 5 * ROW);
    near(passengerAfter.y - passengerBefore.y, 5 * ROW);
    near(anchorAfter.x, anchorBefore.x);
    near(passengerAfter.x, passengerBefore.x);
  });

  test('a non-selected item is unaffected by another item\'s group move', async ({ page }) => {
    await item(page, '1').click();
    await item(page, '2').click({ modifiers: ['Control'] });

    const bystanderBefore = await settledBox(item(page, '0'));
    const bystanderCell = await layoutItem(page, '0');

    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '2', { y: 5 });

    const bystanderAfter = await settledBox(item(page, '0'));
    near(bystanderAfter.x, bystanderBefore.x, 0.5);
    near(bystanderAfter.y, bystanderBefore.y, 0.5);
    expect(await layoutItem(page, '0')).toStrictEqual(bystanderCell);
  });

  test('an item that was Ctrl+clicked back out of the selection is no longer carried along', async ({ page }) => {
    await item(page, '1').click();
    await item(page, '2').click({ modifiers: ['Control'] });
    await item(page, '2').click({ modifiers: ['Control'] });
    await expectSelected(page, ['1']);

    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '1', { y: 5 });

    await page.waitForTimeout(250);
    await expectCell(page, '2', { y: 0 });
  });

  test('after the background click cleared the selection, a drag moves only the dragged item', async ({ page }) => {
    await item(page, '1').click();
    await item(page, '2').click({ modifiers: ['Control'] });
    await clickBackground(page);
    await expectSelected(page, []);

    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '1', { y: 5 });

    await page.waitForTimeout(250);
    await expectCell(page, '2', { y: 0 });
    await expectSelected(page, []);
  });
});
