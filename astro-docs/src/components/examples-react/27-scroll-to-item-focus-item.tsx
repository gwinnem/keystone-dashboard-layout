import { useRef, useState } from 'react';
import { GridLayout, GridItem, type IGridLayoutHandle } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './27-scroll-to-item-focus-item.css';

const initialLayout: TLayout = Array.from({ length: 6 }, (_, index) => ({ h: 2, i: String(index), w: 4, x: 0, y: index * 2 }));

export default function ScrollToItemFocusItem() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const gridRef = useRef<IGridLayoutHandle>(null);

  function addAndJumpToItem(): void {
    const id = `new-${Date.now()}`;
    setLayout((current) => {
      const next = [...current, { h: 2, i: id, w: 4, x: 0, y: current.length * 2 }];
      return next;
    });
    // The new item's own element doesn't exist in the DOM yet at this
    // exact point — React batches DOM updates asynchronously, so a
    // naive synchronous call here would find nothing and do nothing.
    // Scheduling for the next tick (a microtask, after React commits)
    // gives the new element time to actually mount.
    setTimeout(() => {
      gridRef.current?.scrollToItem(id);
      gridRef.current?.focusItem(id);
    }, 0);
  }

  function jumpToFirst(): void {
    gridRef.current?.scrollToItem('0');
    gridRef.current?.focusItem('0');
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={addAndJumpToItem} type="button">+ Add item (scrolls &amp; focuses it)</button>
        <button className="demo-btn demo-btn--ghost" onClick={jumpToFirst} type="button">Scroll to item 0</button>
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

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
