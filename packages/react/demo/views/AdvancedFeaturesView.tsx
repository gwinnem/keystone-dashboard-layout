import { useRef, useState } from 'react';
import type { IGridAriaLabels, ICompactor, TLayout } from '@keystone-dashboard-layout/core';
import { GridItem, GridLayout } from '../../src/index';
import type { IGridLayoutHandle } from '../../src/index';

function initialLayout(): TLayout {
  return [
    { h: 2, i: `0`, w: 3, x: 0, y: 0 },
    { h: 2, i: `1`, w: 3, x: 3, y: 0 },
    { h: 2, i: `2`, w: 3, x: 6, y: 0 },
  ];
}

// A deliberately simple, real ICompactor implementation — not the
// built-in vertical/horizontal/overlap strategies GridLayout already
// ships, so choosing it actually demonstrates the override taking
// effect: every non-static item packs into a single row (`y: 0`),
// left to right in layout order, ignoring each item's own current x —
// a "shelf" packer, visually obviously different from any built-in
// compactType.
const shelfCompactor: ICompactor = {
  compact: (layout, cols) => {
    let cursor = 0;
    return layout.map(item => {
      if(item.isStatic) {
        return item;
      }
      if(cursor + item.w > cols) {
        cursor = 0;
      }
      const next = { ...item, x: cursor, y: 0 };
      cursor += item.w;
      return next;
    });
  },
  type: `shelf`,
};

/**
 * Everything left over from every other view:
 * `exportLayoutAsSvg`, `scrollToItem`/`focusItem` (via `ref`), grid-wide
 * `isMirrored` (RTL) and `preserveAspectRatio`, a custom `compactor`
 * example, a keyboard-accessibility walkthrough, grid-wide `ariaLabels`,
 * and the remaining event callbacks (`onLayoutReady`/`onColumnsChanged`).
 */
export default function AdvancedFeaturesView(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const gridRef = useRef<IGridLayoutHandle>(null);
  const [isMirrored, setIsMirrored] = useState(false);
  const [preserveAspectRatio, setPreserveAspectRatio] = useState(false);
  const [useCustomCompactor, setUseCustomCompactor] = useState(false);
  const [colNum, setColNum] = useState(12);
  const [ariaLabels, setAriaLabels] = useState<IGridAriaLabels>({});
  const [svgOutput, setSvgOutput] = useState(``);
  const [log, setLog] = useState<string[]>([]);

  const appendLog = (entry: string): void => {
    setLog(prev => [...prev.slice(-49), entry]);
  };

  return (
    <div className="demo-view" data-testid="view-advanced-features">
      <h2>Advanced features</h2>
      <p className="demo-view-description">
        <code>exportLayoutAsSvg</code>, <code>scrollToItem</code>/<code>focusItem</code>, grid-wide{' '}
        <code>isMirrored</code>/<code>preserveAspectRatio</code>, a custom <code>compactor</code>, keyboard
        accessibility, grid-wide <code>ariaLabels</code>, and <code>onLayoutReady</code>/
        <code>onColumnsChanged</code>.
      </p>

      <div className="demo-controls">
        <fieldset className="demo-control-group">
          <legend>Grid-wide toggles</legend>
          <div className="demo-control">
            <input checked={isMirrored} data-testid="toggle-isMirrored" id="isMirrored" onChange={e => setIsMirrored(e.target.checked)} type="checkbox" />
            <label htmlFor="isMirrored">isMirrored (RTL)</label>
          </div>
          <div className="demo-control">
            <input checked={preserveAspectRatio} data-testid="toggle-preserveAspectRatio" id="preserveAspectRatio" onChange={e => setPreserveAspectRatio(e.target.checked)} type="checkbox" />
            <label htmlFor="preserveAspectRatio">preserveAspectRatio</label>
          </div>
          <div className="demo-control">
            <input checked={useCustomCompactor} data-testid="toggle-useCustomCompactor" id="useCustomCompactor" onChange={e => setUseCustomCompactor(e.target.checked)} type="checkbox" />
            <label htmlFor="useCustomCompactor">custom compactor (&quot;shelf&quot; packer)</label>
          </div>
          <div className="demo-control">
            <label htmlFor="colNum">colNum (onColumnsChanged)</label>
            <input data-testid="input-colNum" id="colNum" min={1} onChange={e => setColNum(Number(e.target.value))} type="number" value={colNum} />
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>scrollToItem / focusItem</legend>
          <div className="demo-control demo-control--wrap">
            {layout.map(item => (
              <button
                data-testid={`button-scroll-${item.i}`}
                key={item.i}
                onClick={() => gridRef.current?.scrollToItem(item.i)}
                type="button"
              >
                {`scrollToItem(${item.i})`}
              </button>
            ))}
          </div>
          <div className="demo-control demo-control--wrap">
            {layout.map(item => (
              <button
                data-testid={`button-focus-${item.i}`}
                key={item.i}
                onClick={() => gridRef.current?.focusItem(item.i)}
                type="button"
              >
                {`focusItem(${item.i})`}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>exportLayoutAsSvg</legend>
          <div className="demo-control">
            <button
              data-testid="button-export-svg"
              onClick={() => setSvgOutput(gridRef.current?.exportLayoutAsSvg() ?? ``)}
              type="button"
            >
              exportLayoutAsSvg()
            </button>
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>ariaLabels (grid-wide)</legend>
          <div className="demo-control">
            <label htmlFor="ariaCloseButton">closeButton</label>
            <input
              data-testid="input-ariaCloseButton"
              id="ariaCloseButton"
              onChange={e => setAriaLabels(prev => ({ ...prev, closeButton: e.target.value || undefined }))}
              placeholder="default: Close"
              type="text"
              value={ariaLabels.closeButton ?? ``}
            />
          </div>
          <div className="demo-control">
            <label htmlFor="ariaItemRole">itemRoleDescription</label>
            <input
              data-testid="input-ariaItemRole"
              id="ariaItemRole"
              onChange={e => setAriaLabels(prev => ({ ...prev, itemRoleDescription: e.target.value || undefined }))}
              placeholder="default: draggable, resizable widget"
              type="text"
              value={ariaLabels.itemRoleDescription ?? ``}
            />
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Keyboard accessibility</legend>
          <div className="demo-control">
            <span>
              Tab into an item, then: arrow keys move it, Shift+arrow resizes it. Tab again to move focus to
              the next focusable item in layout order.
            </span>
          </div>
        </fieldset>
      </div>

      <div className="demo-view-body">
        <div className="demo-view-main">
          <div className="demo-grid-area">
            <GridLayout
              ariaLabels={ariaLabels}
              colNum={colNum}
              compactor={useCustomCompactor ? shelfCompactor : null}
              isMirrored={isMirrored}
              layout={layout}
              onColumnsChanged={next => appendLog(`onColumnsChanged(${next})`)}
              onLayoutChange={setLayout}
              onLayoutReady={() => appendLog(`onLayoutReady`)}
              preserveAspectRatio={preserveAspectRatio}
              ref={gridRef}
              rowHeight={80}
            >
              {layout.map(item => (
                <GridItem i={item.i} key={item.i}>
                  <div className="demo-item-content">{`Item ${item.i}`}</div>
                </GridItem>
              ))}
            </GridLayout>
          </div>

          {svgOutput && (
            <div className="demo-svg-output">
              <p className="demo-status">exportLayoutAsSvg() output</p>
              <pre className="demo-json" data-testid="svg-output">{svgOutput}</pre>
            </div>
          )}
        </div>

        <div className="demo-view-log-column">
          <div className="demo-event-log" data-testid="event-log">
            {log.map((entry, index) => (
              // eslint-disable-next-line react/no-array-index-key -- log entries have no stable identity of their own, same rationale as GridLayout.tsx's own alignment-guide keys.
              <div className="demo-event-log-entry" key={index}>{entry}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
