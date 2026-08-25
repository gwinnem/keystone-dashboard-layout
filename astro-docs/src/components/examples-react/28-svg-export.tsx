import { useRef, useState } from 'react';
import { GridLayout, GridItem, type IGridLayoutHandle } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './28-svg-export.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
];

export default function SvgExport() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [svgMarkup, setSvgMarkup] = useState('');
  const gridRef = useRef<IGridLayoutHandle>(null);

  function exportSvg(): void {
    const svg = gridRef.current?.exportLayoutAsSvg() ?? '';
    setSvgMarkup(svg);
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={exportSvg} type="button">Export as SVG</button>
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} ref={gridRef} rowHeight={60} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      {svgMarkup ? (
        // eslint-disable-next-line react/no-danger -- the SVG string comes from the package's own exportLayoutAsSvg, not user input.
        <div className="svg-preview" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      ) : (
        <p className="demo-description">Click "Export as SVG" to see the output rendered here.</p>
      )}
    </>
  );
}
