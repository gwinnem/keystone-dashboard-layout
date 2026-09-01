import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import ExampleToggle from '../harness-react/ExampleToggle';
import '../examples-react/shared-example-item.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 3, i: '1', w: 3, x: 5, y: 2 },
  { h: 2, i: '2', w: 3, x: 8, y: 0 },
];

export default function SpacingIndicators() {
  const [showSpacingGuides, setShowSpacingGuides] = useState(true);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={showSpacingGuides} label="showSpacingGuides" onChange={setShowSpacingGuides} />
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines showSpacingGuides={showSpacingGuides}>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
