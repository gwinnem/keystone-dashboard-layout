import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import { topLeftStrategy, transformStrategy } from 'keystone-dashboard-layout-core';
import type { IPositionStrategy, TLayout } from 'keystone-dashboard-layout-core';
import './54-pluggable-positioning.css';

type TChoice = 'transform' | 'top-left' | 'outline';

// A custom strategy: reuse the built-in top/left output and add to it.
// getStyle() must keep width/height as 'NNpx' strings.
const outlineStrategy: IPositionStrategy = {
  className: 'strategy-outline',
  getStyle: (position) => ({
    ...topLeftStrategy.getStyle(position),
    outline: '2px dashed #f59e0b',
    outlineOffset: '-2px',
  }),
  type: 'outline',
};

const strategies: Record<TChoice, IPositionStrategy> = {
  outline: outlineStrategy,
  'top-left': topLeftStrategy,
  transform: transformStrategy,
};

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 4, x: 0, y: 0 },
  { h: 3, i: '1', w: 4, x: 4, y: 0 },
  { h: 2, i: '2', w: 4, x: 8, y: 0 },
  { h: 2, i: '3', w: 6, x: 0, y: 3 },
];

export default function PluggablePositioning() {
  const [choice, setChoice] = useState<TChoice>('transform');
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <label>
          Positioning strategy{' '}
          <select onChange={(e) => setChoice(e.target.value as TChoice)} value={choice}>
            <option value="transform">transformStrategy (CSS transforms)</option>
            <option value="top-left">topLeftStrategy (top / left)</option>
            <option value="outline">custom: top / left + outline</option>
          </select>
        </label>
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} positionStrategy={strategies[choice]} rowHeight={60} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">
              {item.i} &middot; {choice}
            </div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
