import { useMemo, useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { ICompactor, TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './42-pluggable-compaction.css';

type TMode = 'vertical' | 'horizontal' | 'none' | 'vertical-overlap' | 'custom';

// A custom ICompactor — stacks every non-static item into a single
// left-hand column, one after another, ignoring x/width entirely.
// Deliberately dramatic/simple for clarity, not a realistic default.
const singleColumnCompactor: ICompactor = {
  type: 'single-column',
  compact(inputLayout) {
    let nextY = 0;
    return inputLayout.map((item) => {
      if (item.isStatic) return item;
      const positioned = { ...item, x: 0, y: nextY };
      nextY += item.h;
      return positioned;
    });
  },
};

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
  { h: 2, i: '3', w: 3, x: 9, y: 0 },
];

export default function PluggableCompaction() {
  const [mode, setMode] = useState<TMode>('vertical');
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  const compactType = useMemo(() => {
    switch (mode) {
      case 'horizontal': return ECompactType.HORIZONTAL;
      case 'none': return ECompactType.NONE;
      case 'vertical-overlap': return ECompactType.VERTICAL_OVERLAP;
      default: return ECompactType.VERTICAL;
    }
  }, [mode]);

  const compactor = mode === 'custom' ? singleColumnCompactor : null;

  function scatter(): void {
    setLayout((current) =>
      current.map((item) => ({
        ...item,
        x: Math.floor(Math.random() * 9),
        y: Math.floor(Math.random() * 6),
      })),
    );
  }

  return (
    <>
      <div className="demo-controls">
        <select className="demo-select" onChange={(e) => setMode(e.target.value as TMode)} value={mode}>
          <option value="vertical">compactType: vertical</option>
          <option value="horizontal">compactType: horizontal</option>
          <option value="none">compactType: none</option>
          <option value="vertical-overlap">compactType: vertical-overlap</option>
          <option value="custom">custom compactor: single column</option>
        </select>
        <button className="demo-btn" onClick={scatter} type="button">Scatter</button>
      </div>

      <GridLayout colNum={12} compactor={compactor} compactType={compactType} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
