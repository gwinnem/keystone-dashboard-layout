import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import '../examples-react/shared-example-item.css';
import './50-height-modes.css';

type THeightMode = 'auto' | 'fixed' | 'scroll' | 'fit';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 3, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 0, y: 6 },
  { h: 2, i: '3', w: 3, x: 3, y: 8 },
];

export default function HeightModes() {
  const [heightMode, setHeightMode] = useState<THeightMode>('auto');
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <select className="demo-select" onChange={(e) => setHeightMode(e.target.value as THeightMode)} value={heightMode}>
          <option value="auto">auto (grows to fit, default)</option>
          <option value="fixed">fixed (no explicit height)</option>
          <option value="scroll">scroll (fixed frame height, scrolls)</option>
          <option value="fit">fit (100% of parent, scrolls)</option>
        </select>
      </div>

      <div className="fixed-frame">
        <GridLayout colNum={6} heightMode={heightMode} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
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
