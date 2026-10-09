import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';

/**
 * `onItemMoved` / `onItemResized` are the per-item callbacks. They were only fired by the drag and resize hooks at the end
 * of a pointer gesture, so a keyboard move or resize never reached them (found by the React props e2e suite,
 * `e2e/props-accessibility.spec.ts`; the Vue package's own `item-moved` / `resized` do fire for the keyboard).
 */

const layout = (): TLayout => [{ h: 2, i: `a`, w: 2, x: 3, y: 1 }];

interface IItemHandlers {
  onItemMoved?: (payload: { i: string | number; x: number; y: number }) => void;
  onItemResized?: (payload: { i: string | number; h: number; w: number; height: number; width: number }) => void;
}

function renderItem(handlers: IItemHandlers): HTMLElement {
  const { container } = render(
    <GridLayout layout={layout()} margin={[10, 10]} rowHeight={100}>
      <GridItem i="a" {...handlers}>A</GridItem>
    </GridLayout>,
  );
  return container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
}

describe(`GridItem keyboard — per-item callbacks`, () => {
  it(`Should call onItemMoved with the destination of a keyboard move`, () => {
    const onItemMoved = vi.fn();
    const target = renderItem({ onItemMoved });

    fireEvent.keyDown(target, { key: `ArrowRight` });

    expect(onItemMoved).toHaveBeenCalledTimes(1);
    expect(onItemMoved).toHaveBeenCalledWith({ i: `a`, x: 4, y: 1 });
  });

  it(`Should report the destination for each direction`, () => {
    const onItemMoved = vi.fn();
    const target = renderItem({ onItemMoved });

    fireEvent.keyDown(target, { key: `ArrowDown` });

    expect(onItemMoved).toHaveBeenLastCalledWith({ i: `a`, x: 3, y: 2 });
  });

  it(`Should not call onItemMoved when the move is blocked (nothing changed)`, () => {
    const onItemMoved = vi.fn();
    const { container } = render(
      <GridLayout layout={[{ h: 2, i: `a`, w: 2, x: 0, y: 0 }]} margin={[10, 10]} rowHeight={100}>
        <GridItem i="a" onItemMoved={onItemMoved}>A</GridItem>
      </GridLayout>,
    );
    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;

    fireEvent.keyDown(target, { key: `ArrowLeft` });
    fireEvent.keyDown(target, { key: `ArrowUp` });

    expect(onItemMoved).not.toHaveBeenCalled();
  });

  it(`Should call onItemResized with the new size in grid units and in pixels`, () => {
    const onItemResized = vi.fn();
    const target = renderItem({ onItemResized });

    fireEvent.keyDown(target, { key: `ArrowRight`, shiftKey: true });

    expect(onItemResized).toHaveBeenCalledTimes(1);
    const payload = onItemResized.mock.calls[0][0] as { h: number; height: number; i: string; w: number; width: number };
    expect(payload).toMatchObject({ h: 2, i: `a`, w: 3 });
    // Pixels follow the same maths as the item's own style: 2 rows of 100 plus one 10px margin between them.
    expect(payload.height).toBe(210);
    expect(typeof payload.width).toBe(`number`);
    expect(payload.width).toBeGreaterThan(0);
  });

  it(`Should call onItemResized with a changed height for Shift+ArrowDown`, () => {
    const onItemResized = vi.fn();
    const target = renderItem({ onItemResized });

    fireEvent.keyDown(target, { key: `ArrowDown`, shiftKey: true });

    expect(onItemResized).toHaveBeenLastCalledWith(expect.objectContaining({ h: 3, i: `a`, w: 2 }));
  });

  it(`Should not call either callback for a key that does nothing`, () => {
    const onItemMoved = vi.fn();
    const onItemResized = vi.fn();
    const target = renderItem({ onItemMoved, onItemResized });

    fireEvent.keyDown(target, { key: `Enter` });
    fireEvent.keyDown(target, { ctrlKey: true, key: `ArrowRight` });

    expect(onItemMoved).not.toHaveBeenCalled();
    expect(onItemResized).not.toHaveBeenCalled();
  });
});
