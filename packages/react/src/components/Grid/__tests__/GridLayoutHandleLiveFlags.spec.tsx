import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';

/**
 * `canUndo` / `canRedo` on the handle were booleans computed when the handle was built. The history is pushed afterwards, by an
 * effect (an item added through the `layout` prop is recorded there), so a consumer holding the handle read `false` and nothing
 * made it read again (found by the React props e2e suite, `e2e/props-api.spec.ts`, where the lab's undo button stayed
 * disabled after an item was added). They are getters now, so a read always answers for the history as it is at that moment.
 */

const layout = (): TLayout => [
  { h: 2, i: `a`, w: 2, x: 0, y: 0 },
  { h: 2, i: `b`, w: 2, x: 0, y: 4 },
];

function setup(): { handle: () => IGridLayoutHandle; rerender: (next: TLayout) => void } {
  const ref = createRef<IGridLayoutHandle>();
  const view = (current: TLayout): React.JSX.Element => (
    <GridLayout enableUndoRedo layout={current} margin={[10, 10]} ref={ref} rowHeight={100}>
      {current.map(entry => <GridItem key={String(entry.i)} i={entry.i}>{String(entry.i)}</GridItem>)}
    </GridLayout>
  );
  const { rerender } = render(view(layout()));
  return { handle: () => ref.current!, rerender: next => rerender(view(next)) };
}

describe(`GridLayout handle — canUndo / canRedo are live`, () => {
  it(`Should start with nothing to undo or redo`, () => {
    const { handle } = setup();

    expect(handle().canUndo).toBe(false);
    expect(handle().canRedo).toBe(false);
  });

  it(`Should report an action taken after the handle was captured, through that same captured handle`, () => {
    const { handle } = setup();
    const captured = handle();

    act(() => {
      handle().compactNow();
    });

    // `captured` is the object the consumer was already holding; a snapshot would still say false here.
    expect(captured.canUndo).toBe(true);
  });

  it(`Should report an item added through the layout prop as undoable`, () => {
    const { handle, rerender } = setup();
    const captured = handle();

    rerender([...layout(), { h: 2, i: `c`, w: 2, x: 4, y: 0 }]);

    expect(captured.canUndo).toBe(true);
    expect(handle().canUndo).toBe(true);
  });

  it(`Should report redo availability live, through undo and back`, () => {
    const { handle } = setup();
    const captured = handle();
    act(() => {
      handle().compactNow();
    });
    expect(captured.canRedo).toBe(false);

    act(() => {
      handle().undo();
    });
    expect(captured.canRedo).toBe(true);
    expect(captured.canUndo).toBe(false);

    act(() => {
      handle().redo();
    });
    expect(captured.canRedo).toBe(false);
    expect(captured.canUndo).toBe(true);
  });
});
