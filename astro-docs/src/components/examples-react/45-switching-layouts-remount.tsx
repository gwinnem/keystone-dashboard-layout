import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './45-switching-layouts-remount.css';

const layoutA: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

const layoutB: TLayout = [
  { h: 3, i: '0', w: 4, x: 0, y: 0 },
  { h: 2, i: '1', w: 4, x: 4, y: 0 },
  { h: 2, i: '2', w: 4, x: 8, y: 0 },
];

export default function SwitchingLayoutsRemount() {
  const [layout, setLayout] = useState<TLayout>(layoutA.map((item) => ({ ...item })));
  const [remountKey, setRemountKey] = useState(0);

  function switchLayout(which: 'a' | 'b'): void {
    setLayout((which === 'a' ? layoutA : layoutB).map((item) => ({ ...item })));
  }

  function forceRemount(): void {
    setRemountKey((key) => key + 1);
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={() => switchLayout('a')} type="button">Layout A</button>
        <button className="demo-btn" onClick={() => switchLayout('b')} type="button">Layout B</button>
        <button className="demo-btn demo-btn--ghost" onClick={forceRemount} type="button">Force remount</button>
      </div>

      <GridLayout colNum={12} key={remountKey} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
