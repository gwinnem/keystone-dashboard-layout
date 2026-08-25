import { useState } from 'react';
import { GridLayout, GridItem, useLayoutPresets } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './35-named-presets.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
];

export default function NamedPresets() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [presetName, setPresetName] = useState('compact');
  const { savePreset, loadPreset, listPresets } = useLayoutPresets('example-35-presets');
  const [presetNames, setPresetNames] = useState<string[]>(() => listPresets());

  function save(): void {
    if (!presetName) return;
    savePreset(presetName, layout);
    setPresetNames(listPresets());
  }

  function load(name: string): void {
    const loaded = loadPreset(name);
    if (loaded) setLayout(loaded);
  }

  return (
    <>
      <div className="demo-controls">
        <input className="demo-input" onChange={(e) => setPresetName(e.target.value)} placeholder="preset name" value={presetName} />
        <button className="demo-btn" onClick={save} type="button">Save preset</button>
        {presetNames.map((name) => (
          <button className="demo-btn demo-btn--ghost" key={name} onClick={() => load(name)} type="button">
            Load "{name}"
          </button>
        ))}
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
