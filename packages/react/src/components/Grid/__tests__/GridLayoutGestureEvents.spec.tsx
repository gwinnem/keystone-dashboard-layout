import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, dispatchResizeEvent, stubOffsetWidth, restoreOffsetWidth } from './test-helpers';

describe(`GridLayout onDragStart/onDragMove/onDragEnd`, () => {
  it(`Should call onDragStart/onDragMove/onDragEnd at the right gesture phases, with the dragged item's own id`, () => {
    const onDragStart = vi.fn();
    const onDragMove = vi.fn();
    const onDragEnd = vi.fn();
    const layout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} onDragEnd={onDragEnd} onDragMove={onDragMove} onDragStart={onDragStart}>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    expect(onDragStart).toHaveBeenCalledWith(`a`);
    expect(onDragMove).not.toHaveBeenCalled();
    expect(onDragEnd).not.toHaveBeenCalled();

    dispatchDragEvent(target, `dragmove`, { clientX: 50, clientY: 0 });
    expect(onDragMove).toHaveBeenCalledWith(`a`);
    expect(onDragEnd).not.toHaveBeenCalled();

    dispatchDragEvent(target, `dragend`, { clientX: 50, clientY: 0 });
    expect(onDragEnd).toHaveBeenCalledWith(`a`);
    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDragMove).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });
});

describe(`GridLayout onMoveBlockedByCollision`, () => {
  it(`Should fire when a drag is fully blocked by preventCollision`, () => {
    stubOffsetWidth(1210);
    const onMoveBlockedByCollision = vi.fn();
    // A (x:0,w:2) and B (x:2,w:2) adjacent — dragging A right into B's
    // own spot, with preventCollision on, should be fully blocked (A
    // ends up right back where it started).
    const layout: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 2, y: 0 },
    ];
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onMoveBlockedByCollision={onMoveBlockedByCollision} preventCollision rowHeight={100}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    // colWidth = (1210-130)/12 = 90. A landing on grid x=2 needs
    // left≈210; dragstart's own stubbed left is 5, so delta=205.
    dispatchDragEvent(target, `dragmove`, { clientX: 205, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 205, clientY: 0 });

    expect(onMoveBlockedByCollision).toHaveBeenCalledWith(`a`);
    restoreOffsetWidth();
  });

  it(`Should not fire when preventCollision is off (the collision is resolved by pushing, not blocking)`, () => {
    stubOffsetWidth(1210);
    const onMoveBlockedByCollision = vi.fn();
    const layout: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 2, y: 0 },
    ];
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onMoveBlockedByCollision={onMoveBlockedByCollision} rowHeight={100}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 205, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 205, clientY: 0 });

    expect(onMoveBlockedByCollision).not.toHaveBeenCalled();
    restoreOffsetWidth();
  });

  it(`Should fire on a resize whenever preventCollision clamps the requested size at all (not just a full block)`, () => {
    stubOffsetWidth(1210);
    const onMoveBlockedByCollision = vi.fn();
    // A (x:0,w:2) resizing wider, with B (x:2,w:2) immediately to its
    // right — with preventCollision on, growing into B's own space
    // should clamp (not fully block) and still report the collision.
    const layout: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 2, y: 0 },
    ];
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onMoveBlockedByCollision={onMoveBlockedByCollision} preventCollision rowHeight={100}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    const eastOnly = { bottom: false, left: false, right: true, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: eastOnly });
    // Growing A's own width well past B's own starting edge.
    dispatchResizeEvent(target, `resizemove`, { clientX: 300, clientY: 0, edges: eastOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 300, clientY: 0, edges: eastOnly });

    expect(onMoveBlockedByCollision).toHaveBeenCalledWith(`a`);
    restoreOffsetWidth();
  });
});

describe(`GridLayout onSelectionChanged`, () => {
  it(`Should not fire on initial mount`, () => {
    const onSelectionChanged = vi.fn();
    render(
      <GridLayout layout={[{ h: 2, i: `a`, w: 2, x: 0, y: 0 }]} multiSelect onSelectionChanged={onSelectionChanged}>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    expect(onSelectionChanged).not.toHaveBeenCalled();
  });

  it(`Should fire with the current selection when an item is clicked (multiSelect on)`, () => {
    const onSelectionChanged = vi.fn();
    const { container } = render(
      <GridLayout layout={[{ h: 2, i: `a`, w: 2, x: 0, y: 0 }]} multiSelect onSelectionChanged={onSelectionChanged}>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    fireEvent.click(target);

    expect(onSelectionChanged).toHaveBeenCalledWith([`a`]);
  });

  it(`Should not fire at all when multiSelect is off (clicking is a no-op for selection)`, () => {
    const onSelectionChanged = vi.fn();
    const { container } = render(
      <GridLayout layout={[{ h: 2, i: `a`, w: 2, x: 0, y: 0 }]} onSelectionChanged={onSelectionChanged}>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    fireEvent.click(target);

    expect(onSelectionChanged).not.toHaveBeenCalled();
  });
});
