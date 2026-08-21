import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { restoreOffsetWidth, stubOffsetWidth, triggerResize } from './test-helpers';

/**
 * Regression test for a real bug found while writing the
 * `distributeEvenly` tests: `containerWidth`'s own seed default (100)
 * is indistinguishable from a genuine measurement, so on a mount with
 * `responsive` already `true`, the responsive-breakpoint effect used
 * to run once against that seed value before the real measurement
 * landed — at 100px, `getBreakpointFromWidth` resolves to `'xxs'`
 * (threshold 0), meaning every real consumer briefly saw their layout
 * bounds-corrected/compacted for a 2-column grid on every single mount,
 * regardless of the actual container size.
 */
describe(`GridLayout responsive — no spurious pre-measurement breakpoint resolution`, () => {
  it(`Should never bounds-correct against the containerWidth seed default before a real measurement lands`, () => {
    // A real, wide container (colNum would resolve to 'lg', cols=12) —
    // if the bug were present, 'a' (x:8,w:2, fits fine at cols=12)
    // would still have been clamped for a transient cols=2 pass first.
    stubOffsetWidth(1210);
    const handleChange = vi.fn();
    render(
      <GridLayout layout={[{ h: 2, i: `a`, w: 2, x: 8, y: 0 }]} onLayoutChange={handleChange} responsive>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    // Every onLayoutChange call across the whole settle process (not
    // just the last one) should already reflect the real, final
    // breakpoint's own bounds — none of them should ever show 'a'
    // clamped down to fit a 2-column grid it was never actually
    // measured at.
    handleChange.mock.calls.forEach(call => {
      const layout = call[0] as TLayout;
      const a = layout.find(entry => entry.i === `a`)!;
      expect(a.x).toBe(8);
    });
    restoreOffsetWidth();
  });

  it(`Should still resolve the correct breakpoint once the real measurement lands`, () => {
    stubOffsetWidth(1210);
    const handleChange = vi.fn();
    render(
      <GridLayout layout={[{ h: 2, i: `a`, w: 2, x: 8, y: 0 }]} onLayoutChange={handleChange} responsive>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    // 1210px is squarely within 'lg' (threshold 1200, cols=12) — 'a'
    // (x:8,w:2) fits fine there, so no correction should ever have
    // been needed at all, and onLayoutChange may not even have fired
    // yet by this point if nothing needed correcting.
    if(handleChange.mock.calls.length > 0) {
      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      const a = lastCall.find(entry => entry.i === `a`)!;
      expect(a.x).toBe(8);
    }

    // Now shrink to a width that genuinely needs correcting ('xs',
    // cols=4) — confirms the responsive effect still works correctly
    // once a real measurement is in play, not just that it stays
    // silent.
    triggerResize(500);

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const a = lastCall.find(entry => entry.i === `a`)!;
    expect(a.x).toBe(2);
    restoreOffsetWidth();
  });
});
