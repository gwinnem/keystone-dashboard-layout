import { useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import type { TLayout } from 'keystone-dashboard-layout-core';

interface IReport {
  h: number;
  height: number;
  i: string | number;
  w: number;
  width: number;
}

/**
 * Three items with the built-in maximize button on. The size each one last reported through `onItemResized` is written next to
 * the grid (not inside it, where a hidden item would hide its own readout), so a test can compare what was reported with what
 * the browser actually drew.
 */
export default function Maximize(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>([
    { h: 2, i: `0`, w: 4, x: 0, y: 0 },
    { h: 2, i: `1`, w: 4, x: 4, y: 0 },
    { h: 2, i: `2`, w: 4, x: 8, y: 0 },
  ]);
  const [reports, setReports] = useState<Record<string, IReport>>({});

  const handleResized = (payload: IReport): void => {
    setReports(previous => ({ ...previous, [String(payload.i)]: payload }));
  };

  return (
    <div data-testid="maximize-wrap">
      <div>
        {layout.map(item => {
          const report = reports[String(item.i)];
          return (
            <output data-testid={`reported-${item.i}`} key={item.i} style={{ display: `block` }}>
              {report ? `${report.width}x${report.height}` : `none`}
            </output>
          );
        })}
      </div>
      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={80} showMaximizeButton>
        {layout.map(item => (
          <GridItem i={item.i} key={item.i} onItemResized={handleResized}>
            <div className="fixture-item-content">
              {`Item ${item.i}`}
            </div>
          </GridItem>
        ))}
      </GridLayout>
    </div>
  );
}
