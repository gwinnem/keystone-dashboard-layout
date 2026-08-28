import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './04-multiple-grids.css';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';

export default function MultipleGrids() {
  const [layoutA, setLayoutA] = useState<TLayout>([
    { h: 2, i: 'a0', w: 3, x: 0, y: 0 },
    { h: 2, i: 'a1', w: 3, x: 3, y: 0 },
  ]);
  const [layoutB, setLayoutB] = useState<TLayout>([
    { h: 2, i: 'b0', w: 3, x: 0, y: 0 },
    { h: 2, i: 'b1', w: 3, x: 3, y: 0 },
  ]);

  return (
    <>
      <div className="grids-row">
        <div className="grid-column">
          <p className="grid-label">Grid A</p>
          <GridLayout colNum={6} layout={layoutA} onLayoutChange={setLayoutA} rowHeight={60} showGridLines>
            {layoutA.map((item) => (
              <GridItem i={item.i} key={item.i}>
                <div className="example-item">{item.i}</div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
        <div className="grid-column">
          <p className="grid-label">Grid B</p>
          <GridLayout colNum={6} layout={layoutB} onLayoutChange={setLayoutB} rowHeight={60} showGridLines>
            {layoutB.map((item) => (
              <GridItem i={item.i} key={item.i}>
                <div className="example-item">{item.i}</div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
      </div>

      <LayoutJsonViewer label="Grid A" layout={layoutA} />
      <LayoutJsonViewer label="Grid B" layout={layoutB} />
    </>
  );
}
