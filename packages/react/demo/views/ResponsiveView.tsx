import { useMemo, useState } from 'react';
import type { IBreakpoints, IColumns, TBreakpoint, TLayout, TResponsiveLayout } from '@keystone-dashboard-layout/core';
import { GridItem, GridLayout } from '../../src/index';

const BREAKPOINT_NAMES: (keyof IBreakpoints)[] = [`xxl`, `xl`, `lg`, `md`, `sm`, `xs`, `xxs`];

const DEFAULT_BREAKPOINTS: IBreakpoints = { lg: 1200, md: 996, sm: 768, xl: 1400, xs: 480, xxl: 1600, xxs: 0 };
const DEFAULT_COLS: IColumns = { lg: 12, md: 10, sm: 6, xl: 12, xs: 4, xxl: 12, xxs: 2 };

function initialLayout(): TLayout {
  return [
    { h: 2, i: `0`, w: 4, x: 0, y: 0 },
    { h: 2, i: `1`, w: 4, x: 4, y: 0 },
    { h: 2, i: `2`, w: 4, x: 8, y: 0 },
  ];
}

// A distinct, hand-authored layout for the "sm" breakpoint specifically
// — when `responsiveLayouts.sm` is set, entering "sm" uses *this* exact
// layout instead of `findOrGenerateResponsiveLayout`'s own auto-bounds-
// corrected-and-compacted version, demonstrating that a pre-defined
// entry wins outright.
const CUSTOM_SM_LAYOUT: TLayout = [
  { h: 3, i: `0`, w: 6, x: 0, y: 0 },
  { h: 3, i: `1`, w: 6, x: 0, y: 3 },
  { h: 3, i: `2`, w: 6, x: 0, y: 6 },
];

// The simulated-width slider's own floor — the container can never be
// narrower than what's needed to render this view's own widest item
// (6 grid units, from CUSTOM_SM_LAYOUT above) at a bare-minimum usable
// per-column pixel size (50px), plus the margin gaps between/around
// columns (7 gaps at the default 10px margin). Below this, colWidth
// math produces degenerate, visually broken results — items rendering
// far too narrow to actually show their own content, handles
// overlapping, etc. — not a real, useful breakpoint state to simulate.
const MIN_SIMULATED_WIDTH = 6 * 50 + 7 * 10;

// The minW/maxW-vs-breakpoint-overflow demo, generalized to multiple
// columns (not just the single-item case this behavior was originally
// confirmed against) — see core's own `correctBounds` and its own
// updated comment for the underlying library fix this demonstrates.
// Applying the same minW to all three items at once means, at a narrow
// breakpoint (xxs: 2 cols), *every* item hits its own floor
// simultaneously — multiple columns' worth of overflow content side by
// side, not just one item spilling over alone.
const MIN_W_FLOOR = 3;

/**
 * `responsive`, `breakpoints`, `cols`, `responsiveLayouts`,
 * `onBreakpointChange` — plus a simulated-container-width slider (a
 * wrapping `<div>` with an inline pixel width, driven by the slider;
 * `GridLayout`'s own `ResizeObserver` measures *that* constrained
 * width, achieving the same effect as an actual browser resize without
 * needing one) so breakpoint behavior is testable without resizing the
 * real browser window.
 */
export default function ResponsiveView(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [breakpoints, setBreakpoints] = useState<IBreakpoints>(DEFAULT_BREAKPOINTS);
  const [cols, setCols] = useState<IColumns>(DEFAULT_COLS);
  const [useCustomSmLayout, setUseCustomSmLayout] = useState(false);
  const [useMinWFloor, setUseMinWFloor] = useState(false);
  const [simulatedWidth, setSimulatedWidth] = useState(1200);
  const [log, setLog] = useState<string[]>([]);

  const appendLog = (entry: string): void => {
    setLog(prev => [...prev.slice(-49), entry]);
  };

  const responsiveLayouts: TResponsiveLayout = useCustomSmLayout ? { sm: CUSTOM_SM_LAYOUT } : {};

  // Memoized (not recomputed as a fresh array on every render) --
  // GridLayout's own controlled-component sync compares this prop by
  // reference, so a brand-new array here on every render (even when
  // neither `layout` nor `useMinWFloor` actually changed) would make it
  // re-sync its own internal state from this prop on every single
  // render, discarding whatever it had just committed internally one
  // render earlier -- which is what made the displayed "current layout"
  // JSON above appear stuck showing only the initial values instead of
  // live drag/resize/breakpoint updates.
  const layoutWithMinW = useMemo(
    () => layout.map(item => (useMinWFloor ? { ...item, minW: MIN_W_FLOOR } : { ...item, minW: undefined })),
    [layout, useMinWFloor],
  );

  return (
    <div className="demo-view" data-testid="view-responsive">
      <h2>Responsive breakpoints</h2>
      <p className="demo-view-description">
        <code>responsive</code>/<code>breakpoints</code>/<code>cols</code>/<code>responsiveLayouts</code>/
        <code>onBreakpointChange</code> — drag the slider below to simulate a container-width change
        without resizing the real browser window. The <code>minW</code> toggle demonstrates a real library
        fix: shrinking to a breakpoint narrower than an item&apos;s own <code>minW</code> no longer
        silently squeezes it below that floor — the item (and, with multiple items sharing the same
        floor, the whole row) stays at its minimum width and the grid scrolls horizontally instead.
      </p>

      <div className="demo-controls">
            <fieldset className="demo-control-group">
              <legend>Simulated width</legend>
              <div className="demo-control">
                <label htmlFor="simulatedWidth">Container width</label>
                <input
                  data-testid="input-simulatedWidth"
                  id="simulatedWidth"
                  max={1800}
                  min={MIN_SIMULATED_WIDTH}
                  onChange={e => setSimulatedWidth(Number(e.target.value))}
                  step={10}
                  type="range"
                  value={simulatedWidth}
                />
                <span>{simulatedWidth}px</span>
              </div>
            </fieldset>

            <fieldset className="demo-control-group">
              <legend>Breakpoints &amp; cols</legend>
              <table className="demo-breakpoint-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Threshold (px)</th>
                    <th>Cols</th>
                  </tr>
                </thead>
                <tbody>
                  {BREAKPOINT_NAMES.map(name => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>
                        <input
                          data-testid={`input-breakpoint-${name}`}
                          onChange={e => setBreakpoints(prev => ({ ...prev, [name]: Number(e.target.value) }))}
                          type="number"
                          value={breakpoints[name]}
                        />
                      </td>
                      <td>
                        <input
                          data-testid={`input-cols-${name}`}
                          onChange={e => setCols(prev => ({ ...prev, [name]: Number(e.target.value) }))}
                          type="number"
                          value={cols[name]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </fieldset>

            <fieldset className="demo-control-group">
              <legend>responsiveLayouts</legend>
              <div className="demo-control">
                <input
                  checked={useCustomSmLayout}
                  data-testid="toggle-useCustomSmLayout"
                  id="useCustomSmLayout"
                  onChange={e => setUseCustomSmLayout(e.target.checked)}
                  type="checkbox"
                />
                <label htmlFor="useCustomSmLayout">Use a custom pre-defined layout for &quot;sm&quot;</label>
              </div>
            </fieldset>

            <fieldset className="demo-control-group">
              <legend>minW vs. narrow breakpoints</legend>
              <div className="demo-control">
                <input
                  checked={useMinWFloor}
                  data-testid="toggle-useMinWFloor"
                  id="useMinWFloor"
                  onChange={e => setUseMinWFloor(e.target.checked)}
                  type="checkbox"
                />
                <label htmlFor="useMinWFloor">Give every item a minW of {MIN_W_FLOOR} columns</label>
              </div>
              <p className="demo-status">
                Drag the slider down to the &quot;xxs&quot; breakpoint (2 cols) with this on — each item
                would need to shrink below its own minW to fit, so the grid scrolls horizontally instead.
              </p>
            </fieldset>
          </div>

      <div className="demo-view-body">
        <div className="demo-view-main">
          <div className="demo-grid-area-scroll">
            <div className="demo-grid-area" style={{ width: `${simulatedWidth}px` }}>
              <GridLayout
                breakpoints={breakpoints}
                cols={cols}
                layout={layoutWithMinW}
                onBreakpointChange={(breakpoint: TBreakpoint, colCount: number) => appendLog(`onBreakpointChange(${breakpoint}, cols: ${colCount})`)}
                onLayoutChange={setLayout}
                responsive
                responsiveLayouts={responsiveLayouts}
                rowHeight={80}
              >
                {layoutWithMinW.map(item => (
                  <GridItem i={item.i} key={item.i}>
                    <div className="demo-item-content">{`Item ${item.i}`}</div>
                  </GridItem>
                ))}
              </GridLayout>
            </div>
          </div>
        </div>

        <div className="demo-view-log-column">
          <div className="demo-state-inspector">
            <p className="demo-status">Current layout</p>
            <pre className="demo-json" data-testid="state-layout">{JSON.stringify(layout, null, 2)}</pre>
            <p className="demo-status">responsiveLayouts config</p>
            <pre className="demo-json" data-testid="state-responsiveLayouts">{JSON.stringify(responsiveLayouts, null, 2)}</pre>
          </div>

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
