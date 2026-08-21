# Demo app

A showcase and manual-testing tool for `@keystone-dashboard-layout/react`,
covering every `GridLayout`/`GridItem` prop and imperative-handle method —
see `../docs/DEMO_APP_IMPLEMENTATION_PLAN.md` for the full implementation
plan, view-by-view feature breakdown, and the 45-example cross-reference
against Vue's own VitePress documentation.

Distinct from `../e2e-fixture/`, which stays exactly as it is — a
deliberately minimal scenario switcher whose only job is feeding
Playwright's own automated suite. This app is a superset, built for a
human (or an agent driving Chrome) to actually explore.

```bash
npm run demo         # dev server on http://localhost:5176
npm run demo:build    # production build, output to dist-demo/
```

## Views

All nine views from the implementation plan are now built.

| View | Demonstrates |
|---|---|
| `views/BasicGridView.tsx` | The smallest possible setup — a fixed layout, default drag/resize, no toggles |
| `views/DragResizeView.tsx` | Every grid-wide toggle not covered by a more specific view (interaction, compaction incl. `compactNow`/`rearrange`, rendering, resize affordances incl. `renderResizeHandle`, snap/guides, close button, `header` render prop), live event log |
| `views/DynamicItemsView.tsx` | Adding/removing items via a real first-fit slot, `useLayoutStorage` persistence (save/load/clear), named layout presets, `key`-forced remount |
| `views/ResponsiveView.tsx` | `responsive`/`breakpoints`/`cols`/`responsiveLayouts`/`onBreakpointChange`, a simulated-container-width slider |
| `views/ItemOverridesView.tsx` | Every per-item `ILayoutItem` field (interactivity, size constraints, drag/resize restriction, per-item resize handles, visual overrides, per-item `ariaLabels`) via a control panel bound to one selected item; also includes `MinMaxWidthDemo` — a focused demonstration of `GridLayout`'s own minW/maxW width-enforcement (grid expands and scrolls, or shrinks, to honor an item's own stated constraints; single- and multi-column cases both shown |
| `views/SelectionAndHistoryView.tsx` | `multiSelect` (selection state via `ref`, group move/resize, `alignSelected`/`distributeSelected`) and `enableUndoRedo`/`undoHistoryLimit`/`undo`/`redo`/`canUndo`/`canRedo` — two ref-driven feature groups with no grid-wide prop equivalent |
| `views/CrossGridView.tsx` | Two independently-toggleable `GridLayout` instances — `allowCrossGridDrag`/`disableExternalDrop`/`layoutId`/`onCrossGridItemDropped`/`onCrossGridDropRejected`, dragging an item between them, and a rejected drop when the target has `disableExternalDrop` on |
| `views/ExternalDropView.tsx` | `allowOutsideDrop`/`outsideDropWidth`/`outsideDropHeight`/`outsideDropAccept`/`onOutsideDrop` — a native HTML5 `draggable` chip dropped into either of two grids (both also keeping `allowCrossGridDrag` on), `core`'s own `readOutsideDropPayload` parsing the attached structured data |
| `views/AdvancedFeaturesView.tsx` | `exportLayoutAsSvg`, `scrollToItem`/`focusItem` (via `ref`), grid-wide `isMirrored`/`preserveAspectRatio`, a custom `compactor` (a "shelf" packer), a keyboard-accessibility walkthrough, grid-wide `ariaLabels`, `onLayoutReady`/`onColumnsChanged` |

## Testability

Every interactive element (nav buttons, toggle inputs, sliders, item
roots, event logs) carries a `data-testid` — `data-testid="nav-{id}"`
for navigation, matching `e2e-fixture/App.tsx`'s own established naming.
`GridItem` roots already carry a stable `data-grid-item-id={i}`
attribute automatically (neither `GridLayout` nor `GridItem` forward
arbitrary extra props — see `grid-item-props.interface.ts`/
`grid-layout-props.interface.ts`), so item elements are targeted via
`[data-grid-item-id="..."]`, not a `data-testid` passed directly to
either component.

The library is imported straight from `../src` (via `../../src/index`
in each view — the *barrel* file specifically, so its own top-level
`import './styles/index.css'` side effect actually pulls in the
library's real positioning/transition CSS), so the demo always reflects
current source with no build step in between.
