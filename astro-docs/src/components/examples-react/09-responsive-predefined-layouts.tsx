import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout, TResponsiveLayout } from '@keystone-dashboard-layout/core';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './07-responsive-breakpoints.css';

// The default (large-screen) layout — three items side by side. A more
// realistic "header/sidebar/content" dashboard shape than a flat row
// of interchangeable items, and the `xs` breakpoint (480px) rather
// than `sm` (768px) — the lower, more readily-crossable threshold
// that a narrow docs-example panel can actually reach.
const initialLayout: TLayout = [
  { h: 2, i: 'header', w: 6, x: 0, y: 0 },
  { h: 3, i: 'sidebar', w: 2, x: 0, y: 2 },
  { h: 3, i: 'content', w: 4, x: 2, y: 2 },
];

// Hand-authored layout for narrow screens: stack everything, sidebar last.
const responsiveLayouts: TResponsiveLayout = {
  xs: [
    { h: 2, i: 'header', w: 4, x: 0, y: 0 },
    { h: 4, i: 'content', w: 4, x: 0, y: 2 },
    { h: 3, i: 'sidebar', w: 4, x: 0, y: 6 },
  ],
};

export default function ResponsivePredefinedLayouts() {
  const [lastBreakpoint, setLastBreakpoint] = useState('—');
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <span className="demo-description">
          Instead of letting the library auto-generate a layout for each breakpoint, you can
          hand it exact layouts to switch between via <code>responsiveLayouts</code>. Shrink
          the panel (or your window) to see the hand-authored mobile layout kick in below{' '}
          <code>md</code>. Current breakpoint: <strong>{lastBreakpoint}</strong>
        </span>
      </div>

      <GridLayout
        layout={layout}
        onBreakpointChange={(breakpoint) => setLastBreakpoint(breakpoint)}
        onLayoutChange={setLayout}
        responsive
        responsiveLayouts={responsiveLayouts}
        rowHeight={50}
        showGridLines
      >
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
