import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import './51-drag-activation-distance.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0, dragActivationDistance: 40 },
];

export default function DragActivationDistance() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
      {layout.map((item) => (
        <GridItem i={item.i} key={item.i}>
          <div className="example-item">{item.i === '1' ? '40px threshold' : 'default (3px)'}</div>
        </GridItem>
      ))}
    </GridLayout>
  );
}
