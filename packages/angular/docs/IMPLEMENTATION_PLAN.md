# Angular Port — Implementation Plan

Phase-by-phase tracking against `docs/PARITY_GAP_ANGULAR.md`'s own
architecture mapping and prop inventory, the same relationship the
React package's `IMPLEMENTATION_PLAN.md`/`PARITY_GAP_VUE.md` have to
each other. Each phase should be individually buildable and testable
before the next starts — not a single all-at-once port.

## Phase 0 — Real Angular CLI workspace (prerequisite, not yet done)

`ng generate library keystone-dashboard-layout-angular --skip-install`
run from `packages/angular/`, then the generated `src/lib/` reshaped to
match this package's existing layout. Needs a real CLI run on a real
machine — see `PARITY_GAP_ANGULAR.md`'s own "Build tooling" section.
Once done, `package.json`'s `_comment_scripts` note and the missing
`dev`/`build`/`lint`/`test`/`test:e2e` scripts should be filled in to
match every other package's own script shape (`turbo.json` already has
task definitions ready for them).

## Phase 1 — Basic rendering (this session)

`GridLayoutComponent` + `GridItemComponent`, position/size only:

- `GridItemComponent` accepts `h`/`w`/`x`/`y`/`i` plus the container
  measurements it needs (`colNum`/`rowHeight`/`margin`/`containerWidth`)
  — initially as direct `@Input()`s for a standalone-testable component,
  before the parent/child DI wiring in Phase 2 supplies them
  automatically.
- Computes pixel position/size via `core`'s own `calcPosition`-shaped
  math (**reuse `core`'s exported `setTransform`/`setTopLeft` helpers
  directly** rather than re-deriving the formula — confirmed these are
  plain functions with zero Vue/React dependency, exported from
  `@keystone-dashboard-layout/core`'s own `index.ts`).
- `GridLayoutComponent` accepts `layout: TLayout` (the required input),
  `colNum`/`rowHeight`/`margin`, measures its own container width via
  `ResizeObserver` (matching Vue's own `erd`/React's own
  `containerRef` + `ResizeObserver` pattern — no Angular-specific
  alternative needed here, `ResizeObserver` is a plain browser API),
  and renders one `GridItemComponent` per layout entry via `*ngFor`.
- No drag, no resize, no compaction, no eventBus/DI wiring yet — a
  static, correctly-positioned grid is the whole scope.
- Tests: Karma/Jasmine component tests confirming pixel position/size
  matches `calcPosition`'s own output for a range of grid-unit inputs,
  matching the level of rigor `GridItem.spec.ts`'s own position-
  calculation tests already establish for Vue.

## Phase 2 — Container-width cascade + `GridEventBusService`

Wires `GridItemComponent` to receive `containerWidth`/`colNum`/
`rowHeight`/`margin` from its parent `GridLayoutComponent` via the DI-
scoped `GridEventBusService` (see `PARITY_GAP_ANGULAR.md`'s own
architecture-mapping table), rather than requiring a consumer to pass
them down manually as direct inputs the way Phase 1 does for standalone
testability. Establishes the `provide('eventBus')`/`inject('eventBus')`
→ Angular-DI-scoped-service mapping for every later phase's own
cascade needs (`setColNum`/`setRowHeight`/`setMargin`/etc., matching
Vue's own eventBus message table one at a time as each becomes
relevant, not all at once).

## Phase 3 — Drag

`native-interaction.ts`'s `createNativeDraggable` wired into
`GridItemComponent`, matching Vue's own `useGridItemDrag.ts`
composable's responsibilities (attach/detach on mount/destroy and on
relevant `@Input()` changes via `ngOnChanges`, forward
`dragstart`/`dragmove`/`dragend` up to `GridLayoutComponent` via the
eventBus service) but expressed as Angular lifecycle hooks
(`ngOnInit`/`ngOnDestroy`/`ngOnChanges`) rather than a composable
function. `GridLayoutComponent` applies `moveElement`/compaction on
each tick, the same `core`-shared logic Vue/React both already call.

## Phase 4 — Resize

Same shape as Phase 3, for `createNativeResizable` /
`useGridItemResize.ts`'s own responsibilities (the 8 resize-hint spans,
`preserveAspectRatio`, min/max clamping).

## Phase 5 onward — everything else in the prop inventory

Ordered roughly by (how much of the drag/resize foundation it needs) ×
(how self-contained it is), not committed rigidly:

- `isBounded`, `preventCollision`, `compactType`/`compactor`
- `showAlignmentGuides`/`showSpacingGuides`/`snapToGrid`
- `multiSelect` (group move/resize, selection state)
- `enableUndoRedo`
- `responsive`/`breakpoints`/`cols`/`responsiveLayouts`
- `allowCrossGridDrag`/`allowOutsideDrop` (the shared `core`
  `cross-grid-registry.ts` — same "reached via a `@keystone-dashboard-
  layout/core` subpath export, not a raw source alias" note React's own
  parity doc flags for Stryker sandboxing applies here too, worth
  checking early rather than rediscovering under whatever Angular's own
  test-sandboxing does)
- `showResizeHandles`/`resizeHandleColor`/per-item overrides
  (`isMirrored`/`zIndex`/`autoScroll`/`autoHeight`/`dragAllowFrom`/
  `dragIgnoreFrom`/`resizeIgnoreFrom`/`dragActivationDistance`)
- `transformScale`/`transitionDurationMs`/`transitionTimingFunction`/
  `borderRadiusPx`/`useBorderRadius`
- Imperative API (`compactNow`/`rearrange`/`duplicateItem`/selection
  methods/`undo`/`redo`/`alignSelected`/`distributeSelected`/
  `exportLayoutAsSvg`/`scrollToItem`/`focusItem`) as public
  `GridLayoutComponent` methods
- `useLayoutStorage`/`useLayoutPresets` equivalents — an Angular
  service or a plain injectable function, mirroring the shape both the
  Vue composable and React hook versions already establish (adapted to
  Angular's own DI-friendly idiom, likely an `@Injectable()` service
  parameterized by `key` rather than a composable/hook call)

## Testing strategy

Once Phase 0's own Karma setup exists: component-level tests mirroring
Vue's own `tests/GridItem.spec.ts`/`GridLayout.spec.ts` coverage
first, then e2e (Playwright, matching the config shape both Vue and
React packages already use — no reason for Angular's own e2e harness to
differ) once enough interactive features exist to be worth testing
against a real browser. Given this whole session's own history of
coverage-passing-but-real-bugs-present (RTL positioning, cross-grid
z-index), each phase's own e2e coverage should specifically include the
same class of "does this actually look right in a real browser"
assertions (`elementFromPoint`, real pixel bounding boxes) that caught
those, not just DOM-presence/class-name checks.
