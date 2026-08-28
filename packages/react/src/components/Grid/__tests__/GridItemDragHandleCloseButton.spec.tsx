import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { GridItemDragHandle } from '../GridItemDragHandle';
import { GridItemCloseButton } from '../GridItemCloseButton';

describe(`GridItemDragHandle`, () => {
  it(`Should default text to 'x', matching Vue's own default exactly`, () => {
    const { container } = render(<GridItemDragHandle />);

    const button = container.querySelector(`button`) as HTMLButtonElement;
    expect(button.textContent).toBe(`x`);
  });

  it(`Should render the configured text inside the button`, () => {
    const { container } = render(<GridItemDragHandle text="⠿" />);

    const button = container.querySelector(`button`) as HTMLButtonElement;
    expect(button.textContent).toBe(`⠿`);
  });

  it(`Should render a separate .kdl-draggable-handle span, distinct from the button — the actual draggable hit-area, not the button itself`, () => {
    const { container } = render(<GridItemDragHandle />);

    const handle = container.querySelector(`.kdl-draggable-handle`);
    expect(handle).toBeTruthy();
    // Confirmed via a direct source read of Vue's own CustomDragElement.
    // vue: the handle is a sibling of the button, not a wrapper around
    // it or a child of it.
    expect(container.querySelector(`button .kdl-draggable-handle`)).toBeFalsy();
  });

  it(`Should render both the button and the handle inside a single .kdl-drag-element-text wrapper`, () => {
    const { container } = render(<GridItemDragHandle />);

    const wrapper = container.querySelector(`.kdl-drag-element-text`);
    expect(wrapper?.querySelector(`button`)).toBeTruthy();
    expect(wrapper?.querySelector(`.kdl-draggable-handle`)).toBeTruthy();
  });
});

describe(`GridItemCloseButton`, () => {
  it(`Should call onRemoveGridItem with the configured i when clicked`, () => {
    const handleRemove = vi.fn();
    const { container } = render(<GridItemCloseButton i="my-item" onRemoveGridItem={handleRemove} />);

    const button = container.querySelector(`button`) as HTMLButtonElement;
    fireEvent.click(button);

    expect(handleRemove).toHaveBeenCalledWith(`my-item`);
  });

  it(`Should render a button with an aria-label of "Close"`, () => {
    const { container } = render(<GridItemCloseButton i="0" onRemoveGridItem={() => {}} />);

    const button = container.querySelector(`button`) as HTMLButtonElement;
    expect(button.getAttribute(`aria-label`)).toBe(`Close`);
  });

  it(`Should render a separate, aria-hidden icon span inside the button`, () => {
    const { container } = render(<GridItemCloseButton i="0" onRemoveGridItem={() => {}} />);

    const icon = container.querySelector(`button .kdl-custom-close-button-icon`);
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute(`aria-hidden`)).toBe(`true`);
  });

  it(`Should call onRemoveGridItem with the correct id for a numeric i, not just a string one`, () => {
    const handleRemove = vi.fn();
    const { container } = render(<GridItemCloseButton i={42} onRemoveGridItem={handleRemove} />);

    const button = container.querySelector(`button`) as HTMLButtonElement;
    fireEvent.click(button);

    expect(handleRemove).toHaveBeenCalledWith(42);
  });
});
