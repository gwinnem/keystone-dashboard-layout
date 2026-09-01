import { useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import type { TLayout } from 'keystone-dashboard-layout-core';

/**
 * Real-browser coverage for `allowCrossGridDrag` — dragging an
 * existing item from one live `GridLayout` into another. The unit
 * suite already covers the underlying accept/reject logic directly
 * (`handleDragEnd` called with a fabricated `clientX`/`clientY`), but
 * never through an actual pointer-driven gesture crossing real DOM
 * boundaries between two independently-measured containers — exactly
 * the class of thing the Vue port's own history found real,
 * browser-only bugs in for this same feature (native `mousemove`
 * unreliability during the gesture; see
 * `packages/react/e2e/cross-grid.spec.ts`).
 */
export default function CrossGrid(): React.JSX.Element {
  const [layoutA, setLayoutA] = useState<TLayout>([
    { h: 2, i: `a0`, w: 3, x: 0, y: 0 },
    // A static item in the same column, with a real gap between it and
    // "a0" once "a0" leaves — needed for the bin-pack-not-push-and-
    // compact regression test (dropping "a0" back into grid A should
    // land it back in the gap above "locked", not pushed below it).
    // Static items never move during compaction (confirmed directly:
    // `compactLayout`'s own `if(!l.isStatic)` guard), so this gap
    // persists regardless of `compactType` once "a0" is dragged out.
    { h: 2, i: `locked`, isStatic: true, w: 3, x: 0, y: 2 },
  ]);
  const [layoutB, setLayoutB] = useState<TLayout>([]);

  return (
    <div style={{ display: `flex`, gap: `16px` }}>
      <div data-testid="cross-grid-a" style={{ border: `1px solid #ccc`, minHeight: `200px`, width: `50%` }}>
        <GridLayout allowCrossGridDrag colNum={6} layout={layoutA} layoutId="grid-a" onLayoutChange={setLayoutA} rowHeight={80}>
          {layoutA.map(item => (
            <GridItem i={item.i} key={item.i}>
              <div className="fixture-item-content">
                {`Item ${item.i}`}
              </div>
            </GridItem>
          ))}
        </GridLayout>
      </div>
      <div data-testid="cross-grid-b" style={{ border: `1px solid #ccc`, minHeight: `200px`, width: `50%` }}>
        <GridLayout allowCrossGridDrag className="cross-grid-empty-target" colNum={6} layout={layoutB} layoutId="grid-b" onLayoutChange={setLayoutB} rowHeight={80}>
          {layoutB.map(item => (
            <GridItem i={item.i} key={item.i}>
              <div className="fixture-item-content">
                {`Item ${item.i}`}
              </div>
            </GridItem>
          ))}
        </GridLayout>
      </div>
    </div>
  );
}
