import { useMemo, useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout, TResizeHandle } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import './53-resize-direction-toggles.css';

const initialLayout: TLayout = [{ h: 3, i: '0', w: 4, x: 4, y: 0 }];

export default function ResizeDirectionToggles() {
  const [n, setN] = useState(true);
  const [s, setS] = useState(true);
  const [e, setE] = useState(true);
  const [w, setW] = useState(false);
  const [ne, setNe] = useState(true);
  const [nw, setNw] = useState(false);
  const [se, setSe] = useState(true);
  const [sw, setSw] = useState(false);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  const resizeHandles = useMemo<TResizeHandle[]>(() => {
    const handles: TResizeHandle[] = [];
    if (n) handles.push('n');
    if (s) handles.push('s');
    if (e) handles.push('e');
    if (w) handles.push('w');
    if (ne) handles.push('ne');
    if (nw) handles.push('nw');
    if (se) handles.push('se');
    if (sw) handles.push('sw');
    return handles;
  }, [n, s, e, w, ne, nw, se, sw]);

  const layoutWithHandles = useMemo<TLayout>(
    () => layout.map((item) => ({ ...item, resizeHandles })),
    [layout, resizeHandles],
  );

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={n} label="N" onChange={setN} />
        <ExampleToggle checked={s} label="S" onChange={setS} />
        <ExampleToggle checked={e} label="E" onChange={setE} />
        <ExampleToggle checked={w} label="W" onChange={setW} />
        <ExampleToggle checked={ne} label="NE" onChange={setNe} />
        <ExampleToggle checked={nw} label="NW" onChange={setNw} />
        <ExampleToggle checked={se} label="SE" onChange={setSe} />
        <ExampleToggle checked={sw} label="SW" onChange={setSw} />
      </div>

      <GridLayout colNum={12} layout={layoutWithHandles} onLayoutChange={setLayout} rowHeight={60} showGridLines showResizeHandles>
        {layoutWithHandles.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{resizeHandles.length ? resizeHandles.join(', ') : 'none'}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
