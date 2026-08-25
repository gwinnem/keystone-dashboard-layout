import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleNumberField from '../harness-react/ExampleNumberField';
import '../examples-react/shared-example-item.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
];

export default function GridDimensions() {
  const [rowHeight, setRowHeight] = useState(60);
  const [colNum, setColNum] = useState(12);
  const [marginX, setMarginX] = useState(10);
  const [marginY, setMarginY] = useState(10);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleNumberField label="rowHeight" max={200} min={20} onChange={setRowHeight} value={rowHeight} />
        <ExampleNumberField label="colNum" max={24} min={2} onChange={setColNum} value={colNum} />
        <ExampleNumberField label="margin[0]" max={40} min={0} onChange={setMarginX} value={marginX} />
        <ExampleNumberField label="margin[1]" max={40} min={0} onChange={setMarginY} value={marginY} />
      </div>

      <GridLayout colNum={colNum} layout={layout} margin={[marginX, marginY]} onLayoutChange={setLayout} rowHeight={rowHeight} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
