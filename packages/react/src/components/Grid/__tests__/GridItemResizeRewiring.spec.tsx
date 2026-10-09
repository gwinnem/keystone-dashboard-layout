import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { restoreOffsetWidth } from './test-helpers';

/**
 * Two gaps found by the React props e2e suite (`e2e/props-cascade.spec.ts`), pinned here at unit level:
 *
 *   1. An item that is not resizable when it mounts renders no resize-hint spans, so `useGridItemResize`'s wiring effect
 *      found nothing to attach to and bailed out. Becoming resizable later drew the spans but never re-ran the effect
 *      (its dependencies did not change), so the handles were present and inert. The engine stashes a test-only
 *      `__nativeResizeHandler` on the element once it is actually wired, which is what is asserted here.
 *   2. A static item must never show a close button, whatever is configured — the Vue package's own rule.
 */

const entry = (overrides: Partial<TLayout[number]> = {}): TLayout[number] => ({ h: 2, i: `0`, w: 2, x: 0, y: 0, ...overrides });

const wiredResizeHandler = (container: HTMLElement): unknown =>
  (container.querySelector(`.kdl-grid-item`) as unknown as { __nativeResizeHandler?: unknown }).__nativeResizeHandler;

describe(`GridItem — resize engine is wired when an item becomes resizable after mount`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should not be wired while the grid's isResizable is false, and wire once the item overrides it to true`, () => {
    const { container, rerender } = render(
      <GridLayout isResizable={false} layout={[entry()]}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );
    expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(0);
    expect(wiredResizeHandler(container)).toBeUndefined();

    rerender(
      <GridLayout isResizable={false} layout={[entry({ isResizable: true })]}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(8);
    expect(typeof wiredResizeHandler(container)).toBe(`function`);
  });

  it(`Should wire once an item that mounted static stops being static`, () => {
    const { container, rerender } = render(
      <GridLayout layout={[entry({ isStatic: true })]}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );
    expect(wiredResizeHandler(container)).toBeUndefined();

    rerender(
      <GridLayout layout={[entry({ isStatic: false })]}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(typeof wiredResizeHandler(container)).toBe(`function`);
  });

  it(`Should stop being wired again once the item becomes non-resizable`, () => {
    const { container, rerender } = render(
      <GridLayout layout={[entry()]}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );
    expect(typeof wiredResizeHandler(container)).toBe(`function`);

    rerender(
      <GridLayout layout={[entry({ isResizable: false })]}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(0);
  });
});

describe(`GridItem — a static item never shows a close button`, () => {
  it(`Should show a close button on a non-static item when showCloseButton is on`, () => {
    const { container } = render(
      <GridLayout layout={[entry()]} showCloseButton>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelectorAll(`.kdl-grid-item-close-button`)).toHaveLength(1);
  });

  it(`Should show none on a static item, even with showCloseButton on grid-wide`, () => {
    const { container } = render(
      <GridLayout layout={[entry({ isStatic: true })]} showCloseButton>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelectorAll(`.kdl-grid-item-close-button`)).toHaveLength(0);
  });

  it(`Should show none on a static item, even when the item itself asks for one`, () => {
    const { container } = render(
      <GridLayout layout={[entry({ isStatic: true, showCloseButton: true })]}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelectorAll(`.kdl-grid-item-close-button`)).toHaveLength(0);
  });
});
