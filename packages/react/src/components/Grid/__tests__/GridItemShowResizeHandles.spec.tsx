import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';

const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

describe(`GridLayout/GridItem showResizeHandles/resizeHandleColor`, () => {
  it(`Should not render the visible-handle class by default (off)`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.classList.contains(`kdl-grid-item--show-resize-handles`)).toBe(false);
    expect(item.style.getPropertyValue(`--kdl-resize-handle-color`)).toBe(``);
  });

  it(`Should render the visible-handle class and default color when turned on grid-wide`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()} showResizeHandles>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.classList.contains(`kdl-grid-item--show-resize-handles`)).toBe(true);
    expect(item.style.getPropertyValue(`--kdl-resize-handle-color`)).toBe(`rgb(94 94 94 / 45%)`);
  });

  it(`Should apply a custom grid-wide resizeHandleColor`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()} resizeHandleColor="rgb(255 0 0 / 80%)" showResizeHandles>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.getPropertyValue(`--kdl-resize-handle-color`)).toBe(`rgb(255 0 0 / 80%)`);
  });

  it(`Should let a per-item showResizeHandles override the grid-wide default in either direction`, () => {
    const layout: TLayout = [
      { h: 2, i: `0`, showResizeHandles: false, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, showResizeHandles: true, w: 2, x: 2, y: 0 },
    ];
    const { container } = render(
      <GridLayout layout={layout} showResizeHandles={false}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const items = container.querySelectorAll(`.kdl-grid-item`);
    expect((items[0] as HTMLElement).classList.contains(`kdl-grid-item--show-resize-handles`)).toBe(false);
    expect((items[1] as HTMLElement).classList.contains(`kdl-grid-item--show-resize-handles`)).toBe(true);
  });

  it(`Should let a per-item resizeHandleColor override the grid-wide value`, () => {
    const layout: TLayout = [{ h: 2, i: `0`, resizeHandleColor: `blue`, showResizeHandles: true, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} resizeHandleColor="red">
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.getPropertyValue(`--kdl-resize-handle-color`)).toBe(`blue`);
  });

  it(`Should not render the resize-handle-color custom property at all when showResizeHandles resolves to false, even with a custom color set`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()} resizeHandleColor="blue" showResizeHandles={false}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.getPropertyValue(`--kdl-resize-handle-color`)).toBe(``);
  });
});
