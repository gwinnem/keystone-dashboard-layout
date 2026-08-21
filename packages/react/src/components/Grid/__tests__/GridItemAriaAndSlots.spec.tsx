import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';

const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

describe(`GridItem ariaLabels`, () => {
  it(`Should use the built-in English default for the close button when nothing is overridden`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()} showCloseButton>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelector(`.kdl-grid-item-close-button`)!.getAttribute(`aria-label`)).toBe(`Close`);
  });

  it(`Should use a grid-wide ariaLabels override for the close button`, () => {
    const { container } = render(
      <GridLayout ariaLabels={{ closeButton: `Dismiss widget` }} layout={basicLayout()} showCloseButton>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelector(`.kdl-grid-item-close-button`)!.getAttribute(`aria-label`)).toBe(`Dismiss widget`);
  });

  it(`Should let a per-item ariaLabels override win over the grid-wide one`, () => {
    const layout: TLayout = [{ ariaLabels: { closeButton: `Remove this specific widget` }, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout ariaLabels={{ closeButton: `Dismiss widget` }} layout={layout} showCloseButton>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelector(`.kdl-grid-item-close-button`)!.getAttribute(`aria-label`)).toBe(`Remove this specific widget`);
  });

  it(`Should use the built-in default aria-roledescription for a draggable/resizable item`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelector(`.kdl-grid-item`)!.getAttribute(`aria-roledescription`)).toBe(`Draggable, resizable item`);
  });

  it(`Should override aria-roledescription grid-wide`, () => {
    const { container } = render(
      <GridLayout ariaLabels={{ itemRoleDescription: `dashboard widget` }} layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelector(`.kdl-grid-item`)!.getAttribute(`aria-roledescription`)).toBe(`dashboard widget`);
  });

  it(`Should only merge the one overridden key, leaving the rest at their own defaults`, () => {
    const { container } = render(
      <GridLayout ariaLabels={{ closeButton: `Dismiss` }} layout={basicLayout()} showCloseButton>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.getAttribute(`aria-roledescription`)).toBe(`Draggable, resizable item`);
    expect(container.textContent).toContain(`Press arrow keys to move.`);
  });
});

describe(`GridItem header`, () => {
  it(`Should render children directly, with no wrapper, when header is not provided`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Plain content</GridItem>
      </GridLayout>,
    );

    expect(container.querySelector(`.kdl-grid-item-header`)).toBeFalsy();
    expect(container.querySelector(`.kdl-grid-item-body`)).toBeFalsy();
    expect(container.querySelector(`.kdl-grid-item`)!.classList.contains(`kdl-grid-item--has-header`)).toBe(false);
    expect(container.textContent).toContain(`Plain content`);
  });

  it(`Should render header and children in separate regions when header is provided`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem header={<span>Widget title</span>} i="0">
          Widget body
        </GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.classList.contains(`kdl-grid-item--has-header`)).toBe(true);
    expect(container.querySelector(`.kdl-grid-item-header`)!.textContent).toBe(`Widget title`);
    expect(container.querySelector(`.kdl-grid-item-body`)!.textContent).toBe(`Widget body`);
  });
});

describe(`GridItem renderResizeHandle`, () => {
  it(`Should render nothing extra inside a resize-hint span by default`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const handle = container.querySelector(`.kdl-resize-hint--se`) as HTMLElement;
    expect(handle.textContent).toBe(``);
  });

  it(`Should render custom content inside each resize-hint span, receiving its own edge`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0" renderResizeHandle={edge => <span data-testid={`handle-${edge}`}>{edge}</span>}>
          Item 0
        </GridItem>
      </GridLayout>,
    );

    const seHandle = container.querySelector(`.kdl-resize-hint--se`) as HTMLElement;
    expect(seHandle.textContent).toBe(`se`);
    const neHandle = container.querySelector(`.kdl-resize-hint--ne`) as HTMLElement;
    expect(neHandle.textContent).toBe(`ne`);
  });

  it(`Should only render custom content for handles actually present in the resolved resizeHandles set`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()} resizeHandles={[`se`]}>
        <GridItem i="0" renderResizeHandle={edge => <span>{edge}</span>}>
          Item 0
        </GridItem>
      </GridLayout>,
    );

    expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(1);
    expect(container.querySelector(`.kdl-resize-hint--se`)!.textContent).toBe(`se`);
  });
});
