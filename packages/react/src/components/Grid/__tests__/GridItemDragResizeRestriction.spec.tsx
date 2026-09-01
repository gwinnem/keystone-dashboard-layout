import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';

const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

/**
 * jsdom's own `offsetParent` is `null` by default (no real layout
 * engine) — `useGridItemDrag.ts`'s own `dragstart` case reads
 * `target.offsetParent.getBoundingClientRect()` unconditionally (`target`
 * here is always the item's own root, per `native-interaction.ts`'s own
 * `onEvent({ ..., target: el, ... })`, regardless of which descendant
 * the pointerdown actually landed on), so a real drag reaching that
 * line throws without this stub. The `dispatchDragEvent` backdoor
 * helper in `test-helpers.ts` already does the same stubbing — needed
 * again here since these tests dispatch real `PointerEvent`s instead
 * of using that backdoor (see this file's own module doc comment for
 * why).
 */
function stubItemRootForDrag(itemRoot: HTMLElement): void {
  Object.defineProperty(itemRoot, `offsetParent`, { configurable: true, value: document.body });
}

/**
 * These tests dispatch *real* `PointerEvent` sequences throughout,
 * never the `__nativeDragHandler`/`__nativeResizeHandler` backdoor
 * `dispatchDragEvent`/`dispatchResizeEvent` (in `test-helpers.ts`) use
 * elsewhere in this suite — that backdoor calls the drag/resize
 * *callback* directly, bypassing the real `onPointerDown` listener
 * entirely, which is exactly where `passesDragFilters`/
 * `resolveActivationDistance` (in `core`'s own `native-interaction.ts`)
 * run. `dragAllowFrom`/`dragIgnoreFrom`/`resizeIgnoreFrom`/
 * `dragActivationDistance` are only exercisable through that real path.
 */
describe(`GridItem dragAllowFrom/dragIgnoreFrom/resizeIgnoreFrom/dragActivationDistance`, () => {
  it(`Should not start a drag when clicking a <button> inside the item's own children (the default dragIgnoreFrom)`, () => {
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} onLayoutChange={handleChange}>
        <GridItem i="0">
          <button type="button">Click me</button>
        </GridItem>
      </GridLayout>,
    );
    stubItemRootForDrag(container.querySelector(`.kdl-grid-item`) as HTMLElement);

    const button = container.querySelector(`button`) as HTMLElement;
    button.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
    button.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));
    button.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should not start a drag when clicking an <a> inside the item's own children either`, () => {
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} onLayoutChange={handleChange}>
        <GridItem i="0">
          <a href="#test">A link</a>
        </GridItem>
      </GridLayout>,
    );
    stubItemRootForDrag(container.querySelector(`.kdl-grid-item`) as HTMLElement);

    const link = container.querySelector(`a`) as HTMLElement;
    link.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
    link.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));
    link.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should still start a drag from elsewhere on the item, with the default dragIgnoreFrom in effect`, () => {
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} onLayoutChange={handleChange}>
        <GridItem i="0">
          <span>Plain text</span>
          <button type="button">Click me</button>
        </GridItem>
      </GridLayout>,
    );
    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    stubItemRootForDrag(item);

    item.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
    item.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));
    item.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));

    expect(handleChange).toHaveBeenCalled();
  });

  it(`Should allow dragging from a <button> when dragIgnoreFrom is explicitly cleared to an empty string`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [{ dragIgnoreFrom: ``, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">
          <button type="button">Click me</button>
        </GridItem>
      </GridLayout>,
    );
    stubItemRootForDrag(container.querySelector(`.kdl-grid-item`) as HTMLElement);

    const button = container.querySelector(`button`) as HTMLElement;
    button.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
    button.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));
    button.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));

    expect(handleChange).toHaveBeenCalled();
  });

  it(`Should only allow starting a drag from an element matching dragAllowFrom`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [{ dragAllowFrom: `.drag-handle`, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">
          <span className="drag-handle">Handle</span>
          <span className="other-content">Not a handle</span>
        </GridItem>
      </GridLayout>,
    );
    stubItemRootForDrag(container.querySelector(`.kdl-grid-item`) as HTMLElement);

    const otherContent = container.querySelector(`.other-content`) as HTMLElement;
    otherContent.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
    otherContent.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));
    otherContent.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));
    expect(handleChange).not.toHaveBeenCalled();

    const handle = container.querySelector(`.drag-handle`) as HTMLElement;
    handle.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 2 }));
    handle.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 2 }));
    handle.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 2 }));
    expect(handleChange).toHaveBeenCalled();
  });

  it(`Should not start a resize when clicking custom renderResizeHandle content matching resizeIgnoreFrom`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [{ h: 2, i: `0`, resizeIgnoreFrom: `.resize-icon`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0" renderResizeHandle={() => <span className="resize-icon">icon</span>}>
          Item 0
        </GridItem>
      </GridLayout>,
    );

    const icon = container.querySelector(`.resize-icon`) as HTMLElement;
    icon.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
    icon.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));
    icon.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should still resize from the same handle when resizeIgnoreFrom doesn't match the click target`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [{ h: 2, i: `0`, resizeIgnoreFrom: `.resize-icon`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0" renderResizeHandle={() => <span className="resize-icon">icon</span>}>
          Item 0
        </GridItem>
      </GridLayout>,
    );

    // Clicking the handle span itself (not its own child icon) should
    // still work — the exclusion only applies to elements actually
    // matching `resizeIgnoreFrom`.
    const seHandle = container.querySelector(`.kdl-resize-hint--se`) as HTMLElement;
    seHandle.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
    seHandle.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));
    seHandle.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));

    expect(handleChange).toHaveBeenCalled();
  });

  it(`Should require dragActivationDistance's own threshold before starting a drag`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [{ dragActivationDistance: 20, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );
    stubItemRootForDrag(container.querySelector(`.kdl-grid-item`) as HTMLElement);

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    item.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
    // Only 10px — below the 20px threshold, shouldn't have started a drag yet.
    item.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 10, clientY: 0, pointerId: 1 }));
    item.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 10, clientY: 0, pointerId: 1 }));

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should start a drag once movement exceeds dragActivationDistance's own threshold`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [{ dragActivationDistance: 20, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );
    stubItemRootForDrag(container.querySelector(`.kdl-grid-item`) as HTMLElement);

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    item.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
    item.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 30, clientY: 0, pointerId: 1 }));
    item.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 30, clientY: 0, pointerId: 1 }));

    expect(handleChange).toHaveBeenCalled();
  });

  it(`Should fall back to the 3px default for a pointer type left unset in the object form of dragActivationDistance`, () => {
    const handleChange = vi.fn();
    // Only `touch` is customized — `mouse` should still use the 3px
    // default, not 0 (which would make every mouse movement start a
    // drag instantly) and not touch's own 8px.
    const layout: TLayout = [{ dragActivationDistance: { touch: 8 }, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );
    stubItemRootForDrag(container.querySelector(`.kdl-grid-item`) as HTMLElement);

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    item.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1, pointerType: `mouse` }));
    // 5px — exceeds the 3px default, but well under touch's own 8px,
    // confirming this movement is judged against the *mouse* default,
    // not silently inheriting touch's own configured value.
    item.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 5, clientY: 0, pointerId: 1, pointerType: `mouse` }));
    item.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 5, clientY: 0, pointerId: 1, pointerType: `mouse` }));

    expect(handleChange).toHaveBeenCalled();
  });
});
