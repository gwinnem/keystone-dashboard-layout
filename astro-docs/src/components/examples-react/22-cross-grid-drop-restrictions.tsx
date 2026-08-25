import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './04-multiple-grids.css';
import './07-responsive-breakpoints.css';

export default function CrossGridDropRestrictions() {
  const [layoutA, setLayoutA] = useState<TLayout>([{ h: 2, i: 'a0', w: 3, x: 0, y: 0 }]);
  const [layoutB, setLayoutB] = useState<TLayout>([{ h: 2, i: 'b0', w: 3, x: 0, y: 0 }]);
  const [lastEvent, setLastEvent] = useState('none yet');

  return (
    <>
      <div className="demo-controls">
        <span className="demo-description">Last event: <strong>{lastEvent}</strong></span>
      </div>

      <div className="grids-row">
        <div className="grid-column">
          <p className="grid-label">Grid A</p>
          <GridLayout allowCrossGridDrag colNum={6} layout={layoutA} layoutId="grid-a" onLayoutChange={setLayoutA} rowHeight={60} showGridLines>
            {layoutA.map((item) => (
              <GridItem i={item.i} key={item.i}>
                <div className="example-item">{item.i}</div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
        <div className="grid-column">
          <p className="grid-label">Grid B (rejects incoming drops)</p>
          <GridLayout
            allowCrossGridDrag
            colNum={6}
            disableExternalDrop
            layout={layoutB}
            layoutId="grid-b"
            onCrossGridDropRejected={({ itemId, sourceLayoutId }) => setLastEvent(`rejected ${itemId} from ${sourceLayoutId}`)}
            onLayoutChange={setLayoutB}
            rowHeight={60}
            showGridLines
          >
            {layoutB.map((item) => (
              <GridItem i={item.i} key={item.i}>
                <div className="example-item">{item.i}</div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
      </div>
    </>
  );
}
