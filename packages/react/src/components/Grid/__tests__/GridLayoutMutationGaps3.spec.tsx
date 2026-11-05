import { createRef, useState } from 'react';
import type { JSX, ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';
import { dispatchDragEvent, dispatchResizeEvent, restoreOffsetWidth, stubOffsetWidth, triggerResize } from './test-helpers';

/**
 * Targets mutants that survived Stryker against `GridLayout.tsx`, `GridItem.tsx` and `useCrossGridDrag.ts`
 * after `GridLayoutMutationGaps2.spec.tsx` (see `reports/mutation/mutation.json`). Many of these are the
 * mirror image of something that file already covers for the *other* half of a feature: group resize
 * when only group move was tested, the per-breakpoint layout cache when only a case where regeneration
 * happens to give the same answer was tested, dependency arrays that nothing ever changed after mount.
 *
 * Fixed geometry, as in that file: container 1200px, margin [10, 10], rowHeight 100, 12 columns ->
 * column step 99.1667, row step 110. The drag helper's item rect starts at (5, 5), so a tick at
 * (clientX, clientY) targets column round((5 + clientX - 10) / 99.1667) and row round((5 + clientY - 10) / 110):
 * clientX 402 -> column 4;  clientY 115 -> row 1, 335 -> row 3, 665 -> row 6.
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
const rootOf = (container: HTMLElement): HTMLElement => container.querySelector(`.kdl-grid-layout`) as HTMLElement;

describe(`GridLayout — group resize respects multiSelect being switched off`, () => {
  it(`Should not group-resize once multiSelect has been switched off, even with a selection still in place`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 3, i: `1`, w: 3, x: 4, y: 0 },
    ];
    const ref = createRef<IGridLayoutHandle>();
    const onLayoutChange = vi.fn();
    const { container, rerender } = render(grid(layout, { multiSelect: true, onLayoutChange, ref }));
    act(() => {
      ref.current!.selectItem(`0`);
    });
    act(() => {
      ref.current!.toggleItemSelection(`1`);
    });
    rerender(grid(layout, { multiSelect: false, onLayoutChange, ref }));
    const target = itemEl(container, `0`);

    // The anchor grows by one column and one row; with multiSelect off the passenger must not follow.
    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizemove`, { clientX: 100, clientY: 110 });

    const mid = lastLayout(onLayoutChange);
    expect(byId(mid, `0`)).toMatchObject({ h: 3, w: 3 });
    expect(byId(mid, `1`)).toMatchObject({ h: 3, w: 3 });
  });
});

describe(`GridLayout — restoreOnDrag does not restrict the item being dragged`, () => {
  it(`Should let the dragged item itself compact upwards once it lands, whatever row it started on`, () => {
    stubOffsetWidth(1200);
    // "a" starts on row 3 directly under a static wall, so it could never rise. Dragged to column 4, row 1
    // (free space), it must settle on row 0 — which it only can if its OWN pre-drag row (3) is not
    // part of the "other items may not rise past where they started" snapshot.
    const layout: TLayout = [
      { h: 3, i: `wall`, isStatic: true, w: 2, x: 0, y: 0 },
      { h: 2, i: `a`, w: 2, x: 0, y: 3 },
    ];
    const onLayoutChange = vi.fn();
    const { container } = render(grid(layout, { compactType: ECompactType.VERTICAL, onLayoutChange, restoreOnDrag: true }));
    const target = itemEl(container, `a`);

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 402, clientY: 115 });
    dispatchDragEvent(target, `dragend`, { clientX: 402, clientY: 115 });

    expect(byId(lastLayout(onLayoutChange), `a`)).toMatchObject({ x: 4, y: 0 });
  });
});

/** Two grids wired the way a real consumer would: each `onLayoutChange` feeds its own state back as the `layout` prop. */
function TwoItemSourceHarness({ onChangeA }: { onChangeA: (layout: TLayout) => void }): JSX.Element {
  const [layoutA, setLayoutA] = useState<TLayout>([
    { h: 2, i: `moving`, w: 2, x: 0, y: 0 },
    { h: 2, i: `staying`, w: 2, x: 4, y: 0 },
  ]);
  const [layoutB, setLayoutB] = useState<TLayout>([]);
  return (
    <>
      <GridLayout allowCrossGridDrag layout={layoutA} layoutId="grid-a" onLayoutChange={next => { setLayoutA(next); onChangeA(next); }}>
        {layoutA.map(item => <GridItem i={item.i} key={item.i}>{item.i}</GridItem>)}
      </GridLayout>
      <GridLayout allowCrossGridDrag layout={layoutB} layoutId="grid-b" onLayoutChange={setLayoutB}>
        {layoutB.map(item => <GridItem i={item.i} key={item.i}>{item.i}</GridItem>)}
      </GridLayout>
    </>
  );
}

const TARGET_RECT = { bottom: 400, height: 400, left: 1000, right: 1200, toJSON: () => ({}), top: 0, width: 200, x: 1000, y: 0 };

describe(`GridLayout — an item handed over to another grid`, () => {
  it(`Should leave every OTHER item in the source grid, and clear the drag state`, () => {
    const onChangeA = vi.fn();
    const { container } = render(<TwoItemSourceHarness onChangeA={onChangeA} />);
    const [gridA, gridB] = Array.from(container.querySelectorAll(`.kdl-grid-layout`)) as HTMLElement[];
    gridB.getBoundingClientRect = () => TARGET_RECT;
    const target = itemEl(container, `moving`);

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 1100, clientY: 100 });
    dispatchDragEvent(target, `dragend`, { clientX: 1100, clientY: 100 });

    const left = lastLayout(onChangeA);
    expect(left.map(entry => entry.i)).toStrictEqual([`staying`]);
    expect(gridA.classList.contains(`kdl-grid-layout--active-drag`)).toBe(false);
  });

  it(`Should not hand an item over when the drag began while allowCrossGridDrag was off`, () => {
    const layoutA: TLayout = [{ h: 2, i: `shared-item`, w: 2, x: 0, y: 0 }];
    const layoutB: TLayout = [];
    const onDropped = vi.fn();
    const element = (allowA: boolean): ReactElement => (
      <>
        <GridLayout allowCrossGridDrag={allowA} layout={layoutA} layoutId="grid-a">
          <GridItem i="shared-item">Shared</GridItem>
        </GridLayout>
        <GridLayout allowCrossGridDrag layout={layoutB} layoutId="grid-b" onCrossGridItemDropped={onDropped}>
          {null}
        </GridLayout>
      </>
    );
    const { container, rerender } = render(element(false));
    (container.querySelectorAll(`.kdl-grid-layout`)[1] as HTMLElement).getBoundingClientRect = () => TARGET_RECT;
    const target = itemEl(container, `shared-item`);

    dispatchDragEvent(target, `dragstart`);
    // Turned on only after the gesture began: the drag was never one this grid agreed to hand over.
    rerender(element(true));
    dispatchDragEvent(target, `dragend`, { clientX: 1100, clientY: 100 });

    expect(onDropped).not.toHaveBeenCalled();
  });

  it(`Should accept and refuse drops without throwing when no handler is supplied for either`, () => {
    const element = (disableB: boolean): ReactElement => (
      <StatefulPair disableB={disableB} />
    );
    function StatefulPair({ disableB }: { disableB: boolean }): JSX.Element {
      const [layoutA, setLayoutA] = useState<TLayout>([{ h: 2, i: `x`, w: 2, x: 0, y: 0 }]);
      const [layoutB, setLayoutB] = useState<TLayout>([]);
      return (
        <>
          <GridLayout allowCrossGridDrag layout={layoutA} layoutId="grid-a" onLayoutChange={setLayoutA}>
            {layoutA.map(item => <GridItem i={item.i} key={item.i}>{item.i}</GridItem>)}
          </GridLayout>
          <GridLayout allowCrossGridDrag disableExternalDrop={disableB} layout={layoutB} layoutId="grid-b" onLayoutChange={setLayoutB}>
            {layoutB.map(item => <GridItem i={item.i} key={item.i}>{item.i}</GridItem>)}
          </GridLayout>
        </>
      );
    }

    for(const disableB of [false, true]) {
      const { container, unmount } = render(element(disableB));
      (container.querySelectorAll(`.kdl-grid-layout`)[1] as HTMLElement).getBoundingClientRect = () => TARGET_RECT;
      const target = itemEl(container, `x`);
      expect(() => {
        dispatchDragEvent(target, `dragstart`);
        dispatchDragEvent(target, `dragend`, { clientX: 1100, clientY: 100 });
      }).not.toThrow();
      unmount();
    }
  });
});

describe(`GridLayout — onMoveBlockedByCollision on a purely vertical move`, () => {
  const stacked = (): TLayout => [
    { h: 2, i: `0`, w: 2, x: 0, y: 0 },
    { h: 2, i: `1`, w: 2, x: 0, y: 3 },
  ];

  it(`Should report a vertical move that preventCollision refused`, () => {
    stubOffsetWidth(1200);
    const onMoveBlockedByCollision = vi.fn();
    const { container } = render(grid(stacked(), { onMoveBlockedByCollision, preventCollision: true }));
    const target = itemEl(container, `0`);

    // Straight down onto row 3, where "1" sits: x is unchanged, only y differs, and the move is refused.
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 335 });

    expect(onMoveBlockedByCollision).toHaveBeenCalledWith(`0`);
  });

  it(`Should say nothing for a vertical move into free space`, () => {
    stubOffsetWidth(1200);
    const onMoveBlockedByCollision = vi.fn();
    const { container } = render(grid(stacked(), { onMoveBlockedByCollision, preventCollision: true }));
    const target = itemEl(container, `0`);

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 665 });
    dispatchDragEvent(target, `dragend`, { clientX: 0, clientY: 665 });

    expect(onMoveBlockedByCollision).not.toHaveBeenCalled();
  });
});

describe(`GridLayout — root element markup`, () => {
  it(`Should carry only the base class name by default — no stray "false" tokens`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));
    expect(rootOf(container).className).toBe(`kdl-grid-layout`);
  });

  it(`Should add its modifier and the consumer's own class, in that order, when set`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { className: `mine`, showGridLines: true }));
    expect(rootOf(container).className).toBe(`kdl-grid-layout kdl-grid-layout--grid-lines mine`);
  });

  it(`Should render its items directly, with no width wrapper and no horizontal scroll, when no item sets minW`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));
    const root = rootOf(container);
    expect(root.firstElementChild!.classList.contains(`kdl-grid-item`)).toBe(true);
    expect(root.style.overflowX).toBe(``);
  });

  it(`Should set no grid-line custom properties while showGridLines is off`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));
    expect(rootOf(container).style.getPropertyValue(`--kdl-grid-line-column-size`)).toBe(``);
    expect(rootOf(container).style.getPropertyValue(`--kdl-grid-line-row-size`)).toBe(``);
  });

  it(`Should follow transitionDurationMs when it changes after mount`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container, rerender } = render(grid(layout, { transitionDurationMs: 100 }));
    expect(rootOf(container).style.getPropertyValue(`--kdl-transition-duration`)).toBe(`100ms`);

    rerender(grid(layout, { transitionDurationMs: 300 }));
    expect(rootOf(container).style.getPropertyValue(`--kdl-transition-duration`)).toBe(`300ms`);
  });
});

describe(`GridLayout — responsive breakpoint switching`, () => {
  it(`Should not re-run a breakpoint switch for a width change that stays inside the same breakpoint`, () => {
    stubOffsetWidth(1300); // "lg" under the default breakpoints
    const onBreakpointChange = vi.fn();
    render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { onBreakpointChange, responsive: true }));
    expect(onBreakpointChange).toHaveBeenCalledTimes(1);
    expect(onBreakpointChange).toHaveBeenCalledWith(`lg`, 12);

    triggerResize(1250); // still above 1200, still "lg"

    expect(onBreakpointChange).toHaveBeenCalledTimes(1);
  });

  it(`Should restore a wider breakpoint's own layout after a trip through a narrower one that squeezed it`, () => {
    stubOffsetWidth(1300);
    const onLayoutChange = vi.fn();
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 8, y: 0 },
      { h: 2, i: `1`, w: 2, x: 0, y: 0 },
    ];
    render(grid(layout, { onLayoutChange, responsive: true }));
    expect(byId(lastLayout(onLayoutChange), `0`).x).toBe(8);

    // "xs" has 4 columns, so the item at column 8 cannot stay there...
    triggerResize(500);
    const narrow = byId(lastLayout(onLayoutChange), `0`);
    expect(narrow.x + narrow.w).toBeLessThanOrEqual(4);

    // ...but returning to "lg" must bring back what "lg" had, not a layout regenerated from the squeezed one.
    triggerResize(1300);
    expect(byId(lastLayout(onLayoutChange), `0`).x).toBe(8);
  });
});

describe(`GridLayout — outside drop follows props that change after mount`, () => {
  const placeholderOf = (container: HTMLElement) => container.querySelector(`.kdl-grid-outside-drop-placeholder`);

  const fire = (root: HTMLElement, type: string): void => {
    const event = new Event(type, { bubbles: true, cancelable: true }) as unknown as { clientX: number; clientY: number };
    event.clientX = 50;
    event.clientY = 50;
    act(() => {
      root.dispatchEvent(event as unknown as Event);
    });
  };

  const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

  it(`Should start accepting once an outsideDropAccept predicate that rejected everything is replaced`, () => {
    const element = (accept: () => boolean): ReactElement => (
      <GridLayout allowOutsideDrop layout={layout} margin={[10, 10]} outsideDropAccept={accept} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>
    );
    const { container, rerender } = render(element(() => false));
    const root = rootOf(container);
    fire(root, `dragenter`);
    fire(root, `dragover`);
    expect(placeholderOf(container)).toBeFalsy();

    rerender(element(() => true));
    fire(root, `dragenter`);
    fire(root, `dragover`);

    expect(placeholderOf(container)).toBeTruthy();
  });

  it(`Should start accepting, and clear its placeholder again, once allowOutsideDrop is switched on after mount`, () => {
    const element = (allow: boolean): ReactElement => (
      <GridLayout allowOutsideDrop={allow} layout={layout} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>
    );
    const { container, rerender } = render(element(false));
    rerender(element(true));
    const root = rootOf(container);

    fire(root, `dragenter`);
    fire(root, `dragover`);
    expect(placeholderOf(container)).toBeTruthy();

    fire(root, `dragleave`);
    expect(placeholderOf(container)).toBeFalsy();
  });

  it(`Should stop accepting once allowOutsideDrop is switched off after mount`, () => {
    const element = (allow: boolean): ReactElement => (
      <GridLayout allowOutsideDrop={allow} layout={layout} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>
    );
    const { container, rerender } = render(element(true));
    rerender(element(false));
    const root = rootOf(container);

    fire(root, `dragenter`);
    fire(root, `dragover`);

    expect(placeholderOf(container)).toBeFalsy();
  });
});

describe(`GridItem — live style for a mirrored (RTL) item`, () => {
  it(`Should follow the pointer while a mirrored item is being dragged`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 4, y: 0 }], { isMirrored: true }));
    const target = itemEl(container, `0`);

    dispatchDragEvent(target, `dragstart`);
    const atStart = target.style.transform;
    dispatchDragEvent(target, `dragmove`, { clientX: 50, clientY: 0 });

    expect(target.style.transform).not.toBe(atStart);
  });

  it(`Should move the anchor edge on screen while a mirrored item is being resized`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 4, y: 0 }], { isMirrored: true }));
    const target = itemEl(container, `0`);

    // The helper's default edges are right + bottom, and under RTL the right edge is the one that moves the anchor.
    dispatchResizeEvent(target, `resizestart`);
    const atStart = target.style.transform;
    dispatchResizeEvent(target, `resizemove`, { clientX: 100, clientY: 0 });

    expect(target.style.transform).not.toBe(atStart);
  });

  it(`Should follow the pointer within a single column while a mirrored item is being resized, not only in whole-column steps`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 4, y: 0 }], { isMirrored: true }));
    const target = itemEl(container, `0`);

    dispatchResizeEvent(target, `resizestart`);
    const atStart = target.style.transform;
    // The test above moves 100px, more than half a column (about 99px a step), so the item's grid cell changes and the snapped position
    // moves the style on its own. 10px leaves the cell alone: only the pixel-precise anchor from the live resize can move the style.
    dispatchResizeEvent(target, `resizemove`, { clientX: 10, clientY: 0 });

    expect(target.style.transform).not.toBe(atStart);
  });
});

describe(`GridItem — resizing state and wiring`, () => {
  it(`Should drop the resizing class again once the resize has ended`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));
    const target = itemEl(container, `0`);

    dispatchResizeEvent(target, `resizestart`);
    expect(target.classList.contains(`kdl-grid-item--resizing`)).toBe(true);
    dispatchResizeEvent(target, `resizemove`, { clientX: 100, clientY: 0 });
    dispatchResizeEvent(target, `resizeend`, { clientX: 100, clientY: 0 });

    expect(target.classList.contains(`kdl-grid-item--resizing`)).toBe(false);
  });

  it(`Should not wire the native resize engine at all for an item whose resizeHandles is empty`, () => {
    stubOffsetWidth(1200);
    const { container } = render(grid([
      { h: 2, i: `none`, resizeHandles: [], w: 2, x: 0, y: 0 },
      { h: 2, i: `all`, w: 2, x: 4, y: 0 },
    ]));
    const engineOf = (id: string): unknown => (itemEl(container, id) as unknown as { __nativeResizeHandler?: unknown }).__nativeResizeHandler;

    expect(engineOf(`all`)).toBeTypeOf(`function`);
    expect(engineOf(`none`)).toBeUndefined();
  });

  it(`Should stop observing its auto-height wrapper when it unmounts`, () => {
    stubOffsetWidth(1200);
    const disconnect = vi.fn();
    // tests/setup.ts installs its own ResizeObserver with vi.stubGlobal, so this must put that one back
    // itself — vi.unstubAllGlobals() would remove the shared mock for every later test in the file.
    const sharedMock = globalThis.ResizeObserver;
    vi.stubGlobal(`ResizeObserver`, class {
      disconnect = disconnect;
      observe = vi.fn();
      unobserve = vi.fn();
    });
    try {
      const { unmount } = render(grid([{ autoHeight: true, h: 2, i: `0`, w: 2, x: 0, y: 0 }]));

      unmount();

      expect(disconnect).toHaveBeenCalled();
    } finally {
      vi.stubGlobal(`ResizeObserver`, sharedMock);
    }
  });

  it(`Should disconnect every ResizeObserver it created on unmount, the auto-height one and the grid's container one alike`, () => {
    stubOffsetWidth(1200);
    // The test above shares one disconnect spy across every observer, so it is satisfied by whichever cleanup runs, and it cannot notice
    // the other being lost. Here each instance records its own disconnect.
    const created: { disconnected: boolean }[] = [];
    const sharedMock = globalThis.ResizeObserver;
    vi.stubGlobal(`ResizeObserver`, class {
      disconnected = false;

      constructor() {
        created.push(this);
      }

      disconnect = (): void => {
        this.disconnected = true;
      };

      observe = vi.fn();

      unobserve = vi.fn();
    });
    try {
      const { unmount } = render(grid([{ autoHeight: true, h: 2, i: `0`, w: 2, x: 0, y: 0 }]));
      // The grid measures its container, and the auto-height item observes its own wrapper.
      expect(created.length).toBeGreaterThanOrEqual(2);

      unmount();

      expect(created.every(observer => observer.disconnected)).toBe(true);
    } finally {
      vi.stubGlobal(`ResizeObserver`, sharedMock);
    }
  });
});
