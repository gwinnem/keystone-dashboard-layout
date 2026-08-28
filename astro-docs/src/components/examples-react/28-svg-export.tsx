import { useMemo, useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import { exportLayoutAsSvg } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './28-svg-export.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 6, x: 0, y: 2 },
];

export default function SvgExport() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [showExport, setShowExport] = useState(false);

  const dataUrl = useMemo(() => {
    const svg = exportLayoutAsSvg(layout, { backgroundColor: '#f8fafc', colNum: 12, containerWidth: 700, rowHeight: 80 });
    // A real data URL, not a placeholder — an <img>'s own src can
    // safely point at one directly, unlike dangerouslySetInnerHTML
    // (which would inject the raw SVG markup as live DOM), so this
    // needs no XSS-review suppression of any kind, and the download
    // link below is the exact same string, not a separate mechanism.
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, [layout]);

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={() => setShowExport((v) => !v)} type="button">
          {showExport ? 'Hide' : 'Show'} exported SVG
        </button>
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={80} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      {showExport ? (
        <>
          <p className="demo-description">
            Exported SVG (rendered below as a data URL — no dangerouslySetInnerHTML needed, since the raw markup never touches the DOM directly):
          </p>
          <div className="svg-preview">
            <img alt="Exported grid layout, rendered as SVG" src={dataUrl} />
          </div>
          <p className="demo-description">
            <a download="layout.svg" href={dataUrl}>Download layout.svg</a>
          </p>
        </>
      ) : null}
    </>
  );
}
