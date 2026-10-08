import { expect, test, type Page } from '@playwright/test';
import {
  LAB_GEOMETRY,
  clearEvents,
  click,
  colStep,
  dragItem,
  eventLocator,
  eventPayloads,
  expectCell,
  gridBox,
  item,
  layoutItem,
  openLab,
  patchTargetEntry,
  readLayout,
  resizeItem,
  rowStep,
  setControl,
  setGrid,
} from './lab-helpers';

const COL = colStep(LAB_GEOMETRY);
const ROW = rowStep(LAB_GEOMETRY);

/** The current selection, sorted — a `Set` keeps insertion order, which is not what most assertions are about. */
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

const plain = (page: Page, id: string) => item(page, id).click();
const withKey = (page: Page, id: string, key: 'Shift' | 'Control' | 'Meta') => item(page, id).click({ modifiers: [key] });

test.describe('multiSelect off (the default)', () => {
  test('clicks select nothing and add no selected class', async ({ page }) => {
    await openLab(page);
    await plain(page, '0');
    await expectSelected(page, []);
    await expect(item(page, '0')).not.toHaveClass(/vue-grid-item-selected/);
  });

  test('ctrl- and shift-clicks select nothing either', async ({ page }) => {
    await openLab(page);
    await withKey(page, '0', 'Control');
    await withKey(page, '1', 'Shift');
    await expectSelected(page, []);
  });
});

test.describe('selecting with clicks', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
  });

  test('a plain click selects just that item and marks it', async ({ page }) => {
    await plain(page, '0');
    await expectSelected(page, ['0']);
    await expect(item(page, '0')).toHaveClass(/vue-grid-item-selected/);
    await expect(item(page, '1')).not.toHaveClass(/vue-grid-item-selected/);
  });

  test('a second plain click replaces the selection', async ({ page }) => {
    await plain(page, '0');
    await plain(page, '1');
    await expectSelected(page, ['1']);
    await expect(item(page, '0')).not.toHaveClass(/vue-grid-item-selected/);
  });

  test('Ctrl+click adds to the selection, and toggles an already-selected item off', async ({ page }) => {
    await plain(page, '0');
    await withKey(page, '1', 'Control');
    await expectSelected(page, ['0', '1']);

    await withKey(page, '0', 'Control');
    await expectSelected(page, ['1']);
    await expect(item(page, '0')).not.toHaveClass(/vue-grid-item-selected/);
  });

  test('Cmd/Meta+click behaves like Ctrl+click', async ({ page }) => {
    await plain(page, '0');
    await withKey(page, '2', 'Meta');
    await expectSelected(page, ['0', '2']);
    await withKey(page, '2', 'Meta');
    await expectSelected(page, ['0']);
  });

  test('Shift+click selects the whole run from the anchor to the clicked item', async ({ page }) => {
    await plain(page, '0');
    await withKey(page, '2', 'Shift');
    await expectSelected(page, ['0', '1', '2']);
  });

  test('a Shift range replaces the selection rather than adding to it', async ({ page }) => {
    await plain(page, '0');
    await withKey(page, '3', 'Control');
    // The anchor is now "3"; Shift+click "1" selects 1..3 and drops "0".
    await withKey(page, '1', 'Shift');
    await expectSelected(page, ['1', '2', '3']);
  });

  test('Shift+click does not move the anchor, so repeated Shift-clicks fan out from the same item', async ({ page }) => {
    await plain(page, '1');
    await withKey(page, '3', 'Shift');
    await expectSelected(page, ['1', '2', '3']);

    await withKey(page, '0', 'Shift');
    await expectSelected(page, ['0', '1']);
  });

  test('Ctrl+click moves the anchor', async ({ page }) => {
    await plain(page, '0');
    await withKey(page, '2', 'Control');
    await withKey(page, '3', 'Shift');
    await expectSelected(page, ['2', '3']);
  });

  test('a Shift+click with no anchor yet behaves like a plain selection', async ({ page }) => {
    await withKey(page, '2', 'Shift');
    await expectSelected(page, ['2']);
  });

  test('clicking the empty background clears the selection', async ({ page }) => {
    await plain(page, '0');
    await withKey(page, '1', 'Control');
    await expectSelected(page, ['0', '1']);

    await clickBackground(page);
    await expectSelected(page, []);
    await expect(item(page, '0')).not.toHaveClass(/vue-grid-item-selected/);
  });

  test('clearing also forgets the anchor: the next Shift+click starts afresh', async ({ page }) => {
    await plain(page, '0');
    await clickBackground(page);
    await expectSelected(page, []);

    await withKey(page, '2', 'Shift');
    await expectSelected(page, ['2']);
  });

  test('dragging an item is not a click: it neither selects nor clears', async ({ page }) => {
    await plain(page, '0');
    await expectSelected(page, ['0']);
    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '1', { y: 5 });
    await expectSelected(page, ['0']);
  });

  test('turning multiSelect off stops further selection', async ({ page }) => {
    await setGrid(page, 'multiSelect', false);
    await plain(page, '1');
    await expectSelected(page, []);
  });
});

test.describe('selection API', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
  });

  const withId = async (page: Page, id: string, button: string): Promise<void> => {
    await page.getByTestId('lab-method-id').fill(id);
    await click(page, button);
  };

  test('selectItem selects, replacing any earlier selection', async ({ page }) => {
    await withId(page, '0', 'lab-select-item');
    await expectSelected(page, ['0']);
    await withId(page, '2', 'lab-select-item');
    await expectSelected(page, ['2']);
  });

  test('toggleItemSelection adds an unselected item and removes a selected one', async ({ page }) => {
    await withId(page, '0', 'lab-select-item');
    await withId(page, '1', 'lab-toggle-item');
    await expectSelected(page, ['0', '1']);
    await withId(page, '1', 'lab-toggle-item');
    await expectSelected(page, ['0']);
  });

  test('deselectItem removes one item and leaves the rest', async ({ page }) => {
    await withId(page, '0', 'lab-select-item');
    await withId(page, '1', 'lab-toggle-item');
    await withId(page, '0', 'lab-deselect-item');
    await expectSelected(page, ['1']);
  });

  test('deselectItem on an item that is not selected changes nothing', async ({ page }) => {
    await withId(page, '0', 'lab-select-item');
    await clearEvents(page);
    await withId(page, '3', 'lab-deselect-item');
    await expectSelected(page, ['0']);
    await expect(eventLocator(page, 'selection-changed')).toHaveCount(0);
  });

  test('clearSelection empties the selection, and does nothing when it is already empty', async ({ page }) => {
    await withId(page, '0', 'lab-select-item');
    await click(page, 'lab-clear-selection');
    await expectSelected(page, []);

    await clearEvents(page);
    await click(page, 'lab-clear-selection');
    await expect(eventLocator(page, 'selection-changed')).toHaveCount(0);
  });

  test('the selected class follows the API too', async ({ page }) => {
    await withId(page, '2', 'lab-select-item');
    await expect(item(page, '2')).toHaveClass(/vue-grid-item-selected/);
    await click(page, 'lab-clear-selection');
    await expect(item(page, '2')).not.toHaveClass(/vue-grid-item-selected/);
  });
});

test.describe('selection-changed', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
    await clearEvents(page);
  });

  test('carries the full current selection each time, not just what changed', async ({ page }) => {
    await plain(page, '0');
    await withKey(page, '1', 'Control');
    await withKey(page, '3', 'Control');

    await expect.poll(async () => eventLocator(page, 'selection-changed').count()).toBeGreaterThanOrEqual(3);
    const payloads = await eventPayloads(page, 'selection-changed');
    expect(payloads.map(([ids]) => ids)).toStrictEqual([['0'], ['0', '1'], ['0', '1', '3']]);
  });

  test('is emitted with an empty array when the selection is cleared', async ({ page }) => {
    await plain(page, '0');
    await clickBackground(page);
    await expect.poll(async () => (await eventPayloads(page, 'selection-changed')).at(-1)).toStrictEqual([[]]);
  });

  test('reports a Shift range as one change to the whole run', async ({ page }) => {
    await plain(page, '0');
    await withKey(page, '2', 'Shift');
    await expect.poll(async () => (await eventPayloads(page, 'selection-changed')).at(-1)).toStrictEqual([['0', '1', '2']]);
  });
});

test.describe('selection and removal', () => {
  test('removing a selected item drops it from the selection and says so', async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
    await plain(page, '3');
    await expectSelected(page, ['3']);
    await clearEvents(page);

    // "remove last item" deletes item "3" from the layout.
    await click(page, 'lab-remove-last-item');

    await expectSelected(page, []);
    await expect.poll(async () => (await eventPayloads(page, 'selection-changed')).at(-1)).toStrictEqual([[]]);
  });

  test('removing an item that was not selected leaves the selection and emits nothing', async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
    await plain(page, '0');
    await clearEvents(page);

    await click(page, 'lab-remove-last-item');

    await expectSelected(page, ['0']);
    await page.waitForTimeout(200);
    await expect(eventLocator(page, 'selection-changed')).toHaveCount(0);
  });
});

test.describe('group move', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
    await plain(page, '0');
    await withKey(page, '3', 'Control');
    await expectSelected(page, ['0', '3']);
  });

  test('dragging a selected item moves every selected item by the same amount', async ({ page }) => {
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await expectCell(page, '3', { y: 8 });
    await expectCell(page, '3', { x: 0 });
  });

  test('...in the horizontal direction too', async ({ page }) => {
    // Move both right by two columns: "0" to x:2... but "1" is in the way, so move the pair down first.
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await dragItem(page, item(page, '0'), 2 * COL, 0);
    await expectCell(page, '0', { x: 2 });
    await expectCell(page, '3', { x: 2 });
  });

  test('items that are not selected stay where they are', async ({ page }) => {
    const bystander = await layoutItem(page, '1');
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '3', { y: 8 });
    expect(await layoutItem(page, '1')).toStrictEqual(bystander);
  });

  test('dragging an unselected item moves only that item', async ({ page }) => {
    await dragItem(page, item(page, '1'), 0, 5 * ROW);
    await expectCell(page, '1', { y: 5 });
    await expectCell(page, '0', { y: 0 });
    await expectCell(page, '3', { y: 3 });
  });

  test('a static passenger is not carried along', async ({ page }) => {
    await patchTargetEntry(page, '3', { isStatic: true });
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await page.waitForTimeout(250);
    await expectCell(page, '3', { y: 3 });
  });

  test('a passenger with isDraggable explicitly false is not carried along either', async ({ page }) => {
    await patchTargetEntry(page, '3', { isDraggable: false });
    // One jump rather than a sweep: sliding "0" down through "3" makes the library swap them (the collided item moves
    // up into the vacated slot), which would hide what this test is about.
    await dragItem(page, item(page, '0'), 0, 5 * ROW, { steps: 1 });
    await expectCell(page, '0', { y: 5 });
    await page.waitForTimeout(250);
    await expectCell(page, '3', { y: 3 });
  });

  test('a passenger that is static only through its GridItem prop is not carried along', async ({ page }) => {
    await setControl(page, 'item-target', '3');
    await setControl(page, 'item-isStatic', true);
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    await page.waitForTimeout(250);
    await expectCell(page, '3', { y: 3 });
  });

  test('a keyboard move on a selected item carries the group too', async ({ page }) => {
    await item(page, '0').focus();
    await page.keyboard.press('ArrowDown');
    await expectCell(page, '0', { y: 1 });
    await expectCell(page, '3', { y: 4 });
  });

  test('with only one item selected, a drag moves just that item', async ({ page }) => {
    await click(page, 'lab-clear-selection');
    await plain(page, '0');
    // One jump, not a sweep (a sweep through "3" swaps the two).
    await dragItem(page, item(page, '0'), 0, 5 * ROW, { steps: 1 });
    await expectCell(page, '0', { y: 5 });
    await expectCell(page, '3', { y: 3 });
  });
});

test.describe('group resize', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
    await plain(page, '1');
    await withKey(page, '2', 'Control');
    await expectSelected(page, ['1', '2']);
  });

  test('resizing a selected item resizes every selected item by the same width', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });
    await expectCell(page, '2', { w: 5 });
  });

  test('...and by the same height', async ({ page }) => {
    await resizeItem(page, item(page, '1'), 's', 0, ROW);
    await expectCell(page, '1', { h: 4 });
    await expectCell(page, '2', { h: 5 });
  });

  test('a passenger\'s own maxW is respected, not the anchor\'s', async ({ page }) => {
    await patchTargetEntry(page, '2', { maxW: 4 });
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });
    await expectCell(page, '2', { w: 4 });
  });

  test('a passenger\'s own minW is respected when the group shrinks', async ({ page }) => {
    await patchTargetEntry(page, '2', { minW: 4 });
    await resizeItem(page, item(page, '1'), 'e', -COL, 0);
    await expectCell(page, '1', { w: 1 });
    await expectCell(page, '2', { w: 4 });
  });

  test('a passenger\'s own maxH and minH are respected', async ({ page }) => {
    await patchTargetEntry(page, '2', { maxH: 4 });
    await resizeItem(page, item(page, '1'), 's', 0, ROW);
    await expectCell(page, '1', { h: 4 });
    await expectCell(page, '2', { h: 4 });
  });

  test('a static passenger is not resized', async ({ page }) => {
    await patchTargetEntry(page, '2', { isStatic: true });
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });
    await page.waitForTimeout(250);
    await expectCell(page, '2', { w: 4 });
  });

  test('a passenger with isResizable explicitly false is not resized', async ({ page }) => {
    await patchTargetEntry(page, '2', { isResizable: false });
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });
    await page.waitForTimeout(250);
    await expectCell(page, '2', { w: 4 });
  });

  test('a passenger whose maxW is set only through its GridItem prop is clamped too', async ({ page }) => {
    await setControl(page, 'item-target', '2');
    await setControl(page, 'item-maxW', '4');
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });
    await expectCell(page, '2', { w: 4 });
  });

  test('a keyboard resize on a selected item resizes the group too', async ({ page }) => {
    await item(page, '1').focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expectCell(page, '1', { w: 3 });
    await expectCell(page, '2', { w: 5 });
  });

  test('unselected items are not resized', async ({ page }) => {
    const bystander = await layoutItem(page, '0');
    await resizeItem(page, item(page, '1'), 'e', COL, 0);
    await expectCell(page, '1', { w: 3 });
    expect(await layoutItem(page, '0')).toStrictEqual(bystander);
  });
});

test.describe('layout after group operations', () => {
  test('every item still has a position after a group move', async ({ page }) => {
    await openLab(page);
    await setGrid(page, 'multiSelect', true);
    await plain(page, '0');
    await withKey(page, '3', 'Control');
    await dragItem(page, item(page, '0'), 0, 5 * ROW);
    await expectCell(page, '0', { y: 5 });
    expect((await readLayout(page)).map(cell => cell.i)).toStrictEqual(['0', '1', '2', '3']);
  });
});
