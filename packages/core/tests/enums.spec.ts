import { describe, expect, it } from 'vitest';
import { EDragEvent } from '../src/gridlayout/enums/EDragEvent';
import { EGridLayoutEvent } from '../src/gridlayout/enums/EGridLayoutEvents';
import { EGridItemEvent } from '../src/griditem/enums/EGridItemEvents';

// These three enums compile to real runtime objects (unlike a plain
// `interface`/`type`, a TypeScript enum is executable code) but aren't
// referenced anywhere in this package's own test suite — their consumers
// are the Vue components in packages/vue, not anything under test here.
// Asserting their string values directly is cheap, genuine coverage
// rather than an artificial exclude-list entry for something that
// actually does emit JS.

describe(`EDragEvent`, () => {
  it(`Should have the expected string values`, () => {
    expect(EDragEvent.DRAG_START).toBe(`dragstart`);
    expect(EDragEvent.DRAG_MOVE).toBe(`dragmove`);
    expect(EDragEvent.DRAG_END).toBe(`dragend`);
  });
});

describe(`EGridLayoutEvent`, () => {
  it(`Should have the expected string values`, () => {
    expect(EGridLayoutEvent.BREAKPOINT_CHANGED).toBe(`breakpoint-changed`);
    expect(EGridLayoutEvent.CHANGED_DIRECTION).toBe(`changed-direction`);
    expect(EGridLayoutEvent.COLUMNS_CHANGED).toBe(`columns-changed`);
    expect(EGridLayoutEvent.CONTAINER_RESIZED).toBe(`container-resized`);
    expect(EGridLayoutEvent.DRAG_END).toBe(`dragend`);
    expect(EGridLayoutEvent.DRAG_MOVE).toBe(`dragmove`);
    expect(EGridLayoutEvent.DRAG_START).toBe(`dragstart`);
    expect(EGridLayoutEvent.CROSS_GRID_DROP_REJECTED).toBe(`cross-grid-drop-rejected`);
    expect(EGridLayoutEvent.CROSS_GRID_ITEM_DROPPED).toBe(`cross-grid-item-dropped`);
    expect(EGridLayoutEvent.ITEM_DROPPED_FROM_OUTSIDE).toBe(`item-dropped-from-outside`);
    // LAYOUT_BEFORE_MOUNT/LAYOUT_CREATED/LAYOUT_MOUNTED were removed
    // from the enum itself (not just unwired from GridLayout.vue's own
    // defineEmits) — see EGridLayoutEvents.ts's own history and
    // packages/react/docs/PARITY_GAP_VUE.md's "lifecycle events" note
    // for the full rationale (LAYOUT_CREATED fired before the
    // container's real width was known, so every listener saw
    // pre-measurement, unsettled item positions; LAYOUT_BEFORE_MOUNT/
    // LAYOUT_MOUNTED fired before layout validation/responsive setup
    // had run). This test used to assert all three still had their old
    // string values, which stayed stale after the enum members
    // themselves were deleted — `EGridLayoutEvent.LAYOUT_BEFORE_MOUNT`
    // etc. are simply `undefined` now, not a leftover string constant
    // to compare against.
    expect(EGridLayoutEvent.LAYOUT_READY).toBe(`layout-ready`);
    expect(EGridLayoutEvent.LAYOUT_UPDATE).toBe(`update:layout`);
    expect(EGridLayoutEvent.LAYOUT_UPDATED).toBe(`layout-updated`);
    expect(EGridLayoutEvent.MOVE_BLOCKED_BY_COLLISION).toBe(`move-blocked-by-collision`);
    expect(EGridLayoutEvent.SELECTION_CHANGED).toBe(`selection-changed`);
  });
});

describe(`EGridItemEvent`, () => {
  it(`Should have the expected string values`, () => {
    expect(EGridItemEvent.CONTAINER_RESIZED).toBe(`container-resized`);
    expect(EGridItemEvent.DRAG).toBe(`drag`);
    expect(EGridItemEvent.DRAGGED).toBe(`dragged`);
    expect(EGridItemEvent.MOVE).toBe(`item-move`);
    expect(EGridItemEvent.MOVED).toBe(`item-moved`);
    expect(EGridItemEvent.REMOVE_ITEM).toBe(`remove-grid-item`);
    expect(EGridItemEvent.RESIZE).toBe(`resize`);
    expect(EGridItemEvent.RESIZED).toBe(`resized`);
    expect(EGridItemEvent.ITEM_CLICKED).toBe(`item-clicked`);
  });
});
