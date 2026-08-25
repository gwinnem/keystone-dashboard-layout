import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleNumberField from '../harness-react/ExampleNumberField';
import '../examples-react/shared-example-item.css';
import './24-transition-duration-easing.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
  { h: 2, i: '3', w: 3, x: 9, y: 0 },
];

export default function TransitionDurationEasing() {
  const [transitionDurationMs, setTransitionDurationMs] = useState(600);
  const [transitionTimingFunction, setTransitionTimingFunction] = useState('ease');
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  function shuffle(): void {
    setLayout((current) =>
      [...current]
        .sort(() => Math.random() - 0.5)
        .map((item, index) => ({ ...item, x: (index % 4) * 3, y: Math.floor(index / 4) * 2 })),
    );
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={shuffle} type="button">Shuffle</button>
        <ExampleNumberField label="transitionDurationMs" max={2000} min={0} onChange={setTransitionDurationMs} value={transitionDurationMs} />
        <select className="demo-select" onChange={(e) => setTransitionTimingFunction(e.target.value)} value={transitionTimingFunction}>
          <option value="ease">ease</option>
          <option value="linear">linear</option>
          <option value="ease-in-out">ease-in-out</option>
          <option value="cubic-bezier(.68,-0.55,.27,1.55)">bounce-ish</option>
        </select>
      </div>

      <GridLayout
        colNum={12}
        layout={layout}
        onLayoutChange={setLayout}
        rowHeight={60}
        showGridLines
        transitionDurationMs={transitionDurationMs}
        transitionTimingFunction={transitionTimingFunction}
      >
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
