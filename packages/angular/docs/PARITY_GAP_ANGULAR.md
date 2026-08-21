# Parity Gap — Vue vs. Angular

The starting scoping document for the Angular port, mirroring the role
`packages/react/docs/PARITY_GAP_VUE.md` played for the React port —
except written *before* the port exists, not after, since there's
nothing to verify against yet. This is the architecture-mapping and
prop inventory the port should follow; `docs/IMPLEMENTATION_PLAN.md`
(this same `docs/` folder) tracks phase-by-phase progress against it,
the same relationship the two React docs have.

**Decisions locked in before writing any component code** (confirmed
directly with the person maintaining this repo, not assumed):

- **`@Input()`/`@Output()` decorators**, not the newer `input()`/
  `output()`/`model()` signal-based APIs. More explicit, more familiar
  to anyone coming from Angular 12–16, and avoids tying this port to
  Angular's newest (and still-evolving) reactivity primitives before
  the rest of the port even exists.
- **Reuse `@keystone-dashboard-layout/core`'s `native-interaction.ts`
  directly** for the drag/resize/auto-scroll engine — the same
  Pointer-Events-based implementation Vue and React already share.
  Zero framework dependency in that file (confirmed: no Vue/React
  import anywhere in it), so there's no Angular-specific reason to
  reimplement it.

## Why this document exists before any component code

Vue's `GridLayout.vue`/`GridItem.vue` lean on Vue-specific primitives
throughout — `ref`/`computed`/`watch`, `provide`/`inject` for the
`eventBus`, `defineExpose` for the imperative API, scoped `<style>`
blocks. React's own port had to re-derive an Angular-shaped answer for
each of these from scratch; getting that mapping wrong early (e.g.
picking `@Input()` setters where a lifecycle hook was actually needed)
is exactly the kind of thing that produces the "coverage says 100% but
a real browser reveals a bug" pattern this whole session's own history
with the React port ran into more than once (the RTL positioning bug,
the missing cross-grid z-index boost). Writing the mapping down first,
and reasoning through *why* each choice is correct for Angular's own
change-detection model — not just "the Vue-adjacent-sounding Angular
API" — is meant to avoid re-learning those same lessons a third time.

## Architecture mapping

| Vue mechanism | Angular equivalent | Why |
|---|---|---|
| `ref`/`computed`/`watch` on props | `@Input()` properties + `ngOnChanges(changes: SimpleChanges)` | Angular's own change detection already re-runs template bindings on every input change; `ngOnChanges` is where side effects *beyond* the template (recomputing `styleObj`, an eventBus-equivalent cascade) belong — the direct analogue of Vue's own per-prop `watch()` callbacks, which is exactly what `GridItem.vue`'s own `createStyle()` call sites are. |
| `provide('eventBus', ...)` / `inject('eventBus')` | A `GridEventBusService`, provided at the `GridLayoutComponent` level (`providers: [GridEventBusService]` on that component, not root-provided) and injected into each `GridItemComponent` via the constructor | Angular's DI is naturally scoped to a component subtree via `providers` on a component — this reproduces Vue's `provide`/`inject` scoping (one eventBus per `GridLayout` instance, not a singleton) exactly, without needing a manually-managed `Map<GridLayoutComponent, EventBus>` or similar. `GridItemComponent` requires being a *descendant* of a `GridLayoutComponent` in the injector tree for this to resolve — same requirement Vue's own `inject('eventBus')` has via template nesting. |
| `$parent`/`thisLayout` (GridItem reading GridLayout's exposed state at mount) | Constructor-injected reference to the parent `GridLayoutComponent` itself (`@Optional() @Inject(forwardRef(() => GridLayoutComponent))` or, more simply, since Angular allows injecting a parent component type directly when it's a real ancestor: `constructor(@Optional() private layout: GridLayoutComponent)`) | Angular's DI can resolve an ancestor component instance directly, without the `$parent`-via-render-tree indirection Vue needs — genuinely simpler here, not just a workaround. |
| `defineExpose({...})` (template-ref imperative API) | Public methods/properties directly on `GridLayoutComponent`, accessed via `@ViewChild(GridLayoutComponent) gridRef!: GridLayoutComponent` in a consumer | Same shape as React's `IGridLayoutHandle` (public class members instead of a `useImperativeHandle` object) — Angular doesn't need an extra indirection layer the way React's ref forwarding does, since a class instance's own public members already are the "handle." |
| Scoped `<style>` (Vue SFC) | Angular's own `styleUrls`/`ViewEncapsulation.Emulated` (the default) *or* the same global `kdl-`-prefixed stylesheet React already uses | Leaning toward the **shared global stylesheet** (`styles/index.css`, copied/symlinked from the React package or moved to `core` as a shared asset) over Angular's emulated encapsulation — the CSS itself has zero Angular-specific concerns (it's plain CSS classes), and a single shared stylesheet avoids three copies of the same rules silently drifting apart across packages, a real risk this session's own RTL bug investigation showed can happen even *within* one styling concern (the missing `.kdl-grid-item--rtl` anchor was a copy/paste gap between Vue and React's otherwise-identical CSS). Needs a decision on where the canonical copy lives before Phase 1's own styling lands — flagged in the implementation plan, not decided here. |
| `nextTick()` | `NgZone.onStable` (one-shot: `this.ngZone.onStable.pipe(take(1))`) or, more simply, `Promise.resolve().then(...)`/`queueMicrotask` for a "after this task, before paint" deferral, or `ChangeDetectorRef.detectChanges()` called explicitly when a value needs to be read synchronously post-update | Angular has no single direct equivalent — `nextTick()`'s own callers in Vue fall into two different real needs (deferring a DOM read until *after* a template re-render commits, vs. deferring past the *current* microtask/event handler), and the right Angular tool differs per call site; each port site should pick deliberately, not reach for one blanket substitute. |
| Vue reactivity primitives generally | `ChangeDetectorRef.markForCheck()` (if `OnPush` is used) or default (`Default`) change detection | **Recommendation: `ChangeDetectionStrategy.OnPush`** on both components, matching the "explicit, not magic" philosophy `@Input()`/`@Output()` already reflects — but every state mutation *not* driven by an `@Input()` change (drag/resize tick updating `styleObj`, for instance) then needs an explicit `markForCheck()` call, the same discipline React's port needed for `setState` calls outside a synthetic event handler. Flagged as a decision to confirm once Phase 1's own drag/resize work starts, not before — `OnPush` has no bearing on the position/size-only Phase 1 scope this document's own plan starts with. |

## GridLayout-level props — inventory against Vue's `IGridLayoutProps`

Every field in Vue's `grid-layout-props.interface.ts`, confirmed by
reading that file directly (not carried over from memory of the
React parity table, which is a *different* comparison). All of these
are plain data (`boolean`/`number`/`string`/array/plain-object types)
with zero Vue-specific typing — meaning every one of them is a
straightforward `@Input()` with no translation needed, *unlike* the
`ICompactor`/callback-prop-shaped ones called out below.

`autoSize`, `heightMode`, `allowCrossGridDrag`, `ariaLabels`,
`enableEditMode`, `disableExternalDrop`, `layoutId`, `allowOutsideDrop`,
`outsideDropWidth`, `outsideDropHeight`, `outsideDropAccept`,
`borderRadiusPx`, `transitionDurationMs`, `transitionTimingFunction`,
`showAlignmentGuides`, `showSpacingGuides`, `snapToGrid`,
`snapThreshold`, `breakpoints`, `colNum`, `cols`, `distributeEvenly`,
`horizontalShift`, `isBounded`, `isDraggable`, `isMirrored`,
`isResizable`, `layout` (required), `margin`, `maxRows`, `multiSelect`,
`preventCollision`, `responsive`, `responsiveLayouts`, `restoreOnDrag`,
`rowHeight`, `showCloseButton`, `showGridLines`, `showResizeHandles`,
`resizeHandleColor`, `resizeHandles`, `transformScale`,
`useBorderRadius`, `useCssTransforms`, `compactor`, `enableUndoRedo`,
`undoHistoryLimit`, `compactType`.

Two worth flagging specifically:

- **`compactor?: ICompactor | null`** — `ICompactor`'s own `compact()`
  method is plain data in, plain data out (confirmed: no Vue/React
  import in `core`'s own `compactor.ts`), so this `@Input()` needs no
  special handling at all — a consumer passes the same `ICompactor`
  object shape Vue/React both already accept.
- **`layout: TLayout`** — the one *required* input, and the one place
  Angular's own two-way-binding convention (`[(layout)]`, backed by a
  paired `layout`/`layoutChange` input/output pair, Angular's
  `[(banana-in-a-box)]` syntax) is worth considering explicitly rather
  than defaulting to React's fully-controlled `[layout]`+`(layoutChange)`
  shape out of habit — Angular consumers commonly expect `[(ngModel)]`-
  style two-way binding for exactly this kind of "the component mutates
  it, I want my own reference updated" case. Decide in Phase 1 planning,
  not here; either shape is a small, contained decision once made.

## GridLayout-level events — inventory against Vue's `EGridLayoutEvent`

Every one of these becomes an Angular `@Output() name = new
EventEmitter<PayloadType>()`, the direct equivalent of React's callback
props (`onDragStart`, etc.) — Angular's own idiom for "notify a parent
of something," matching what a template consumer expects
(`(dragStart)="handler($event)"`).

`DRAG_START`, `DRAG_MOVE`, `DRAG_END`, `MOVE_BLOCKED_BY_COLLISION`,
`SELECTION_CHANGED`, `LAYOUT_UPDATE`/`LAYOUT_UPDATED` (React folded
these into one `onLayoutChange` — worth the same fold here, or two
separate outputs matching Vue exactly; decide in Phase 1, likely
folding to match React unless a concrete Angular-specific reason not
to turns up), `BREAKPOINT_CHANGED`, `CROSS_GRID_ITEM_DROPPED`,
`CROSS_GRID_DROP_REJECTED`, `ITEM_DROPPED_FROM_OUTSIDE`,
`LAYOUT_READY`, `COLUMNS_CHANGED`.

## GridItem-level props — inventory against Vue's `IGridItemProps`

Vue's `GridItem` takes ~30 direct component props (unlike React's
`GridItem`, which takes only `i` plus two render props and reads
everything else off the matching `ILayoutItem` — see React's own
`grid-item-props.interface.ts` doc comment for that architecture
choice). **Angular should follow Vue's shape here, not React's** —
`@Input()` properties map far more naturally onto Vue's per-component-
prop model than onto React's per-layout-item-field one, and there's no
Angular-specific reason to adopt React's narrower surface.

Full list, confirmed by reading `grid-item-props.interface.ts`
directly: `ariaLabels`, `autoScroll`, `autoHeight`, `borderRadiusPx`,
`dragAllowFrom`, `dragActivationDistance`, `dragIgnoreFrom`,
`enableEditMode`, `h` (required), `i` (required), `isBounded`,
`isDraggable`, `isMirrored`, `isResizable`, `isStatic`, `maxW`, `maxH`,
`minH`, `minW`, `preserveAspectRatio`, `resizeIgnoreFrom`,
`resizeHandleColor`, `resizeHandles`, `showResizeHandles`,
`showCloseButton`, `useBorderRadius`, `w` (required), `x` (required),
`y` (required), `zIndex`.

Vue's `#header`/`#resize-handle` named slots map onto Angular's
**content projection** (`<ng-content select="[header]">`/a structural
directive for the resize-handle slot, or `@ContentChild`) — a
closer, more direct match than React's render-prop translation needed,
since Angular's content projection is itself slot-shaped already.

## What Phase 1 (this session) actually delivers

Given the scale of what full parity represents, this session's own
Phase 1 is deliberately narrow: **basic `GridLayoutComponent`/
`GridItemComponent` rendering — grid-unit position/size correctly
computed into pixel styles via `core`'s own `calcPosition`-equivalent
math, using `@Input()` for `layout`/`colNum`/`rowHeight`/`margin`, no
drag, no resize, no compaction-on-interaction.** Matches how the React
port's own `docs/IMPLEMENTATION_PLAN.md` phases were structured
(basic rendering first, interactivity layered on in later, individually
testable phases) rather than attempting the whole surface at once.

See `docs/IMPLEMENTATION_PLAN.md` (same folder) for the phase list this
feeds into.

## Build tooling — the other prerequisite

`packages/angular`'s own `package.json` deliberately omits `dev`/
`build`/`lint`/`test`/`test:e2e` scripts, with a comment explaining
why: `ng generate library` hasn't been run yet, so there's no real
`angular.json`/`ng-package.json`/Karma config backing those scripts.
This document and Phase 1's own component source can be written
without that scaffolding existing yet (they're just well-formed
TypeScript/Angular-decorator source), but the scaffolding itself needs
a real `ng`/`ng-packagr` CLI run — which needs to happen on a real
machine with the CLI installed (already present in this package's own
`node_modules/.bin`, confirmed), not something written by hand file-by-
file with any confidence it'll actually build correctly. Concretely:

```bash
cd packages/angular
npx ng generate library keystone-dashboard-layout-angular --skip-install
```

then move the generated `projects/keystone-dashboard-layout-angular/src/lib/`
contents to match this package's own existing `src/` layout, and wire
`@keystone-dashboard-layout/core` in as the generated library's own
dependency (already present in this package's `package.json`). Flagged
here rather than attempted blind — this needs a real command run and
its real output inspected, not guessed at.
