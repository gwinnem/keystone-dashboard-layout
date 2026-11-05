import { createRef } from 'react';
import type { ReactElement, RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { findCrossGridZoneAt } from 'keystone-dashboard-layout-core/gridlayout/helpers/cross-grid-registry';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';

/**
 * Two families of behaviour that a mutation run found nothing checking:
 *
 *  1. Every action below goes through a `useCallback` that closes over props (`onLayoutChange`, `multiSelect`, `allowOutsideDrop`...).
 *     If its dependency list stops tracking them, the callback keeps using the FIRST render's values. Each test re-renders with a new
 *     value and then triggers the action: only the callback of the latest render may hear about it.
 *  2. How a `layout` prop that changes from outside is told apart from the echo of the layout this grid itself just produced.
 */

const layoutOf = (...ids: string[]): TLayout => ids.map((i, row) => ({ h: 2, i, w: 2, x: 0, y: row * 2 }));

const childrenOf = (ids: string[]): ReactElement[] => ids.map(i => <GridItem i={i} key={i}>Item {i}</GridItem>);

describe(`GridLayout — an action reports to the onLayoutChange of the latest render`, () => {
  const element = (onLayoutChange: (layout: TLayout) => void, ref: RefObject<IGridLayoutHandle | null>, layout = layoutOf(`0`, `1`)): ReactElement => (
    <GridLayout enableUndoRedo layout={layout} multiSelect onLayoutChange={onLayoutChange} ref={ref}>
      {childrenOf(layout.map(item => String(item.i)))}
    </GridLayout>
  );

  /** Mounts with one callback, re-renders with another, and forgets everything either was told along the way. */
  const mountThenSwap = (layout?: TLayout) => {
    const first = vi.fn();
    const second = vi.fn();
    const ref = createRef<IGridLayoutHandle>();
    const view = render(element(first, ref, layout));
    view.rerender(element(second, ref, layout));
    first.mockClear();
    second.mockClear();
    return { first, ref, second, view };
  };

  it.each([
    [`compactNow`, (handle: IGridLayoutHandle) => handle.compactNow()],
    [`rearrange`, (handle: IGridLayoutHandle) => handle.rearrange()],
    [`duplicateItem`, (handle: IGridLayoutHandle) => handle.duplicateItem(`0`)],
  ])(`%s`, (_name, run) => {
    const { first, ref, second } = mountThenSwap();

    act(() => {
      run(ref.current!);
    });

    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
  });

  it(`undo`, () => {
    const { first, ref, second } = mountThenSwap();
    // A committed action first, so there is a history entry to undo.
    act(() => {
      ref.current!.compactNow();
    });
    second.mockClear();

    act(() => {
      ref.current!.undo();
    });

    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
  });

  it(`redo`, () => {
    const { first, ref, second } = mountThenSwap();
    act(() => {
      ref.current!.compactNow();
    });
    act(() => {
      ref.current!.undo();
    });
    second.mockClear();

    act(() => {
      ref.current!.redo();
    });

    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
  });

  it(`alignSelected`, () => {
    // Two items side by side, in different columns, so that aligning the second to the first really moves it.
    const sideBySide: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 4, y: 0 },
    ];
    const { first, ref, second } = mountThenSwap(sideBySide);
    act(() => {
      ref.current!.selectItem(`0`);
      ref.current!.selectItem(`1`);
    });

    act(() => {
      ref.current!.alignSelected(`left`);
    });

    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
  });

  it(`an item accepted from another grid`, () => {
    const first = vi.fn();
    const second = vi.fn();
    const ref = createRef<IGridLayoutHandle>();
    const grid = (onLayoutChange: (layout: TLayout) => void): ReactElement => (
      <GridLayout allowCrossGridDrag layout={layoutOf(`0`)} layoutId="target" onLayoutChange={onLayoutChange} ref={ref}>
        {childrenOf([`0`])}
      </GridLayout>
    );
    const view = render(grid(first));
    view.rerender(grid(second));
    first.mockClear();
    second.mockClear();

    // jsdom lays nothing out, so the grid's rect is all zeros and (0, 0) lies on it.
    const zone = findCrossGridZoneAt(0, 0, `another-grid`);
    act(() => {
      zone?.acceptDrop({ h: 2, i: `dropped`, w: 2, x: 0, y: 0 }, `another-grid`);
    });

    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
    const reported = second.mock.calls.at(-1)![0] as TLayout;
    expect(reported.map(item => item.i)).toContain(`dropped`);
  });
});

describe(`GridLayout — props that change after mount reach the handlers that read them`, () => {
  it(`Should let a click select an item once multiSelect is switched on after mount`, () => {
    const onSelectionChanged = vi.fn();
    const grid = (multiSelect: boolean): ReactElement => (
      <GridLayout layout={layoutOf(`0`)} multiSelect={multiSelect} onSelectionChanged={onSelectionChanged}>
        {childrenOf([`0`])}
      </GridLayout>
    );
    const view = render(grid(false));
    view.rerender(grid(true));

    fireEvent.click(view.container.querySelector(`[data-grid-item-id="0"]`)!);

    expect(onSelectionChanged).toHaveBeenLastCalledWith([`0`]);
  });

  describe(`an outside drag entering the grid`, () => {
    const dragEnter = (root: Element): Event => {
      const event = new Event(`dragenter`, { bubbles: true, cancelable: true });
      act(() => {
        root.dispatchEvent(event);
      });
      return event;
    };

    const grid = (allowOutsideDrop: boolean, outsideDropAccept?: () => boolean): ReactElement => (
      <GridLayout allowOutsideDrop={allowOutsideDrop} layout={layoutOf(`0`)} outsideDropAccept={outsideDropAccept}>
        {childrenOf([`0`])}
      </GridLayout>
    );

    it(`Should be taken by the grid once allowOutsideDrop is switched on after mount`, () => {
      const view = render(grid(false));
      view.rerender(grid(true));

      // The grid takes a drag it accepts by cancelling the browser's default.
      expect(dragEnter(view.container.firstElementChild!).defaultPrevented).toBe(true);
    });

    it(`Should be left to the browser once allowOutsideDrop is switched off after mount`, () => {
      const view = render(grid(true));
      view.rerender(grid(false));

      expect(dragEnter(view.container.firstElementChild!).defaultPrevented).toBe(false);
    });

    it(`Should be taken by the grid once an outsideDropAccept that refused everything is replaced`, () => {
      const view = render(grid(true, () => false));
      view.rerender(grid(true, () => true));

      expect(dragEnter(view.container.firstElementChild!).defaultPrevented).toBe(true);
    });
  });
});

describe(`GridLayout — a layout prop that changes from outside`, () => {
  const lastLayout = (onLayoutChange: ReturnType<typeof vi.fn>): TLayout => onLayoutChange.mock.calls.at(-1)![0] as TLayout;
  const byId = (layout: TLayout, id: string) => layout.find(item => item.i === id)!;

  const grid = (layout: TLayout, onLayoutChange: (layout: TLayout) => void): ReactElement => (
    <GridLayout layout={layout} onLayoutChange={onLayoutChange}>
      {childrenOf(layout.map(item => String(item.i)))}
    </GridLayout>
  );

  it(`Should settle the remaining items when one is removed, rather than treating the result as an echo`, () => {
    // Every remaining item is found at an identical position in what is rendered, so only the difference in LENGTH shows that the
    // layout came from outside and needs compacting: item 1 has to rise into the row item 0 left.
    const onLayoutChange = vi.fn();
    const view = render(grid(layoutOf(`0`, `1`), onLayoutChange));
    onLayoutChange.mockClear();

    view.rerender(grid([{ h: 2, i: `1`, w: 2, x: 0, y: 2 }], onLayoutChange));

    expect(byId(lastLayout(onLayoutChange), `1`).y).toBe(0);
  });

  it(`Should not throw when an item is replaced by one with a different id, the length staying the same`, () => {
    const view = render(grid(layoutOf(`a`, `b`), vi.fn()));

    expect(() => view.rerender(grid(layoutOf(`a`, `c`), vi.fn()))).not.toThrow();
    expect(view.container.querySelector(`[data-grid-item-id="c"]`)).toBeTruthy();
  });

  it(`Should settle an item whose width alone was changed so that it now overlaps its neighbour`, () => {
    // Positions are unchanged, so only the width tells this layout from the one already rendered. Not an echo, so it is compacted and
    // the neighbour pushed down out of the way.
    const onLayoutChange = vi.fn();
    const sideBySide: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 2, y: 0 },
    ];
    const view = render(grid(sideBySide, onLayoutChange));
    onLayoutChange.mockClear();

    view.rerender(grid([{ ...sideBySide[0], w: 4 }, sideBySide[1]], onLayoutChange));

    expect(byId(lastLayout(onLayoutChange), `b`).y).toBe(2);
  });

  it(`Should settle an item whose height alone was changed so that it now overlaps its neighbour`, () => {
    const onLayoutChange = vi.fn();
    const stacked: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 0, y: 2 },
    ];
    const view = render(grid(stacked, onLayoutChange));
    onLayoutChange.mockClear();

    view.rerender(grid([{ ...stacked[0], h: 4 }, stacked[1]], onLayoutChange));

    expect(byId(lastLayout(onLayoutChange), `b`).y).toBe(4);
  });
});

describe(`GridLayout — root element`, () => {
  it(`Should be positioned relative, so the items inside it are placed against the grid and not the page`, () => {
    const { container } = render(<GridLayout layout={layoutOf(`0`)}>{childrenOf([`0`])}</GridLayout>);

    expect((container.firstElementChild as HTMLElement).style.position).toBe(`relative`);
  });
});
