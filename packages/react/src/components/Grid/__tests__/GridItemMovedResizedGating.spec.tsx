import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, dispatchResizeEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

/**
 * `onItemMoved` / `onItemResized` were fired unconditionally at the end of every gesture. The Vue package's `item-moved` and
 * `resized` fire only when the item actually ended up somewhere else / at another size, so a drag put back in its own cell,
 * and the resizestart/resizeend pair a plain click on a handle produces, no longer report anything (found by the React
 * props e2e suite, `e2e/props-events.spec.ts`).
 */

const layout = (): TLayout => [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];

const rightEdgeOnly = { bottom: false, left: false, right: true, top: false };

afterEach(() => {
  restoreOffsetWidth();
});

function renderItem(handlers: {
  onItemMoved?: (payload: { i: string | number; x: number; y: number }) => void;
  onItemResized?: (payload: { i: string | number; h: number; w: number; height: number; width: number }) => void;
}): HTMLElement {
  stubOffsetWidth(1210); // 12 columns of 90px plus 13 margins of 10px
  const { container } = render(
    <GridLayout layout={layout()} margin={[10, 10]} rowHeight={100}>
      <GridItem i="a" {...handlers}>A</GridItem>
    </GridLayout>,
  );
  return container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
}

describe(`GridItem onItemMoved — only for a drag that changes the cell`, () => {
  it(`Should report a drag that ends in another cell`, () => {
    const onItemMoved = vi.fn();
    const target = renderItem({ onItemMoved });

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 300, clientY: 0 });

    expect(onItemMoved).toHaveBeenCalledTimes(1);
    expect(onItemMoved).toHaveBeenCalledWith({ i: `a`, x: 3, y: 0 });
  });

  it(`Should stay silent for a drag that ends in the cell it started in`, () => {
    const onItemMoved = vi.fn();
    const target = renderItem({ onItemMoved });

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragend`);

    expect(onItemMoved).not.toHaveBeenCalled();
  });

  it(`Should compare against the cell the item occupies when this drag begins, not where an earlier one began`, () => {
    const onItemMoved = vi.fn();
    const target = renderItem({ onItemMoved });

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 300, clientY: 0 });
    onItemMoved.mockClear();

    // The item now sits in x:3. The helper's stubbed bounding rect does not follow it (it always reports the item at x:0), so
    // this second gesture lands back in x:0: a move away from the cell it began in (x:3), and so reported. Had the start cell
    // gone stale (still x:0 from the first gesture, or never reset), it would have looked unchanged and been swallowed.
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragend`);

    expect(onItemMoved).toHaveBeenCalledTimes(1);
    expect(onItemMoved).toHaveBeenCalledWith({ i: `a`, x: 0, y: 0 });
  });
});

describe(`GridItem onItemResized — only for a resize that changes the size`, () => {
  it(`Should report a resize that ends at another size`, () => {
    const onItemResized = vi.fn();
    const target = renderItem({ onItemResized });

    dispatchResizeEvent(target, `resizestart`, { edges: rightEdgeOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 100, clientY: 0, edges: rightEdgeOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 100, clientY: 0, edges: rightEdgeOnly });

    expect(onItemResized).toHaveBeenCalledTimes(1);
    expect(onItemResized).toHaveBeenCalledWith(expect.objectContaining({ h: 2, i: `a`, w: 3 }));
  });

  it(`Should stay silent for a resize that ends at the size it started with`, () => {
    const onItemResized = vi.fn();
    const target = renderItem({ onItemResized });

    dispatchResizeEvent(target, `resizestart`, { edges: rightEdgeOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: 0, edges: rightEdgeOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: 0, edges: rightEdgeOnly });

    expect(onItemResized).not.toHaveBeenCalled();
  });

  it(`Should stay silent for the bare resizestart/resizeend pair a click on a handle produces`, () => {
    const onItemResized = vi.fn();
    const target = renderItem({ onItemResized });

    dispatchResizeEvent(target, `resizestart`, { edges: rightEdgeOnly });
    dispatchResizeEvent(target, `resizeend`, { edges: rightEdgeOnly });

    expect(onItemResized).not.toHaveBeenCalled();
  });
});
