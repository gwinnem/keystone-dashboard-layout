import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import ExampleToggle from '../harness-react/ExampleToggle';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './04-multiple-grids.css';
import './12-cross-grid-drag-drop.css';

// `allowCrossGridDrag` needs to be set on *both* grids — toggling it
// off on either one confines dragging back to within that grid only,
// silently, with no error or event of any kind (a grid without this
// prop was never part of the cross-grid system in the first place).
// The target starts completely empty — given a min-height via CSS so
// there's still a reasonable drop target to aim for, since an
// actually-empty grid's own height would otherwise collapse to
// almost nothing.
const initialSourceLayout: TLayout = [
  { h: 2, i: 'a', w: 3, x: 0, y: 0 },
  { h: 2, i: 'b', w: 3, x: 0, y: 2 },
  { h: 2, i: 'locked', isStatic: true, w: 3, x: 0, y: 4 },
];

export default function CrossGridDragDrop() {
  const [sourceEnabled, setSourceEnabled] = useState(true);
  const [targetEnabled, setTargetEnabled] = useState(true);
  const [preventCollision, setPreventCollision] = useState(false);
  const [sourceLayout, setSourceLayout] = useState<TLayout>(initialSourceLayout);
  const [targetLayout, setTargetLayout] = useState<TLayout>([]);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={sourceEnabled} label="Source grid: allow cross-grid drag" onChange={setSourceEnabled} />
        <ExampleToggle checked={targetEnabled} label="Target grid: allow cross-grid drag" onChange={setTargetEnabled} />
        <ExampleToggle checked={preventCollision} label="preventCollision" onChange={setPreventCollision} />
      </div>

      <div className="grids-row">
        <div className="grid-column">
          <p className="grid-label">Source</p>
          <GridLayout
            allowCrossGridDrag={sourceEnabled}
            colNum={4}
            layout={sourceLayout}
            layoutId="cross-grid-drag-drop-source"
            onLayoutChange={setSourceLayout}
            preventCollision={preventCollision}
            rowHeight={60}
            showGridLines
          >
            {sourceLayout.map((item) => (
              <GridItem i={item.i} key={item.i}>
                <div className={item.isStatic ? 'example-item example-item--static' : 'example-item'}>
                  {item.i}
                  {item.isStatic ? <small>locked</small> : null}
                </div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
        <div className="grid-column">
          <p className="grid-label">Target</p>
          <GridLayout
            allowCrossGridDrag={targetEnabled}
            colNum={4}
            layout={targetLayout}
            layoutId="cross-grid-drag-drop-target"
            onLayoutChange={setTargetLayout}
            preventCollision={preventCollision}
            rowHeight={60}
            showGridLines
          >
            {targetLayout.map((item) => (
              <GridItem i={item.i} key={item.i}>
                <div className="example-item">{item.i}</div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
      </div>

      <LayoutJsonViewer label="Source" layout={sourceLayout} />
      <LayoutJsonViewer label="Target" layout={targetLayout} />
    </>
  );
}
