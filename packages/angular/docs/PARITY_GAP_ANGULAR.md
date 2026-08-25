# Parity Gap — Angular vs. Vue (post-implementation)

Unlike `PARITY_GAP_ANGULAR.md` (the pre-port planning document, written
before any Angular component code existed — kept as-is for historical
record, not updated here), this document compares the two *completed*
implementations as they actually stand today. Every claim below was
verified by reading the current source directly — `grid-layout-props.
interface.ts`, `grid-item-props.interface.ts`, `EGridLayoutEvents.ts`,
`GridLayout.vue`, `GridItem.vue`, `useGridItemKeyboard.ts` on the Vue
side; `grid-layout.component.ts`, `grid-item.component.ts` on the
Angular side — not carried over from memory of the pre-port planning
document or assumed from the architecture mapping still being
accurate. Where a claim below couldn't be fully verified this pass, it
says so explicitly rather than presenting it with false confidence.

The architecture mapping in `PARITY_GAP_ANGULAR.md` (Vue's `provide`/
`inject` → Angular's `GridEventBusService`, `defineExpose` → public
class members, etc.) held up and is not re-litigated here — this
document is about the **feature surface**, not the plumbing.

## How to read this document

Each table row is one of:
- **✅ Match** — same behavior, confirmed by reading both
  implementations' own source, not just the type signature.
- **⚠️ Partial** — the feature exists in some form on both sides, but
  with a real, confirmed behavioral difference worth knowing about.
- **❌ Gap** — Vue has it; Angular has no equivalent at all.
- **➖ N/A** — Vue-specific plumbing with no meaningful Angular
  translation needed (already covered by the architecture mapping).

## GridLayout-level props

| Vue prop | Angular equivalent | Status | Notes |
|---|---|---|---|
| `layout` (required) | `layout` (required) | ✅ Match | |
| `autoSize` | `autoSize` | ✅ Match | Angular only has the older boolean form. |
| `heightMode` | — | ❌ **Gap** | Vue's newer 4-mode height system (`'auto'` \| `'fixed'` \| `'scroll'` \| `'fit'`) — `'scroll'`/`'fit'` add `overflow-y: auto` handling `autoSize` alone can't express. Angular has no equivalent; a consumer wanting scroll-contained grid content has no built-in way to get it. |
| `allowCrossGridDrag` | `allowCrossGridDrag` | ✅ Match | |
| `ariaLabels` (grid-wide) | — | ❌ **Gap** | See GridItem-level table — this is one half of a feature that doesn't exist in Angular at all. |
| `enableEditMode` (grid-wide) | — | ❌ **Gap** | Grid-wide interactivity master switch. Angular has no equivalent at either the grid or item level (see GridItem table). |
| `disableExternalDrop` | `disableExternalDrop` | ✅ Match | |
| `layoutId` | `layoutId` | ✅ Match | |
| `allowOutsideDrop` | `allowOutsideDrop` | ✅ Match | |
| `outsideDropWidth` | `outsideDropWidth` | ✅ Match | |
| `outsideDropHeight` | `outsideDropHeight` | ✅ Match | |
| `outsideDropAccept` | `outsideDropAccept` | ✅ Match | |
| `borderRadiusPx` (grid-wide) | — | ❌ **Gap** | See GridItem-level table. |
| `transitionDurationMs` | `transitionDurationMs` | ✅ Match | |
| `transitionTimingFunction` | `transitionTimingFunction` | ✅ Match | |
| `showAlignmentGuides` | `showAlignmentGuides` | ✅ Match | |
| `showSpacingGuides` | `showSpacingGuides` | ✅ Match | |
| `snapToGrid` | `snapToGrid` | ✅ Match | |
| `snapThreshold` | `snapThreshold` | ✅ Match | |
| `breakpoints` | `breakpoints` | ✅ Match | |
| `colNum` | `colNum` | ✅ Match | |
| `cols` | `cols` | ✅ Match | |
| `distributeEvenly` | `distributeEvenly` | ✅ Match | |
| `horizontalShift` | `horizontalShift` | ✅ Match | |
| `isBounded` (grid-wide default) | — | ❌ **Gap** | See "Grid-wide cascade" section below — this is a structural gap, not a single missing prop. |
| `isDraggable` (grid-wide default) | — | ❌ **Gap** | Same as above. |
| `isMirrored` | `isMirrored` (per-item only — see GridItem table) | ⚠️ **Partial** | Vue's `isMirrored` is grid-wide, cascading to every item (with a per-item override). Angular's `isMirrored` exists **only** as a per-item `@Input()` — there is no grid-wide toggle to mirror an entire grid at once; every item must be set individually. |
| `isResizable` (grid-wide default) | — | ❌ **Gap** | Same as `isDraggable` above. |
| `margin` | `margin` | ✅ Match | |
| `maxRows` (grid-wide) | `maxRows` (per-item only) | ⚠️ **Partial** | Vue's `maxRows` is a single grid-wide value governing the whole layout's own growth. Angular's `maxRows` exists only as a `GridItemComponent` `@Input()` (default `Infinity`), read purely for that one item's own `calcXY`/`calcWH` y-capping — there is no grid-wide `GridLayoutComponent` `maxRows` at all, so nothing enforces it during compaction, collision resolution, or the imperative API (`compactNow`, etc.) the way Vue's grid-level value does. |
| `multiSelect` | `multiSelect` | ✅ Match | Group move/resize, selection cascade, all confirmed present on both sides. |
| `preventCollision` | `preventCollision` | ✅ Match | |
| `responsive` | `responsive` | ✅ Match | |
| `responsiveLayouts` | `responsiveLayouts` | ✅ Match | |
| `restoreOnDrag` | `restoreOnDrag` | ✅ Match | |
| `rowHeight` | `rowHeight` | ✅ Match | |
| `showCloseButton` (grid-wide default) | — | ❌ **Gap** | See GridItem-level table — the entire close-button feature is absent from Angular. |
| `showGridLines` | — | ❌ **Gap** | Vue toggles a `grid` CSS class rendering visible grid-line guides behind items. No Angular equivalent at all. |
| `showResizeHandles` | `showResizeHandles` | ✅ Match | |
| `resizeHandleColor` | `resizeHandleColor` | ✅ Match | |
| `resizeHandles` (grid-wide default) | — | ❌ **Gap** | Angular's `resizeHandles` exists only per-item; there is no grid-wide default to restrict every item's own handles at once. |
| `transformScale` | `transformScale` | ✅ Match | |
| `useBorderRadius` (grid-wide) | — | ❌ **Gap** | See GridItem-level table. |
| `useCssTransforms` | `useCssTransforms` | ✅ Match | |
| `compactor` | `compactor` | ✅ Match | |
| `enableUndoRedo` | `enableUndoRedo` | ✅ Match | |
| `undoHistoryLimit` | `undoHistoryLimit` | ✅ Match | |
| `compactType` | `compactType` | ✅ Match | |

### Grid-wide cascade — a structural gap, not four separate missing props

Vue's `isDraggable`/`isResizable`/`isBounded`/`showCloseButton` (and,
per the GridItem table below, `useBorderRadius`/`borderRadiusPx`/
`enableEditMode`/`resizeHandleColor`/`resizeHandles`/`showResizeHandles`)
all follow one consistent pattern: a grid-wide default on `GridLayout`,
with each `GridItem`'s own matching prop defaulting to `null` — meaning
"defer to the grid's own default" — and only overriding it when set to
an actual `true`/`false`/value.

**Angular has no version of this cascade mechanism at all** for
`isDraggable`/`isResizable`/`isBounded` specifically. `GridItemComponent`
does have its own `isDraggable`/`isResizable`/`isBounded` `@Input()`s,
but:
- `GridLayoutComponent` itself has no matching `isDraggable`/
  `isResizable`/`isBounded` `@Input()` to cascade *from* at all.
- Angular's per-item `isDraggable`/`isResizable` default to `null`, but
  since there's nothing to inherit, `null` is simply treated as "true"
  in the native-engine's own `enabled` check (`this.isDraggable !==
  false`) — a fixed default baked into the component, not a
  configurable grid-wide one.
- `isBounded` defaults to a plain `false` directly on the item, with no
  `null`/inherit state at all.

Practically: a Vue consumer can set `isDraggable: false` once on
`GridLayout` to make an entire grid non-draggable, then re-enable
dragging for one specific item by setting `isDraggable: true` on it. An
Angular consumer has no such single-prop way to do this — every
`GridItemComponent` in the template needs its own `[isDraggable]="false"`
binding individually (or a consumer-side loop generating that binding
per item), which is a meaningfully different authoring experience for
what should be the same feature.

## GridLayout-level events

| Vue event (`EGridLayoutEvent`) | Angular equivalent | Status | Notes |
|---|---|---|---|
| `BREAKPOINT_CHANGED` | `breakpointChanged` | ✅ Match | |
| `CHANGED_DIRECTION` | — | ➖ N/A | Dead in Vue too (declared, never emitted) — confirmed via Vue's own doc comment on the enum member. Not a real gap. |
| `COLUMNS_CHANGED` | — | ❌ **Gap** | Fired whenever resolved `colNum` changes (prop or responsive breakpoint). Angular resolves `effectiveColNum` internally but never surfaces a change in it as its own event — a consumer would need to infer this from `breakpointChanged` (responsive case only) or simply diff `colNum` themselves (static case), neither of which is the same as a direct signal. |
| `CONTAINER_RESIZED` | — | ➖ N/A | Dead in Vue too, confirmed via its own doc comment. Not a real gap. |
| `DRAG_START` / `DRAG_MOVE` / `DRAG_END` | — | ❌ **Gap** | Angular's `GridEventBusService` has internal `itemDrag$` ticks for exactly these three phases, but none of them are re-exposed as public `@Output()`s on `GridLayoutComponent` — a consumer has no way to hook into drag lifecycle directly; only the eventual `layoutChange` (after compaction/commit) is visible externally. |
| `CROSS_GRID_DROP_REJECTED` | `crossGridDropRejected` | ✅ Match | |
| `CROSS_GRID_ITEM_DROPPED` | `crossGridItemDropped` | ✅ Match | |
| `ITEM_DROPPED_FROM_OUTSIDE` | `itemDroppedFromOutside` | ✅ Match | |
| `LAYOUT_READY` | — | ❌ **Gap** | Fired once, after the container's width is known and every item's size is stable — the "first reliable point to inspect final positions" signal. Angular has nothing equivalent; the closest available signal is the first `layoutChange` emission, which doesn't carry the same "everything has now settled" guarantee Vue's own doc comment describes. |
| `LAYOUT_UPDATE` (the `v-model:layout` update event) | `layoutChange` | ✅ Match (mechanism differs) | Vue's version exists specifically to power `v-model:layout` template sugar; Angular has no equivalent two-way-binding sugar (per `PARITY_GAP_ANGULAR.md`'s own still-open note on this — confirmed still undecided, not resolved since). `layoutChange` alone covers the same "layout was replaced" signal a plain one-way listener would use either framework. |
| `LAYOUT_UPDATED` | — | ⚠️ **Partial** | Vue fires this as a *separate* signal from `LAYOUT_UPDATE`, specifically once a mutation has "fully settled" (as distinct from the v-model-wiring-specific event). Angular folds both into the single `layoutChange` emission — functionally similar timing in practice, but a consumer relying on Vue's two-signals-for-two-purposes distinction (e.g. listening to `LAYOUT_UPDATED` without also picking up `v-model`'s own wiring semantics) has no equivalent split in Angular. |
| `MOVE_BLOCKED_BY_COLLISION` | — | ❌ **Gap** | Fired when `preventCollision` blocks a drag/resize, specifically so a consumer can show a "can't place item here" shake/flash/toast without reimplementing collision detection themselves. Angular's own `preventCollision` handling (in `moveElement`, delegated to `core`) silently reverts the blocked position with no signal at all that a block occurred. |
| `SELECTION_CHANGED` | `selectionChanged` | ✅ Match | |

## GridItem-level props

| Vue prop | Angular equivalent | Status | Notes |
|---|---|---|---|
| `ariaLabels` (per-item) | — | ❌ **Gap** | See "Accessibility" section below. |
| `autoScroll` | `autoScroll` | ✅ Match | |
| `autoHeight` | `autoHeight` | ✅ Match | |
| `borderRadiusPx` | — | ❌ **Gap** | See "Border radius / close button" section below. |
| `dragAllowFrom` | `dragAllowFrom` | ✅ Match | |
| `dragActivationDistance` | `dragActivationDistance` | ✅ Match | |
| `dragIgnoreFrom` | `dragIgnoreFrom` | ✅ Match | |
| `enableEditMode` | — | ❌ **Gap** | See below. |
| `h` / `i` / `w` / `x` / `y` (required) | Same, all required | ✅ Match | |
| `isBounded` | `isBounded` | ⚠️ **Partial** | Present on both, but see the grid-wide cascade note above — Vue's version can inherit a grid default; Angular's cannot. |
| `isDraggable` | `isDraggable` | ⚠️ **Partial** | Same cascade caveat. |
| `isMirrored` | `isMirrored` | ✅ Match (as a per-item toggle) | See the grid-wide `isMirrored` gap above for the one real difference — this per-item prop itself behaves the same on both sides. |
| `isResizable` | `isResizable` | ⚠️ **Partial** | Same cascade caveat. |
| `isStatic` | `isStatic` | ✅ Match | |
| `maxW` / `maxH` / `minW` / `minH` | Same | ✅ Match | |
| `preserveAspectRatio` | `preserveAspectRatio` | ✅ Match | |
| `resizeIgnoreFrom` | `resizeIgnoreFrom` | ✅ Match | |
| `resizeHandleColor` | `resizeHandleColor` | ✅ Match (per-item) | Grid-wide default cascade gap already noted above. |
| `resizeHandles` | `resizeHandles` | ✅ Match (per-item) | Same. |
| `showResizeHandles` | `showResizeHandles` | ✅ Match (per-item) | Same. |
| `showCloseButton` | — | ❌ **Gap** | See below. |
| `useBorderRadius` | — | ❌ **Gap** | See below. |
| `zIndex` | `zIndex` | ✅ Match | |

### Close button — entirely absent from Angular

Vue's `GridItem` renders a real, built-in close button
(`CustomCloseButton.vue`) when `showCloseButton` resolves to `true`
(per-item or via the grid-wide default), emitting
`EGridItemEvent.REMOVE_ITEM` on click — confirmed via direct source
inspection, not just the prop's own doc comment; `showCloseButton`,
`closeButtonEnabled`, and the conditional render are all real, wired-up
code, not a declared-but-inert prop.

Angular has **no** `showCloseButton` prop, no equivalent component, and
no `REMOVE_ITEM`-equivalent output — a consumer wanting a built-in
remove-item affordance has to build their own from scratch, with no
help from the library at all. This is one of the larger, clearly
user-facing feature gaps found in this pass.

### Border radius (`useBorderRadius` / `borderRadiusPx`) — entirely absent

Vue applies `border-radius: {borderRadiusPx}px` via an inline style
when `useBorderRadius` resolves `true` (grid-wide default or per-item
override), with a companion `--kdl`-style inset calculation for the
close button's own corner positioning at large radii. Angular has
neither prop, at either level — no equivalent styling hook exists at
all.

### `enableEditMode` — entirely absent

Vue's `enableEditMode` (grid-wide default + per-item override) is a
single master switch disabling dragging/resizing/the close button all
at once, independent of setting `isDraggable`/`isResizable`/
`isStatic`/`showCloseButton` individually — confirmed as real,
functioning logic gating the native-engine `enabled` checks and the
close button's own render, not just a declared prop. Angular has no
equivalent at all; the closest available approximation is setting
`isDraggable`/`isResizable` to `false` individually (which, given the
missing close-button feature entirely, still leaves no way to disable
"editing" as a single concept).

### Accessibility — `ariaLabels` and keyboard-driven move/resize

Two related, both entirely-missing-from-Angular features:

1. **`ariaLabels`** (grid-wide default + per-item override,
   `IGridAriaLabels`) — localizable strings for the close button's own
   label, the item's `aria-roledescription`, and keyboard move/resize
   instructions, merged (built-in English defaults ← grid default ←
   per-item override) via `core`'s own `resolveAriaLabels`. Angular has
   no `ariaLabels` prop at either level, and (per the missing
   close-button feature above) nothing to apply the close-button-label
   half of it to even if it existed.

2. **Keyboard-driven move/resize** (`useGridItemKeyboard.ts`) — arrow
   keys move a focused item by one grid unit if draggable; Shift +
   arrow keys resize it by one grid unit if resizable; each keypress
   emits the identical `dragstart`→`dragend` (or `resizestart`→
   `resizeend`) event-bus sequence a real mouse drag/resize would,
   including correctly triggering `multiSelect`'s own group-move/
   resize snapshotting (a real, confirmed bug fix in Vue's own history,
   per that file's own doc comment — an earlier version skipped
   straight to a synthetic `dragend` with no `dragstart` first, and
   group-move silently didn't work from the keyboard as a result).
   **Angular has no keyboard-driven move/resize at all** — items are
   focusable (`scrollToItem`/`focusItem`, tabindex on non-static
   items), but no keydown handler exists to actually move or resize a
   focused item. For a library whose Vue side treats this as a real
   accessibility gap worth fixing (see `docs/ACCESSIBILITY.md`
   referenced in that file), this is a meaningful, confirmed
   accessibility regression in the Angular port specifically — anyone
   who cannot use a mouse/touch has no way to reposition or resize a
   grid item in Angular today.

### Header slot

Vue's `GridItem` supports a `#header` named slot (`$slots.header`),
rendered above the default content when provided, with its own
`vue-grid-item-has-header` class toggle. Angular's `GridItemComponent`
has a single `<ng-content>` (plus the separate, always-present
`autoHeight` wrapper — see that feature's own doc comment in the
Angular source for why it's structured that way). There is no
Angular-side equivalent to a distinct, named "header" content region;
a consumer wanting a header needs to build it into their own single
projected content block rather than use a library-provided slot for it.

## Imperative API (`defineExpose` vs. public class members)

Confirmed present, with equivalent behavior, on both sides:
`compactNow`/`rearrange`, `duplicateItem`, `alignSelected`/
`distributeSelected`, `exportLayoutAsSvg`, `scrollToItem`/`focusItem`,
`undo`/`redo`/`canUndo`/`canRedo`, `selectItem`/`deselectItem`/
`toggleItemSelection`/`clearSelection`, the responsive `layouts` cache.

Not verified this pass (flagged, not claimed either way): Vue's own
`defineExpose` surface may include a few additional read-only exposed
refs (e.g. `width`, `thisLayout` itself) that exist purely for
`GridItem`'s own internal `$parent` access rather than as a public API
surface a normal consumer would call directly — these weren't
cross-checked against Angular's own public surface in this pass, since
they're internal plumbing on the Vue side rather than documented
consumer-facing API.

## Summary — confirmed gaps, roughly by impact

**Larger, clearly user-facing:**
1. Keyboard-driven move/resize (`useGridItemKeyboard.ts`) — a real
   accessibility regression, not just a missing convenience prop.
2. The entire close-button feature (`showCloseButton` + `REMOVE_ITEM`).
3. The grid-wide `isDraggable`/`isResizable`/`isBounded`/
   `resizeHandles`/`resizeHandleColor`/`showResizeHandles` cascade —
   structural, affects authoring ergonomics for every one of those
   props at once, not a single missing field.
4. `heightMode`'s `'scroll'`/`'fit'` modes (scroll-contained grid
   content) — `autoSize` alone can't express this.
5. `enableEditMode` (single master interactivity switch).

**Smaller, more contained:**
6. `ariaLabels` (localizable strings).
7. `useBorderRadius`/`borderRadiusPx`.
8. `showGridLines`.
9. `LAYOUT_READY`, `MOVE_BLOCKED_BY_COLLISION`, `COLUMNS_CHANGED`,
   granular `DRAG_START`/`DRAG_MOVE`/`DRAG_END` events.
10. Grid-wide `isMirrored`/`maxRows` (both work per-item already;
    only the grid-wide single-prop version is missing).
11. The header content slot.

**Not gaps** (confirmed dead code in Vue itself, or Vue-specific
plumbing with no meaningful Angular translation): `CHANGED_DIRECTION`,
`CONTAINER_RESIZED` (the `GridLayout`-level one), `useInstance.ts`'s
own `$parent` access mechanism.

## What this document doesn't cover

This pass focused on the `GridLayout`/`GridItem` prop, event, and
imperative-API surface specifically, cross-checked against source, not
documentation claims. It does **not** cover:
- CSS/styling parity (scoped-style vs. shared-stylesheet differences,
  per `PARITY_GAP_ANGULAR.md`'s own still-open note on where the
  canonical stylesheet should live).
- e2e/browser-level behavior (both packages' own e2e coverage is a
  separate, already-flagged gap — see `IMPLEMENTATION_PLAN.md`).
- Bundle size, build tooling, or packaging differences.
- Test coverage parity between the two packages' own test suites.

Any of the above would need their own dedicated pass, not an
extension of this one.