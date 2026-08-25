import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import ExampleNumberField from '../harness-react/ExampleNumberField';
import '../examples-react/shared-example-item.css';
import './14-border-radius.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 2, x: 2, y: 0 },
  { h: 2, i: '2', w: 2, x: 4, y: 0 },
];

export default function BorderRadius() {
  const [useBorderRadius, setUseBorderRadius] = useState(true);
  const [borderRadiusPx, setBorderRadiusPx] = useState(16);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={useBorderRadius} label="useBorderRadius" onChange={setUseBorderRadius} />
        <ExampleNumberField label="borderRadiusPx" max={40} min={0} onChange={setBorderRadiusPx} value={borderRadiusPx} />
      </div>

      <GridLayout
        borderRadiusPx={borderRadiusPx}
        colNum={12}
        layout={layout}
        onLayoutChange={setLayout}
        rowHeight={60}
        showGridLines
        useBorderRadius={useBorderRadius}
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
