import { useState } from 'react';
import { GridLayout, GridItem, useLayoutStorage } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import '../examples-react/shared-example-item.css';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import './19-save-load-layout.css';

const STORAGE_KEY = 'keystone-dashboard-layout-example-19-layout';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

export default function SaveLoadLayout() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [status, setStatus] = useState('');
  const { load, save } = useLayoutStorage(STORAGE_KEY);

  function handleSave(): void {
    save(layout);
    setStatus('Saved.');
  }

  function handleLoad(): void {
    const loaded = load();
    if (!loaded) {
      setStatus('Nothing saved yet.');
      return;
    }
    setLayout(loaded);
    setStatus('Loaded.');
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={handleSave} type="button">Save</button>
        <button className="demo-btn demo-btn--ghost" onClick={handleLoad} type="button">Load</button>
        {status ? <span className="demo-status">{status}</span> : null}
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
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
