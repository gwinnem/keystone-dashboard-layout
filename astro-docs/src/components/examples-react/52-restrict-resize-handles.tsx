import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import './52-restrict-resize-handles.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0, resizeHandles: ['se'] },
  { h: 2, i: '1', w: 3, x: 4, y: 0, resizeHandles: ['e', 'w'] },
];

export default function RestrictResizeHandles() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines showResizeHandles>
      {layout.map((item) => (
        <GridItem i={item.i} key={item.i}>
          <div className="example-item">{item.i === '0' ? 'only se' : 'only e/w'}</div>
        </GridItem>
      ))}
    </GridLayout>
  );
}
