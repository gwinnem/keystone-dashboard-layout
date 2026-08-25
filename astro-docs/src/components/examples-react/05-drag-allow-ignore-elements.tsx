import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import './05-drag-allow-ignore-elements.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0, dragAllowFrom: '.drag-handle' },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

export default function DragAllowIgnoreElements() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={70} showGridLines>
      {layout.map((item) => (
        <GridItem i={item.i} key={item.i}>
          <div className="example-item">
            {item.i === '0' ? <div className="drag-handle">drag here</div> : null}
            <div className="item-body">
              {item.i}
              {item.i === '1' ? <button className="no-drag-btn" type="button">not draggable</button> : null}
            </div>
          </div>
        </GridItem>
      ))}
    </GridLayout>
  );
}
