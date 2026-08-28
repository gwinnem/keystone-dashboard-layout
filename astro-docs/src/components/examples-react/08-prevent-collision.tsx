import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 2, x: 2, y: 0 },
  { h: 2, i: '2', w: 2, x: 4, y: 0 },
];

export default function PreventCollision() {
  const [preventCollision, setPreventCollision] = useState(true);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={preventCollision} label="preventCollision" onChange={setPreventCollision} />
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} preventCollision={preventCollision} rowHeight={60} showGridLines>
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
