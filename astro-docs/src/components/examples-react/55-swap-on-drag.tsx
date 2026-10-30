import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TCollisionMode, TLayout } from 'keystone-dashboard-layout-core';
import './55-swap-on-drag.css';

// Equal-size tiles: dropping one on another always has a clean cell to swap into.
const initialLayout: TLayout = [
  { h: 2, i: 'A', w: 4, x: 0, y: 0 },
  { h: 2, i: 'B', w: 4, x: 4, y: 0 },
  { h: 2, i: 'C', w: 4, x: 8, y: 0 },
  { h: 2, i: 'D', w: 4, x: 0, y: 2 },
  { h: 2, i: 'E', w: 4, x: 4, y: 2 },
  { h: 2, i: 'F', w: 4, x: 8, y: 2 },
];

export default function SwapOnDrag() {
  const [mode, setMode] = useState<TCollisionMode>('swap');
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <label>
          Collision mode{' '}
          <select onChange={(e) => setMode(e.target.value as TCollisionMode)} value={mode}>
            <option value="swap">swap: trade places</option>
            <option value="push">push: shove aside (default)</option>
          </select>
        </label>
      </div>

      <GridLayout collisionMode={mode} colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
