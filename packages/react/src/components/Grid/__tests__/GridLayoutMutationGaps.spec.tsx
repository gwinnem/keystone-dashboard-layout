import { createRef } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';
import { dispatchDragEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

/**
 * Targets mutants that survived Stryker against `GridLayout.tsx` (see
 * `reports/mutation/mutation.json`). Each test exists for one specific
 * surviving mutant or a small cluster of them, not for a feature.
 */
afterEach(() => {
  restoreOffsetWidth();
});

const makeDataTransfer = (): DataTransfer => ({ getData: () => `` } as unknown as DataTransfer);

const grid = (layout: TLayout, extra: Record<string, unknown> = {}): ReactElement => (
  <GridLayout layout={layout} margin={[10, 10]} rowHeight={100} {...extra}>
    <GridItem i="0">Item 0</GridItem>
  </GridLayout>
);

describe(`GridLayout — external layout changes that need compaction`, () => {
  // The documented "append an item with `y: Infinity` and let compaction
  // place it" pattern. Until now nothing ever reached the branch that tells
  // the consumer about the settled positions — which is also why every
  // field comparison inside `layoutPositionsEqual` survived: the "differs"
  // outcome was never produced.
  it(`Should notify onLayoutChange with the settled layout when an appended item had to be compacted`, () => {
    stubOffsetWidth(1200);
    const onLayoutChange = vi.fn();
    const first: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { rerender } = render(grid(first, { onLayoutChange }));
    onLayoutChange.mockClear();

    rerender(grid([...first, { h: 2, i: `1`, w: 2, x: 0, y: Infinity }], { onLayoutChange }));

    const notified = onLayoutChange.mock.calls.at(-1)?.[0] as TLayout;
    expect(notified.find(item => item.i === `1`)?.y).toBe(2);
  });

  it(`Should notify onLayoutChange when only x had to change (horizontal compaction)`, () => {
    stubOffsetWidth(1200);
    const onLayoutChange = vi.fn();
    const first: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { rerender } = render(grid(first, { compactType: ECompactType.HORIZONTAL, onLayoutChange }));
    onLayoutChange.mockClear();

    rerender(grid([...first, { h: 2, i: `1`, w: 2, x: 8, y: 0 }], { compactType: ECompactType.HORIZONTAL, onLayoutChange }));

    const notified = onLayoutChange.mock.calls.at(-1)?.[0] as TLayout;
    expect(notified.find(item => item.i === `1`)).toMatchObject({ x: 2, y: 0 });
  });

  it(`Should not notify onLayoutChange when the externally supplied layout was already settled`, () => {
    stubOffsetWidth(1200);
    const onLayoutChange = vi.fn();
    const first: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { rerender } = render(grid(first, { onLayoutChange }));
    onLayoutChange.mockClear();

    rerender(grid(first.map(item => ({ ...item })), { onLayoutChange }));

    expect(onLayoutChange).not.toHaveBeenCalled();
  });

  it(`Should not throw when such a layout arrives and no onLayoutChange handler was provided`, () => {
    stubOffsetWidth(1200);
    const first: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { rerender } = render(grid(first));

    expect(() => rerender(grid([...first, { h: 2, i: `1`, w: 2, x: 0, y: Infinity }]))).not.toThrow();
  });

  it(`Should not record an undo point when an external layout change keeps the same number of items`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const first: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { rerender } = render(grid(first, { compactType: ECompactType.NONE, enableUndoRedo: true, ref }));

    rerender(grid([{ h: 2, i: `0`, w: 2, x: 4, y: 0 }], { compactType: ECompactType.NONE, enableUndoRedo: true, ref }));

    expect(ref.current!.canUndo).toBe(false);
  });
});

describe(`GridLayout — min-width floor`, () => {
  it(`Should widen the inner container to the largest minW floor, using rowHeight and the horizontal margin`, () => {
    stubOffsetWidth(100);
    const { container } = render(grid([{ h: 2, i: `0`, minW: 3, w: 3, x: 0, y: 0 }]));

    // 3 * 100 + (3 - 1) * 10 = 320
    const inner = Array.from(container.querySelectorAll<HTMLElement>(`div`)).find(element => element.style.width === `320px`);

    expect(inner).toBeDefined();
    expect(inner!.style.position).toBe(`relative`);
  });
});

describe(`GridLayout — undo history limit`, () => {
  it(`Should keep exactly undoHistoryLimit snapshots, not one fewer`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const handleChange = vi.fn();
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 0, y: 6 },
    ];
    const { container } = render(grid(layout, { compactType: ECompactType.NONE, enableUndoRedo: true, onLayoutChange: handleChange, ref, undoHistoryLimit: 2 }));
    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 600, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 600, clientY: 0 });

    act(() => {
      ref.current!.undo();
    });
    act(() => {
      ref.current!.undo();
    });

    const afterTwoUndos = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(afterTwoUndos.find(entry => entry.i === `0`)!.x).toBe(0);
  });
});

describe(`GridLayout — outside drop`, () => {
  const rootOf = (container: HTMLElement): HTMLElement => container.querySelector(`.kdl-grid-layout`) as HTMLElement;

  const dropAt = (root: HTMLElement, clientX: number, clientY: number): void => {
    const event = new Event(`drop`, { bubbles: true, cancelable: true }) as unknown as { clientX: number; clientY: number; dataTransfer: DataTransfer };
    event.clientX = clientX;
    event.clientY = clientY;
    event.dataTransfer = makeDataTransfer();
    act(() => {
      root.dispatchEvent(event as unknown as Event);
    });
  };

  const stubRect = (root: HTMLElement, rect: { left: number; top: number }): void => {
    root.getBoundingClientRect = () => ({
      bottom: 0, height: 0, left: rect.left, right: 0, toJSON: () => ({}), top: rect.top, width: 0, x: rect.left, y: rect.top,
    });
  };

  it(`Should subtract the container's own offset and the margin on both axes when resolving the drop position`, () => {
    stubOffsetWidth(1210);
    const onOutsideDrop = vi.fn();
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { allowOutsideDrop: true, onOutsideDrop, outsideDropHeight: 2, outsideDropWidth: 2 }));
    const root = rootOf(container);
    stubRect(root, { left: 50, top: 100 });

    // left = 201.2 - 50 = 151.2 -> (151.2 - 10) / 100 = 1.41 -> 1
    // top  = 264   - 100 = 164  -> (164  - 10) / 110 = 1.40 -> 1
    dropAt(root, 201.2, 264);

    const [[payload]] = onOutsideDrop.mock.calls;
    expect(payload).toMatchObject({ x: 1, y: 1 });
  });

  it(`Should cap the drop position at the last column and row the dropped item still fits in`, () => {
    stubOffsetWidth(1210);
    const onOutsideDrop = vi.fn();
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { allowOutsideDrop: true, maxRows: 8, onOutsideDrop, outsideDropHeight: 2, outsideDropWidth: 2 }));
    const root = rootOf(container);

    dropAt(root, 5000, 5000);

    // x would be 50 -> capped at colNum - outsideDropWidth = 10; y would be 45 -> capped at maxRows - outsideDropHeight = 6
    const [[payload]] = onOutsideDrop.mock.calls;
    expect(payload).toMatchObject({ x: 10, y: 6 });
  });

  it(`Should place the live placeholder using multiplication, not division, at a cell other than 1`, () => {
    stubOffsetWidth(1210);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { allowOutsideDrop: true, outsideDropHeight: 2, outsideDropWidth: 2 }));
    const root = rootOf(container);
    const event = new Event(`dragover`, { bubbles: true, cancelable: true }) as unknown as { clientX: number; clientY: number };
    // x = round((310 - 10) / 100) = 3; y = round((230 - 10) / 110) = 2
    event.clientX = 310;
    event.clientY = 230;

    act(() => {
      root.dispatchEvent(event as unknown as Event);
    });

    const placeholder = container.querySelector(`.kdl-grid-outside-drop-placeholder`) as HTMLElement;
    // left = round(90 * 3 + 4 * 10) = 310; top = round(100 * 2 + 3 * 10) = 230
    expect(placeholder.style.left).toBe(`310px`);
    expect(placeholder.style.top).toBe(`230px`);
  });

  it(`Should leave a rejected dragenter to the browser, without counting it`, () => {
    let accept = false;
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { allowOutsideDrop: true, outsideDropAccept: () => accept }));
    const root = rootOf(container);
    const rejected = new Event(`dragenter`, { bubbles: true, cancelable: true });
    act(() => {
      root.dispatchEvent(rejected);
    });
    expect(rejected.defaultPrevented).toBe(false);

    // If the rejected dragenter had still been counted, the single dragleave
    // below would leave the count at 1 and the placeholder would stay.
    accept = true;
    act(() => {
      root.dispatchEvent(new Event(`dragenter`, { bubbles: true, cancelable: true }));
    });
    act(() => {
      root.dispatchEvent(new Event(`dragover`, { bubbles: true, cancelable: true }));
    });
    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeTruthy();
    act(() => {
      root.dispatchEvent(new Event(`dragleave`, { bubbles: true, cancelable: true }));
    });

    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeFalsy();
  });

  it(`Should not even call preventDefault on a dragleave while allowOutsideDrop is off`, () => {
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]));
    const event = new Event(`dragleave`, { bubbles: true, cancelable: true });

    act(() => {
      rootOf(container).dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(false);
  });

  it(`Should not throw on a drop when no onOutsideDrop handler was provided`, () => {
    stubOffsetWidth(1210);
    const { container } = render(grid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { allowOutsideDrop: true }));

    expect(() => dropAt(rootOf(container), 100, 100)).not.toThrow();
  });
});
