import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, dispatchResizeEvent } from './test-helpers';

/**
 * The native engine captures the pointer on the item, so the browser delivers a `click` to it after every drag or
 * resize ends. With `multiSelect` on, a click means "select just this item", so without suppression every drag of a
 * selected item collapsed the selection to that one item once it ended (found by the React props e2e suite,
 * `e2e/props-multiselect.spec.ts`). The flag is armed synchronously in the engine's own `dragend`/`resizeend` callback
 * and clears on the next task; these tests fire the click in the same task as the gesture end, as a browser does, and
 * again on the next task.
 */

const layout = (): TLayout => [
  { h: 2, i: `a`, w: 2, x: 0, y: 0 },
  { h: 2, i: `b`, w: 2, x: 4, y: 0 },
];

const nextTask = (): Promise<void> => new Promise(resolve => {
  setTimeout(resolve, 0);
});

function renderGrid(onSelectionChanged: (ids: (string | number)[]) => void): HTMLElement {
  const { container } = render(
    <GridLayout layout={layout()} margin={[10, 10]} multiSelect onSelectionChanged={onSelectionChanged} rowHeight={100}>
      <GridItem i="a">A</GridItem>
      <GridItem i="b">B</GridItem>
    </GridLayout>,
  );
  return container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
}

describe(`GridItem — the click that trails a drag or resize`, () => {
  it(`Should select the item on a plain click, with no gesture involved`, () => {
    const onSelectionChanged = vi.fn();
    const target = renderGrid(onSelectionChanged);

    fireEvent.click(target);

    expect(onSelectionChanged).toHaveBeenLastCalledWith([`a`]);
  });

  it(`Should ignore the click that arrives in the same task as the end of a drag`, () => {
    const onSelectionChanged = vi.fn();
    const target = renderGrid(onSelectionChanged);

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragend`, { clientX: 300, clientY: 0 });
    fireEvent.click(target);

    expect(onSelectionChanged).not.toHaveBeenCalled();
  });

  it(`Should honour a genuine click on the next task, once the trailing one has gone by`, async () => {
    const onSelectionChanged = vi.fn();
    const target = renderGrid(onSelectionChanged);

    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragend`, { clientX: 300, clientY: 0 });
    await nextTask();
    fireEvent.click(target);

    expect(onSelectionChanged).toHaveBeenLastCalledWith([`a`]);
  });

  it(`Should ignore the click that arrives in the same task as the end of a resize`, () => {
    const onSelectionChanged = vi.fn();
    const target = renderGrid(onSelectionChanged);

    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizeend`, { clientX: 100, clientY: 0 });
    fireEvent.click(target);

    expect(onSelectionChanged).not.toHaveBeenCalled();
  });

  it(`Should honour a genuine click on the next task after a resize`, async () => {
    const onSelectionChanged = vi.fn();
    const target = renderGrid(onSelectionChanged);

    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizeend`, { clientX: 100, clientY: 0 });
    await nextTask();
    fireEvent.click(target);

    expect(onSelectionChanged).toHaveBeenLastCalledWith([`a`]);
  });

  it(`Should not suppress a click after a drag that only just started, with no end reported`, () => {
    const onSelectionChanged = vi.fn();
    const target = renderGrid(onSelectionChanged);

    // dragstart alone (no dragend) is not the end of a gesture, so nothing is armed.
    dispatchDragEvent(target, `dragstart`);
    fireEvent.click(target);

    expect(onSelectionChanged).toHaveBeenLastCalledWith([`a`]);
  });
});
