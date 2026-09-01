import { useEffect, useRef, useState } from 'react';
import { GridLayout, GridItem, type IGridLayoutHandle } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { IGridAriaLabels, TLayout } from 'keystone-dashboard-layout-core';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import ExampleToggle from '../harness-react/ExampleToggle';
import '../examples-react/shared-example-item.css';
import './36-aria-labels.css';

const initialLayout: TLayout = [
  { ariaLabels: undefined, h: 2, i: 'a', showCloseButton: true, w: 6, x: 0, y: 0 },
  { ariaLabels: { closeButton: 'Fermer' }, h: 2, i: 'b', showCloseButton: true, w: 6, x: 6, y: 0 },
];

const spanishLabels: IGridAriaLabels = {
  closeButton: 'Cerrar',
  itemRoleDescription: 'Elemento arrastrable y redimensionable',
  moveInstruction: 'Presiona las flechas para mover.',
  resizeInstruction: 'Presiona shift más flechas para redimensionar.',
};

interface IAriaReadoutRow {
  id: string;
  roleDescription: string;
  instructions: string;
  closeButtonLabel: string;
}

export default function AriaLabels() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [spanish, setSpanish] = useState(false);
  const [ariaReadout, setAriaReadout] = useState<IAriaReadoutRow[]>([]);
  const gridRef = useRef<IGridLayoutHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Every one of the strings this example is about is deliberately
  // visually hidden in normal use — toggling the language produces no
  // visible change at all on its own. Reading these same values back
  // out of the real, rendered DOM (not duplicating the ariaLabels
  // logic separately) and displaying them in an ordinary, visible
  // table makes the actual effect immediately visible without needing
  // devtools or a screen reader. useEffect (React's own "after mount
  // and after every subsequent commit" hook) is what makes sure this
  // reads the DOM only after it's actually settled, rather than
  // running synchronously during render before anything exists yet.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const next = layout.map((item) => {
      const el = container.querySelector<HTMLElement>(`[data-grid-item-id="${item.i}"]`);
      const closeButtonEl = el?.querySelector<HTMLElement>('.kdl-grid-item-close-button');
      const instructionsId = el?.getAttribute('aria-describedby');
      const instructionsEl = instructionsId ? container.querySelector<HTMLElement>(`#${instructionsId}`) : null;
      return {
        closeButtonLabel: closeButtonEl?.getAttribute('aria-label')?.trim() ?? '(none)',
        id: String(item.i),
        instructions: instructionsEl?.textContent?.trim().replace(/\s+/g, ' ') ?? '(none)',
        roleDescription: el?.getAttribute('aria-roledescription') ?? '(none)',
      };
    });
    setAriaReadout(next);
  }, [spanish, layout]);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={spanish} label="Use Spanish grid-wide labels" onChange={setSpanish} />
      </div>

      <div ref={containerRef}>
        <GridLayout
          ariaLabels={spanish ? spanishLabels : {}}
          colNum={12}
          layout={layout}
          onLayoutChange={setLayout}
          ref={gridRef}
          rowHeight={80}
          showGridLines
        >
          <GridItem i="a">
            <div className="example-item">Uses grid-wide labels</div>
          </GridItem>
          <GridItem i="b">
            <div className="example-item">Own override (French close button)</div>
          </GridItem>
        </GridLayout>
      </div>

      <div className="aria-readout">
        <h4>Current ARIA strings (normally screen-reader-only)</h4>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>aria-roledescription</th>
              <th>Move/resize instructions</th>
              <th>Close button label</th>
            </tr>
          </thead>
          <tbody>
            {ariaReadout.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.roleDescription}</td>
                <td>{row.instructions}</td>
                <td>{row.closeButtonLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
