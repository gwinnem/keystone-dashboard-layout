import { createRef, useState } from 'react';
import type { JSX } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';
import type { IGridLayoutProps } from '../grid-layout-props.interface';
import { restoreOffsetWidth, stubOffsetWidth, triggerResize } from './test-helpers';

const trio = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 2, y: 0 },
  { h: 2, i: `2`, w: 2, x: 0, y: 2 },
];

/** A layout with a gap: compaction would pull item `1` up from row 6 to row 2. */
const gap = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 0, y: 6 },
];

const stubClientHeight = (height: number): void => {
  Object.defineProperty(HTMLElement.prototype, `clientHeight`, { configurable: true, value: height });
};

const restoreClientHeight = (): void => {
  Reflect.deleteProperty(HTMLElement.prototype, `clientHeight`);
};

/** Runs `fn` inside `act()`: every handle method updates the grid from outside React's own event system. */
function callInAct<T>(fn: () => T): T {
  let result: T | undefined;
  act(() => {
    result = fn();
  });
  return result as T;
}

type TGridProps = Omit<IGridLayoutProps, `children` | `layout`>;

/** A 1200px wide, 500px high grid with one `GridItem` per layout entry. */
const renderGrid = (layout: TLayout, props: TGridProps = {}) => {
  stubOffsetWidth(1200);
  stubClientHeight(500);
  const ref = createRef<IGridLayoutHandle>();
  const element = (nextLayout: TLayout, nextProps: TGridProps): JSX.Element => (
    <GridLayout layout={nextLayout} ref={ref} {...nextProps}>
      {nextLayout.map(entry => <GridItem key={entry.i} i={entry.i}>{`Item ${String(entry.i)}`}</GridItem>)}
    </GridLayout>
  );
  const view = render(element(layout, props));
  return {
    ...view,
    ref,
    rerenderGrid: (nextLayout: TLayout, nextProps: TGridProps = {}): void => view.rerender(element(nextLayout, nextProps)),
  };
};

type TResizedPayload = { h: number; height: number; i: string | number; w: number; width: number };

/** Like `renderGrid`, but every `GridItem` reports its pixel size through one shared `onItemResized` spy. */
const renderReporting = (layout: TLayout, props: TGridProps = {}) => {
  stubOffsetWidth(1200);
  stubClientHeight(500);
  const ref = createRef<IGridLayoutHandle>();
  const onItemResized = vi.fn();
  const element = (nextLayout: TLayout, nextProps: TGridProps): JSX.Element => (
    <GridLayout layout={nextLayout} ref={ref} {...nextProps}>
      {nextLayout.map(entry => <GridItem key={entry.i} i={entry.i} onItemResized={onItemResized}>{`Item ${String(entry.i)}`}</GridItem>)}
    </GridLayout>
  );
  const view = render(element(layout, props));
  return {
    ...view,
    onItemResized,
    ref,
    rerenderGrid: (nextLayout: TLayout, nextProps: TGridProps = {}): void => view.rerender(element(nextLayout, nextProps)),
  };
};

/** What one item reported through `onItemResized`, oldest first. */
const reportsFor = (spy: ReturnType<typeof vi.fn>, id: string): TResizedPayload[] =>
  (spy.mock.calls.map(call => call[0]) as TResizedPayload[]).filter(payload => payload.i === id);

const item = (container: HTMLElement, id: string): HTMLElement => container.querySelector(`[data-grid-item-id="${id}"]`) as HTMLElement;

const styleOf = (container: HTMLElement, id: string): string => item(container, id).getAttribute(`style`) ?? ``;

const isHidden = (container: HTMLElement, id: string): boolean => styleOf(container, id).includes(`display: none`);

const lastLayout = (onLayoutChange: ReturnType<typeof vi.fn>): TLayout => onLayoutChange.mock.calls.at(-1)![0] as TLayout;

const yOf = (layout: TLayout, id: string): number => layout.find(entry => entry.i === id)!.y;

describe(`GridLayout maximize / restore`, () => {
  afterEach(() => {
    restoreOffsetWidth();
    restoreClientHeight();
  });

  describe(`maximizing`, () => {
    it(`Should fill the grid minus one margin on each side`, () => {
      const { container } = renderGrid(trio(), { maximizedItem: `1` });

      const style = styleOf(container, `1`);

      // jsdom serializes the transform without a space after the first comma.
      expect(style).toMatch(/translate3d\(10px,\s*10px,\s*0\)/);
      expect(style).toContain(`width: 1180px`);
      expect(style).toContain(`height: 480px`);
    });

    it(`Should hide every other item but keep it mounted`, () => {
      const { container } = renderGrid(trio(), { maximizedItem: `1` });

      expect(item(container, `0`)).toBeTruthy();
      expect(item(container, `2`)).toBeTruthy();
      expect(isHidden(container, `0`)).toBe(true);
      expect(isHidden(container, `2`)).toBe(true);
      expect(isHidden(container, `1`)).toBe(false);
    });

    it(`Should mark the maximized item with a class`, () => {
      const { container } = renderGrid(trio(), { maximizedItem: `1` });

      expect(item(container, `1`).classList.contains(`kdl-grid-item--maximized`)).toBe(true);
      expect(item(container, `0`).classList.contains(`kdl-grid-item--maximized`)).toBe(false);
    });

    it(`Should maximize and restore through the handle`, () => {
      const { container, ref } = renderGrid(trio());
      expect(ref.current!.maximizedItem).toBeNull();

      callInAct(() => ref.current!.maximize(`2`));
      expect(ref.current!.maximizedItem).toBe(`2`);
      expect(styleOf(container, `2`)).toContain(`width: 1180px`);

      callInAct(() => ref.current!.restore());
      expect(ref.current!.maximizedItem).toBeNull();
      expect(isHidden(container, `0`)).toBe(false);
    });

    it(`Should switch straight to another item`, () => {
      const { container, ref } = renderGrid(trio(), { maximizedItem: `0` });

      callInAct(() => ref.current!.maximize(`1`));

      expect(isHidden(container, `0`)).toBe(true);
      expect(isHidden(container, `1`)).toBe(false);
      expect(styleOf(container, `1`)).toContain(`width: 1180px`);
    });

    it(`Should toggle with toggleMaximize`, () => {
      const { ref } = renderGrid(trio());

      callInAct(() => ref.current!.toggleMaximize(`1`));
      expect(ref.current!.maximizedItem).toBe(`1`);

      callInAct(() => ref.current!.toggleMaximize(`2`));
      expect(ref.current!.maximizedItem).toBe(`2`);

      callInAct(() => ref.current!.toggleMaximize(`2`));
      expect(ref.current!.maximizedItem).toBeNull();
    });

    it(`Should follow the maximizedItem prop after mount`, () => {
      const { container, rerenderGrid } = renderGrid(trio());
      const layout = trio();

      rerenderGrid(layout, { maximizedItem: `1` });
      expect(isHidden(container, `0`)).toBe(true);

      rerenderGrid(layout, { maximizedItem: null });
      expect(isHidden(container, `0`)).toBe(false);
    });

    it(`Should use the grid height measured when the item was maximized`, () => {
      const { container, ref } = renderGrid(trio());
      stubClientHeight(300);

      callInAct(() => ref.current!.maximize(`0`));

      expect(styleOf(container, `0`)).toContain(`height: 280px`);
    });

    it(`Should follow the grid when it is resized`, () => {
      const { container } = renderGrid(trio(), { maximizedItem: `0` });
      expect(styleOf(container, `0`)).toContain(`height: 480px`);
      stubClientHeight(300);

      triggerResize(1000);

      expect(styleOf(container, `0`)).toContain(`height: 280px`);
      expect(styleOf(container, `0`)).toContain(`width: 980px`);
    });

    it(`Should anchor to the right edge when the grid is mirrored`, () => {
      const { container } = renderGrid(trio(), { isMirrored: true, maximizedItem: `0`, useCssTransforms: false });

      const style = styleOf(container, `0`);

      expect(style).toContain(`right: 10px`);
      expect(style).not.toContain(`left: 10px`);
    });

    it(`Should ignore an id the layout does not have`, () => {
      const { container, ref } = renderGrid(trio(), { maximizedItem: `nope` });

      expect(ref.current!.maximizedItem).toBeNull();
      expect(isHidden(container, `0`)).toBe(false);
    });

    it(`Should work with a numeric id`, () => {
      const layout: TLayout = [{ h: 2, i: 0, w: 2, x: 0, y: 0 }, { h: 2, i: 1, w: 2, x: 2, y: 0 }];
      const { container, ref } = renderGrid(layout, { maximizedItem: 0 });

      expect(ref.current!.maximizedItem).toBe(0);
      expect(isHidden(container, `1`)).toBe(true);
    });
  });

  describe(`restoring`, () => {
    it(`Should put every item back where layout has it, without touching layout`, () => {
      const layout = trio();
      const onLayoutChange = vi.fn();
      const { container, ref } = renderGrid(layout, { onLayoutChange });
      const before = JSON.stringify(layout);
      const styleBefore = styleOf(container, `1`);

      callInAct(() => ref.current!.maximize(`1`));
      expect(JSON.stringify(layout)).toBe(before);

      callInAct(() => ref.current!.restore());

      expect(JSON.stringify(layout)).toBe(before);
      expect(styleOf(container, `1`)).toBe(styleBefore);
      expect(item(container, `1`).classList.contains(`kdl-grid-item--maximized`)).toBe(false);
      expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it(`Should do nothing when nothing is maximized`, () => {
      const onMaximizedItemChange = vi.fn();
      const { ref } = renderGrid(trio(), { onMaximizedItemChange });

      callInAct(() => ref.current!.restore());

      expect(onMaximizedItemChange).not.toHaveBeenCalled();
    });

    it(`Should un-hide the others when the maximized item is removed from layout`, () => {
      const onMaximizedItemChange = vi.fn();
      const { container, ref, rerenderGrid } = renderGrid(trio(), { maximizedItem: `1`, onMaximizedItemChange });
      expect(isHidden(container, `0`)).toBe(true);

      rerenderGrid(trio().filter(entry => entry.i !== `1`), { maximizedItem: `1`, onMaximizedItemChange });

      expect(ref.current!.maximizedItem).toBeNull();
      expect(isHidden(container, `0`)).toBe(false);
      expect(onMaximizedItemChange.mock.calls).toStrictEqual([[null]]);
    });
  });

  describe(`events`, () => {
    it(`Should call onMaximizedItemChange with the id, then null`, () => {
      const onMaximizedItemChange = vi.fn();
      const { ref } = renderGrid(trio(), { onMaximizedItemChange });

      callInAct(() => ref.current!.maximize(`1`));
      callInAct(() => ref.current!.restore());

      expect(onMaximizedItemChange.mock.calls).toStrictEqual([[`1`], [null]]);
    });

    it(`Should not call it twice when the item is already maximized`, () => {
      const onMaximizedItemChange = vi.fn();
      const { ref } = renderGrid(trio(), { onMaximizedItemChange });

      callInAct(() => ref.current!.maximize(`1`));
      callInAct(() => ref.current!.maximize(`1`));

      expect(onMaximizedItemChange).toHaveBeenCalledTimes(1);
    });

    it(`Should not call it for an id the layout does not have`, () => {
      const onMaximizedItemChange = vi.fn();
      const { ref } = renderGrid(trio(), { onMaximizedItemChange });

      callInAct(() => ref.current!.maximize(`nope`));

      expect(onMaximizedItemChange).not.toHaveBeenCalled();
    });

    it(`Should not call it when the change came from the prop`, () => {
      const onMaximizedItemChange = vi.fn();
      const { rerenderGrid } = renderGrid(trio(), { onMaximizedItemChange });
      const layout = trio();

      rerenderGrid(layout, { maximizedItem: `1`, onMaximizedItemChange });
      rerenderGrid(layout, { maximizedItem: null, onMaximizedItemChange });

      expect(onMaximizedItemChange).not.toHaveBeenCalled();
    });

    it(`Should not report a layout change just for maximizing`, () => {
      const onLayoutChange = vi.fn();
      const { ref } = renderGrid(trio(), { onLayoutChange });

      callInAct(() => ref.current!.maximize(`1`));
      callInAct(() => ref.current!.restore());

      expect(onLayoutChange).not.toHaveBeenCalled();
    });
  });

  describe(`Escape`, () => {
    it(`Should restore on Escape`, () => {
      const onMaximizedItemChange = vi.fn();
      const { container, ref } = renderGrid(trio(), { maximizedItem: `1`, onMaximizedItemChange });

      fireEvent.keyDown(item(container, `1`), { key: `Escape` });

      expect(ref.current!.maximizedItem).toBeNull();
      expect(onMaximizedItemChange.mock.calls).toStrictEqual([[null]]);
    });

    it(`Should ignore other keys`, () => {
      const { container, ref } = renderGrid(trio(), { maximizedItem: `1` });

      fireEvent.keyDown(item(container, `1`), { key: `Enter` });

      expect(ref.current!.maximizedItem).toBe(`1`);
    });

    it(`Should leave an Escape that something inside the item already handled`, () => {
      const { container, ref } = renderGrid(trio(), { maximizedItem: `1` });
      item(container, `1`).addEventListener(`keydown`, event => event.preventDefault());

      fireEvent.keyDown(item(container, `1`), { key: `Escape` });

      expect(ref.current!.maximizedItem).toBe(`1`);
    });

    it(`Should do nothing on Escape when nothing is maximized`, () => {
      const onMaximizedItemChange = vi.fn();
      const { container } = renderGrid(trio(), { onMaximizedItemChange });

      fireEvent.keyDown(item(container, `1`), { key: `Escape` });

      expect(onMaximizedItemChange).not.toHaveBeenCalled();
    });
  });

  describe(`compaction`, () => {
    it(`Should suspend compaction while maximized, and compact once on restore`, () => {
      const onLayoutChange = vi.fn();
      const { ref } = renderGrid(gap(), { maximizedItem: `0`, onLayoutChange });
      // Mounting with an item maximized left the gap alone.
      expect(onLayoutChange).not.toHaveBeenCalled();

      callInAct(() => ref.current!.compactNow());
      expect(onLayoutChange).not.toHaveBeenCalled();

      callInAct(() => ref.current!.restore());

      expect(onLayoutChange).toHaveBeenCalledTimes(1);
      expect(yOf(lastLayout(onLayoutChange), `1`)).toBe(2);
    });

    it(`Should not compact a layout that changes from outside while maximized, until restore`, () => {
      const onLayoutChange = vi.fn();
      const { ref, rerenderGrid } = renderGrid(trio(), { maximizedItem: `0`, onLayoutChange });

      rerenderGrid(gap(), { maximizedItem: `0`, onLayoutChange });
      expect(onLayoutChange).not.toHaveBeenCalled();

      callInAct(() => ref.current!.restore());

      expect(onLayoutChange).toHaveBeenCalledTimes(1);
      expect(yOf(lastLayout(onLayoutChange), `1`)).toBe(2);
    });

    it(`Should hold back the compaction of a duplicate added while maximized`, () => {
      const onLayoutChange = vi.fn();
      const { ref } = renderGrid(gap(), { maximizedItem: `0`, onLayoutChange });

      const copyId = callInAct(() => ref.current!.duplicateItem(`1`));

      expect(copyId).toBe(`1-copy`);
      expect(yOf(lastLayout(onLayoutChange), `1`)).toBe(6);
      expect(yOf(lastLayout(onLayoutChange), `1-copy`)).toBe(8);

      callInAct(() => ref.current!.restore());

      expect(yOf(lastLayout(onLayoutChange), `1`)).toBe(2);
      expect(yOf(lastLayout(onLayoutChange), `1-copy`)).toBe(4);
    });

    it(`Should report the layout on restore only when compaction moved something`, () => {
      const onLayoutChange = vi.fn();
      const { ref } = renderGrid(gap(), { maximizedItem: `0`, onLayoutChange });

      callInAct(() => ref.current!.restore());
      expect(onLayoutChange).toHaveBeenCalledTimes(1);

      callInAct(() => ref.current!.maximize(`0`));
      callInAct(() => ref.current!.restore());
      expect(onLayoutChange).toHaveBeenCalledTimes(1);
    });
  });

  describe(`restoring without a layout listener`, () => {
    it(`Should compact on restore without throwing when no onLayoutChange was given`, () => {
      const { container, ref } = renderGrid(gap(), { maximizedItem: `0` });

      expect(() => callInAct(() => ref.current!.restore())).not.toThrow();

      // Compaction ran: item `1` ends up at row 2, exactly where a layout that already had it there draws it.
      const reference = renderGrid([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }, { h: 2, i: `1`, w: 2, x: 0, y: 2 }]);
      expect(styleOf(container, `1`)).toBe(styleOf(reference.container, `1`));
    });
  });

  describe(`reporting the pixel size`, () => {
    /** The pixel width/height an item's inline style gives it right now. */
    const drawnSize = (container: HTMLElement, id: string): { height: number; width: number } => {
      const style = styleOf(container, id);
      return {
        height: Number.parseFloat(/(?:^|\s)height: ([\d.]+)px/.exec(style)![1]),
        width: Number.parseFloat(/(?:^|\s)width: ([\d.]+)px/.exec(style)![1]),
      };
    };

    it(`Should report the size the item now fills the grid with when it is maximized`, () => {
      const { onItemResized, ref } = renderReporting(trio());
      onItemResized.mockClear();

      callInAct(() => ref.current!.maximize(`1`));

      expect(reportsFor(onItemResized, `1`).at(-1)).toStrictEqual({ h: 2, height: 480, i: `1`, w: 2, width: 1180 });
    });

    it(`Should report the size of its own cell again when it is restored`, () => {
      const { container, onItemResized, ref } = renderReporting(trio());
      callInAct(() => ref.current!.maximize(`1`));
      onItemResized.mockClear();

      callInAct(() => ref.current!.restore());

      const reports = reportsFor(onItemResized, `1`);
      expect(reports).toHaveLength(1);
      expect(reports[0]).toStrictEqual({ h: 2, i: `1`, w: 2, ...drawnSize(container, `1`) });
      expect(reports[0].width).not.toBe(1180);
    });

    it(`Should report the size of an item that is maximized when it mounts`, () => {
      const { onItemResized } = renderReporting(trio(), { maximizedItem: `1` });

      expect(reportsFor(onItemResized, `1`).at(-1)).toStrictEqual({ h: 2, height: 480, i: `1`, w: 2, width: 1180 });
    });

    it(`Should say nothing for the items that stay hidden`, () => {
      const { onItemResized, ref } = renderReporting(trio());
      onItemResized.mockClear();

      callInAct(() => ref.current!.maximize(`1`));
      stubClientHeight(300);
      triggerResize(1000);
      callInAct(() => ref.current!.restore());

      expect(reportsFor(onItemResized, `0`)).toStrictEqual([]);
      expect(reportsFor(onItemResized, `2`)).toStrictEqual([]);
    });

    it(`Should say nothing for an item that was never maximized`, () => {
      const { onItemResized } = renderReporting(trio());
      onItemResized.mockClear();

      stubClientHeight(300);
      triggerResize(1000);

      expect(onItemResized).not.toHaveBeenCalled();
    });

    it(`Should follow the grid while the item is maximized`, () => {
      const { onItemResized } = renderReporting(trio(), { maximizedItem: `0` });
      onItemResized.mockClear();
      stubClientHeight(300);

      triggerResize(1000);

      expect(reportsFor(onItemResized, `0`).at(-1)).toStrictEqual({ h: 2, height: 280, i: `0`, w: 2, width: 980 });
    });

    it(`Should not report again when only the item's own layout cell changes while it is maximized`, () => {
      const { onItemResized, rerenderGrid } = renderReporting(trio(), { maximizedItem: `0` });
      onItemResized.mockClear();

      rerenderGrid(trio().map(entry => (entry.i === `0` ? { ...entry, w: 3 } : entry)), { maximizedItem: `0` });

      expect(onItemResized).not.toHaveBeenCalled();
    });

    it(`Should report the size of the item the grid switches to, and of the one it leaves`, () => {
      const { container, onItemResized, ref } = renderReporting(trio(), { maximizedItem: `0` });
      onItemResized.mockClear();

      callInAct(() => ref.current!.maximize(`1`));

      expect(reportsFor(onItemResized, `1`).at(-1)).toStrictEqual({ h: 2, height: 480, i: `1`, w: 2, width: 1180 });
      expect(reportsFor(onItemResized, `0`)).toHaveLength(1);
      expect(reportsFor(onItemResized, `0`)[0]).toStrictEqual({ h: 2, i: `0`, w: 2, ...drawnSize(container, `0`) });
    });

    it(`Should report through the maximize button too`, () => {
      const { container, onItemResized } = renderReporting(trio(), { showMaximizeButton: true });
      onItemResized.mockClear();

      fireEvent.click(item(container, `2`).querySelector(`.btn-maximize`) as HTMLElement);

      expect(reportsFor(onItemResized, `2`).at(-1)).toStrictEqual({ h: 2, height: 480, i: `2`, w: 2, width: 1180 });
    });

    it(`Should maximize and restore without throwing when no onItemResized was given`, () => {
      const { ref } = renderGrid(trio());

      expect(() => {
        callInAct(() => ref.current!.maximize(`1`));
        callInAct(() => ref.current!.restore());
      }).not.toThrow();
    });
  });

  describe(`interaction while maximized`, () => {
    it(`Should not be draggable or resizable, and be again once restored`, () => {
      const { container, ref } = renderGrid(trio());
      expect(item(container, `1`).classList.contains(`kdl-grid-item--draggable`)).toBe(true);
      expect(item(container, `1`).querySelector(`.kdl-resize-hint--se`)).not.toBeNull();

      callInAct(() => ref.current!.maximize(`1`));
      expect(item(container, `1`).classList.contains(`kdl-grid-item--draggable`)).toBe(false);
      expect(item(container, `1`).querySelector(`.kdl-resize-hint--se`)).toBeNull();

      callInAct(() => ref.current!.restore());
      expect(item(container, `1`).classList.contains(`kdl-grid-item--draggable`)).toBe(true);
      expect(item(container, `1`).querySelector(`.kdl-resize-hint--se`)).not.toBeNull();
    });

    it(`Should not move from the keyboard while maximized`, () => {
      const onLayoutChange = vi.fn();
      const { container, ref } = renderGrid(trio(), { onLayoutChange });

      callInAct(() => ref.current!.maximize(`1`));
      fireEvent.keyDown(item(container, `1`), { key: `ArrowRight` });
      expect(onLayoutChange).not.toHaveBeenCalled();

      callInAct(() => ref.current!.restore());
      fireEvent.keyDown(item(container, `1`), { key: `ArrowRight` });
      expect(lastLayout(onLayoutChange).find(entry => entry.i === `1`)!.x).toBe(3);
    });

    it(`Should keep the close button while maximized`, () => {
      const onItemClose = vi.fn();
      const { container } = renderGrid(trio(), { maximizedItem: `1`, onItemClose, showCloseButton: true });

      const closeButton = item(container, `1`).querySelector(`.kdl-grid-item-close-button`) as HTMLElement;
      fireEvent.click(closeButton);

      expect(onItemClose).toHaveBeenCalledWith(`1`);
    });
  });

  describe(`the maximize button`, () => {
    it(`Should not render by default`, () => {
      const { container } = renderGrid(trio());

      expect(container.querySelector(`.btn-maximize`)).toBeNull();
    });

    it(`Should render on every item when the grid asks for it`, () => {
      const { container } = renderGrid(trio(), { showMaximizeButton: true });

      expect(container.querySelectorAll(`.btn-maximize`)).toHaveLength(3);
    });

    it(`Should let an item decide for itself, either way`, () => {
      const on = renderGrid(trio().map(entry => ({ ...entry, showMaximizeButton: true })));
      const onCount = on.container.querySelectorAll(`.btn-maximize`).length;
      on.unmount();
      const off = renderGrid(trio().map(entry => ({ ...entry, showMaximizeButton: false })), { showMaximizeButton: true });

      expect(onCount).toBe(3);
      expect(off.container.querySelector(`.btn-maximize`)).toBeNull();
    });

    it(`Should maximize its item when clicked, then restore it`, () => {
      const { container, ref } = renderGrid(trio(), { showMaximizeButton: true });

      fireEvent.click(item(container, `1`).querySelector(`.btn-maximize`) as HTMLElement);
      expect(ref.current!.maximizedItem).toBe(`1`);
      expect(isHidden(container, `0`)).toBe(true);

      fireEvent.click(item(container, `1`).querySelector(`.btn-maximize`) as HTMLElement);
      expect(ref.current!.maximizedItem).toBeNull();
      expect(isHidden(container, `0`)).toBe(false);
    });

    it(`Should label itself Maximize, and Restore while maximized`, () => {
      const { container, ref } = renderGrid(trio(), { showMaximizeButton: true });
      const label = (): string => item(container, `1`).querySelector(`.btn-maximize .kdl-visually-hidden`)!.textContent as string;
      expect(label()).toBe(`Maximize`);

      callInAct(() => ref.current!.maximize(`1`));

      expect(label()).toBe(`Restore`);
      expect(item(container, `1`).querySelector(`.btn-maximize`)!.classList.contains(`btn-maximize--active`)).toBe(true);
    });

    it(`Should take its labels from ariaLabels`, () => {
      const { container, ref } = renderGrid(trio(), { ariaLabels: { maximizeButton: `Vergroot`, restoreButton: `Herstel` }, showMaximizeButton: true });
      const label = (): string => item(container, `1`).querySelector(`.btn-maximize .kdl-visually-hidden`)!.textContent as string;
      expect(label()).toBe(`Vergroot`);

      callInAct(() => ref.current!.maximize(`1`));

      expect(label()).toBe(`Herstel`);
    });

    it(`Should work on a static item and with edit mode off`, () => {
      const layout: TLayout = [{ h: 2, i: `0`, isStatic: true, w: 2, x: 0, y: 0 }, { h: 2, i: `1`, w: 2, x: 2, y: 0 }];
      const { container, ref } = renderGrid(layout, { enableEditMode: false, showMaximizeButton: true });

      fireEvent.click(item(container, `0`).querySelector(`.btn-maximize`) as HTMLElement);

      expect(ref.current!.maximizedItem).toBe(`0`);
    });

    it(`Should not count as a click on the item`, () => {
      const { container, ref } = renderGrid(trio(), { multiSelect: true, showMaximizeButton: true });

      fireEvent.click(item(container, `1`).querySelector(`.btn-maximize`) as HTMLElement);

      expect(ref.current!.selectedItems).toHaveLength(0);
    });
  });

  describe(`as a controlled prop`, () => {
    const Controlled = ({ layout }: { layout: TLayout }): JSX.Element => {
      const [maximized, setMaximized] = useState<string | number | null>(null);
      return (
        <>
          <output data-testid="status">{String(maximized)}</output>
          <button data-testid="external" onClick={() => setMaximized(`2`)} type="button">Maximize 2</button>
          <GridLayout layout={layout} maximizedItem={maximized} onMaximizedItemChange={setMaximized} showMaximizeButton>
            {layout.map(entry => <GridItem key={entry.i} i={entry.i}>{`Item ${String(entry.i)}`}</GridItem>)}
          </GridLayout>
        </>
      );
    };

    it(`Should stay in step with the consumer's state, whichever side changes it`, () => {
      stubOffsetWidth(1200);
      stubClientHeight(500);
      const { container, getByTestId } = render(<Controlled layout={trio()} />);

      fireEvent.click(item(container, `1`).querySelector(`.btn-maximize`) as HTMLElement);
      expect(getByTestId(`status`).textContent).toBe(`1`);
      expect(isHidden(container, `0`)).toBe(true);

      fireEvent.click(getByTestId(`external`));
      expect(isHidden(container, `1`)).toBe(true);
      expect(isHidden(container, `2`)).toBe(false);

      fireEvent.keyDown(item(container, `2`), { key: `Escape` });
      expect(getByTestId(`status`).textContent).toBe(`null`);
      expect(isHidden(container, `2`)).toBe(false);
      expect(isHidden(container, `0`)).toBe(false);
    });
  });
});
