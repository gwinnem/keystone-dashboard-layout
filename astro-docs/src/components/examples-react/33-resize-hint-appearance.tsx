import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './33-resize-hint-appearance.css';

// A per-item resizeHandleColor/showResizeHandles override always takes
// precedence over the grid-level default, the same inherit pattern
// isDraggable/isResizable already use — the color picker below only
// ever affects item "a", since "b"/"c" set their own directly on the
// layout item data (React's own GridItem is deliberately minimal and
// doesn't take these as component props at all — only i/header/
// children/renderResizeHandle/onItemMoved/onItemResized/className).
const initialLayout: TLayout = [
  { h: 2, i: 'a', w: 4, x: 0, y: 0 },
  { h: 2, i: 'b', resizeHandleColor: 'crimson', showResizeHandles: true, w: 4, x: 4, y: 0 },
  { h: 2, i: 'c', showResizeHandles: false, w: 4, x: 8, y: 0 },
];

export default function ResizeHintAppearance() {
  const [showResizeHandles, setShowResizeHandles] = useState(true);
  const [resizeHandleColor, setResizeHandleColor] = useState('#f2a93b');
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={showResizeHandles} label="showResizeHandles (grid default)" onChange={setShowResizeHandles} />
        <label className="demo-color-field">
          resizeHandleColor
          <input onChange={(e) => setResizeHandleColor(e.target.value)} type="color" value={resizeHandleColor} />
        </label>
      </div>

      <GridLayout
        colNum={12}
        layout={layout}
        onLayoutChange={setLayout}
        resizeHandleColor={resizeHandleColor}
        rowHeight={100}
        showGridLines
        showResizeHandles={showResizeHandles}
      >
        <GridItem i="a">
          <div className="example-item">grid default</div>
        </GridItem>
        <GridItem i="b">
          <div className="example-item">own override (always visible, crimson)</div>
        </GridItem>
        <GridItem i="c">
          <div className="example-item">own override (always hidden)</div>
        </GridItem>
      </GridLayout>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
