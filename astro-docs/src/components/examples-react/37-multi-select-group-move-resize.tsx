import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import '../examples-react/shared-example-item.css';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import './37-multi-select-group-move-resize.css';

const initialLayout: TLayout = [
  { h: 2, i: 'a', w: 3, x: 0, y: 0 },
  { h: 2, i: 'b', w: 3, x: 3, y: 0 },
  { h: 2, i: 'c', w: 3, x: 6, y: 0 },
  { h: 2, i: 'd', w: 3, x: 0, y: 2, isStatic: true, maxW: 3 },
];

export default function MultiSelectGroupMoveResize() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  // The imperative handle's own `selectedItems` is a snapshot, not
  // reactive state — reading it directly in JSX wouldn't re-render on
  // its own change. `onSelectionChanged` is the real, idiomatic way to
  // keep a piece of local state in sync with the grid's own selection.
  const [selectedItems, setSelectedItems] = useState<(string | number)[]>([]);

  return (
    <>
      <div className="demo-controls">
        <span className="demo-description">Selected: {selectedItems.join(', ') || 'none'}</span>
        <span className="demo-description">Try it: select two items, then Tab to one and press an arrow key — the other moves too.</span>
      </div>

      <GridLayout
        compactType={ECompactType.NONE}
        layout={layout}
        multiSelect
        onLayoutChange={setLayout}
        onSelectionChanged={setSelectedItems}
        rowHeight={80}
        showGridLines
        showResizeHandles
      >
        {layout.map((item) => (
          <GridItem
            i={item.i}
            key={item.i}
            renderResizeHandle={(edge) => <span className="resize-dot" title={edge}>⤡</span>}
          >
            <div className="example-item">
              {item.i}{item.i === 'd' ? ' (static)' : ''}
            </div>
          </GridItem>
        ))}
      </GridLayout>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
