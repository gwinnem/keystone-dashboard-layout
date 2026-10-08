import { createRef } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';
import { dispatchDragEvent, dispatchResizeEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

/**
 * Targets mutants that survived Stryker against `GridLayout.tsx` and
 * `GridItem.tsx` (see `reports/mutation/mutation.json`). Every test here
 * exists for one specific cluster of survivors, and every expected value
 * is derived from this fixed geometry rather than observed:
 *
 *   container 1200px, margin [10, 10], rowHeight 100, 12 columns
 *   -> colWidth = (1200 - 10 * 13) / 12 = 89.1667, column step 99.1667, row step 110
 *
 * The drag helper reports the item's own rect as { left: 5, top: 5 }, so a
 * drag tick at (clientX, clientY) targets column round((5 + clientX - 10) / 99.1667)
 * and row round((5 + clientY - 10) / 110): clientX 203 -> column 2,
 * clientX 402 -> 4, clientX 501 -> 5, clientX 997 -> 10; clientY 225 -> row 2,
 * clientY 445 -> 4, clientY 555 -> 5, clientY 885 -> 8.
 */
afterEach(() => {
  restoreOffsetWidth();
});

const grid = (layout: TLayout, props: Record<string, unknown> = {}): ReactElement => (
  <GridLayout colNum={12} compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} {...props}>
    {layout.map(item => <GridItem key={String(item.i)} i={String(item.i)}>{String(item.i)}</GridItem>)}
  </GridLayout>
);

const itemEl = (container: HTMLElement, id: string): HTMLElement => container.querySelector(`[data-grid-item-id="${id}"]`) as HTMLElement;
const lastLayout = (fn: ReturnType<typeof vi.fn>): TLayout => fn.mock.calls.at(-1)![0] as TLayout;
const byId = (layout: TLayout, id: string) => layout.find(entry => entry.i === id)!;
const click = (el: HTMLElement, options: MouseEventInit = {}): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent(`click`, { bubbles: true, ...options }));
  });
};
const select = (ref: { current: IGridLayoutHandle | null }, ...ids: string[]): void => {
  ids.forEach(id => {
    act(() => {
      ref.current!.selectItem(id);
    });
  });
};

/**
 * An exception thrown inside a React event handler never reaches the caller
 * of `dispatchEvent`: React reports it on `window` instead, where Vitest (and
 * the Stryker runner under it) treats it as a crash of the whole run rather
 * than a failed test — which is why `expect(() => ...).not.toThrow()` cannot
 * pin these down. Catching the window `error` event turns it into a failure.
 */
const captureUncaughtErrors = (run: () => void): unknown[] => {
  const errors: unknown[] = [];
  const onError = (event: ErrorEvent): void => {
    errors.push(event.error ?? event.message);
    event.preventDefault();
  };
  window.addEventListener(`error`, onError);
  try {
    run();
  } finally {
    window.removeEventListener(`error`, onError);
  }
  return errors;
};

describe(`GridLayout — group move and resize`, () => {
  it(`Should move every other selected item by the real row delta, already during dragmove`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 1 },
      { h: 2, i: `1`, w: 2, x: 4, y: 2 },
    ];
    const ref = createRef<IGridLayoutHandle>();
    const onLayoutChange = vi.fn();
    const { container } = render(grid(layout, { multiSelect: true, onLayoutChange, ref }));
    select(ref, `0`, `1`);
    const target = itemEl(container, `0`);

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 445 });

    // The anchor started on row 1 and is now on row 4 (a delta of 3), so the passenger on row 2 lands on row 5.
    const mid = lastLayout(onLayoutChange);
    expect(byId(mid, `0`).y).toBe(4);
    expect(byId(mid, `1`)).toMatchObject({ x: 4, y: 5 });
  });

  it(`Should not group-move once multiSelect has been switched off, even with a selection still in place`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 1 },
      { h: 2, i: `1`, w: 2, x: 4, y: 2 },
    ];
    const ref = createRef<IGridLayoutHandle>();
    const onLayoutChange = vi.fn();
    const { container, rerender } = render(grid(layout, { multiSelect: true, onLayoutChange, ref }));
    select(ref, `0`, `1`);
    rerender(grid(layout, { multiSelect: false, onLayoutChange, ref }));
    const target = itemEl(container, `0`);

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 445 });

    expect(byId(lastLayout(onLayoutChange), `1`)).toMatchObject({ x: 4, y: 2 });
  });

  it(`Should resize every other selected item by the real width and height delta, already during resizemove`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 3, i: `1`, w: 3, x: 4, y: 0 },
    ];
    const ref = createRef<IGridLayoutHandle>();
    const onLayoutChange = vi.fn();
    const { container } = render(grid(layout, { multiSelect: true, onLayoutChange, ref }));
    select(ref, `0`, `1`);
    const target = itemEl(container, `0`);

    // width 188 + 100 -> round(298 / 99.1667) = 3 columns; height 210 + 110 -> round(330 / 110) = 3 rows.
    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizemove`, { clientX: 100, clientY: 110 });

    const mid = lastLayout(onLayoutChange);
    expect(byId(mid, `0`)).toMatchObject({ h: 3, w: 3 });
    expect(byId(mid, `1`)).toMatchObject({ h: 4, w: 4 });
  });

  it(`Should leave a passenger alone whose own isResizable is explicitly false`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 3, i: `1`, isResizable: false, w: 3, x: 4, y: 0 },
    ];
    const ref = createRef<IGridLayoutHandle>();
    const onLayoutChange = vi.fn();
    const { container } = render(grid(layout, { multiSelect: true, onLayoutChange, ref }));
    select(ref, `0`, `1`);
    const target = itemEl(container, `0`);

    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizemove`, { clientX: 100, clientY: 110 });

    expect(byId(lastLayout(onLayoutChange), `1`)).toMatchObject({ h: 3, w: 3 });
  });
});

describe(`GridLayout — snapToGrid`, () => {
  const snapLayout = (): TLayout => [
    { h: 2, i: `0`, w: 2, x: 0, y: 0 },
    { h: 2, i: `1`, w: 2, x: 6, y: 3 },
  ];

  it(`Should snap only x, leaving an out-of-range y alone, already during dragmove`, () => {
    stubOffsetWidth(1200);
    const onLayoutChange = vi.fn();
    const { container } = render(grid(snapLayout(), { onLayoutChange, snapThreshold: 1, snapToGrid: true }));
    const target = itemEl(container, `0`);

    // Dragged to (5, 8): its left edge is 1 away from the neighbour's left edge (6) -> x snaps to 6;
    // nothing is within 1 of it vertically, so y stays 8.
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 501, clientY: 885 });

    expect(byId(lastLayout(onLayoutChange), `0`)).toMatchObject({ x: 6, y: 8 });
  });

  it(`Should snap only y, leaving an out-of-range x alone, already during dragmove`, () => {
    stubOffsetWidth(1200);
    const onLayoutChange = vi.fn();
    const { container } = render(grid(snapLayout(), { onLayoutChange, snapThreshold: 1, snapToGrid: true }));
    const target = itemEl(container, `0`);

    // Dragged to (10, 4): its top edge is 1 away from the neighbour's top edge (3) -> y snaps to 3;
    // nothing is within 1 of it horizontally, so x stays 10.
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 997, clientY: 445 });

    expect(byId(lastLayout(onLayoutChange), `0`)).toMatchObject({ x: 10, y: 3 });
  });

  it(`Should not snap at dragstart, where there is no drag delta yet`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 3, y: 0 },
    ];
    const onLayoutChange = vi.fn();
    const { container } = render(grid(layout, { onLayoutChange, snapThreshold: 1, snapToGrid: true }));

    // At (0, 0) the item's right edge is 1 from its neighbour's left edge: a snap would move it to x 1.
    dispatchDragEvent(itemEl(container, `0`), `dragstart`);

    expect(byId(lastLayout(onLayoutChange), `0`).x).toBe(0);
  });
});

describe(`GridLayout — the in-grid gesture placeholder and drag class`, () => {
  const placeholderOf = (container: HTMLElement): HTMLElement | null => container.querySelector(`.kdl-grid-placeholder`);

  it(`Should size and place the placeholder from the live drag position, during dragmove, and remove it at dragend`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));
    const target = itemEl(container, `0`);

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 203, clientY: 225 });

    // column 2, row 2, 2x2: left = round(89.1667 * 2 + 3 * 10) = 208, top = round(100 * 2 + 3 * 10) = 230,
    // width = round(89.1667 * 2 + 10) = 188, height = round(100 * 2 + 10) = 210.
    const placeholder = placeholderOf(container)!;
    expect(placeholder.style.left).toBe(`208px`);
    expect(placeholder.style.top).toBe(`230px`);
    expect(placeholder.style.width).toBe(`188px`);
    expect(placeholder.style.height).toBe(`210px`);

    dispatchDragEvent(target, `dragend`, { clientX: 203, clientY: 225 });
    expect(placeholderOf(container)).toBeNull();
  });

  it(`Should size and place the placeholder from the live resize size, during resizemove`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));
    const target = itemEl(container, `0`);

    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizemove`, { clientX: 100, clientY: 110 });

    // 3x3 at column 0, row 0: left 10, top 10, width round(89.1667 * 3 + 2 * 10) = 288, height 100 * 3 + 2 * 10 = 320.
    const placeholder = placeholderOf(container)!;
    expect(placeholder.style.left).toBe(`10px`);
    expect(placeholder.style.top).toBe(`10px`);
    expect(placeholder.style.width).toBe(`288px`);
    expect(placeholder.style.height).toBe(`320px`);
  });

  it(`Should carry the active-drag class only while a drag is in progress`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));
    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    const target = itemEl(container, `0`);
    expect(root.classList.contains(`kdl-grid-layout--active-drag`)).toBe(false);

    dispatchDragEvent(target, `dragstart`);
    expect(root.classList.contains(`kdl-grid-layout--active-drag`)).toBe(true);

    dispatchDragEvent(target, `dragend`, { clientX: 0, clientY: 0 });
    expect(root.classList.contains(`kdl-grid-layout--active-drag`)).toBe(false);
  });
});

describe(`GridLayout — alignSelected, duplicateItem and forced compaction`, () => {
  it(`Should identify itself by name in React's tooling`, () => {
    expect(GridLayout.displayName).toBe(`GridLayout`);
  });

  it(`Should apply an alignment that lands on a non-selected item when preventCollision is off`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 4, y: 4 },
      { h: 2, i: `2`, w: 2, x: 0, y: 4 },
    ];
    const ref = createRef<IGridLayoutHandle>();
    const onLayoutChange = vi.fn();
    render(grid(layout, { multiSelect: true, onLayoutChange, ref }));
    select(ref, `0`, `1`);

    act(() => {
      ref.current!.alignSelected(`left`);
    });

    expect(byId(lastLayout(onLayoutChange), `1`).x).toBe(0);
  });

  it(`Should apply an alignment that only overlaps another selected item, with unrelated items elsewhere, under preventCollision`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 4, y: 0 },
      { h: 2, i: `2`, w: 2, x: 8, y: 8 },
    ];
    const ref = createRef<IGridLayoutHandle>();
    const onLayoutChange = vi.fn();
    render(grid(layout, { multiSelect: true, onLayoutChange, preventCollision: true, ref }));
    select(ref, `0`, `1`);

    act(() => {
      ref.current!.alignSelected(`left`);
    });

    // Item 1 now sits exactly on item 0 — both are being aligned, so that is not a collision — and item 2 is nowhere near.
    expect(byId(lastLayout(onLayoutChange), `1`).x).toBe(0);
  });

  it(`Should leave y untouched when an alignment only adjusts x`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 4, y: 4 },
    ];
    const ref = createRef<IGridLayoutHandle>();
    const onLayoutChange = vi.fn();
    render(grid(layout, { multiSelect: true, onLayoutChange, ref }));
    select(ref, `0`, `1`);

    act(() => {
      ref.current!.alignSelected(`left`);
    });

    expect(byId(lastLayout(onLayoutChange), `1`)).toMatchObject({ x: 0, y: 4 });
  });

  it(`Should place a duplicate directly below its source, using the source's own height`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const onLayoutChange = vi.fn();
    render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { onLayoutChange, ref }));

    act(() => {
      ref.current!.duplicateItem(`0`);
    });

    expect(byId(lastLayout(onLayoutChange), `0-copy`).y).toBe(2);
  });

  it(`Should compact along the grid's own compactType when it is not NONE`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 6, y: 0 },
    ];
    const ref = createRef<IGridLayoutHandle>();
    const onLayoutChange = vi.fn();
    render(grid(layout, { compactType: ECompactType.HORIZONTAL, onLayoutChange, ref }));

    act(() => {
      ref.current!.compactNow();
    });

    // Horizontal compaction closes the gap between the two items; a vertical one would not.
    expect(byId(lastLayout(onLayoutChange), `1`).x).toBe(2);
  });

  it(`Should tell a custom compactor which compactType a forced compaction used`, () => {
    stubOffsetWidth(1200);
    const compact = vi.fn((layoutArg: TLayout) => layoutArg);
    const ref = createRef<IGridLayoutHandle>();
    render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { compactor: { compact, type: `vertical` }, compactType: ECompactType.NONE, ref }));

    act(() => {
      ref.current!.compactNow();
    });

    expect(compact.mock.calls.at(-1)![2]).toMatchObject({ compactType: ECompactType.VERTICAL });
  });

  it(`Should tell a custom compactor which compactType compacted an externally supplied layout`, () => {
    stubOffsetWidth(1200);
    const compact = vi.fn((layoutArg: TLayout) => layoutArg);
    const first: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { rerender } = render(grid(first, { compactor: { compact, type: `vertical` }, compactType: ECompactType.HORIZONTAL }));

    rerender(grid([{ h: 2, i: `0`, w: 2, x: 4, y: 0 }], { compactor: { compact, type: `vertical` }, compactType: ECompactType.HORIZONTAL }));

    expect(compact.mock.calls.at(-1)![2]).toMatchObject({ compactType: ECompactType.HORIZONTAL });
  });
});

describe(`GridLayout — selection`, () => {
  const threeInARow = (): TLayout => [
    { h: 2, i: `0`, w: 2, x: 0, y: 0 },
    { h: 2, i: `1`, w: 2, x: 4, y: 0 },
    { h: 2, i: `2`, w: 2, x: 8, y: 0 },
  ];

  it(`Should reset the Shift-click anchor once its own item is removed from the layout`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const { container, rerender } = render(grid(threeInARow(), { multiSelect: true, ref }));
    click(itemEl(container, `0`));

    rerender(grid(threeInARow().slice(1), { multiSelect: true, ref }));
    click(itemEl(container, `2`), { shiftKey: true });
    click(itemEl(container, `1`), { shiftKey: true });

    // With the anchor reset, the first Shift-click falls back to a plain select and re-anchors on 2,
    // so the second one ranges 2..1. A stale anchor would instead collapse to just ['1'].
    expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`1`, `2`]);
  });

  it(`Should keep the Shift-click anchor when a different item is removed from the layout`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const { container, rerender } = render(grid(threeInARow(), { multiSelect: true, ref }));
    click(itemEl(container, `0`));

    rerender(grid([threeInARow()[0], threeInARow()[2]], { multiSelect: true, ref }));
    click(itemEl(container, `2`), { shiftKey: true });
    click(itemEl(container, `0`), { shiftKey: true });

    // Still anchored on 0, so the second Shift-click ranges 0..0. A wrongly reset anchor would have moved to 2.
    expect(ref.current!.selectedItems).toStrictEqual([`0`]);
  });

  it(`Should treat the first Shift-click on a fresh grid as a plain select that also sets the anchor`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(grid(threeInARow(), { multiSelect: true, ref }));

    click(itemEl(container, `2`), { shiftKey: true });
    click(itemEl(container, `0`), { shiftKey: true });

    expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`0`, `1`, `2`]);
  });

  it(`Should deselect an item that is already selected when it is toggled`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    render(grid(threeInARow(), { multiSelect: true, ref }));
    select(ref, `0`, `1`);

    act(() => {
      ref.current!.toggleItemSelection(`0`);
    });

    expect(ref.current!.selectedItems).toStrictEqual([`1`]);
  });

  it(`Should not report a selection change for deselecting an item that was never selected`, () => {
    stubOffsetWidth(1200);
    const onSelectionChanged = vi.fn();
    const ref = createRef<IGridLayoutHandle>();
    render(grid(threeInARow(), { multiSelect: true, onSelectionChanged, ref }));
    select(ref, `0`);
    onSelectionChanged.mockClear();

    act(() => {
      ref.current!.deselectItem(`1`);
    });

    expect(onSelectionChanged).not.toHaveBeenCalled();
  });

  it(`Should not report a selection change for clearing an already-empty selection`, () => {
    stubOffsetWidth(1200);
    const onSelectionChanged = vi.fn();
    const ref = createRef<IGridLayoutHandle>();
    render(grid(threeInARow(), { multiSelect: true, onSelectionChanged, ref }));

    act(() => {
      ref.current!.clearSelection();
    });

    expect(onSelectionChanged).not.toHaveBeenCalled();
  });

  it(`Should not report a selection change when the layout changes but nothing selected was removed`, () => {
    stubOffsetWidth(1200);
    const onSelectionChanged = vi.fn();
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(grid(threeInARow(), { multiSelect: true, onSelectionChanged, ref }));
    select(ref, `0`);
    onSelectionChanged.mockClear();

    dispatchDragEvent(itemEl(container, `1`), `dragstart`);
    dispatchDragEvent(itemEl(container, `1`), `dragmove`, { clientX: 203, clientY: 225 });

    expect(onSelectionChanged).not.toHaveBeenCalled();
  });

  it(`Should leave the selection alone when a click bubbles up from an item on a grid with multiSelect off`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(grid(threeInARow(), { ref }));
    select(ref, `0`);

    click(itemEl(container, `0`));

    expect(ref.current!.selectedItems).toStrictEqual([`0`]);
  });

  it(`Should not swallow an item's click when multiSelect is off, so it still reaches ancestors`, () => {
    stubOffsetWidth(1200);
    const onAncestorClick = vi.fn();
    const { container } = render(<div onClick={onAncestorClick}>{grid(threeInARow())}</div>);

    click(itemEl(container, `0`));

    expect(onAncestorClick).toHaveBeenCalledTimes(1);
  });
});

describe(`GridLayout — alignment and spacing guides`, () => {
  it(`Should remove alignment guides again once the dragged item no longer lines up with anything`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 4, y: 4 },
    ];
    const { container } = render(grid(layout, { showAlignmentGuides: true }));
    const target = itemEl(container, `0`);
    const guides = (): number => container.querySelectorAll(`.kdl-grid-alignment-guide`).length;

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 402, clientY: 0 }); // column 4: left edges line up
    expect(guides()).toBeGreaterThan(0);

    dispatchDragEvent(target, `dragmove`, { clientX: 104, clientY: 0 }); // column 1: lines up with nothing
    expect(guides()).toBe(0);
  });

  it(`Should remove spacing indicators again once the dragged item has no neighbour left to measure a gap to`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 6, y: 0 },
    ];
    const { container } = render(grid(layout, { showSpacingGuides: true }));
    const target = itemEl(container, `0`);
    const indicators = (): number => container.querySelectorAll(`.kdl-grid-spacing-indicator`).length;

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 203, clientY: 0 }); // column 2, same rows as the neighbour
    expect(indicators()).toBeGreaterThan(0);

    dispatchDragEvent(target, `dragmove`, { clientX: 203, clientY: 555 }); // row 5: no row overlap with it any more
    expect(indicators()).toBe(0);
  });

  it(`Should still produce grid-line sizes for a container exactly 1px wide`, () => {
    stubOffsetWidth(1);
    // No GridItem children on purpose: at 1px the column width is negative, which core's own
    // pixel conversion rejects for an actual item — the grid-line sizes themselves are still valid.
    const { container } = render(<GridLayout colNum={12} layout={[]} margin={[10, 10]} rowHeight={100} showGridLines />);
    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;

    expect(root.style.getPropertyValue(`--kdl-grid-line-column-size`)).not.toBe(``);
  });
});

describe(`GridLayout — resize collision clamping and undo`, () => {
  it(`Should clamp the width to just before a neighbour on the right, measured from the item's own x`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 2, y: 0 },
      { h: 2, i: `1`, w: 2, x: 6, y: 0 },
    ];
    const onLayoutChange = vi.fn();
    const onMoveBlockedByCollision = vi.fn();
    const { container } = render(grid(layout, { onLayoutChange, onMoveBlockedByCollision, preventCollision: true }));
    const target = itemEl(container, `0`);

    // width 188 + 300 -> 5 columns would reach column 7 and run into the neighbour at 6, so it clamps to 6 - 2 = 4.
    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizemove`, { clientX: 300, clientY: 0 });

    expect(byId(lastLayout(onLayoutChange), `0`)).toMatchObject({ h: 2, w: 4 });
    expect(onMoveBlockedByCollision).toHaveBeenCalledWith(`0`);
  });

  it(`Should clamp the height to just before a neighbour below, leaving the width alone`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 1 },
      { h: 2, i: `1`, w: 2, x: 0, y: 4 },
    ];
    const onLayoutChange = vi.fn();
    const { container } = render(grid(layout, { onLayoutChange, preventCollision: true }));
    const target = itemEl(container, `0`);

    // height 210 + 220 -> 4 rows would run into the neighbour on row 4, so it clamps to 4 - 1 = 3.
    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: 220 });

    expect(byId(lastLayout(onLayoutChange), `0`)).toMatchObject({ h: 3, w: 2 });
  });

  it(`Should neither clamp nor report a block for a resize that collides with nothing`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 8, y: 0 },
    ];
    const onLayoutChange = vi.fn();
    const onMoveBlockedByCollision = vi.fn();
    const { container } = render(grid(layout, { onLayoutChange, onMoveBlockedByCollision, preventCollision: true }));
    const target = itemEl(container, `0`);

    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizemove`, { clientX: 100, clientY: 0 });

    expect(byId(lastLayout(onLayoutChange), `0`).w).toBe(3);
    expect(onMoveBlockedByCollision).not.toHaveBeenCalled();
  });

  it(`Should undo a whole resize in one step, back to the size it had before resizestart`, () => {
    stubOffsetWidth(1200);
    const onLayoutChange = vi.fn();
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { enableUndoRedo: true, onLayoutChange, ref }));
    const target = itemEl(container, `0`);

    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizemove`, { clientX: 100, clientY: 0 });
    dispatchResizeEvent(target, `resizeend`, { clientX: 100, clientY: 0 });
    act(() => {
      ref.current!.undo();
    });

    expect(byId(lastLayout(onLayoutChange), `0`).w).toBe(2);
  });
});

describe(`GridLayout — undo/redo bookkeeping`, () => {
  const dragOnce = (container: HTMLElement, clientX: number, clientY: number): void => {
    const target = itemEl(container, `0`);
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX, clientY });
    dispatchDragEvent(target, `dragend`, { clientX, clientY });
  };

  it(`Should keep canUndo and canRedo current across a commit, an undo and a redo`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { enableUndoRedo: true, ref }));

    dragOnce(container, 203, 225);
    expect([ref.current!.canUndo, ref.current!.canRedo]).toStrictEqual([true, false]);

    act(() => {
      ref.current!.undo();
    });
    expect([ref.current!.canUndo, ref.current!.canRedo]).toStrictEqual([false, true]);

    act(() => {
      ref.current!.redo();
    });
    expect([ref.current!.canUndo, ref.current!.canRedo]).toStrictEqual([true, false]);
  });

  it(`Should start recording history once enableUndoRedo is switched on after mount`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const ref = createRef<IGridLayoutHandle>();
    const { container, rerender } = render(grid(layout, { enableUndoRedo: false, ref }));

    rerender(grid(layout, { enableUndoRedo: true, ref }));
    dragOnce(container, 203, 225);

    expect(ref.current!.canUndo).toBe(true);
  });

  it(`Should honour an undoHistoryLimit that changes after mount`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const onLayoutChange = vi.fn();
    const ref = createRef<IGridLayoutHandle>();
    const { container, rerender } = render(grid(layout, { enableUndoRedo: true, onLayoutChange, ref, undoHistoryLimit: 50 }));
    rerender(grid(layout, { enableUndoRedo: true, onLayoutChange, ref, undoHistoryLimit: 1 }));

    dragOnce(container, 203, 225);
    dragOnce(container, 501, 555);
    act(() => {
      ref.current!.undo();
    });
    act(() => {
      ref.current!.undo();
    });

    // Only one snapshot fits: the second undo is a no-op, so the item is left where the first drag put it.
    expect(byId(lastLayout(onLayoutChange), `0`)).toMatchObject({ x: 2, y: 2 });
  });
});

describe(`GridItem — keyboard move and resize`, () => {
  const keyLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 1 }];

  it(`Should stop a keyboard resize at maxRows, measured from the item's own row`, () => {
    stubOffsetWidth(1200);
    const onLayoutChange = vi.fn();
    const { container } = render(grid(keyLayout(), { maxRows: 4, onLayoutChange }));
    const item = itemEl(container, `0`);

    fireEvent.keyDown(item, { key: `ArrowDown`, shiftKey: true });
    expect(byId(lastLayout(onLayoutChange), `0`).h).toBe(3); // 2 + 1, within 4 - 1 = 3

    const callsAfterFirst = onLayoutChange.mock.calls.length;
    fireEvent.keyDown(item, { key: `ArrowDown`, shiftKey: true });
    expect(onLayoutChange.mock.calls.length).toBe(callsAfterFirst); // 3 + 1 would pass the bound: nothing changes
  });

  it(`Should stop a keyboard move at maxRows, measured from the item's own height`, () => {
    stubOffsetWidth(1200);
    const onLayoutChange = vi.fn();
    const { container } = render(grid(keyLayout(), { maxRows: 4, onLayoutChange }));
    const item = itemEl(container, `0`);

    fireEvent.keyDown(item, { key: `ArrowDown` });
    expect(byId(lastLayout(onLayoutChange), `0`).y).toBe(2); // 1 + 1, within 4 - 2 = 2

    const callsAfterFirst = onLayoutChange.mock.calls.length;
    fireEvent.keyDown(item, { key: `ArrowDown` });
    expect(onLayoutChange.mock.calls.length).toBe(callsAfterFirst);
  });

  it(`Should record a keyboard resize as one undoable step`, () => {
    stubOffsetWidth(1200);
    const onLayoutChange = vi.fn();
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(grid(keyLayout(), { enableUndoRedo: true, onLayoutChange, ref }));

    fireEvent.keyDown(itemEl(container, `0`), { key: `ArrowRight`, shiftKey: true });
    expect(byId(lastLayout(onLayoutChange), `0`).w).toBe(3);
    act(() => {
      ref.current!.undo();
    });

    expect(byId(lastLayout(onLayoutChange), `0`).w).toBe(2);
  });

  it(`Should leave no placeholder behind once a keyboard resize has finished`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid(keyLayout()));

    fireEvent.keyDown(itemEl(container, `0`), { key: `ArrowRight`, shiftKey: true });

    expect(container.querySelector(`.kdl-grid-placeholder`)).toBeNull();
  });

  it(`Should ignore a key that is not an arrow, without throwing or preventing its default`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid(keyLayout()));
    let notPrevented = true;

    const errors = captureUncaughtErrors(() => {
      notPrevented = fireEvent.keyDown(itemEl(container, `0`), { key: `a` });
    });

    expect(errors).toStrictEqual([]);
    expect(notPrevented).toBe(true);
  });

  it(`Should close an item with no onItemClose handler without throwing`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid(keyLayout(), { showCloseButton: true }));

    const errors = captureUncaughtErrors(() => {
      fireEvent.click(container.querySelector(`.kdl-grid-item-close-button`) as HTMLElement);
    });

    expect(errors).toStrictEqual([]);
  });

  it(`Should accept an outside drop with no onOutsideDrop handler without throwing`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid(keyLayout(), { allowOutsideDrop: true }));
    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    const drop = new Event(`drop`, { bubbles: true, cancelable: true }) as unknown as { clientX: number; clientY: number; dataTransfer: DataTransfer };
    drop.clientX = 100;
    drop.clientY = 100;
    drop.dataTransfer = { getData: () => `` } as unknown as DataTransfer;

    const errors = captureUncaughtErrors(() => {
      act(() => {
        root.dispatchEvent(drop as unknown as Event);
      });
    });

    expect(errors).toStrictEqual([]);
  });
});

describe(`GridItem — live style while a gesture is running`, () => {
  it(`Should follow the dragged pixel position, on both axes, during dragmove`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));
    const target = itemEl(container, `0`);

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 50, clientY: 0 });

    // The item's own rect starts at (5, 5); 50px further right puts the live position at (55, 5), not the snapped grid cell.
    expect(target.style.transform).toMatch(/translate3d\(55px,\s*5px/);
  });

  it(`Should move the left anchor along with a left-edge resize`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 4, y: 0 }]));
    const target = itemEl(container, `0`);
    const edges = { bottom: false, left: true, right: false, top: false };

    // Column 4 starts at round(89.1667 * 4 + 5 * 10) = 407px; pulling the left edge 100px further left leaves it at 307px and 100px wider.
    dispatchResizeEvent(target, `resizestart`, { clientX: 0, edges });
    dispatchResizeEvent(target, `resizemove`, { clientX: -100, edges });

    expect(target.style.transform).toMatch(/translate3d\(307px/);
    expect(target.style.width).toBe(`288px`);
  });
});

describe(`GridItem — attributes, text and class names`, () => {
  it(`Should be focusable when it can be dragged but not resized`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, isResizable: false, w: 2, x: 0, y: 0 }]));

    expect(itemEl(container, `0`).getAttribute(`tabindex`)).toBe(`0`);
  });

  it(`Should be focusable when it can be resized but not dragged`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, isDraggable: false, w: 2, x: 0, y: 0 }]));

    expect(itemEl(container, `0`).getAttribute(`tabindex`)).toBe(`0`);
  });

  it(`Should read out exactly the instructions that apply, with a single space between them`, () => {
    stubOffsetWidth(1200);
    const both = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));
    const dragOnly = render(grid([{ h: 2, i: `0`, isResizable: false, w: 2, x: 0, y: 0 }]));
    const resizeOnly = render(grid([{ h: 2, i: `0`, isDraggable: false, w: 2, x: 0, y: 0 }]));
    const instructions = (container: HTMLElement): string => (container.querySelector(`.kdl-visually-hidden`) as HTMLElement).textContent!;

    expect(instructions(both.container)).toBe(`Press arrow keys to move. Press shift plus arrow keys to resize.`);
    expect(instructions(dragOnly.container)).toBe(`Press arrow keys to move. `);
    expect(instructions(resizeOnly.container)).toBe(` Press shift plus arrow keys to resize.`);
  });

  it(`Should carry only real class names, never a stray "false" from an inactive flag`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));

    const className = itemEl(container, `0`).className;

    expect(className).not.toMatch(/false|undefined|null/);
    expect(className).not.toMatch(/\s{2,}/);
  });

  it(`Should render a resize hint for every one of the eight edges by default`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));

    [`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`].forEach(edge => {
      expect(container.querySelector(`.kdl-resize-hint--${edge}`)).not.toBeNull();
    });
  });

  it(`Should pick up a per-item aria label change after mount`, () => {
    stubOffsetWidth(1200);
    const first: TLayout = [{ ariaLabels: { moveInstruction: `First move text.` }, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container, rerender } = render(grid(first));

    rerender(grid([{ ariaLabels: { moveInstruction: `Second move text.` }, h: 2, i: `0`, w: 2, x: 0, y: 0 }]));

    expect((container.querySelector(`.kdl-visually-hidden`) as HTMLElement).textContent).toContain(`Second move text.`);
  });

  it(`Should pick up a grid-wide ariaLabels change after mount`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container, rerender } = render(grid(layout, { ariaLabels: { moveInstruction: `First grid text.` } }));

    rerender(grid(layout, { ariaLabels: { moveInstruction: `Second grid text.` } }));

    expect((container.querySelector(`.kdl-visually-hidden`) as HTMLElement).textContent).toContain(`Second grid text.`);
  });
});
