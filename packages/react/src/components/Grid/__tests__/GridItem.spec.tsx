import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, dispatchResizeEvent, restoreOffsetWidth } from './test-helpers';

const basicLayout = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 2, y: 0 },
];

describe(`GridItem`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should render its own children`, () => {
    const { getByText } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    expect(getByText(`Item 0`)).toBeTruthy();
    expect(getByText(`Item 1`)).toBeTruthy();
  });

  it(`Should throw when no matching layout entry exists for its own "i"`, () => {
    // Swallow the expected console.error React logs for an uncaught
    // render error, so this test's own output stays clean — the thrown
    // error itself is what's under test, not whether it's logged.
    const consoleErrorSpy = vi.spyOn(console, `error`).mockImplementation(() => {});

    expect(() => render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="does-not-exist">Ghost</GridItem>
      </GridLayout>,
    )).toThrow(/no layout entry found/);

    consoleErrorSpy.mockRestore();
  });

  it(`Should throw when rendered outside a GridLayout`, () => {
    const consoleErrorSpy = vi.spyOn(console, `error`).mockImplementation(() => {});

    expect(() => render(<GridItem i="0">Orphan</GridItem>)).toThrow(/must be rendered inside a GridLayout/);

    consoleErrorSpy.mockRestore();
  });

  it(`Should position itself via a CSS transform by default (useCssTransforms)`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.transform).toContain(`translate3d`);
    expect(item.style.position).toBe(`absolute`);
  });

  it(`Should position itself via top/left instead when useCssTransforms is false`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100} useCssTransforms={false}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.transform).toBe(``);
    expect(item.style.top).not.toBe(``);
    expect(item.style.left).not.toBe(``);
  });

  it(`Should apply the vue-equivalent draggable/static classes based on its own layout entry`, () => {
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, isStatic: true, w: 2, x: 4, y: 0 },
    ];
    const { container } = render(
      <GridLayout layout={layout}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const items = container.querySelectorAll(`.kdl-grid-item`);
    expect(items[0].classList.contains(`kdl-grid-item--draggable`)).toBe(true);
    expect(items[1].classList.contains(`kdl-grid-item--static`)).toBe(true);
    expect(items[1].classList.contains(`kdl-grid-item--draggable`)).toBe(false);
  });

  it(`Should render all 8 resize-hint spans when resizable`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const hints = container.querySelectorAll(`.kdl-resize-hint`);
    expect(hints).toHaveLength(8);
  });

  it(`Should render no resize-hint spans when the item is static`, () => {
    const layout: TLayout = [{ h: 2, i: `0`, isStatic: true, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(0);
  });

  describe(`dragging`, () => {
    it(`Should report a moved position and add the dragging class while a drag is in progress`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });

      expect(target.classList.contains(`kdl-grid-item--dragging`)).toBe(true);
    });

    it(`Should call onLayoutChange with the item's new grid position on dragend`, () => {
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });
      dispatchDragEvent(target, `dragend`, { clientX: 300, clientY: 0 });

      expect(handleChange).toHaveBeenCalled();
      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      const movedItem = lastCall.find(entry => entry.i === `0`);
      expect(movedItem?.x).toBeGreaterThan(0);
    });

    it(`Should not start a drag for a static item`, () => {
      const layout: TLayout = [{ h: 2, i: `0`, isStatic: true, w: 2, x: 0, y: 0 }];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={layout} onLayoutChange={handleChange}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      // The native engine itself gates on `enabled` via its own
      // getOptions() callback — calling the handler directly still
      // bypasses that gate, the same limitation Vue's own equivalent
      // tests have; what's actually verified here is that the real,
      // wired-up pointerdown listener never invokes the handler at all
      // for a static item, confirmed indirectly by dispatching a real
      // PointerEvent sequence instead of the backdoor for this one case.
      target.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      target.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 50, clientY: 50, pointerId: 1 }));
      target.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 50, clientY: 50, pointerId: 1 }));

      expect(handleChange).not.toHaveBeenCalled();
    });

    it(`Should clamp a bounded drag within the container`, () => {
      const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={3} isBounded layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 5000, clientY: 5000 });
      dispatchDragEvent(target, `dragend`, { clientX: 5000, clientY: 5000 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      const movedItem = lastCall.find(entry => entry.i === `0`);
      // Still fully within the 3-column container, not dragged off the edge.
      expect(movedItem!.x).toBeLessThanOrEqual(1);
    });

    it(`Should no-op (not throw) on an unrecognized drag event type (defensive default case)`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      const handler = (target as unknown as { __nativeDragHandler: (event: unknown) => void }).__nativeDragHandler;

      expect(() => act(() => {
        handler({ clientX: 0, clientY: 0, target, type: `bogus` });
      })).not.toThrow();
    });

    it(`Should not throw when dragend arrives without a matching dragstart`, () => {
      // A dragend with no preceding dragstart in this same gesture —
      // draggingRef.current is still undefined at that point — should
      // no-op cleanly rather than computing a position from nothing.
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={basicLayout()} onLayoutChange={handleChange}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;

      expect(() => dispatchDragEvent(target, `dragend`)).not.toThrow();
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe(`resizing`, () => {
    it(`Should add the resizing class while a resize is in progress`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);

      expect(target.classList.contains(`kdl-grid-item--resizing`)).toBe(true);
    });

    it(`Should call onLayoutChange with the grown size on resizeend`, () => {
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: 0 });
      dispatchResizeEvent(target, `resizeend`, { clientX: 200, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      const resizedItem = lastCall.find(entry => entry.i === `0`);
      expect(resizedItem!.w).toBeGreaterThan(2);
    });

    it(`Should clamp the resized width to maxW`, () => {
      const layout: TLayout = [{ h: 2, i: `0`, maxW: 3, w: 2, x: 0, y: 0 }];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: 5000, clientY: 0 });
      dispatchResizeEvent(target, `resizeend`, { clientX: 5000, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `0`)!.w).toBe(3);
    });

    it(`Should clamp the resized width to minW when shrinking`, () => {
      const layout: TLayout = [{ h: 4, i: `0`, minW: 2, w: 4, x: 0, y: 0 }];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: -5000, clientY: 0 });
      dispatchResizeEvent(target, `resizeend`, { clientX: -5000, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `0`)!.w).toBe(2);
    });

    it(`Should clamp the resized height to maxH`, () => {
      const layout: TLayout = [{ h: 2, i: `0`, maxH: 3, w: 2, x: 0, y: 0 }];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: 5000 });
      dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: 5000 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `0`)!.h).toBe(3);
    });

    it(`Should clamp the resized height to minH when shrinking`, () => {
      const layout: TLayout = [{ h: 4, i: `0`, minH: 2, w: 2, x: 0, y: 0 }];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: -5000 });
      dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: -5000 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `0`)!.h).toBe(2);
    });

    it(`Should floor the resized size at 1, even when minW/minH are explicitly set below it`, () => {
      // minW/minH default to 1 when unset, so the earlier minW/minH
      // clamp above would already stop a shrink at exactly 1 in the
      // common case — never separately exercising this absolute floor.
      // Setting minW/minH to 0 here (unusual, but a valid value a
      // consumer's own layout data could set) lets the floor genuinely
      // trigger independently of the minW/minH clamp.
      const layout: TLayout = [{ h: 4, i: `0`, minH: 0, minW: 0, w: 4, x: 0, y: 0 }];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: -5000, clientY: -5000 });
      dispatchResizeEvent(target, `resizeend`, { clientX: -5000, clientY: -5000 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      const resized = lastCall.find(entry => entry.i === `0`)!;
      expect(resized.w).toBe(1);
      expect(resized.h).toBe(1);
    });

    it(`Should move the item's own x when resizing from the left edge`, () => {
      const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 4, y: 4 }];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      const leftOnly = { bottom: false, left: true, right: false, top: false };
      dispatchResizeEvent(target, `resizestart`, { edges: leftOnly });
      dispatchResizeEvent(target, `resizemove`, { clientX: -150, clientY: 0, edges: leftOnly });
      dispatchResizeEvent(target, `resizeend`, { clientX: -150, clientY: 0, edges: leftOnly });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      const resized = lastCall.find(entry => entry.i === `0`)!;
      expect(resized.w).toBeGreaterThan(2);
      expect(resized.x).toBeLessThan(4);
    });

    it(`Should move the item's own y when resizing from the top edge`, () => {
      const layout: TLayout = [{ h: 4, i: `0`, w: 2, x: 4, y: 4 }];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      const topOnly = { bottom: false, left: false, right: false, top: true };
      dispatchResizeEvent(target, `resizestart`, { edges: topOnly });
      dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: -150, edges: topOnly });
      dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: -150, edges: topOnly });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      const resized = lastCall.find(entry => entry.i === `0`)!;
      expect(resized.h).toBeGreaterThan(4);
      expect(resized.y).toBeLessThan(4);
    });

    it(`Should no-op (not throw) on an unrecognized resize event type (defensive default case)`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      const handler = (target as unknown as { __nativeResizeHandler: (event: unknown) => void }).__nativeResizeHandler;

      expect(() => act(() => {
        handler({
          clientX: 0,
          clientY: 0,
          edges: { bottom: true, left: false, right: true, top: false },
          target,
          type: `bogus`,
        });
      })).not.toThrow();
    });

    it(`Should resize via a real pointerdown/move/up sequence on an actual resize handle (exercising the native engine's own getOptions callback, not just the backdoor)`, () => {
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const seHandle = container.querySelector(`.kdl-resize-hint--se`) as HTMLElement;
      seHandle.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      seHandle.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));
      seHandle.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe(`unmount`, () => {
    it(`Should tear down the native drag/resize engines without throwing`, () => {
      const { container, unmount } = render(
        <GridLayout layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);

      expect(() => unmount()).not.toThrow();
    });
  });

  describe(`zIndex`, () => {
    it(`Should not set an inline z-index when the item's own zIndex is unset`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      expect(item.style.zIndex).toBe(``);
    });

    it(`Should apply the item's own explicit zIndex as an inline style, winning over the static/dragging/resizing CSS-class defaults`, () => {
      const layout: TLayout = [{ h: 2, i: `0`, isStatic: true, w: 2, x: 0, y: 0, zIndex: 42 }];
      const { container } = render(
        <GridLayout layout={layout}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      expect(item.style.zIndex).toBe(`42`);
    });

    it(`Should treat an explicit zIndex of 0 as a real override, not "unset"`, () => {
      const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0, zIndex: 0 }];
      const { container } = render(
        <GridLayout layout={layout}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
      expect(item.style.zIndex).toBe(`0`);
    });
  });

  describe(`showCloseButton`, () => {
    it(`Should not render a close button by default`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      expect(container.querySelector(`.kdl-grid-item-close-button`)).toBeFalsy();
    });

    it(`Should render a close button when the grid-wide default is on`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()} showCloseButton>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      expect(container.querySelectorAll(`.kdl-grid-item-close-button`)).toHaveLength(2);
    });

    it(`Should let a per-item showCloseButton override the grid-wide default in either direction`, () => {
      const layout: TLayout = [
        { h: 2, i: `0`, showCloseButton: false, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, showCloseButton: true, w: 2, x: 2, y: 0 },
      ];
      const { container } = render(
        <GridLayout layout={layout} showCloseButton={false}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      expect(container.querySelectorAll(`.kdl-grid-item-close-button`)).toHaveLength(1);
    });

    it(`Should call onItemClose with the item's own id when clicked, without removing anything itself`, () => {
      const handleClose = vi.fn();
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={basicLayout()} onItemClose={handleClose} onLayoutChange={handleChange} showCloseButton>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      const closeButton = container.querySelector(`[data-grid-item-id="0"] .kdl-grid-item-close-button`) as HTMLButtonElement;
      closeButton.click();

      expect(handleClose).toHaveBeenCalledWith(`0`);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it(`Should not throw when clicked with no onItemClose handler provided`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()} showCloseButton>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const closeButton = container.querySelector(`.kdl-grid-item-close-button`) as HTMLButtonElement;
      expect(() => closeButton.click()).not.toThrow();
    });
  });
});
