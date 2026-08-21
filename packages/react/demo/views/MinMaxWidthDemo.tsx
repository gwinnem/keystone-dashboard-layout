import { useState } from 'react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridItem, GridLayout } from '../../src/index';

const SINGLE_COLUMN_LAYOUT: TLayout = [
  { h: 2, i: `single`, minW: 5, w: 1, x: 0, y: 0 },
];

// Two side-by-side items (colNum: 2, each w:1) with two *different*
// minW values -- the wider one (item "b", minW:5) is what should win
// and set the grid's own effective width, not item "a"'s narrower
// minW:3, demonstrating the multi-column/multi-item case the
// single-column reasoning alone can't exercise.
const MULTI_COLUMN_LAYOUT: TLayout = [
  { h: 2, i: `a`, minW: 3, w: 1, x: 0, y: 0 },
  { h: 2, i: `b`, minW: 5, w: 1, x: 1, y: 0 },
];

/**
 * A dedicated, focused demonstration of GridLayout's own min/maxW
 * width-enforcement behavior (see that memo's own doc comment in
 * GridLayout.tsx for the full rationale) -- a fixed, deliberately
 * narrow outer wrapper around each grid below, so the effect (the grid
 * rendering *wider* than its own available space and becoming
 * horizontally scrollable, rather than squeezing an item's own content
 * unreadably narrow) is directly visible without needing to fight with
 * the browser's own window size. Entirely library-driven -- neither
 * grid below has any application code computing widths itself.
 */
export default function MinMaxWidthDemo(): React.JSX.Element {
  const [singleColumnLayout, setSingleColumnLayout] = useState<TLayout>(SINGLE_COLUMN_LAYOUT);
  const [multiColumnLayout, setMultiColumnLayout] = useState<TLayout>(MULTI_COLUMN_LAYOUT);

  return (
    <div className="demo-minmax-section">
      <h3>minW/maxW width enforcement (library-level, no application code)</h3>
      <p className="demo-view-description">
        Each grid below sits inside a wrapper narrower than what its own widest item&apos;s <code>minW</code> needs
        {' '}— <code>GridLayout</code> itself expands to fit and becomes horizontally scrollable, rather than
        squeezing that item&apos;s content unreadably narrow.
      </p>

      <div className="demo-minmax-row">
        <div className="demo-minmax-item">
          <p className="demo-status">Single column — one item, minW: 5, inside a 150px-wide wrapper</p>
          <div className="demo-minmax-wrapper" style={{ width: `150px` }}>
            <GridLayout colNum={1} layout={singleColumnLayout} onLayoutChange={setSingleColumnLayout} rowHeight={80}>
              {singleColumnLayout.map(item => (
                <GridItem i={item.i} key={item.i}>
                  <div className="demo-item-content">{`minW: ${item.minW}`}</div>
                </GridItem>
              ))}
            </GridLayout>
          </div>
        </div>

        <div className="demo-minmax-item">
          <p className="demo-status">Two columns — item &quot;a&quot; minW: 3, item &quot;b&quot; minW: 5, inside a 150px-wide wrapper</p>
          <div className="demo-minmax-wrapper" style={{ width: `150px` }}>
            <GridLayout colNum={2} layout={multiColumnLayout} onLayoutChange={setMultiColumnLayout} rowHeight={80}>
              {multiColumnLayout.map(item => (
                <GridItem i={item.i} key={item.i}>
                  <div className="demo-item-content">{`Item ${item.i} (minW: ${item.minW})`}</div>
                </GridItem>
              ))}
            </GridLayout>
          </div>
        </div>
      </div>
    </div>
  );
}
