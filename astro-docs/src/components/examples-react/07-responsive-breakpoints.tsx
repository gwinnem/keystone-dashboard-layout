import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { IBreakpoints, IColumns, TLayout } from 'keystone-dashboard-layout-core';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './07-responsive-breakpoints.css';

// Scaled down from the library's own defaults (xxl:1600/xl:1400/lg:1200/
// md:996/sm:768/xs:480/xxs:0) to fit this example's own narrow container
// — the default thresholds, designed for a real page, are never reached
// at all inside a docs-example panel this narrow, so every breakpoint
// below "sm" would be completely undemonstrable here otherwise.
const breakpoints: IBreakpoints = { lg: 400, md: 320, sm: 240, xl: 500, xs: 160, xxl: 600, xxs: 0 };
const cols: IColumns = { lg: 12, md: 10, sm: 6, xl: 12, xs: 4, xxl: 12, xxs: 2 };

const initialLayout: TLayout = [
  // Row 1: a full-width header band.
  { h: 1, i: '0', w: 12, x: 0, y: 0 },
  // Row 2: three equal-width cards.
  { h: 2, i: '1', w: 4, x: 0, y: 1 },
  { h: 2, i: '2', w: 4, x: 4, y: 1 },
  { h: 2, i: '3', w: 4, x: 8, y: 1 },
  // Row 3: two wider cards, an asymmetric split.
  { h: 2, i: '4', w: 8, x: 0, y: 3 },
  { h: 2, i: '5', w: 4, x: 8, y: 3 },
];

export default function ResponsiveBreakpoints() {
  const [lastBreakpoint, setLastBreakpoint] = useState('—');
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <span className="demo-description">
          This example's own container is narrower than the library's default breakpoints
          (designed for a full browser window), so the breakpoints here are scaled down to
          fit it — shrink the panel below (or your browser window) to see the column count
          step down at each one. Current breakpoint: <strong>{lastBreakpoint}</strong>
        </span>
      </div>

      <GridLayout
        breakpoints={breakpoints}
        cols={cols}
        layout={layout}
        onBreakpointChange={(breakpoint) => setLastBreakpoint(breakpoint)}
        onLayoutChange={setLayout}
        responsive
        rowHeight={50}
        showGridLines
      >
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      <p className="demo-description">
        This example's own breakpoints (columns): <code>xxl ≥600 (12 cols)</code>,{' '}
        <code>xl ≥500 (12 cols)</code>, <code>lg ≥400 (12 cols)</code>,{' '}
        <code>md ≥320 (10 cols)</code>, <code>sm ≥240 (6 cols)</code>,{' '}
        <code>xs ≥160 (4 cols)</code>, <code>xxs &lt;160 (2 cols)</code> — the library's own
        defaults are much larger (see the API reference), sized for a real page rather than a
        docs-example panel.
      </p>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
