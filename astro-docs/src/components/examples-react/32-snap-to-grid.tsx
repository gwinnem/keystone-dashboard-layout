import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import ExampleNumberField from '../harness-react/ExampleNumberField';
import '../examples-react/shared-example-item.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 4, y: 0 },
];

export default function SnapToGrid() {
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapThreshold, setSnapThreshold] = useState(1);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={snapToGrid} label="snapToGrid" onChange={setSnapToGrid} />
        <ExampleNumberField label="snapThreshold" max={4} min={1} onChange={setSnapThreshold} value={snapThreshold} />
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines snapThreshold={snapThreshold} snapToGrid={snapToGrid}>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
