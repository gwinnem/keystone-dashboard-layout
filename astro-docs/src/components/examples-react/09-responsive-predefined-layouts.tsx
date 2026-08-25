import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TBreakpoint, TLayout, TResponsiveLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './07-responsive-breakpoints.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
  { h: 2, i: '3', w: 3, x: 9, y: 0 },
];

// A deliberately different arrangement at 'sm' — stacked in a single
// column, reordered — not just a narrower reflow of the 'lg' layout.
const responsiveLayouts: TResponsiveLayout = {
  sm: [
    { h: 2, i: '3', w: 6, x: 0, y: 0 },
    { h: 2, i: '0', w: 6, x: 0, y: 2 },
    { h: 2, i: '1', w: 6, x: 0, y: 4 },
    { h: 2, i: '2', w: 6, x: 0, y: 6 },
  ],
};

export default function ResponsivePredefinedLayouts() {
  const [lastBreakpoint, setLastBreakpoint] = useState<TBreakpoint>('lg');
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <span className="demo-description">Current breakpoint: <strong>{lastBreakpoint}</strong></span>
      </div>

      <GridLayout
        layout={layout}
        onBreakpointChange={(breakpoint) => setLastBreakpoint(breakpoint)}
        onLayoutChange={setLayout}
        responsive
        responsiveLayouts={responsiveLayouts}
        rowHeight={60}
        showGridLines
      >
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
