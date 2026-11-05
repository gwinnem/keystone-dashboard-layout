import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { topLeftStrategy, transformStrategy } from 'keystone-dashboard-layout-core';
import type { IPositionStrategy, TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';

const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

/** Puts every item at a fixed, recognisable spot so a test can tell this strategy's style from the built-in ones. */
const markerStrategy: IPositionStrategy = {
  className: `my-position`,
  getStyle: ({ width, height }) => ({ height: `${height}px`, left: `7px`, position: `absolute`, top: `9px`, width: `${width}px` }),
  type: `marker`,
};

const renderItem = (props: { positionStrategy?: IPositionStrategy | null; useCssTransforms?: boolean; isMirrored?: boolean }): HTMLElement => {
  const { container } = render(
    <GridLayout layout={basicLayout()} {...props}>
      <GridItem i="0">Item 0</GridItem>
    </GridLayout>,
  );
  return container.querySelector(`.kdl-grid-item`) as HTMLElement;
};

describe(`GridLayout positionStrategy`, () => {
  it(`Should position with CSS transforms by default, with no extra class`, () => {
    const item = renderItem({});

    expect(item.style.transform).toContain(`translate3d`);
    expect(item.classList.contains(`css-transforms`)).toBe(false);
  });

  it(`Should keep using useCssTransforms: false when no strategy is given`, () => {
    const item = renderItem({ useCssTransforms: false });

    expect(item.style.transform).toBe(``);
    expect(item.style.top).not.toBe(``);
  });

  it(`Should use a custom strategy's style and class`, () => {
    const item = renderItem({ positionStrategy: markerStrategy });

    expect(item.classList.contains(`my-position`)).toBe(true);
    expect(item.style.left).toBe(`7px`);
    expect(item.style.top).toBe(`9px`);
    expect(item.style.transform).toBe(``);
  });

  it(`Should let positionStrategy win over useCssTransforms`, () => {
    const item = renderItem({ positionStrategy: topLeftStrategy, useCssTransforms: true });

    expect(item.style.transform).toBe(``);
    expect(item.style.top).not.toBe(``);
  });

  it(`Should add no class for a strategy that does not ask for one`, () => {
    const item = renderItem({ positionStrategy: { ...markerStrategy, className: undefined } });

    expect(item.classList.contains(`my-position`)).toBe(false);
  });

  it(`Should restyle items when the strategy changes after mount`, () => {
    const { container, rerender } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );
    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.transform).toContain(`translate3d`);

    rerender(
      <GridLayout layout={basicLayout()} positionStrategy={markerStrategy}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );
    expect(item.style.left).toBe(`7px`);
    expect(item.classList.contains(`my-position`)).toBe(true);

    rerender(
      <GridLayout layout={basicLayout()} positionStrategy={null}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );
    expect(item.style.transform).toContain(`translate3d`);
    expect(item.classList.contains(`my-position`)).toBe(false);
  });

  it(`Should pass rtl and the right anchor to the strategy when the grid is mirrored`, () => {
    const seen: Parameters<IPositionStrategy['getStyle']>[0][] = [];
    const spy: IPositionStrategy = {
      getStyle: input => {
        seen.push(input);
        return transformStrategy.getStyle(input);
      },
      type: `spy`,
    };
    renderItem({ isMirrored: true, positionStrategy: spy });

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(input => input.rtl && typeof input.right === `number` && input.left === undefined)).toBe(true);
  });
});
