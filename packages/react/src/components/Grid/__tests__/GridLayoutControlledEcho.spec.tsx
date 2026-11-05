import { createRef, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';
import { dispatchDragEvent } from './test-helpers';

/**
 * A controlled consumer feeds every `onLayoutChange` straight back in as the `layout` prop — which is how this component
 * is meant to be used (and how the e2e lab drives it). Most `layout` prop changes are then just the echo of a layout the
 * grid produced itself. Re-compacting that echo with a plain, unconstrained pass undid anything a *constrained* compaction
 * had just done: `restoreOnDrag` holds other items at their pre-drag row, and the echo lifted them straight back up on the
 * next render. The other `restoreOnDrag` specs never feed the layout back in, which is why they passed while the option was
 * doing nothing for any real consumer (found by the React props e2e suite, `e2e/props-interaction.spec.ts`).
 */

interface IControlledGridProps {
  gridRef?: React.Ref<IGridLayoutHandle>;
  initial: TLayout;
  restoreOnDrag?: boolean;
}

function ControlledGrid({ gridRef, initial, restoreOnDrag = true }: IControlledGridProps): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>(initial);
  return (
    <>
      <pre data-testid="stored-layout">{JSON.stringify(layout.map(({ i, x, y }) => ({ i, x, y })))}</pre>
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={setLayout} ref={gridRef} restoreOnDrag={restoreOnDrag} rowHeight={100}>
        {layout.map(entry => <GridItem key={String(entry.i)} i={entry.i}>{String(entry.i)}</GridItem>)}
      </GridLayout>
    </>
  );
}

const stacked = (): TLayout => [
  { h: 2, i: `a`, w: 2, x: 0, y: 0 },
  { h: 2, i: `b`, w: 2, x: 0, y: 2 },
];

const yOf = (getByTestId: (id: string) => HTMLElement, id: string): number =>
  (JSON.parse(getByTestId(`stored-layout`).textContent ?? `[]`) as { i: string; y: number }[]).find(entry => entry.i === id)!.y;

describe(`GridLayout — a controlled consumer that stores every onLayoutChange`, () => {
  it(`Should keep restoreOnDrag holding the other item at its pre-drag row while a drag is in progress`, () => {
    const { container, getByTestId } = render(<ControlledGrid initial={stacked()} />);

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });

    // "a" has moved away, leaving a gap above "b" — which restoreOnDrag must leave alone, even after the stored layout
    // has been fed back in as the prop.
    expect(yOf(getByTestId, `b`)).toBe(2);
  });

  it(`Should keep holding it through the drop, until a later layout pass`, () => {
    const ref = createRef<IGridLayoutHandle>();
    const { container, getByTestId } = render(<ControlledGrid gridRef={ref} initial={stacked()} />);

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 300, clientY: 0 });

    expect(yOf(getByTestId, `b`)).toBe(2);

    // A pass that does not go through the drag path is unrestricted, and only then does "b" rise into the gap. Wrapped in
    // act(): the handle call is a direct function call, not a React event, so its state update would otherwise not be
    // flushed before the layout is read back.
    act(() => {
      ref.current!.compactNow();
    });
    expect(yOf(getByTestId, `b`)).toBe(0);
  });

  it(`Should still let the other item rise during the same drag when restoreOnDrag is off`, () => {
    const { container, getByTestId } = render(<ControlledGrid initial={stacked()} restoreOnDrag={false} />);

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });

    expect(yOf(getByTestId, `b`)).toBe(0);
  });
});
