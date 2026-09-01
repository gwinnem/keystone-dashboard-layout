import { useRef, useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import { findFirstFitSlot } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import ExampleToggle from '../harness-react/ExampleToggle';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './10-add-remove-items.css';

const colNum = 12;

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

export default function AddRemoveItems() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [appendToFirstRow, setAppendToFirstRow] = useState(false);
  const nextId = useRef(2);

  /**
   * A real first-fit bin-pack, ported directly from the previous
   * VitePress-based docs site's own identical example (confirmed via a
   * direct source read, including that file's own two documented bug
   * fixes below — not re-derived from scratch): appending with `x:0,
   * y:0` (or `y: Infinity`, the simpler convention this package's other
   * examples use) and letting compaction settle it is the normal
   * pattern, but it never *reuses a gap* left by a removed item — a new
   * item always lands in a fresh row at the bottom even when there's
   * clearly room higher up. `findFirstFitSlot` (this package's own
   * exported helper — the same one `allowCrossGridDrag`'s own accept
   * side uses) scans row by row from the top, column by column from the
   * left, for the first open gap instead.
   */
  function addItem(): void {
    setLayout((current) => {
      const newItem = { h: 2, i: String(nextId.current), w: 3, x: 0, y: 0 };
      nextId.current += 1;

      if (appendToFirstRow) {
        const firstRowItems = current.filter((item) => item.y === 0);
        // Bug fix (ported from the same source): the rightmost occupied
        // edge (max of x+w across first-row items), not the sum of
        // every first-row item's own width — summing only equals "the
        // first free column" when the row is packed with no gaps at
        // all; removing an item from the middle of a full first row
        // (not the end) leaves the sum unchanged, landing the new item
        // on top of whatever's still sitting at the old rightmost edge
        // instead of in the actual gap this toggle exists to fill.
        const rightmostEdge = firstRowItems.reduce((max, item) => Math.max(max, item.x + item.w), 0);
        if (rightmostEdge + newItem.w <= colNum) {
          newItem.x = rightmostEdge;
          return [...current, newItem];
        }
        // First row is full — fall through to the general bin-pack below.
      }

      const slot = findFirstFitSlot(current, colNum, newItem.w, newItem.h);
      newItem.x = slot.x;
      newItem.y = slot.y;
      return [...current, newItem];
    });
  }

  function removeItem(id: string | number): void {
    setLayout((current) => current.filter((item) => item.i !== id));
  }

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={appendToFirstRow} label="Add to end of first row (instead of a new row)" onChange={setAppendToFirstRow} />
        <button className="demo-btn" onClick={addItem} type="button">+ Add item</button>
        <button className="demo-btn demo-btn--ghost" onClick={() => setLayout([])} type="button">Clear all</button>
      </div>

      <GridLayout
        colNum={colNum}
        layout={layout}
        onItemClose={removeItem}
        onLayoutChange={setLayout}
        rowHeight={60}
        showCloseButton
        showGridLines
      >
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
