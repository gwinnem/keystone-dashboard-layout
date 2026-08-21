import { useRef, useState } from 'react';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout, TResizeHandle } from '@keystone-dashboard-layout/core';
import { GridItem, GridLayout } from '../../src/index';
import type { IGridLayoutHandle } from '../../src/index';

const ALL_RESIZE_HANDLES: TResizeHandle[] = [`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`];
const HEIGHT_MODES = [`auto`, `fixed`, `scroll`, `fit`] as const;
const COMPACT_TYPES = Object.values(ECompactType);

// renderResizeHandle's own worked example — a real directional arrow
// glyph per edge/corner reads far more clearly at the resize-hint's
// own small (10px) size than the 2-letter edge name itself would ("nw"
// as literal text was cramped/illegible at that size; an arrow
// communicates the resize direction at a glance instead).
const RESIZE_HANDLE_ICONS: Record<TResizeHandle, string> = {
  e: `\u2192`,
  n: `\u2191`,
  ne: `\u2197`,
  nw: `\u2196`,
  s: `\u2193`,
  se: `\u2198`,
  sw: `\u2199`,
  w: `\u2190`,
};

function initialLayout(): TLayout {
  return [
    { h: 2, i: `0`, w: 3, x: 0, y: 0 },
    { h: 2, i: `1`, w: 3, x: 3, y: 0 },
    { h: 2, i: `2`, w: 3, x: 6, y: 0 },
  ];
}

/**
 * The single largest view by control count — every grid-wide toggle
 * not covered by a more specific view, plus a live event log. See
 * `docs/DEMO_APP_IMPLEMENTATION_PLAN.md`'s own section 2 for the full,
 * confirmed feature list this covers.
 */
export default function DragResizeView(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const gridRef = useRef<IGridLayoutHandle>(null);
  const [log, setLog] = useState<string[]>([]);

  // Interaction
  const [isDraggable, setIsDraggable] = useState(true);
  const [isResizable, setIsResizable] = useState(true);
  const [isBounded, setIsBounded] = useState(false);
  const [preventCollision, setPreventCollision] = useState(false);
  const [enableEditMode, setEnableEditMode] = useState(true);

  // Compaction
  const [compactType, setCompactType] = useState<ECompactType>(ECompactType.VERTICAL);
  const [restoreOnDrag, setRestoreOnDrag] = useState(false);
  const [distributeEvenly, setDistributeEvenly] = useState(false);
  const [horizontalShift, setHorizontalShift] = useState(false);

  // Rendering
  const [useCssTransforms, setUseCssTransforms] = useState(true);
  const [transformScale, setTransformScale] = useState(1);
  const [transitionDurationMs, setTransitionDurationMs] = useState(200);
  const [transitionTimingFunction, setTransitionTimingFunction] = useState(`ease`);
  const [heightMode, setHeightMode] = useState<(typeof HEIGHT_MODES)[number]>(`auto`);
  const [showGridLines, setShowGridLines] = useState(false);

  // Resize affordance
  const [resizeHandles, setResizeHandles] = useState<TResizeHandle[]>(ALL_RESIZE_HANDLES);
  const [showResizeHandles, setShowResizeHandles] = useState(false);
  const [resizeHandleColor, setResizeHandleColor] = useState(`rgb(94 94 94 / 45%)`);
  const [customResizeIcons, setCustomResizeIcons] = useState(false);

  // Snap & guides
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapThreshold, setSnapThreshold] = useState(1);
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(false);
  const [showSpacingGuides, setShowSpacingGuides] = useState(false);

  // Close button
  const [showCloseButton, setShowCloseButton] = useState(false);

  // Custom header content
  const [showHeader, setShowHeader] = useState(false);

  const appendLog = (entry: string): void => {
    setLog(prev => [...prev.slice(-49), entry]);
  };

  const toggleResizeHandle = (handle: TResizeHandle): void => {
    setResizeHandles(prev => (prev.includes(handle) ? prev.filter(h => h !== handle) : [...prev, handle]));
  };

  // dragAllowFrom/resizeIgnoreFrom are per-item *layout data* fields
  // (ILayoutItem), not GridItem component props -- confirmed in
  // grid-item-props.interface.ts, which only accepts
  // i/header/children/renderResizeHandle/className. Passing either
  // directly to <GridItem> would be silently dropped (neither
  // component forwards arbitrary extra props). Merging them into the
  // layout array itself instead -- the same place showHeader's own
  // worked example (matching Vue's example 18 mechanism, see the
  // implementation plan's own cross-check section) needs them to
  // actually live -- is what makes them take effect at all.
  const effectiveLayout = layout.map(item => (showHeader
    ? { ...item, dragAllowFrom: `.demo-drag-handle`, resizeIgnoreFrom: `.demo-drag-handle` }
    : { ...item, dragAllowFrom: null, resizeIgnoreFrom: null }
  ));

  return (
    <div className="demo-view" data-testid="view-drag-resize">
      <h2>Drag &amp; resize toggles</h2>
      <p className="demo-view-description">
        Every grid-wide prop not covered by a more specific view — interaction, compaction, rendering,
        resize affordances, snapping/guides, the close button, and custom header content — plus a live
        event log below.
      </p>

      <div className="demo-controls">
        <fieldset className="demo-control-group">
          <legend>Interaction</legend>
          <div className="demo-control">
            <input checked={isDraggable} data-testid="toggle-isDraggable" id="isDraggable" onChange={e => setIsDraggable(e.target.checked)} type="checkbox" />
            <label htmlFor="isDraggable">isDraggable</label>
          </div>
          <div className="demo-control">
            <input checked={isResizable} data-testid="toggle-isResizable" id="isResizable" onChange={e => setIsResizable(e.target.checked)} type="checkbox" />
            <label htmlFor="isResizable">isResizable</label>
          </div>
          <div className="demo-control">
            <input checked={isBounded} data-testid="toggle-isBounded" id="isBounded" onChange={e => setIsBounded(e.target.checked)} type="checkbox" />
            <label htmlFor="isBounded">isBounded</label>
          </div>
          <div className="demo-control">
            <input checked={preventCollision} data-testid="toggle-preventCollision" id="preventCollision" onChange={e => setPreventCollision(e.target.checked)} type="checkbox" />
            <label htmlFor="preventCollision">preventCollision</label>
          </div>
          <div className="demo-control">
            <input checked={enableEditMode} data-testid="toggle-enableEditMode" id="enableEditMode" onChange={e => setEnableEditMode(e.target.checked)} type="checkbox" />
            <label htmlFor="enableEditMode">enableEditMode</label>
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Compaction</legend>
          <div className="demo-control">
            <label htmlFor="compactType">compactType</label>
            <select data-testid="select-compactType" id="compactType" onChange={e => setCompactType(e.target.value as ECompactType)} value={compactType}>
              {COMPACT_TYPES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="demo-control">
            <input checked={restoreOnDrag} data-testid="toggle-restoreOnDrag" id="restoreOnDrag" onChange={e => setRestoreOnDrag(e.target.checked)} type="checkbox" />
            <label htmlFor="restoreOnDrag">restoreOnDrag</label>
          </div>
          <div className="demo-control">
            <input checked={distributeEvenly} data-testid="toggle-distributeEvenly" id="distributeEvenly" onChange={e => setDistributeEvenly(e.target.checked)} type="checkbox" />
            <label htmlFor="distributeEvenly">distributeEvenly</label>
          </div>
          <div className="demo-control">
            <input checked={horizontalShift} data-testid="toggle-horizontalShift" id="horizontalShift" onChange={e => setHorizontalShift(e.target.checked)} type="checkbox" />
            <label htmlFor="horizontalShift">horizontalShift</label>
          </div>
          <div className="demo-control">
            <button data-testid="button-compactNow" onClick={() => gridRef.current?.compactNow()} type="button">compactNow()</button>
            <button data-testid="button-rearrange" onClick={() => gridRef.current?.rearrange()} type="button">rearrange()</button>
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Rendering</legend>
          <div className="demo-control">
            <input checked={useCssTransforms} data-testid="toggle-useCssTransforms" id="useCssTransforms" onChange={e => setUseCssTransforms(e.target.checked)} type="checkbox" />
            <label htmlFor="useCssTransforms">useCssTransforms</label>
          </div>
          <div className="demo-control">
            <label htmlFor="transformScale">transformScale</label>
            <input
              data-testid="input-transformScale"
              id="transformScale"
              min={0.25}
              max={2}
              onChange={e => setTransformScale(Number(e.target.value))}
              step={0.05}
              type="range"
              value={transformScale}
            />
            <span>{transformScale.toFixed(2)}</span>
          </div>
          <div className="demo-control">
            <label htmlFor="transitionDurationMs">transitionDurationMs</label>
            <input
              data-testid="input-transitionDurationMs"
              id="transitionDurationMs"
              onChange={e => setTransitionDurationMs(Number(e.target.value))}
              type="number"
              value={transitionDurationMs}
            />
          </div>
          <div className="demo-control">
            <label htmlFor="transitionTimingFunction">transitionTimingFunction</label>
            <select data-testid="select-transitionTimingFunction" id="transitionTimingFunction" onChange={e => setTransitionTimingFunction(e.target.value)} value={transitionTimingFunction}>
              <option value="ease">ease</option>
              <option value="ease-out">ease-out</option>
              <option value="linear">linear</option>
              <option value="cubic-bezier(0.34, 1.56, 0.64, 1)">cubic-bezier (bounce)</option>
            </select>
          </div>
          <div className="demo-control">
            <label htmlFor="heightMode">heightMode</label>
            <select data-testid="select-heightMode" id="heightMode" onChange={e => setHeightMode(e.target.value as typeof heightMode)} value={heightMode}>
              {HEIGHT_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </div>
          <div className="demo-control">
            <input checked={showGridLines} data-testid="toggle-showGridLines" id="showGridLines" onChange={e => setShowGridLines(e.target.checked)} type="checkbox" />
            <label htmlFor="showGridLines">showGridLines</label>
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Resize affordance</legend>
          <div className="demo-control demo-control--wrap">
            <span>resizeHandles:</span>
            {ALL_RESIZE_HANDLES.map(handle => (
              <label key={handle}>
                <input
                  checked={resizeHandles.includes(handle)}
                  data-testid={`toggle-resizeHandle-${handle}`}
                  onChange={() => toggleResizeHandle(handle)}
                  type="checkbox"
                />
                {handle}
              </label>
            ))}
          </div>
          <div className="demo-control">
            <input checked={showResizeHandles} data-testid="toggle-showResizeHandles" id="showResizeHandles" onChange={e => setShowResizeHandles(e.target.checked)} type="checkbox" />
            <label htmlFor="showResizeHandles">showResizeHandles</label>
          </div>
          <div className="demo-control">
            <label htmlFor="resizeHandleColor">resizeHandleColor</label>
            <input data-testid="input-resizeHandleColor" id="resizeHandleColor" onChange={e => setResizeHandleColor(e.target.value)} type="text" value={resizeHandleColor} />
          </div>
          <div className="demo-control">
            <input
              checked={customResizeIcons}
              data-testid="toggle-customResizeIcons"
              id="customResizeIcons"
              onChange={e => setCustomResizeIcons(e.target.checked)}
              type="checkbox"
            />
            <label htmlFor="customResizeIcons">renderResizeHandle (custom icon — also enable showResizeHandles above to see it)</label>
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Snap &amp; guides</legend>
          <div className="demo-control">
            <input checked={snapToGrid} data-testid="toggle-snapToGrid" id="snapToGrid" onChange={e => setSnapToGrid(e.target.checked)} type="checkbox" />
            <label htmlFor="snapToGrid">snapToGrid</label>
          </div>
          <div className="demo-control">
            <label htmlFor="snapThreshold">snapThreshold</label>
            <input data-testid="input-snapThreshold" id="snapThreshold" min={0} onChange={e => setSnapThreshold(Number(e.target.value))} type="number" value={snapThreshold} />
          </div>
          <div className="demo-control">
            <input checked={showAlignmentGuides} data-testid="toggle-showAlignmentGuides" id="showAlignmentGuides" onChange={e => setShowAlignmentGuides(e.target.checked)} type="checkbox" />
            <label htmlFor="showAlignmentGuides">showAlignmentGuides</label>
          </div>
          <div className="demo-control">
            <input checked={showSpacingGuides} data-testid="toggle-showSpacingGuides" id="showSpacingGuides" onChange={e => setShowSpacingGuides(e.target.checked)} type="checkbox" />
            <label htmlFor="showSpacingGuides">showSpacingGuides</label>
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Close button &amp; header</legend>
          <div className="demo-control">
            <input checked={showCloseButton} data-testid="toggle-showCloseButton" id="showCloseButton" onChange={e => setShowCloseButton(e.target.checked)} type="checkbox" />
            <label htmlFor="showCloseButton">showCloseButton</label>
          </div>
          <div className="demo-control">
            <input checked={showHeader} data-testid="toggle-showHeader" id="showHeader" onChange={e => setShowHeader(e.target.checked)} type="checkbox" />
            <label htmlFor="showHeader">header (drag handle via dragAllowFrom + resizeIgnoreFrom)</label>
          </div>
        </fieldset>
      </div>

      <div className="demo-view-body">
        <div className="demo-view-main">
          <div className="demo-grid-area">
        <GridLayout
          colNum={12}
          compactType={compactType}
          distributeEvenly={distributeEvenly}
          enableEditMode={enableEditMode}
          heightMode={heightMode}
          horizontalShift={horizontalShift}
          isBounded={isBounded}
          isDraggable={isDraggable}
          isResizable={isResizable}
          layout={effectiveLayout}
          margin={[10, 10]}
          onDragEnd={id => appendLog(`onDragEnd(${id})`)}
          onDragMove={id => appendLog(`onDragMove(${id})`)}
          onDragStart={id => appendLog(`onDragStart(${id})`)}
          onItemClose={id => {
            appendLog(`onItemClose(${id})`);
            setLayout(prev => prev.filter(item => item.i !== id));
          }}
          onLayoutChange={setLayout}
          onMoveBlockedByCollision={id => appendLog(`onMoveBlockedByCollision(${id})`)}
          preventCollision={preventCollision}
          ref={gridRef}
          resizeHandleColor={resizeHandleColor}
          resizeHandles={resizeHandles}
          restoreOnDrag={restoreOnDrag}
          rowHeight={80}
          showAlignmentGuides={showAlignmentGuides}
          showCloseButton={showCloseButton}
          showGridLines={showGridLines}
          showResizeHandles={showResizeHandles}
          showSpacingGuides={showSpacingGuides}
          snapThreshold={snapThreshold}
          snapToGrid={snapToGrid}
          transformScale={transformScale}
          transitionDurationMs={transitionDurationMs}
          transitionTimingFunction={transitionTimingFunction}
          useCssTransforms={useCssTransforms}
        >
          {effectiveLayout.map(item => (
            <GridItem
              i={item.i}
              key={item.i}
              header={showHeader ? <div className="demo-drag-handle">drag here</div> : undefined}
              renderResizeHandle={customResizeIcons ? (edge => <span className="demo-resize-icon">{RESIZE_HANDLE_ICONS[edge]}</span>) : undefined}
            >
              <div className="demo-item-content">{`Item ${item.i}`}</div>
            </GridItem>
          ))}
          </GridLayout>
          </div>
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
