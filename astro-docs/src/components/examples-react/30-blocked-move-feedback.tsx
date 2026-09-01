import { useRef, useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import '../examples-react/shared-example-item.css';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import './17-static-items.css';
import './30-blocked-move-feedback.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: 'anchor', w: 3, x: 3, y: 0, isStatic: true },
];

export default function BlockedMoveFeedback() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [flashing, setFlashing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleBlocked(): void {
    setFlashing(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setFlashing(false), 900);
  }

  return (
    <>
      <div className="demo-controls">
        <span className={`demo-status${flashing ? ' demo-status--active' : ''}`}>
          {flashing ? 'Blocked!' : 'Try dragging item 0 onto the static item'}
        </span>
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} onMoveBlockedByCollision={handleBlocked} preventCollision rowHeight={60} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className={`example-item${item.i === 'anchor' ? ' example-item--static' : ''}`}>
              {item.i === 'anchor' ? 'static' : item.i}
            </div>
          </GridItem>
        ))}
      </GridLayout>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
