import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';
import { dispatchDragEvent, dispatchResizeEvent } from './test-helpers';

describe(`GridLayout restoreOnDrag`, () => {
  it(`Should not let another item compact past its own pre-drag position while a drag is in progress`, () => {
    // A resting on top of B (A: y0-2, B: y2-4) — dragging A away should
    // normally let VERTICAL compaction immediately pull B up to y:0.
    // With restoreOnDrag on, B should stay at its own pre-drag y:2
    // throughout the drag (dragmove), not rise past it.
    const layout: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 0, y: 2 },
    ];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} restoreOnDrag rowHeight={100}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });

    const midDragCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(midDragCall.find(entry => entry.i === `b`)!.y).toBe(2);
  });

  it(`Should let compaction resolve fully, unrestricted, via a later action that doesn't go through the drag path at all`, () => {
    // A second *drag* gesture wouldn't actually demonstrate this: with
    // restoreOnDrag still enabled for the whole grid, any later drag
    // re-snapshots whatever B's *current* position is at *that*
    // gesture's own dragstart, so B would stay restrained indefinitely
    // as long as something keeps being dragged — not because clearing
    // the snapshot at dragend failed, but because a fresh one is taken
    // immediately. `compactNow()` is a clean way to observe the
    // *unrestricted* case instead: it goes through
    // `commitForcedCompaction`, which never reads the drag-scoped
    // snapshot ref at all, regardless of `restoreOnDrag`.
    const ref = createRef<IGridLayoutHandle>();
    const layout: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 0, y: 2 },
    ];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} ref={ref} restoreOnDrag rowHeight={100}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 300, clientY: 0 });

    // Still restrained immediately after the drag itself ends — the
    // drag's own final commit is still gated.
    const afterDragCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(afterDragCall.find(entry => entry.i === `b`)!.y).toBe(2);

    ref.current!.compactNow();

    const afterCompactNowCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(afterCompactNowCall.find(entry => entry.i === `b`)!.y).toBe(0);
  });

  it(`Should have no effect on the same scenario when restoreOnDrag is off (the default) — B rises immediately during the drag`, () => {
    const layout: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 0, y: 2 },
    ];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });

    const midDragCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(midDragCall.find(entry => entry.i === `b`)!.y).toBe(0);
  });

  it(`Should use the x axis instead of y for ECompactType.HORIZONTAL`, () => {
    const layout: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 2, y: 0 },
    ];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.HORIZONTAL} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} restoreOnDrag rowHeight={100}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 300 });

    const midDragCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    // B should stay at its own pre-drag x:2, not shift left past it.
    expect(midDragCall.find(entry => entry.i === `b`)!.x).toBe(2);
  });

  it(`Should have no effect on a resize (only scoped to drag) — B still compacts normally, unrestricted, during a resize`, () => {
    const layout: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 0, y: 2 },
    ];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} restoreOnDrag rowHeight={100}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    // Resizing A shorter (not a drag at all) opens a gap above B — with
    // restoreOnDrag correctly scoped to drag only, B should still rise
    // to fill it via normal, unrestricted VERTICAL compaction, exactly
    // as if restoreOnDrag weren't set.
    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    const bottomOnly = { bottom: true, left: false, right: false, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: bottomOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: -150, edges: bottomOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: -150, edges: bottomOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `b`)!.y).toBe(lastCall.find(entry => entry.i === `a`)!.h);
  });
});
