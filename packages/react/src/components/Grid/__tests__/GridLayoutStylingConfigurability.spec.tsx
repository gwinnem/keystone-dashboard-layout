import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

afterEach(() => {
  restoreOffsetWidth();
});

describe(`GridLayout transitionDurationMs/transitionTimingFunction`, () => {
  it(`Should apply the default 200ms/ease as CSS custom properties on the root when unset`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    expect(root.style.getPropertyValue(`--kdl-transition-duration`)).toBe(`200ms`);
    expect(root.style.getPropertyValue(`--kdl-transition-timing`)).toBe(`ease`);
  });

  it(`Should apply a custom transitionDurationMs/transitionTimingFunction`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()} transitionDurationMs={500} transitionTimingFunction="linear">
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    expect(root.style.getPropertyValue(`--kdl-transition-duration`)).toBe(`500ms`);
    expect(root.style.getPropertyValue(`--kdl-transition-timing`)).toBe(`linear`);
  });
});

describe(`GridItem borderRadiusPx/useBorderRadius`, () => {
  it(`Should not apply a border radius by default (useBorderRadius off)`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.borderRadius).toBe(``);
  });

  it(`Should apply the default 10px border radius when useBorderRadius is on grid-wide`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()} useBorderRadius>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.borderRadius).toBe(`10px`);
  });

  it(`Should apply a custom grid-wide borderRadiusPx`, () => {
    const { container } = render(
      <GridLayout borderRadiusPx={24} layout={basicLayout()} useBorderRadius>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.borderRadius).toBe(`24px`);
  });

  it(`Should let a per-item useBorderRadius override the grid-wide default in either direction`, () => {
    const layout: TLayout = [
      { h: 2, i: `0`, useBorderRadius: false, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, useBorderRadius: true, w: 2, x: 2, y: 0 },
    ];
    const { container } = render(
      <GridLayout layout={layout} useBorderRadius={false}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const items = container.querySelectorAll(`.kdl-grid-item`);
    expect((items[0] as HTMLElement).style.borderRadius).toBe(``);
    expect((items[1] as HTMLElement).style.borderRadius).toBe(`10px`);
  });

  it(`Should let a per-item borderRadiusPx override the grid-wide value`, () => {
    const layout: TLayout = [{ borderRadiusPx: 4, h: 2, i: `0`, useBorderRadius: true, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout borderRadiusPx={10} layout={layout}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.borderRadius).toBe(`4px`);
  });
});

describe(`GridLayout minW-driven container width expansion`, () => {
  it(`Should apply overflowX: auto on the root when an item's own minW pushes effectiveContainerWidth past the real measured width — confirmed gap via a fresh coverage report`, () => {
    // needsHorizontalScroll ("effectiveContainerWidth > containerWidth")
    // — no existing test in this package specifically asserts the root
    // element's own overflowX style value under this condition, only
    // effectiveContainerWidth's own downstream effects elsewhere (item
    // pixel width, etc). A narrow measured container (100px) combined
    // with a large minW (10, at the default rowHeight:150 floors to
    // 10*150+9*10=1590px) reliably triggers the expansion.
    stubOffsetWidth(100);
    const layout: TLayout = [{ h: 2, i: `0`, minW: 10, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    expect(root.style.overflowX).toBe(`auto`);
  });

  it(`Should fall back to a plain 'auto' height on the inner width-wrapper when containerHeight itself is undefined (heightMode: 'fixed') — confirmed gap via a fresh coverage report`, () => {
    // The inner width-wrapper's own "containerHeight ?? 'auto'" style
    // fallback — only reachable when needsWidthWrapper is true (same
    // minW-driven expansion as the test above) *and* containerHeight
    // itself resolves to undefined, which only happens for
    // heightMode: 'fixed' (the default 'auto' mode always computes a
    // real pixel value instead).
    stubOffsetWidth(100);
    const layout: TLayout = [{ h: 2, i: `0`, minW: 10, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout heightMode="fixed" layout={layout}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    expect(root.style.height).toBe(``);
    const wrapper = root.firstElementChild as HTMLElement;
    expect(wrapper.style.height).toBe(`auto`);
  });
});
