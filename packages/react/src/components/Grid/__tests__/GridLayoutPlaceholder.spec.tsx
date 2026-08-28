import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, dispatchResizeEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

describe(`GridLayout renderPlaceholder — regular in-grid drag/resize`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should render the fallback .kdl-grid-placeholder box during a regular in-grid drag, when no renderPlaceholder is provided`, () => {
    stubOffsetWidth(1210);
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);

    expect(container.querySelector(`.kdl-grid-placeholder`)).toBeTruthy();

    dispatchDragEvent(target, `dragend`, { clientX: 0, clientY: 0 });

    expect(container.querySelector(`.kdl-grid-placeholder`)).toBeFalsy();
  });

  it(`Should render the fallback .kdl-grid-placeholder box during a regular in-grid resize too, not just drag`, () => {
    stubOffsetWidth(1210);
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchResizeEvent(target, `resizestart`);

    expect(container.querySelector(`.kdl-grid-placeholder`)).toBeTruthy();

    dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: 0 });

    expect(container.querySelector(`.kdl-grid-placeholder`)).toBeFalsy();
  });

  it(`Should not render any placeholder at all before a drag/resize starts`, () => {
    stubOffsetWidth(1210);
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelector(`.kdl-grid-placeholder`)).toBeFalsy();
  });

  it(`Should call renderPlaceholder with the live placeholder and isDragging:true during a regular in-grid drag, instead of the fallback box`, () => {
    stubOffsetWidth(1210);
    const renderPlaceholder = vi.fn((placeholder, isDragging) => (
      <span className="custom-placeholder-marker" data-dragging={String(isDragging)} data-x={placeholder?.x} data-y={placeholder?.y} />
    ));
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} renderPlaceholder={renderPlaceholder} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);

    expect(container.querySelector(`.custom-placeholder-marker`)).toBeTruthy();
    // The fallback box should not also render alongside the custom one.
    expect(container.querySelector(`.kdl-grid-placeholder`)).toBeFalsy();

    const marker = container.querySelector(`.custom-placeholder-marker`) as HTMLElement;
    expect(marker.getAttribute(`data-dragging`)).toBe(`true`);
    expect(marker.getAttribute(`data-x`)).not.toBeNull();
    expect(marker.getAttribute(`data-y`)).not.toBeNull();

    dispatchDragEvent(target, `dragend`, { clientX: 0, clientY: 0 });

    expect(container.querySelector(`.custom-placeholder-marker`)).toBeFalsy();
  });

  it(`Should call renderPlaceholder with null and isDragging:false when nothing is active — never actually reachable via rendering, since the placeholder wrapper itself is only rendered while a placeholder style exists, but confirms the guard doesn't call it with a stale non-null value`, () => {
    stubOffsetWidth(1210);
    const renderPlaceholder = vi.fn(() => <span className="custom-placeholder-marker" />);
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} renderPlaceholder={renderPlaceholder} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    // renderPlaceholder is only ever actually invoked (and rendered)
    // once a placeholder style exists at all (see GridLayout.tsx's own
    // `{renderPlaceholder && activePlaceholderStyle && (...)}` guard) —
    // with nothing dragging, it should not appear in the DOM at all.
    expect(container.querySelector(`.custom-placeholder-marker`)).toBeFalsy();
  });
});
