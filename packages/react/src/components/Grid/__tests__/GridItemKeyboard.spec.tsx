import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';

const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 5, y: 5 }];

describe(`GridItem keyboard accessibility`, () => {
  it(`Should move the item by one grid unit on ArrowRight`, () => {
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight` });
    });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.x).toBe(6);
  });

  it(`Should move by one grid unit on ArrowLeft/Up/Down too`, () => {
    const handleChange = vi.fn();
    // compactType:NONE — with the default VERTICAL compaction and only
    // one item in the layout, *every* commitLayout call (including the
    // synthetic dragstart one, which runs before dragend on every
    // keypress) collapses this lone, uncontested item's own y straight
    // back to 0, making any assertion on a specific y value meaningless
    // without disabling it first.
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={basicLayout()} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowLeft` });
    });
    expect(handleChange.mock.calls.at(-1)![0].find((e: { i: string }) => e.i === `0`).x).toBe(4);

    act(() => {
      fireEvent.keyDown(target, { key: `ArrowDown` });
    });
    expect(handleChange.mock.calls.at(-1)![0].find((e: { i: string }) => e.i === `0`).y).toBe(6);

    act(() => {
      fireEvent.keyDown(target, { key: `ArrowUp` });
    });
    expect(handleChange.mock.calls.at(-1)![0].find((e: { i: string }) => e.i === `0`).y).toBe(5);
  });

  it(`Should resize the item by one grid unit on Shift+ArrowRight`, () => {
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight`, shiftKey: true });
    });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    expect(resized.w).toBe(3);
    expect(resized.h).toBe(2);
  });

  it(`Should not move or resize a static item`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [{ h: 2, i: `0`, isStatic: true, w: 2, x: 5, y: 5 }];
    const { container } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight` });
    });
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight`, shiftKey: true });
    });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should not move when the item isn't draggable, but should still resize if resizable`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [{ h: 2, i: `0`, isDraggable: false, w: 2, x: 5, y: 5 }];
    const { container } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight` });
    });
    expect(handleChange).not.toHaveBeenCalled();

    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight`, shiftKey: true });
    });
    expect(handleChange).toHaveBeenCalled();
  });

  it(`Should not resize when the item isn't resizable`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [{ h: 2, i: `0`, isResizable: false, w: 2, x: 5, y: 5 }];
    const { container } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight`, shiftKey: true });
    });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should ignore an arrow key held with Ctrl/Alt/Meta, letting OS/browser shortcuts through`, () => {
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { ctrlKey: true, key: `ArrowRight` });
    });
    act(() => {
      fireEvent.keyDown(target, { altKey: true, key: `ArrowRight` });
    });
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight`, metaKey: true });
    });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should be a no-op at the grid's own boundary`, () => {
    const handleChange = vi.fn();
    // colNum default 12; item w:2 at x:10 is already at the rightmost valid position (10+2=12).
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 10, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight` });
    });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should be a no-op resizing at the grid's own boundary too — confirmed gap via a fresh coverage report`, () => {
    // handleKeyDown's own "if(w === item.w && h === item.h) { return;
    // }" branch — same boundary as the plain-move no-op test above, but
    // for Shift+ArrowRight instead: item.w+dx (2+1=3) clamps back down
    // to colNum-item.x (12-10=2), landing exactly on item.w itself; h
    // stays unchanged too, since ArrowRight's own dy is 0.
    const handleChange = vi.fn();
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 10, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight`, shiftKey: true });
    });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should ignore any key other than the plain/Shift-modified arrows`, () => {
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { key: `Enter` });
    });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should flip the horizontal delta under isMirrored`, () => {
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout isMirrored layout={basicLayout()} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight` });
    });

    // ArrowRight is a physical-direction key; under RTL the item's own
    // grid-unit x actually *decreases* to keep moving toward the
    // visual right (see calcPosition's own right = ... formula, which
    // increases with x).
    expect(handleChange.mock.calls.at(-1)![0].find((e: { i: string }) => e.i === `0`).x).toBe(4);
  });

  it(`Should set tabIndex and aria attributes for a draggable/resizable, non-static item`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    expect(target.tabIndex).toBe(0);
    expect(target.getAttribute(`role`)).toBe(`group`);
    expect(target.getAttribute(`aria-describedby`)).toBeTruthy();
  });

  it(`Should not set tabIndex/aria attributes for a static item`, () => {
    const layout: TLayout = [{ h: 2, i: `0`, isStatic: true, w: 2, x: 5, y: 5 }];
    const { container } = render(
      <GridLayout layout={layout}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    expect(target.tabIndex).toBe(-1);
    expect(target.getAttribute(`role`)).toBeNull();
    expect(target.getAttribute(`aria-describedby`)).toBeNull();
  });

  it(`Should announce a custom ariaLabels instruction instead of the English default`, () => {
    const { container } = render(
      <GridLayout ariaLabels={{ moveInstruction: `Custom move instructions.` }} layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.textContent).toContain(`Custom move instructions.`);
  });

  it(`Should engage multiSelect's group-move when moving a selected item via keyboard`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 5, y: 5 },
      { h: 2, i: `1`, w: 2, x: 0, y: 0 },
    ];
    const { container } = render(
      <GridLayout layout={layout} multiSelect onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    act(() => {
      (container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement).click();
    });
    act(() => {
      (container.querySelector(`[data-grid-item-id="1"]`) as HTMLElement).dispatchEvent(
        new MouseEvent(`click`, { bubbles: true, ctrlKey: true }),
      );
    });

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    act(() => {
      fireEvent.keyDown(target, { key: `ArrowRight` });
    });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.x).toBe(6);
    expect(lastCall.find(entry => entry.i === `1`)!.x).toBe(1);
  });
});
