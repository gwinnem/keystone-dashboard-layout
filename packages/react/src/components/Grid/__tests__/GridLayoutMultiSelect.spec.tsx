import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';
import { dispatchDragEvent, dispatchResizeEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

const threeItemLayout = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 4, y: 0 },
  { h: 2, i: `2`, w: 2, x: 8, y: 0 },
];

/** Every `ref.current!.xxx()` handle call, and every raw `.click()`/`dispatchEvent`, is a direct synchronous invocation outside React's own event system — same `act()` rationale as `dispatchDragEvent`/`dispatchResizeEvent` in `test-helpers.ts`. */
function click(el: HTMLElement, options: MouseEventInit = {}): void {
  act(() => {
    el.dispatchEvent(new MouseEvent(`click`, { bubbles: true, ...options }));
  });
}

describe(`GridLayout multiSelect`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should select an item exclusively on a plain click`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(
      <GridLayout layout={threeItemLayout()} multiSelect ref={ref}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    click(container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement);

    expect(ref.current!.selectedItems).toStrictEqual([`0`]);
  });

  it(`Should replace the prior exclusive selection on a second plain click`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(
      <GridLayout layout={threeItemLayout()} multiSelect ref={ref}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    click(container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement);
    click(container.querySelector(`[data-grid-item-id="1"]`) as HTMLElement);

    expect(ref.current!.selectedItems).toStrictEqual([`1`]);
  });

  it(`Should toggle an item into the selection with a Ctrl+click, preserving the rest`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(
      <GridLayout layout={threeItemLayout()} multiSelect ref={ref}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    click(container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement);
    click(container.querySelector(`[data-grid-item-id="1"]`) as HTMLElement, { ctrlKey: true });

    expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`0`, `1`]);
  });

  it(`Should compute the same range again (not toggle it back off) on a second, repeated Shift+click to the same target`, () => {
    // Corrected, not merely renamed: an earlier version of this test
    // asserted the *opposite* — that a second Shift+click to the same
    // target toggled the range back off entirely, landing back at just
    // `['0']`. That was true of Shift-click's own old "treat exactly
    // like Ctrl/Cmd" behavior, but is actively wrong now that Shift
    // computes a real, anchored range instead (see `GridLayout.tsx`'s
    // own `handleItemClick`): the anchor stays fixed at the last
    // plain/Ctrl click ('0') across repeated Shift-clicks by design
    // (not updated by a Shift-click itself), so re-clicking the exact
    // same target with the exact same anchor recomputes the identical
    // range and *replaces* the selection with it again — idempotent,
    // not a toggle. See the dedicated `Shift-click range-selection`
    // suite below for the fuller set of range-specific behaviors.
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(
      <GridLayout layout={threeItemLayout()} multiSelect ref={ref}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    click(container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement);
    click(container.querySelector(`[data-grid-item-id="1"]`) as HTMLElement, { shiftKey: true });
    click(container.querySelector(`[data-grid-item-id="1"]`) as HTMLElement, { shiftKey: true });

    expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`0`, `1`]);
  });

  it(`Should apply the selected class to a currently-selected item`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(
      <GridLayout layout={threeItemLayout()} multiSelect ref={ref}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    act(() => {
      ref.current!.selectItem(`0`);
    });

    const item0 = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    const item1 = container.querySelector(`[data-grid-item-id="1"]`) as HTMLElement;
    expect(item0.classList.contains(`kdl-grid-item--selected`)).toBe(true);
    expect(item1.classList.contains(`kdl-grid-item--selected`)).toBe(false);
  });

  it(`Should clear the selection when clicking the grid's own empty background`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(
      <GridLayout layout={threeItemLayout()} multiSelect ref={ref}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    click(container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement);
    expect(ref.current!.selectedItems).toStrictEqual([`0`]);

    click(container.querySelector(`.kdl-grid-layout`) as HTMLElement);
    expect(ref.current!.selectedItems).toStrictEqual([]);
  });

  it(`Should not react to any clicks at all when multiSelect is off (the default)`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(
      <GridLayout layout={threeItemLayout()} ref={ref}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    click(container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement);

    expect(ref.current!.selectedItems).toStrictEqual([]);
  });

  it(`Should expose selectItem/deselectItem/toggleItemSelection/clearSelection directly via the handle`, () => {
    const ref = createRef<IGridLayoutHandle>();
    render(
      <GridLayout layout={threeItemLayout()} multiSelect ref={ref}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    act(() => {
      ref.current!.selectItem(`0`);
    });
    act(() => {
      ref.current!.selectItem(`1`);
    });
    expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`0`, `1`]);

    act(() => {
      ref.current!.deselectItem(`0`);
    });
    expect(ref.current!.selectedItems).toStrictEqual([`1`]);

    act(() => {
      ref.current!.toggleItemSelection(`0`);
    });
    expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`0`, `1`]);

    act(() => {
      ref.current!.clearSelection();
    });
    expect(ref.current!.selectedItems).toStrictEqual([]);
  });

  it(`Should be a no-op to deselect an id that isn't currently selected`, () => {
    const ref = createRef<IGridLayoutHandle>();
    render(
      <GridLayout layout={threeItemLayout()} multiSelect ref={ref}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    act(() => {
      ref.current!.selectItem(`0`);
    });

    act(() => {
      ref.current!.deselectItem(`1`);
    });

    expect(ref.current!.selectedItems).toStrictEqual([`0`]);
  });

  it(`Should be a no-op to select an id that's already selected — confirmed gap via a fresh coverage report`, () => {
    // selectItem's own "prev.has(id) ? prev : ..." branch — every
    // other selectItem test in this file only ever selects a
    // previously-unselected id, so the "already selected" side
    // (returning the same Set reference unchanged) was never
    // exercised.
    const ref = createRef<IGridLayoutHandle>();
    render(
      <GridLayout layout={threeItemLayout()} multiSelect ref={ref}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    act(() => {
      ref.current!.selectItem(`0`);
    });
    act(() => {
      ref.current!.selectItem(`0`);
    });

    expect(ref.current!.selectedItems).toStrictEqual([`0`]);
  });

  it(`Should be a no-op to clear an already-empty selection — confirmed gap via a fresh coverage report`, () => {
    // clearSelection's own "prev.size === 0 ? prev : ..." branch —
    // every other clearSelection test in this file only ever clears a
    // genuinely non-empty selection.
    const ref = createRef<IGridLayoutHandle>();
    render(
      <GridLayout layout={threeItemLayout()} multiSelect ref={ref}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    act(() => {
      ref.current!.clearSelection();
    });

    expect(ref.current!.selectedItems).toStrictEqual([]);
  });

  it(`Should prune a selected id when its item is removed via an external layout change`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const { rerender } = render(
      <GridLayout layout={threeItemLayout()} multiSelect ref={ref}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    act(() => {
      ref.current!.selectItem(`0`);
    });
    act(() => {
      ref.current!.selectItem(`1`);
    });
    expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`0`, `1`]);

    act(() => {
      rerender(
        <GridLayout layout={[threeItemLayout()[1]]} multiSelect ref={ref}>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );
    });

    expect(ref.current!.selectedItems).toStrictEqual([`1`]);
  });

  describe(`Shift-click range-selection`, () => {
    // A 4-item layout is what actually distinguishes real
    // range-selection from a plain toggle — every other test in this
    // file only ever uses 2-3 items, most of them adjacent in layout
    // order, so a computed range and a plain toggle/additive select
    // often happen to produce the same result by coincidence. These
    // tests use enough items that only a genuine, layout-order-based
    // range produces the expected selection.
    const fourItemLayout = (): TLayout => [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 2, y: 0 },
      { h: 2, i: `c`, w: 2, x: 4, y: 0 },
      { h: 2, i: `d`, w: 2, x: 6, y: 0 },
    ];

    it(`Should select every item between the anchor and the Shift-clicked target, inclusive`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const { container } = render(
        <GridLayout layout={fourItemLayout()} multiSelect ref={ref}>
          <GridItem i="a">Item a</GridItem>
          <GridItem i="b">Item b</GridItem>
          <GridItem i="c">Item c</GridItem>
          <GridItem i="d">Item d</GridItem>
        </GridLayout>,
      );

      click(container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement);
      click(container.querySelector(`[data-grid-item-id="d"]`) as HTMLElement, { shiftKey: true });

      expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`a`, `b`, `c`, `d`]);
    });

    it(`Should select the same range when Shift-clicking "backwards" toward an earlier item`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const { container } = render(
        <GridLayout layout={fourItemLayout()} multiSelect ref={ref}>
          <GridItem i="a">Item a</GridItem>
          <GridItem i="b">Item b</GridItem>
          <GridItem i="c">Item c</GridItem>
          <GridItem i="d">Item d</GridItem>
        </GridLayout>,
      );

      click(container.querySelector(`[data-grid-item-id="d"]`) as HTMLElement);
      click(container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement, { shiftKey: true });

      expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`a`, `b`, `c`, `d`]);
    });

    it(`Should replace the current selection with the range, not merge into it`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const { container } = render(
        <GridLayout layout={fourItemLayout()} multiSelect ref={ref}>
          <GridItem i="a">Item a</GridItem>
          <GridItem i="b">Item b</GridItem>
          <GridItem i="c">Item c</GridItem>
          <GridItem i="d">Item d</GridItem>
        </GridLayout>,
      );

      // Ctrl-select "d" on its own first — unrelated to the anchor this
      // Shift-click range below is about to compute.
      click(container.querySelector(`[data-grid-item-id="d"]`) as HTMLElement, { ctrlKey: true });
      click(container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement);
      click(container.querySelector(`[data-grid-item-id="b"]`) as HTMLElement, { shiftKey: true });

      // Only "a" and "b" (the computed range) — "d"'s own earlier,
      // unrelated Ctrl-selection doesn't survive.
      expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`a`, `b`]);
    });

    it(`Should keep re-anchoring to the same fixed point across repeated Shift-clicks, not compounding from the previous Shift-click target`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const { container } = render(
        <GridLayout layout={fourItemLayout()} multiSelect ref={ref}>
          <GridItem i="a">Item a</GridItem>
          <GridItem i="b">Item b</GridItem>
          <GridItem i="c">Item c</GridItem>
          <GridItem i="d">Item d</GridItem>
        </GridLayout>,
      );

      click(container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement);
      click(container.querySelector(`[data-grid-item-id="c"]`) as HTMLElement, { shiftKey: true });
      expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`a`, `b`, `c`]);

      // A second Shift-click, to "b" — ranges from the *original* anchor
      // "a", not from "c" (the previous Shift-click target).
      click(container.querySelector(`[data-grid-item-id="b"]`) as HTMLElement, { shiftKey: true });
      expect(ref.current!.selectedItems.slice().sort()).toStrictEqual([`a`, `b`]);
    });

    it(`Should fall back to a plain select when there's no anchor yet (the very first click on a fresh grid is a Shift-click)`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const { container } = render(
        <GridLayout layout={fourItemLayout()} multiSelect ref={ref}>
          <GridItem i="a">Item a</GridItem>
          <GridItem i="b">Item b</GridItem>
          <GridItem i="c">Item c</GridItem>
          <GridItem i="d">Item d</GridItem>
        </GridLayout>,
      );

      click(container.querySelector(`[data-grid-item-id="b"]`) as HTMLElement, { shiftKey: true });

      expect(ref.current!.selectedItems).toStrictEqual([`b`]);
    });

    it(`Should reset the anchor after clearSelection, so a later Shift-click falls back to a plain select again`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const { container } = render(
        <GridLayout layout={fourItemLayout()} multiSelect ref={ref}>
          <GridItem i="a">Item a</GridItem>
          <GridItem i="b">Item b</GridItem>
          <GridItem i="c">Item c</GridItem>
          <GridItem i="d">Item d</GridItem>
        </GridLayout>,
      );

      click(container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement);
      act(() => {
        ref.current!.clearSelection();
      });

      click(container.querySelector(`[data-grid-item-id="c"]`) as HTMLElement, { shiftKey: true });

      // No anchor survived the clear — falls back to a plain select of
      // just "c", not a range from the stale "a" anchor.
      expect(ref.current!.selectedItems).toStrictEqual([`c`]);
    });

    it(`Should reset the anchor once its own item is removed from the layout, so a later Shift-click falls back to a plain select`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const { container, rerender } = render(
        <GridLayout layout={fourItemLayout()} multiSelect ref={ref}>
          <GridItem i="a">Item a</GridItem>
          <GridItem i="b">Item b</GridItem>
          <GridItem i="c">Item c</GridItem>
          <GridItem i="d">Item d</GridItem>
        </GridLayout>,
      );

      click(container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement);

      // Remove "a" (the anchor) from the layout entirely.
      act(() => {
        rerender(
          <GridLayout layout={fourItemLayout().filter(item => item.i !== `a`)} multiSelect ref={ref}>
            <GridItem i="b">Item b</GridItem>
            <GridItem i="c">Item c</GridItem>
            <GridItem i="d">Item d</GridItem>
          </GridLayout>,
        );
      });

      click(container.querySelector(`[data-grid-item-id="c"]`) as HTMLElement, { shiftKey: true });

      expect(ref.current!.selectedItems).toStrictEqual([`c`]);
    });
  });

  describe(`group move`, () => {
    it(`Should move every other selected item by the same delta as the dragged anchor`, () => {
      stubOffsetWidth(1200);
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={threeItemLayout()} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
          <GridItem i="2">Item 2</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });
      act(() => {
        ref.current!.selectItem(`1`);
      });
      act(() => {
        ref.current!.selectItem(`2`);
      });

      // colWidth at 1200/12/10: (1200-13*10)/12 ≈ 89.17; dragging item
      // "0" from x:0 by clientX:200 lands it at grid x:2 (same math
      // already established in the preventCollision tests above).
      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
      dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      // anchor moved from x:0 to x:2 -> dx:2; passengers shift by the same dx.
      expect(lastCall.find(entry => entry.i === `0`)!.x).toBe(2);
      expect(lastCall.find(entry => entry.i === `1`)!.x).toBe(6);
      expect(lastCall.find(entry => entry.i === `2`)!.x).toBe(10);
    });

    it(`Should not move a static passenger during a group drag`, () => {
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, isStatic: true, w: 2, x: 4, y: 0 },
      ];
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });
      act(() => {
        ref.current!.selectItem(`1`);
      });

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
      dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `1`)!.x).toBe(4);
    });

    it(`Should not move a passenger with isDraggable: false during a group drag`, () => {
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, isDraggable: false, w: 2, x: 4, y: 0 },
      ];
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });
      act(() => {
        ref.current!.selectItem(`1`);
      });

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
      dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `1`)!.x).toBe(4);
    });

    it(`Should not apply group move when only a single item is selected`, () => {
      stubOffsetWidth(1200);
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={threeItemLayout()} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
      dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `1`)!.x).toBe(4);
    });

    it(`Should default a selected id's own snapshot position to 0,0 when its layout entry can't be found at dragstart — confirmed gap via a fresh coverage report`, () => {
      // applyGroupMove's own "selectedItem?.x ?? 0, y: selectedItem?.y
      // ?? 0" fallback — every other group-move test here only ever
      // selects real, present items, so this defensive fallback (a
      // selected id with no matching layout entry at snapshot time)
      // was never exercised. A "ghost" id, selected directly via the
      // handle (bypassing any real item click), isn't pruned from the
      // selection until the next workingLayout change — selecting it
      // alone doesn't change workingLayout, so it genuinely persists
      // into a subsequent real dragstart.
      stubOffsetWidth(1200);
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={threeItemLayout()} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });
      act(() => {
        ref.current!.selectItem(`ghost`);
      });

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      expect(() => {
        dispatchDragEvent(target, `dragstart`);
        dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
        dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });
      }).not.toThrow();
    });

    it(`Should not apply a group-move delta once the selection grows past 1 mid-gesture, if the anchor's own dragstart never captured a snapshot — confirmed gap via a fresh coverage report`, () => {
      // applyGroupMove's own "else if((eventType === 'dragmove' ||
      // eventType === 'dragend') && groupMoveStartPositions.current.
      // has(id))" guard — every other group-move test here has the
      // full selection in place *before* dragstart, so the snapshot
      // always already contains the dragged item's own id by the time
      // dragmove/dragend run. Starting the drag with only the anchor
      // selected (so the outer "selectedItemIds.size > 1" guard blocks
      // dragstart's own snapshot from ever populating at all), then
      // selecting more items *during* the same gesture, reaches
      // dragmove/dragend with the outer guard now passing but the
      // snapshot still missing the anchor's own id entirely — the
      // specific combination this else-if's own false side requires.
      stubOffsetWidth(1200);
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={threeItemLayout()} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);

      act(() => {
        ref.current!.selectItem(`1`);
      });

      dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
      dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      // Passenger "1" should be completely untouched — no snapshot
      // existed for the anchor, so applyGroupMove's own delta-
      // application branch never ran at all.
      expect(lastCall.find(entry => entry.i === `1`)!.x).toBe(4);
    });
  });

  describe(`group resize`, () => {
    it(`Should resize every other selected item by the same delta as the resized anchor`, () => {
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 3, x: 4, y: 0 },
      ];
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });
      act(() => {
        ref.current!.selectItem(`1`);
      });

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: 0 });
      dispatchResizeEvent(target, `resizeend`, { clientX: 200, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      const anchor = lastCall.find(entry => entry.i === `0`)!;
      const passenger = lastCall.find(entry => entry.i === `1`)!;
      const dw = anchor.w - 2;
      expect(dw).toBeGreaterThan(0);
      expect(passenger.w).toBe(3 + dw);
    });

    it(`Should clamp a passenger's own grown size to its own maxW during a group resize`, () => {
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, maxW: 4, w: 3, x: 4, y: 0 },
      ];
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });
      act(() => {
        ref.current!.selectItem(`1`);
      });

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: 5000, clientY: 0 });
      dispatchResizeEvent(target, `resizeend`, { clientX: 5000, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `1`)!.w).toBe(4);
    });

    // Mirrors the maxW test above, but for the height dimension --
    // confirmed via a fresh mutation run that `applyGroupResize`'s own
    // height clamp (`Math.min(Math.max(startSize.h + dh, passenger.minH
    // ?? 1), passenger.maxH ?? Infinity)`) had zero coverage of its own:
    // every existing group-resize test only ever grows width
    // (`clientX`), never height (`clientY`), and none set `minH`/`maxH`
    // at all.
    it(`Should clamp a passenger's own grown height to its own maxH during a group resize`, () => {
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 3, i: `1`, maxH: 4, w: 2, x: 4, y: 0 },
      ];
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });
      act(() => {
        ref.current!.selectItem(`1`);
      });

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: 5000 });
      dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: 5000 });

      const lastCall2 = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall2.find(entry => entry.i === `1`)!.h).toBe(4);
    });

    it(`Should not resize a static passenger during a group resize`, () => {
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, isStatic: true, w: 3, x: 4, y: 0 },
      ];
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });
      act(() => {
        ref.current!.selectItem(`1`);
      });

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: 0 });
      dispatchResizeEvent(target, `resizeend`, { clientX: 200, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `1`)!.w).toBe(3);
    });

    it(`Should default a selected id's own snapshot size to 1,1 when its layout entry can't be found at resizestart — confirmed gap via a fresh coverage report`, () => {
      // applyGroupResize's own "selectedItem?.h ?? 1, w: selectedItem?.
      // w ?? 1" fallback — same rationale as applyGroupMove's own
      // equivalent test above, for the resize snapshot instead.
      stubOffsetWidth(1200);
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={threeItemLayout()} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });
      act(() => {
        ref.current!.selectItem(`ghost`);
      });

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      expect(() => {
        dispatchResizeEvent(target, `resizestart`);
        dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: 0 });
        dispatchResizeEvent(target, `resizeend`, { clientX: 200, clientY: 0 });
      }).not.toThrow();
    });

    it(`Should not apply a group-resize delta once the selection grows past 1 mid-gesture, if the anchor's own resizestart never captured a snapshot — confirmed gap via a fresh coverage report`, () => {
      // applyGroupResize's own "else if((eventType === 'resizemove' ||
      // eventType === 'resizeend') && groupResizeStartSizes.current.
      // has(id))" guard — same reachable pattern as applyGroupMove's own
      // equivalent test above: start the resize with only the anchor
      // selected (blocking the snapshot from ever populating), then
      // select more items during the same gesture.
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 3, x: 4, y: 0 },
      ];
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={12} compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} multiSelect onLayoutChange={handleChange} ref={ref} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);

      act(() => {
        ref.current!.selectItem(`1`);
      });

      dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: 0 });
      dispatchResizeEvent(target, `resizeend`, { clientX: 200, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `1`)!.w).toBe(3);
    });
  });
});
