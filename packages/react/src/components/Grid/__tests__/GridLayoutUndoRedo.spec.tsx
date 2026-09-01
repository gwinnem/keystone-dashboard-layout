import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';
import { dispatchDragEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

const basicLayout = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 4, y: 0 },
];

describe(`GridLayout undo/redo`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should default canUndo/canRedo to false`, () => {
    const ref = createRef<IGridLayoutHandle>();
    render(
      <GridLayout enableUndoRedo layout={basicLayout()} ref={ref}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(ref.current!.canUndo).toBe(false);
    expect(ref.current!.canRedo).toBe(false);
  });

  it(`Should be permanent no-ops when enableUndoRedo is off (the default)`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleChange} ref={ref} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });

    expect(ref.current!.canUndo).toBe(false);
    const callCountAfterDrag = handleChange.mock.calls.length;
    act(() => {
      ref.current!.undo();
    });
    // undo() should not have called onLayoutChange again — only the
    // drag itself did.
    expect(handleChange.mock.calls.length).toBe(callCountAfterDrag);
  });

  it(`Should undo a drag back to its pre-drag position`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} enableUndoRedo layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleChange} ref={ref} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });

    const afterDrag = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(afterDrag.find(entry => entry.i === `0`)!.x).toBeGreaterThan(0);
    expect(ref.current!.canUndo).toBe(true);

    act(() => {
      ref.current!.undo();
    });

    const afterUndo = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(afterUndo.find(entry => entry.i === `0`)!.x).toBe(0);
  });

  it(`Should redo after an undo`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} enableUndoRedo layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleChange} ref={ref} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });
    const draggedX = (handleChange.mock.calls.at(-1)![0] as TLayout).find(entry => entry.i === `0`)!.x;

    act(() => {
      ref.current!.undo();
    });
    expect(ref.current!.canRedo).toBe(true);

    act(() => {
      ref.current!.redo();
    });

    const afterRedo = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(afterRedo.find(entry => entry.i === `0`)!.x).toBe(draggedX);
  });

  it(`Should clear the redo stack once a fresh action is committed after an undo`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} enableUndoRedo layout={basicLayout()} margin={[10, 10]} ref={ref} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });

    act(() => {
      ref.current!.undo();
    });
    expect(ref.current!.canRedo).toBe(true);

    // A fresh drag after the undo should invalidate the old redo stack.
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 50, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 50, clientY: 0 });

    expect(ref.current!.canRedo).toBe(false);
  });

  it(`Should treat compactNow() as an undo-tracked action`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const handleChange = vi.fn();
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 0, y: 5 },
    ];
    render(
      <GridLayout compactType={ECompactType.NONE} enableUndoRedo layout={layout} margin={[10, 10]} onLayoutChange={handleChange} ref={ref} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    act(() => {
      ref.current!.compactNow();
    });
    expect(handleChange.mock.calls.at(-1)![0].find((entry: { i: string }) => entry.i === `1`).y).toBe(2);
    expect(ref.current!.canUndo).toBe(true);

    act(() => {
      ref.current!.undo();
    });
    expect(handleChange.mock.calls.at(-1)![0].find((entry: { i: string }) => entry.i === `1`).y).toBe(5);
  });

  it(`Should treat duplicateItem() as an undo-tracked action`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const handleChange = vi.fn();
    render(
      <GridLayout compactType={ECompactType.NONE} enableUndoRedo layout={[{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]} onLayoutChange={handleChange} ref={ref}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    act(() => {
      ref.current!.duplicateItem(`0`);
    });
    expect(handleChange.mock.calls.at(-1)![0]).toHaveLength(2);
    expect(ref.current!.canUndo).toBe(true);

    act(() => {
      ref.current!.undo();
    });
    expect(handleChange.mock.calls.at(-1)![0]).toHaveLength(1);
  });

  it(`Should treat an externally-driven layout length change as an undo-tracked action`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const handleChange = vi.fn();
    const { rerender } = render(
      <GridLayout enableUndoRedo layout={[{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]} onLayoutChange={handleChange} ref={ref}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    act(() => {
      rerender(
        <GridLayout enableUndoRedo layout={[{ h: 2, i: `0`, w: 2, x: 0, y: 0 }, { h: 2, i: `1`, w: 2, x: 2, y: 0 }]} onLayoutChange={handleChange} ref={ref}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );
    });

    expect(ref.current!.canUndo).toBe(true);
  });

  it(`Should respect undoHistoryLimit, dropping the oldest snapshot once exceeded`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} enableUndoRedo layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleChange} ref={ref} rowHeight={100} undoHistoryLimit={1}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    // First drag: x:0 -> some x1
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 100, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 100, clientY: 0 });
    // Second drag: x1 -> some x2 (a second undo point pushed, exceeding the limit of 1)
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });

    // Only one undo should be available — reverting to the position
    // right before the *second* drag, not all the way back to x:0.
    act(() => {
      ref.current!.undo();
    });
    const afterOneUndo = (handleChange.mock.calls.at(-1)![0] as TLayout).find(entry => entry.i === `0`)!.x;
    expect(afterOneUndo).toBeGreaterThan(0);
    expect(ref.current!.canUndo).toBe(false);
  });

  it(`Should be a no-op to redo when there's nothing to redo`, () => {
    const ref = createRef<IGridLayoutHandle>();
    render(
      <GridLayout enableUndoRedo layout={basicLayout()} ref={ref}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(() => act(() => {
      ref.current!.redo();
    })).not.toThrow();
    expect(ref.current!.canRedo).toBe(false);
  });

  it(`Should be a no-op to undo when there's nothing to undo`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const handleChange = vi.fn();
    render(
      <GridLayout enableUndoRedo layout={basicLayout()} onLayoutChange={handleChange} ref={ref}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(() => act(() => {
      ref.current!.undo();
    })).not.toThrow();
    expect(ref.current!.canUndo).toBe(false);
    expect(handleChange).not.toHaveBeenCalled();
  });
});
