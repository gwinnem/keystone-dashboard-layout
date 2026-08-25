import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import '../examples-react/shared-example-item.css';
import './20-auto-size-grid.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 4, x: 0, y: 0 },
  { h: 3, i: '1', w: 4, x: 4, y: 0 },
  { h: 4, i: '2', w: 4, x: 8, y: 0 },
];

export default function AutoSizeGrid() {
  const [autoSize, setAutoSize] = useState(true);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={autoSize} label="autoSize" onChange={setAutoSize} />
      </div>

      <div className={`fixed-frame${!autoSize ? ' fixed-frame--scroll' : ''}`}>
        <GridLayout autoSize={autoSize} colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
          {layout.map((item) => (
            <GridItem i={item.i} key={item.i}>
              <div className="example-item">{item.i}</div>
            </GridItem>
          ))}
        </GridLayout>
      </div>
    </>
  );
}
