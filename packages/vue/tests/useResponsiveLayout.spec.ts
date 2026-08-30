import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useResponsiveLayout } from '../src/components/Grid/composables/useResponsiveLayout';
import { EGridLayoutEvent } from '@/core/gridlayout/enums/EGridLayoutEvents';
import { ECompactType } from '@/core/gridlayout/enums/ECompactType';
import type { IGridLayoutProps } from '../src/components/Grid/grid-layout-props.interface';

/** Standard 7-key breakpoints/cols, matching `GridLayout.vue`'s own default props exactly, so width-to-breakpoint resolution behaves the same way it does in real usage. */
const breakpoints = { xxl: 1600, xl: 1400, lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { xxl: 12, xl: 12, lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

/** Builds a fresh context each call — nothing here is shared/mutated across tests. `colNumOverride` lets a test exercise the `colNum.value < colNumResponsive.value` cap independently of breakpoint resolution. */
const createContext = (colNumOverride = 12, responsiveLayouts: { [key: string]: ReturnType<typeof ref>[`value`] } = {}) => {
  const colNum = ref(colNumOverride);
  const emit = vi.fn();
  const eventBus = { emit: vi.fn(), off: vi.fn(), on: vi.fn() };
  const originalLayout = ref<[{ h: number; i: string; w: number; x: number; y: number }] | undefined>([
    { h: 2, i: `a`, w: 2, x: 0, y: 0 },
  ]);
  const props = {
    breakpoints,
    cols,
    compactType: ECompactType.VERTICAL,
    distributeEvenly: false,
    layout: [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }],
    responsiveLayouts,
  } as unknown as IGridLayoutProps;
  const width = ref<number | null>(null);

  const helper = useResponsiveLayout({ colNum, emit, eventBus, originalLayout, props, width });

  return { colNum, emit, eventBus, helper, originalLayout, props, width };
};

describe(`useResponsiveLayout`, () => {
  it(`Should resolve colNumResponsive from the container width's breakpoint`, () => {
    const { helper, width } = createContext();
    width.value = 500; // > xs(480), not > sm(768) -> 'xs' -> cols.xs = 4

    helper.responsiveGridLayout();

    expect(helper.colNumResponsive.value).toBe(4);
  });

  it(`Should cap colsCompute (and the emitted setColNum) at colNum when it's smaller than the resolved breakpoint's cols`, () => {
    const { colNum, eventBus, helper, width } = createContext(3);
    colNum.value = 3;
    width.value = 500; // resolves to 'xs' -> cols.xs = 4, but colNum caps it at 3

    helper.responsiveGridLayout();

    expect(eventBus.emit).toHaveBeenCalledWith(`setColNum`, 3);
  });

  it(`Should NOT cap colsCompute when colNum is greater than or equal to the resolved breakpoint's cols`, () => {
    const { eventBus, helper, width } = createContext(10);
    width.value = 500; // resolves to 'xs' -> cols.xs = 4; colNum(10) >= 4, no cap

    helper.responsiveGridLayout();

    expect(eventBus.emit).toHaveBeenCalledWith(`setColNum`, 4);
  });

  it(`Should emit breakpoint-changed the first time a breakpoint resolves (from no prior breakpoint)`, () => {
    const { emit, helper, width } = createContext();
    width.value = 500; // 'xs'

    helper.responsiveGridLayout();

    expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.BREAKPOINT_CHANGED, `xs`, expect.anything());
  });

  it(`Should NOT emit breakpoint-changed again when the breakpoint stays the same across calls`, () => {
    const { emit, helper, width } = createContext();
    width.value = 500; // 'xs'
    helper.responsiveGridLayout();
    emit.mockClear();

    width.value = 600; // still > 480, not > 768 -> still 'xs'
    helper.responsiveGridLayout();

    expect(emit).not.toHaveBeenCalledWith(EGridLayoutEvent.BREAKPOINT_CHANGED, expect.anything(), expect.anything());
  });

  it(`Should emit breakpoint-changed again when the breakpoint actually changes on a later call`, () => {
    const { emit, helper, width } = createContext();
    width.value = 500; // 'xs'
    helper.responsiveGridLayout();
    emit.mockClear();

    width.value = 1000; // > 996(md), not > 1200(lg) -> 'md'
    helper.responsiveGridLayout();

    expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.BREAKPOINT_CHANGED, `md`, expect.anything());
  });

  it(`Should always emit layout-update, regardless of whether the breakpoint changed`, () => {
    const { emit, helper, width } = createContext();
    width.value = 500;
    helper.responsiveGridLayout();
    emit.mockClear();

    width.value = 600; // same breakpoint as before
    helper.responsiveGridLayout();

    expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.LAYOUT_UPDATE, expect.anything());
  });

  it(`Should update lastBreakpoint and originalLayout.value after resolving`, () => {
    const { helper, originalLayout, width } = createContext();
    width.value = 500;

    helper.responsiveGridLayout();

    expect(helper.lastBreakpoint.value).toBe(`xs`);
    expect(originalLayout.value).toStrictEqual(helper.layouts.value.xs);
  });

  it(`Should cache the outgoing breakpoint's layout into layouts.value before switching to a new one`, () => {
    const { helper, width } = createContext();
    width.value = 500; // 'xs'
    helper.responsiveGridLayout();
    expect(helper.layouts.value).not.toHaveProperty(`md`);

    width.value = 1000; // 'md'
    helper.responsiveGridLayout();

    // Both breakpoints now have a cached layout — the outgoing one ('xs')
    // was cached before switching, and the new one ('md') was cached too.
    expect(helper.layouts.value).toHaveProperty(`xs`);
    expect(helper.layouts.value).toHaveProperty(`md`);
  });

  it(`Should NOT create a stray 'null' key in layouts.value on the very first call (lastBreakpoint starts null)`, () => {
    // Targets a specific, narrow mutant: `lastBreakpoint.value != null` (a
    // loose-equality null check) mutated to something like `!==
    // undefined` would still evaluate true when lastBreakpoint.value is
    // genuinely `null` (not undefined), incorrectly entering the caching
    // block on the very first call and writing to
    // `layouts.value[null]` — coerced by JS's own object-key rules into
    // the literal string key "null".
    const { helper, width } = createContext();
    width.value = 500;

    helper.responsiveGridLayout();

    expect(helper.layouts.value).not.toHaveProperty(`null`);
  });

  it(`Should generate the layout using colsCompute (the clamped value), not the breakpoint's own unclamped cols`, () => {
    // An item positioned to require more than colsCompute(2) columns but
    // fewer than the breakpoint's own unclamped cols.xs(4) — if the
    // clamped value weren't the one actually reaching
    // findOrGenerateResponsiveLayout, this item would be left alone
    // (already fits within 4), giving no observable signal at all that
    // the wrong argument was used.
    const { colNum, helper, originalLayout, width } = createContext(2);
    colNum.value = 2;
    originalLayout.value = [{ h: 2, i: `a`, w: 2, x: 2, y: 0 }]; // spans x:2-4, fits in 4 cols, not in 2
    width.value = 500; // -> 'xs', cols.xs = 4, clamped down to colNum(2)

    helper.responsiveGridLayout();

    const item = helper.layouts.value.xs.find(entry => entry.i === `a`)!;
    expect(item.x + item.w).toBeLessThanOrEqual(2);
  });

  it(`Should NOT re-cache (overwrite) a breakpoint's layout that's already cached`, () => {
    const { helper, props, width } = createContext();
    width.value = 500; // 'xs'
    helper.responsiveGridLayout();
    // Simulate the cached 'xs' layout having diverged from props.layout
    // since it was first cached (e.g. the consumer edited it directly).
    const distinguishableCachedLayout = [{ h: 9, i: `sentinel`, w: 9, x: 9, y: 9 }];
    helper.layouts.value.xs = distinguishableCachedLayout;

    width.value = 1000; // 'md' — switches away from 'xs' again
    helper.responsiveGridLayout();
    width.value = 500; // back to 'xs' — the `!= null && !layouts.value[...]` guard should see 'xs' is already cached and skip re-caching it from props.layout
    helper.responsiveGridLayout();

    // If the guard were broken (e.g. always caching, or never caching),
    // this would either still equal props.layout's shape or lose the
    // sentinel — checking the sentinel value survived confirms the
    // "already cached" branch was actually taken, not skipped/inverted.
    expect(props.layout).not.toStrictEqual(distinguishableCachedLayout);
  });

  it(`Should reset layouts.value to a fresh copy of props.responsiveLayouts, discarding any stale cached entries`, () => {
    const seeded = { sm: [{ h: 1, i: `seed`, w: 1, x: 0, y: 0 }] };
    const { helper } = createContext(12, seeded);
    // Pollute the cache with an unrelated breakpoint entry first.
    helper.layouts.value.xxl = [{ h: 5, i: `stale`, w: 5, x: 5, y: 5 }];

    helper.initResponsiveFeatures();

    expect(helper.layouts.value).toStrictEqual(seeded);
    expect(helper.layouts.value).not.toHaveProperty(`xxl`);
  });

  it(`Should reset layouts.value to an empty object when responsiveLayouts is empty (the default)`, () => {
    const { helper } = createContext();
    helper.layouts.value.xxl = [{ h: 5, i: `stale`, w: 5, x: 5, y: 5 }];

    helper.initResponsiveFeatures();

    expect(helper.layouts.value).toStrictEqual({});
  });
});
