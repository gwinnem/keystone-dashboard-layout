import { useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import type { TLayout } from '@keystone-dashboard-layout/core';

/**
 * The smallest possible setup — a fixed `layout`, default drag/resize,
 * `onLayoutChange` wired to local state, no toggles at all. The "what
 * does this look like with zero configuration" reference point every
 * other view (added in later phases — see
 * `docs/DEMO_APP_IMPLEMENTATION_PLAN.md`'s own build-phasing section)
 * implicitly builds on.
 */
export default function BasicGridView(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>([
    { h: 2, i: `0`, w: 3, x: 0, y: 0 },
    { h: 2, i: `1`, w: 3, x: 3, y: 0 },
    { h: 3, i: `2`, w: 3, x: 6, y: 0 },
    { h: 2, i: `3`, w: 3, x: 0, y: 2 },
  ]);

  return (
    <div className="demo-view" data-testid="view-basic-grid">
      <h2>Basic grid</h2>
      <p className="demo-view-description">
        A fixed layout with default dragging and resizing — no toggles, no configuration beyond
        <code>colNum</code>/<code>rowHeight</code>. Drag or resize any item below; the layout updates
        via <code>onLayoutChange</code>, the same controlled-component contract every other view uses.
      </p>
      <div className="demo-grid-area">
        <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={80}>
          {layout.map(item => (
            <GridItem i={item.i} key={item.i}>
              <div className="demo-item-content">{`Item ${item.i}`}</div>
            </GridItem>
          ))}
        </GridLayout>
      </div>
    </div>
  );
}
