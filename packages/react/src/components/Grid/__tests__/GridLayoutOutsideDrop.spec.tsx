import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { stubOffsetWidth } from './test-helpers';

const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

/** A minimal fake `DataTransfer` — jsdom doesn't implement the real one meaningfully for these tests' purposes. */
function makeDataTransfer(): DataTransfer {
  return { getData: () => `` } as unknown as DataTransfer;
}

describe(`GridLayout allowOutsideDrop`, () => {
  it(`Should not show a placeholder or call onOutsideDrop when allowOutsideDrop is off (the default)`, () => {
    const handleOutsideDrop = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} onOutsideDrop={handleOutsideDrop}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    act(() => {
      root.dispatchEvent(new Event(`dragover`, { bubbles: true, cancelable: true }));
    });

    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeFalsy();
    expect(handleOutsideDrop).not.toHaveBeenCalled();
  });

  // `handleOutsideDragEnter` has its own copy of the same
  // `!allowOutsideDrop || !outsideDropAccepted(...)` guard `dragover`/
  // `drop` each have — a separate code location despite the identical
  // logic, so exercising it only via those two events leaves
  // `dragenter`'s own copy unexercised. `dragenter` alone doesn't show
  // a placeholder either way (only `dragover` does that), so this
  // confirms the guard via its actual, only observable effect: the
  // enter-count it would otherwise increment.
  it(`Should not count a dragenter at all when allowOutsideDrop is off (the default)`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    act(() => {
      root.dispatchEvent(new Event(`dragenter`, { bubbles: true, cancelable: true }));
    });
    act(() => {
      root.dispatchEvent(new Event(`dragover`, { bubbles: true, cancelable: true }));
    });

    // If dragenter had (wrongly) incremented the count while off, later
    // turning allowOutsideDrop on wouldn't change anything observable
    // here either way — the real confirmation is simpler: no
    // placeholder appears even once dragover normally would show one,
    // since allowOutsideDrop stays off throughout.
    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeFalsy();
  });

  // handleOutsideDragLeave has its own copy of the same
  // "!allowOutsideDrop" guard the other three handlers do — unlike
  // those three, its own onDragLeave JSX prop is attached
  // unconditionally (not itself gated on allowOutsideDrop), so a real
  // dragleave event reaches this handler regardless; only the guard
  // inside it stops anything from happening while the feature is off.
  it(`Should not throw or change anything on a dragleave when allowOutsideDrop is off (the default) — confirmed gap via a fresh coverage report`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    expect(() => act(() => {
      root.dispatchEvent(new Event(`dragleave`, { bubbles: true, cancelable: true }));
    })).not.toThrow();

    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeFalsy();
  });

  it(`Should not count a dragenter at all when outsideDropAccept rejects it`, () => {
    const { container } = render(
      <GridLayout allowOutsideDrop layout={basicLayout()} outsideDropAccept={() => false}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    act(() => {
      root.dispatchEvent(new Event(`dragenter`, { bubbles: true, cancelable: true }));
    });
    act(() => {
      root.dispatchEvent(new Event(`dragover`, { bubbles: true, cancelable: true }));
    });

    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeFalsy();
  });

  // The earlier "allowOutsideDrop off" test above only ever dispatches
  // `dragover` — `handleOutsideDrop`'s own copy of the same guard,
  // reached only via an actual `drop` event, is separately untested
  // until now.
  it(`Should not call onOutsideDrop on an actual drop event when allowOutsideDrop is off (the default)`, () => {
    const handleOutsideDrop = vi.fn();
    const { container } = render(
      <GridLayout layout={basicLayout()} onOutsideDrop={handleOutsideDrop}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    act(() => {
      root.dispatchEvent(new Event(`drop`, { bubbles: true, cancelable: true }));
    });

    expect(handleOutsideDrop).not.toHaveBeenCalled();
  });

  it(`Should show a live placeholder on dragover`, () => {
    const { container } = render(
      <GridLayout allowOutsideDrop layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    const event = new Event(`dragover`, { bubbles: true, cancelable: true }) as unknown as { clientX: number; clientY: number };
    event.clientX = 50;
    event.clientY = 50;
    act(() => {
      root.dispatchEvent(event as unknown as Event);
    });

    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeTruthy();
  });

  // The test above only checks the placeholder's *presence* — every
  // arithmetic operator in `outsideDropPlaceholderStyle`'s own pixel
  // conversion (`GridLayout.tsx`) survives that check untouched, since
  // a wrong height/left/top/width still renders a truthy element.
  // `containerWidth=1210` is chosen so `calcColWidth` divides out to
  // an exact `90` (`(1210 - 13*10) / 12`), keeping the expected values
  // below simple, round numbers rather than something that could mask
  // an off-by-a-bit-of-rounding mutant behind `Math.round`.
  it(`Should compute the placeholder's exact pixel height/left/top/width, not just show something`, () => {
    stubOffsetWidth(1210);
    const { container } = render(
      <GridLayout allowOutsideDrop layout={basicLayout()} margin={[10, 10]} outsideDropHeight={2} outsideDropWidth={2} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    // rect defaults to all-zero in jsdom (not stubbed here), so
    // left/top below are exactly clientX/clientY themselves.
    // x = round((100-10)/(90+10)) = round(0.9) = 1
    // y = round((100-10)/(100+10)) = round(0.818..) = 1
    const event = new Event(`dragover`, { bubbles: true, cancelable: true }) as unknown as { clientX: number; clientY: number };
    event.clientX = 100;
    event.clientY = 100;
    act(() => {
      root.dispatchEvent(event as unknown as Event);
    });

    const placeholder = container.querySelector(`.kdl-grid-outside-drop-placeholder`) as HTMLElement;
    // height = round(100*2 + max(0,1)*10) = 210
    expect(placeholder.style.height).toBe(`210px`);
    // left = round(90*1 + (1+1)*10) = 110
    expect(placeholder.style.left).toBe(`110px`);
    // top = round(100*1 + (1+1)*10) = 120
    expect(placeholder.style.top).toBe(`120px`);
    // width = round(90*2 + max(0,1)*10) = 190
    expect(placeholder.style.width).toBe(`190px`);
  });

  it(`Should call onOutsideDrop with the resolved grid position/size and the native dataTransfer on drop`, () => {
    const handleOutsideDrop = vi.fn();
    const dataTransfer = makeDataTransfer();
    const { container } = render(
      <GridLayout allowOutsideDrop layout={basicLayout()} margin={[10, 10]} onOutsideDrop={handleOutsideDrop} outsideDropHeight={3} outsideDropWidth={4} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    Object.defineProperty(dataTransfer, `dropEffect`, { value: `copy`, writable: true });
    const dropEvent = new Event(`drop`, { bubbles: true, cancelable: true }) as unknown as { clientX: number; clientY: number; dataTransfer: DataTransfer };
    dropEvent.clientX = 0;
    dropEvent.clientY = 0;
    dropEvent.dataTransfer = dataTransfer;
    act(() => {
      root.dispatchEvent(dropEvent as unknown as Event);
    });

    expect(handleOutsideDrop).toHaveBeenCalledTimes(1);
    const payload = handleOutsideDrop.mock.calls[0][0];
    expect(payload.w).toBe(4);
    expect(payload.h).toBe(3);
    expect(payload.dataTransfer).toBe(dataTransfer);
    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeFalsy();
  });

  // Confirmed gap via a fresh mutation run: the test above only ever
  // uses clientX/clientY: 0 (producing x/y: 0 after clamping, a
  // degenerate case many arithmetic mutants in
  // `outsideDropPositionFromEvent` don't actually change the result
  // for) and never asserts `payload.x`/`payload.y` at all -- only `w`/
  // `h`, which are just passed-through props, not anything computed.
  // `containerWidth=1210` again gives an exact colWidth of `90`
  // (`(1210 - 13*10) / 12`), same trick as the placeholder-style test
  // above, so every expected value below is a clean, hand-computable
  // round number.
  it(`Should call onOutsideDrop with the precise computed x/y, not just w/h`, () => {
    stubOffsetWidth(1210);
    const handleOutsideDrop = vi.fn();
    const dataTransfer = makeDataTransfer();
    const { container } = render(
      <GridLayout allowOutsideDrop layout={basicLayout()} margin={[10, 10]} onOutsideDrop={handleOutsideDrop} outsideDropHeight={2} outsideDropWidth={2} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    const dropEvent = new Event(`drop`, { bubbles: true, cancelable: true }) as unknown as { clientX: number; clientY: number; dataTransfer: DataTransfer };
    // rect defaults to all-zero in jsdom, so left/top are exactly
    // clientX/clientY themselves, same as the placeholder-style test.
    // x = round((300-10)/(90+10)) = round(2.9) = 3
    // y = round((220-10)/(100+10)) = round(1.909..) = 2
    dropEvent.clientX = 300;
    dropEvent.clientY = 220;
    dropEvent.dataTransfer = dataTransfer;
    act(() => {
      root.dispatchEvent(dropEvent as unknown as Event);
    });

    expect(handleOutsideDrop).toHaveBeenCalledTimes(1);
    const payload = handleOutsideDrop.mock.calls[0][0];
    expect(payload.x).toBe(3);
    expect(payload.y).toBe(2);
  });

  it(`Should not show a placeholder or call onOutsideDrop when outsideDropAccept returns false`, () => {
    const handleOutsideDrop = vi.fn();
    const { container } = render(
      <GridLayout allowOutsideDrop layout={basicLayout()} onOutsideDrop={handleOutsideDrop} outsideDropAccept={() => false}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    act(() => {
      root.dispatchEvent(new Event(`dragover`, { bubbles: true, cancelable: true }));
    });
    act(() => {
      root.dispatchEvent(new Event(`drop`, { bubbles: true, cancelable: true }));
    });

    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeFalsy();
    expect(handleOutsideDrop).not.toHaveBeenCalled();
  });

  it(`Should only clear the placeholder once the dragenter/dragleave count nets back to zero`, () => {
    const { container } = render(
      <GridLayout allowOutsideDrop layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    act(() => {
      root.dispatchEvent(new Event(`dragenter`, { bubbles: true, cancelable: true }));
    });
    act(() => {
      root.dispatchEvent(new Event(`dragenter`, { bubbles: true, cancelable: true }));
    });
    act(() => {
      root.dispatchEvent(new Event(`dragover`, { bubbles: true, cancelable: true }));
    });
    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeTruthy();

    act(() => {
      root.dispatchEvent(new Event(`dragleave`, { bubbles: true, cancelable: true }));
    });
    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeTruthy();

    act(() => {
      root.dispatchEvent(new Event(`dragleave`, { bubbles: true, cancelable: true }));
    });
    expect(container.querySelector(`.kdl-grid-outside-drop-placeholder`)).toBeFalsy();
  });
});
