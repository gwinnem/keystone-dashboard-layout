import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

describe(`GridLayout collisionMode`, () => {
  // Same geometry as GridLayoutHorizontalShift.spec.tsx: with colWidth 90 and margin 10, a clientX delta of 205 lands the
  // dragged item on grid x=2, squarely on top of B.
  const buildLayout = (): TLayout => [
    { h: 1, i: `a`, w: 2, x: 0, y: 0 },
    { h: 1, i: `b`, w: 2, x: 2, y: 0 },
    { h: 1, i: `c`, w: 2, x: 4, y: 0 },
  ];

  const lastLayout = (handleChange: ReturnType<typeof vi.fn>): TLayout => handleChange.mock.calls.at(-1)![0] as TLayout;
  const pos = (layout: TLayout, id: string): [number, number] => {
    const item = layout.find(entry => entry.i === id)!;
    return [item.x, item.y];
  };

  const renderGrid = (props: Record<string, unknown>) => {
    stubOffsetWidth(1210);
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={buildLayout()} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100} {...props}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
        <GridItem i="c">C</GridItem>
      </GridLayout>,
    );
    return { container, handleChange, target: container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement };
  };

  it(`Should push the item underneath by default`, () => {
    const { handleChange, target } = renderGrid({});

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 205, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 205, clientY: 0 });

    expect(pos(lastLayout(handleChange), `b`)).toEqual([2, 1]);
    restoreOffsetWidth();
  });

  it(`Should swap the two items when collisionMode is swap`, () => {
    const { handleChange, target } = renderGrid({ collisionMode: `swap` });

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 205, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 205, clientY: 0 });

    const layout = lastLayout(handleChange);
    expect(pos(layout, `a`)).toEqual([2, 0]);
    expect(pos(layout, `b`)).toEqual([0, 0]);
    expect(pos(layout, `c`)).toEqual([4, 0]);
    restoreOffsetWidth();
  });

  it(`Should put the swapped item back when the drag moves on to another spot`, () => {
    const { handleChange, target } = renderGrid({ collisionMode: `swap` });

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 205, clientY: 0 });
    expect(pos(lastLayout(handleChange), `b`)).toEqual([0, 0]);

    // Back to the starting cell: B must go home.
    dispatchDragEvent(target, `dragmove`, { clientX: 5, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 5, clientY: 0 });

    const layout = lastLayout(handleChange);
    expect(pos(layout, `a`)).toEqual([0, 0]);
    expect(pos(layout, `b`)).toEqual([2, 0]);
    restoreOffsetWidth();
  });

  it(`Should fall back to pushing when the drop lands on two items at once`, () => {
    const { handleChange, target } = renderGrid({ collisionMode: `swap` });

    dispatchDragEvent(target, `dragstart`);
    // x=3 overlaps both B (2-3) and C (4-5): no single partner, so the ordinary push applies.
    dispatchDragEvent(target, `dragmove`, { clientX: 305, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 305, clientY: 0 });

    const layout = lastLayout(handleChange);
    expect(pos(layout, `a`)).toEqual([3, 0]);
    expect(pos(layout, `b`)[1]).toBeGreaterThan(0);
    restoreOffsetWidth();
  });

  it(`Should ignore swap while preventCollision is on`, () => {
    const { handleChange, target } = renderGrid({ collisionMode: `swap`, preventCollision: true });

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 205, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 205, clientY: 0 });

    const layout = lastLayout(handleChange);
    expect(pos(layout, `a`)).toEqual([0, 0]);
    expect(pos(layout, `b`)).toEqual([2, 0]);
    restoreOffsetWidth();
  });

  it(`Should start every drag with fresh swap state`, () => {
    const { handleChange, target } = renderGrid({ collisionMode: `swap` });

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 205, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 205, clientY: 0 });
    expect(pos(lastLayout(handleChange), `a`)).toEqual([2, 0]);

    // A second drag of A from its new cell back onto B's new one swaps again, relative to the new origin.
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 5, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 5, clientY: 0 });

    const layout = lastLayout(handleChange);
    expect(pos(layout, `a`)).toEqual([0, 0]);
    expect(pos(layout, `b`)).toEqual([2, 0]);
    restoreOffsetWidth();
  });
});
