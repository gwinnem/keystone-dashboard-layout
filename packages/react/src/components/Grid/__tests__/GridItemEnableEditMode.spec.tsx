import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';

const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 5, y: 5 }];

describe(`GridLayout/GridItem enableEditMode`, () => {
  it(`Should not render as draggable/resizable/closable when enableEditMode is off grid-wide, even with isDraggable/isResizable/showCloseButton all true`, () => {
    const { container } = render(
      <GridLayout enableEditMode={false} isDraggable isResizable layout={basicLayout()} showCloseButton>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.classList.contains(`kdl-grid-item--draggable`)).toBe(false);
    expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(0);
    expect(container.querySelector(`.kdl-grid-item-close-button`)).toBeFalsy();
    expect(item.tabIndex).toBe(-1);
  });

  it(`Should not block anything when enableEditMode is on (the default)`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()} showCloseButton>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.classList.contains(`kdl-grid-item--draggable`)).toBe(true);
    expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(8);
    expect(container.querySelector(`.kdl-grid-item-close-button`)).toBeTruthy();
  });

  it(`Should let a per-item enableEditMode: false override a grid-wide true`, () => {
    const layout: TLayout = [{ enableEditMode: false, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} showCloseButton>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.classList.contains(`kdl-grid-item--draggable`)).toBe(false);
    expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(0);
    expect(container.querySelector(`.kdl-grid-item-close-button`)).toBeFalsy();
  });

  it(`Should let a per-item enableEditMode: true override a grid-wide false (unlock one panel in an otherwise view-only dashboard)`, () => {
    const layout: TLayout = [{ enableEditMode: true, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout enableEditMode={false} layout={layout} showCloseButton>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.classList.contains(`kdl-grid-item--draggable`)).toBe(true);
    expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(8);
    expect(container.querySelector(`.kdl-grid-item-close-button`)).toBeTruthy();
  });

  it(`Should also block keyboard arrow-key move/resize when enableEditMode is off`, () => {
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout enableEditMode={false} layout={basicLayout()} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    fireEvent.keyDown(target, { key: `ArrowRight` });
    fireEvent.keyDown(target, { key: `ArrowRight`, shiftKey: true });

    expect(handleChange).not.toHaveBeenCalled();
  });
});
