import { useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import type { TLayout } from '@keystone-dashboard-layout/core';

/**
 * Real-browser coverage for `isMirrored` (RTL) — dragging and resizing
 * a mirrored item, exercising the actual native pointer-driven engine
 * against real, mirrored CSS layout (`right`-anchored positioning).
 * The unit suite already covers the underlying math directly
 * (`dispatchDragEvent`/`dispatchResizeEvent` with a mocked native
 * handler), but the Vue port's own history found the RTL resize
 * edge-anchor swap specifically was a real bug only ever caught by
 * driving an actual browser drag in both directions and checking the
 * real screen-space bounding box (see
 * `packages/react/e2e/rtl.spec.ts`).
 */
export default function Rtl(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>([
    { h: 2, i: `0`, w: 3, x: 4, y: 0 },
  ]);

  return (
    <div data-testid="rtl-wrap">
      <GridLayout colNum={12} isMirrored layout={layout} onLayoutChange={setLayout} rowHeight={80}>
        {layout.map(item => (
          <GridItem i={item.i} key={item.i}>
            <div className="fixture-item-content">
              {`Item ${item.i}`}
            </div>
          </GridItem>
        ))}
      </GridLayout>
    </div>
  );
}
