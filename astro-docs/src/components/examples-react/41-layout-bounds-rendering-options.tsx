import { useEffect, useRef, useState } from 'react';
import { GridLayout, GridItem, type IGridLayoutHandle } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import ExampleNumberField from '../harness-react/ExampleNumberField';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './41-layout-bounds-rendering-options.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 4, x: 0, y: 0 },
  { h: 2, i: '1', w: 4, x: 4, y: 0 },
  { h: 2, i: '2', w: 4, x: 8, y: 0 },
];

export default function LayoutBoundsRenderingOptions() {
  const [maxRowsEnabled, setMaxRowsEnabled] = useState(false);
  const [restoreOnDrag, setRestoreOnDrag] = useState(false);
  const [distributeEvenly, setDistributeEvenly] = useState(false);
  const [transformScale, setTransformScale] = useState(1);
  const [useCssTransforms, setUseCssTransforms] = useState(true);
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [positioningMechanism, setPositioningMechanism] = useState('');
  const gridRef = useRef<IGridLayoutHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // useCssTransforms toggles between two mechanisms that render
  // visually identically (transform: translate3d(...) vs plain
  // top/left), so there'd be no way to actually see the toggle do
  // anything without opening devtools. Reading the real, current
  // inline style back out of the rendered DOM makes the effect visible
  // here.
  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>('[data-grid-item-id="0"]');
    if (!el) return;
    setPositioningMechanism(el.style.transform ? `transform: ${el.style.transform}` : `top: ${el.style.top}, left: ${el.style.left}`);
  }, [useCssTransforms, layout]);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={maxRowsEnabled} label="maxRows: 3" onChange={setMaxRowsEnabled} />
        <ExampleToggle checked={restoreOnDrag} label="restoreOnDrag" onChange={setRestoreOnDrag} />
        <ExampleToggle checked={distributeEvenly} label="distributeEvenly" onChange={setDistributeEvenly} />
        <ExampleNumberField label="transformScale" max={2} min={0.5} onChange={setTransformScale} value={transformScale} />
        <ExampleToggle checked={useCssTransforms} label="useCssTransforms" onChange={setUseCssTransforms} />
      </div>

      <div ref={containerRef} style={{ transform: `scale(${transformScale})`, transformOrigin: 'top left' }}>
        <GridLayout
          colNum={12}
          distributeEvenly={distributeEvenly}
          layout={layout}
          maxRows={maxRowsEnabled ? 3 : Infinity}
          onLayoutChange={setLayout}
          ref={gridRef}
          restoreOnDrag={restoreOnDrag}
          rowHeight={60}
          showGridLines
          transformScale={transformScale}
          useCssTransforms={useCssTransforms}
        >
          {layout.map((item) => (
            <GridItem i={item.i} key={item.i}>
              <div className="example-item">{item.i}</div>
            </GridItem>
          ))}
        </GridLayout>
      </div>

      <p className="demo-description">
        Item "0"'s own positioning right now: <strong>{positioningMechanism}</strong>
      </p>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
