import { useRef, useState } from 'react';
import { GridLayout, GridItem, type IGridLayoutHandle } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './27-scroll-to-item-focus-item.css';

const initialLayout: TLayout = Array.from({ length: 12 }, (_, index) => ({
  h: 2,
  i: String(index),
  w: 2,
  x: (index % 2) * 2,
  y: Math.floor(index / 2) * 2,
}));

export default function ScrollToItemFocusItem() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const gridRef = useRef<IGridLayoutHandle>(null);

  return (
    <>
      <div className="demo-controls">
        {['0', '5', '11'].map((id) => (
          <button className="demo-btn" key={id} onClick={() => gridRef.current?.scrollToItem(id)} type="button">
            Scroll to {id}
          </button>
        ))}
        <button className="demo-btn demo-btn--ghost" onClick={() => gridRef.current?.focusItem('11')} type="button">
          Focus 11
        </button>
      </div>

      <div className="scroll-frame">
        <GridLayout colNum={4} layout={layout} onLayoutChange={setLayout} ref={gridRef} rowHeight={60} showGridLines>
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
