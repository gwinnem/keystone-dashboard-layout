import { useState } from 'react';
import type { JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent } from './test-helpers';

/**
 * A small stateful harness mirroring how a *real* consumer would wire
 * up two grids sharing items via `allowCrossGridDrag` — `onLayoutChange`
 * actually updates this component's own state, so the rendered
 * `GridItem` children stay in sync with each grid's own `layout` prop.
 * A test rendering *static* `GridItem` children instead (never removing
 * one after its own grid's `onLayoutChange` reports it gone) would see
 * that child throw once the internal `workingLayout` state no longer
 * contains it — the same "no layout entry found" crash a real consumer
 * who ignores `onLayoutChange` would also hit, not a library bug.
 */
function TwoGridsHarness({ onChangeA, onChangeB, onDropped }: {
  onChangeA: (layout: TLayout) => void;
  onChangeB: (layout: TLayout) => void;
  onDropped: (payload: { item: unknown; sourceLayoutId: string }) => void;
}): JSX.Element {
  const [layoutA, setLayoutA] = useState<TLayout>([{ h: 2, i: `shared-item`, w: 2, x: 0, y: 0 }]);
  const [layoutB, setLayoutB] = useState<TLayout>([]);

  return (
    <>
      <GridLayout
        allowCrossGridDrag
        layout={layoutA}
        layoutId="grid-a"
        onLayoutChange={next => {
          setLayoutA(next);
          onChangeA(next);
        }}
      >
        {layoutA.map(item => <GridItem i={item.i} key={item.i}>Shared item</GridItem>)}
      </GridLayout>
      <GridLayout
        allowCrossGridDrag
        layout={layoutB}
        layoutId="grid-b"
        onCrossGridItemDropped={onDropped}
        onLayoutChange={next => {
          setLayoutB(next);
          onChangeB(next);
        }}
      >
        {layoutB.map(item => <GridItem i={item.i} key={item.i}>Dropped item</GridItem>)}
      </GridLayout>
    </>
  );
}

describe(`GridLayout allowCrossGridDrag`, () => {
  it(`Should move an item from the source grid to the target grid it's dropped onto`, () => {
    const handleChangeA = vi.fn();
    const handleChangeB = vi.fn();
    const handleDropped = vi.fn();

    const { container } = render(
      <TwoGridsHarness onChangeA={handleChangeA} onChangeB={handleChangeB} onDropped={handleDropped} />,
    );

    const grids = container.querySelectorAll(`.kdl-grid-layout`);
    const gridBRoot = grids[1] as HTMLElement;
    // Grid B occupies a distinct, non-zero screen region — jsdom's own
    // default (unmocked) getBoundingClientRect is all zeros, which
    // would otherwise make grid A's own rect indistinguishable from
    // grid B's for the registry's own point-in-rect lookup.
    gridBRoot.getBoundingClientRect = () => (
      { bottom: 400, height: 400, left: 1000, right: 1200, toJSON: () => ({}), top: 0, width: 200, x: 1000, y: 0 }
    );

    const target = container.querySelector(`[data-grid-item-id="shared-item"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 1100, clientY: 100 });
    // Dropped at (1100, 100) — inside grid B's own rect, not grid A's.
    dispatchDragEvent(target, `dragend`, { clientX: 1100, clientY: 100 });

    const lastCallA = handleChangeA.mock.calls.at(-1)![0] as TLayout;
    expect(lastCallA.find(entry => entry.i === `shared-item`)).toBeUndefined();

    const lastCallB = handleChangeB.mock.calls.at(-1)![0] as TLayout;
    expect(lastCallB.find(entry => entry.i === `shared-item`)).toBeTruthy();

    expect(handleDropped).toHaveBeenCalledTimes(1);
    expect(handleDropped.mock.calls[0][0].sourceLayoutId).toBe(`grid-a`);
  });

  it(`Should reject the drop and leave the source item exactly where it was when the target has disableExternalDrop`, () => {
    const handleChangeA = vi.fn();
    const handleRejected = vi.fn();
    const layoutA: TLayout = [{ h: 2, i: `shared-item`, w: 2, x: 0, y: 0 }];
    const layoutB: TLayout = [];

    const { container } = render(
      <>
        <GridLayout allowCrossGridDrag layout={layoutA} layoutId="grid-a" onLayoutChange={handleChangeA}>
          <GridItem i="shared-item">Shared item</GridItem>
        </GridLayout>
        <GridLayout allowCrossGridDrag disableExternalDrop layout={layoutB} layoutId="grid-b" onCrossGridDropRejected={handleRejected}>
          {null}
        </GridLayout>
      </>,
    );

    const grids = container.querySelectorAll(`.kdl-grid-layout`);
    const gridBRoot = grids[1] as HTMLElement;
    gridBRoot.getBoundingClientRect = () => (
      { bottom: 400, height: 400, left: 1000, right: 1200, toJSON: () => ({}), top: 0, width: 200, x: 1000, y: 0 }
    );

    const target = container.querySelector(`[data-grid-item-id="shared-item"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 1100, clientY: 100 });
    dispatchDragEvent(target, `dragend`, { clientX: 1100, clientY: 100 });

    expect(handleRejected).toHaveBeenCalledTimes(1);
    expect(handleRejected.mock.calls[0][0].sourceLayoutId).toBe(`grid-a`);
    // The source grid's own item should still complete its own normal
    // (purely internal) end-of-drag handling — still present, at some
    // valid position — since the caller falls through to the normal
    // path when the target rejects.
    const lastCallA = handleChangeA.mock.calls.at(-1)![0] as TLayout;
    expect(lastCallA.find(entry => entry.i === `shared-item`)).toBeTruthy();
  });

  it(`Should not attempt any cross-grid lookup at all when allowCrossGridDrag is off (the default)`, () => {
    const handleChangeA = vi.fn();
    const layoutA: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const layoutB: TLayout = [];

    const { container } = render(
      <>
        <GridLayout layout={layoutA} layoutId="grid-a" onLayoutChange={handleChangeA}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>
        <GridLayout allowCrossGridDrag layout={layoutB} layoutId="grid-b">
          {null}
        </GridLayout>
      </>,
    );

    const grids = container.querySelectorAll(`.kdl-grid-layout`);
    const gridBRoot = grids[1] as HTMLElement;
    gridBRoot.getBoundingClientRect = () => (
      { bottom: 400, height: 400, left: 1000, right: 1200, toJSON: () => ({}), top: 0, width: 200, x: 1000, y: 0 }
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 1100, clientY: 100 });
    dispatchDragEvent(target, `dragend`, { clientX: 1100, clientY: 100 });

    // Item stays in grid A's own layout — allowCrossGridDrag being off
    // on the source means the drag is treated as a purely normal,
    // in-grid move regardless of where it ends up on screen.
    const lastCallA = handleChangeA.mock.calls.at(-1)![0] as TLayout;
    expect(lastCallA.find(entry => entry.i === `0`)).toBeTruthy();
  });

  it(`Should fall through to a normal in-grid move when dropped somewhere no other registered grid's rect covers`, () => {
    const handleChangeA = vi.fn();
    const layoutA: TLayout = [{ h: 2, i: `shared-item`, w: 2, x: 0, y: 0 }];
    const layoutB: TLayout = [];

    const { container } = render(
      <>
        <GridLayout allowCrossGridDrag layout={layoutA} layoutId="grid-a" onLayoutChange={handleChangeA}>
          <GridItem i="shared-item">Shared item</GridItem>
        </GridLayout>
        <GridLayout allowCrossGridDrag layout={layoutB} layoutId="grid-b">
          {null}
        </GridLayout>
      </>,
    );

    const grids = container.querySelectorAll(`.kdl-grid-layout`);
    const gridBRoot = grids[1] as HTMLElement;
    gridBRoot.getBoundingClientRect = () => (
      { bottom: 400, height: 400, left: 1000, right: 1200, toJSON: () => ({}), top: 0, width: 200, x: 1000, y: 0 }
    );

    const target = container.querySelector(`[data-grid-item-id="shared-item"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    // (5000, 5000) — well outside grid A's own rect (jsdom's default,
    // all-zero getBoundingClientRect) and grid B's own mocked rect
    // above, so `findCrossGridZoneAt` finds no match at all — the
    // `!targetZone` branch in `useCrossGridDrag.ts`'s own `handleDragEnd`.
    dispatchDragEvent(target, `dragmove`, { clientX: 5000, clientY: 5000 });
    dispatchDragEvent(target, `dragend`, { clientX: 5000, clientY: 5000 });

    // No target zone found at all — falls through to a normal in-grid
    // move, exactly as if allowCrossGridDrag were off for this gesture:
    // the item stays in grid A's own layout, just at whatever position
    // the ordinary drag-end resolution landed it at.
    const lastCallA = handleChangeA.mock.calls.at(-1)![0] as TLayout;
    expect(lastCallA.find(entry => entry.i === `shared-item`)).toBeTruthy();
  });

  // `handleDragEnd` (`useCrossGridDrag.ts`) falls back to `Number.NaN`
  // for either coordinate that's missing — both are typed as optional,
  // since a real caller could genuinely end a drag without native
  // pointer coordinates (e.g. a non-pointer-driven end). Every test
  // above always supplies real clientX/clientY, leaving that fallback
  // itself unexercised; `NaN` fails every rect containment comparison,
  // so the practical effect is identical to the "dropped outside any
  // registered rect" case above — which is exactly what this confirms.
  it(`Should fall through to a normal in-grid move when the drag ends without real pointer coordinates at all`, () => {
    const handleChangeA = vi.fn();
    const layoutA: TLayout = [{ h: 2, i: `shared-item`, w: 2, x: 0, y: 0 }];
    const layoutB: TLayout = [];

    const { container } = render(
      <>
        <GridLayout allowCrossGridDrag layout={layoutA} layoutId="grid-a" onLayoutChange={handleChangeA}>
          <GridItem i="shared-item">Shared item</GridItem>
        </GridLayout>
        <GridLayout allowCrossGridDrag layout={layoutB} layoutId="grid-b">
          {null}
        </GridLayout>
      </>,
    );

    const grids = container.querySelectorAll(`.kdl-grid-layout`);
    const gridBRoot = grids[1] as HTMLElement;
    gridBRoot.getBoundingClientRect = () => (
      { bottom: 400, height: 400, left: 1000, right: 1200, toJSON: () => ({}), top: 0, width: 200, x: 1000, y: 0 }
    );

    const target = container.querySelector(`[data-grid-item-id="shared-item"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 50, clientY: 50 });
    // Explicitly overriding to undefined — dispatchDragEvent's own
    // default event payload otherwise supplies clientX:0/clientY:0.
    dispatchDragEvent(target, `dragend`, { clientX: undefined, clientY: undefined });

    const lastCallA = handleChangeA.mock.calls.at(-1)![0] as TLayout;
    expect(lastCallA.find(entry => entry.i === `shared-item`)).toBeTruthy();
  });
});
