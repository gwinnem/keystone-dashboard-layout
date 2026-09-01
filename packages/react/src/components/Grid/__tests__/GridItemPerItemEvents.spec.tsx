import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, dispatchResizeEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

describe(`GridItem onItemMoved`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should call onItemMoved with this item's own final grid-unit x/y on dragend, and not before`, () => {
    stubOffsetWidth(1210);
    const handleItemMoved = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0" onItemMoved={handleItemMoved}>Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    expect(handleItemMoved).not.toHaveBeenCalled();

    dispatchDragEvent(target, `dragmove`, { clientX: 101, clientY: 0 });
    expect(handleItemMoved).not.toHaveBeenCalled();

    dispatchDragEvent(target, `dragend`, { clientX: 101, clientY: 0 });
    expect(handleItemMoved).toHaveBeenCalledTimes(1);
    const payload = handleItemMoved.mock.calls[0][0];
    expect(payload.i).toBe(`0`);
    expect(typeof payload.x).toBe(`number`);
    expect(typeof payload.y).toBe(`number`);
  });

  it(`Should not throw, and should not call onItemMoved, when GridItem doesn't provide it at all`, () => {
    stubOffsetWidth(1210);
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(() => {
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 101, clientY: 0 });
      dispatchDragEvent(target, `dragend`, { clientX: 101, clientY: 0 });
    }).not.toThrow();
  });

  it(`Should still commit the move via onLayoutChange normally, independent of onItemMoved being provided at all`, () => {
    stubOffsetWidth(1210);
    const handleItemMoved = vi.fn();
    const handleLayoutChange = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleLayoutChange} rowHeight={100}>
        <GridItem i="0" onItemMoved={handleItemMoved}>Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 101, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 101, clientY: 0 });

    expect(handleLayoutChange).toHaveBeenCalled();
    expect(handleItemMoved).toHaveBeenCalledTimes(1);
  });
});

describe(`GridItem onItemResized`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should call onItemResized with this item's own final grid-unit h/w and pixel height/width on resizeend, and not before`, () => {
    stubOffsetWidth(1210);
    const handleItemResized = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0" onItemResized={handleItemResized}>Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchResizeEvent(target, `resizestart`);
    expect(handleItemResized).not.toHaveBeenCalled();

    dispatchResizeEvent(target, `resizemove`, { clientX: 50, clientY: 0 });
    expect(handleItemResized).not.toHaveBeenCalled();

    dispatchResizeEvent(target, `resizeend`, { clientX: 50, clientY: 0 });
    expect(handleItemResized).toHaveBeenCalledTimes(1);
    const payload = handleItemResized.mock.calls[0][0];
    expect(payload.i).toBe(`0`);
    expect(typeof payload.h).toBe(`number`);
    expect(typeof payload.w).toBe(`number`);
    expect(typeof payload.height).toBe(`number`);
    expect(typeof payload.width).toBe(`number`);
  });

  it(`Should not throw, and should not call onItemResized, when GridItem doesn't provide it at all`, () => {
    stubOffsetWidth(1210);
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(() => {
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: 50, clientY: 0 });
      dispatchResizeEvent(target, `resizeend`, { clientX: 50, clientY: 0 });
    }).not.toThrow();
  });

  it(`Should still commit the resize via onLayoutChange normally, independent of onItemResized being provided at all`, () => {
    stubOffsetWidth(1210);
    const handleItemResized = vi.fn();
    const handleLayoutChange = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleLayoutChange} rowHeight={100}>
        <GridItem i="0" onItemResized={handleItemResized}>Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizemove`, { clientX: 50, clientY: 0 });
    dispatchResizeEvent(target, `resizeend`, { clientX: 50, clientY: 0 });

    expect(handleLayoutChange).toHaveBeenCalled();
    expect(handleItemResized).toHaveBeenCalledTimes(1);
  });
});
