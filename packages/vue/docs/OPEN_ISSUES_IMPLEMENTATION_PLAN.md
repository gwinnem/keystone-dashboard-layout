# Open Issues — Implementation Plan

Everything currently open across `ROADMAP.md`, `PRODUCTION_READINESS.md`,
and `docs/PARITY_GAP_PLAN.md`, organized into one place with an actual
recommended order. This document covers what those three don't already
cover in sufficient depth:

- **Standalone roadmap features** not in `docs/PARITY_GAP_PLAN.md`'s
  scope (that plan explicitly excludes swap-on-drag "on request," and
  never covered sub-grid nesting or maximize/restore at all — both
  came from a different comparison, DevExpress/Kendo, not the five
  alternatives that plan is built against).
- **The two remaining Syncfusion-comparison follow-ups**
  (`PARITY_GAP_VUE_COMMERCIAL_AND_CROSS_FRAMEWORK.md`), both flagged
  there as open but never given an implementation design.
- **Verification and tooling debt** from `PRODUCTION_READINESS.md`'s
  own "not re-verified this session" items — these aren't features,
  but they're real, actionable work, and several are quick.

For the 6 items `docs/PARITY_GAP_PLAN.md` already covers in depth
(spacing guides, drag-activation thresholds, align/distribute, height
modes, async persistence, pluggable positioning strategy, fast
compaction, worker engine), see that document directly — not repeated
here.

## How to read this document

Same effort/risk grading as `docs/PARITY_GAP_PLAN.md`: **Small**
(hours, contained to 1-2 files), **Moderate** (a day or so, touches a
few files including tests), **Significant** (multi-day, needs its own
design decisions), **Large** (genuinely new architecture).

---

## Part A — Standalone features

### A1. Swap-on-drag collision mode

**Source**: `gridstack.js`'s default `float: false` swap behavior —
dragging item A onto item B swaps their positions outright, instead of
B being pushed aside by the current collision-cascade logic. Tracked
as `ROADMAP.md` item 8, deliberately excluded from `PARITY_GAP_PLAN.md`
on request at the time.

**Current state**: `moveElement()` (`core/gridlayout/helpers/move-helper.ts`)
is the single call site `dragEvent()` in `GridLayout.vue` uses to
commit a drag's new position — it always cascades collisions via the
existing push-aside logic (`compactItem`/collision-helper's
`getFirstCollision`), with no alternate code path today.

**Design**: a new `collisionMode?: 'push' | 'swap'` prop on
`GridLayout` (default `'push'`, today's only behavior, no change for
existing consumers). When `'swap'` and a drag's new position collides
with exactly one other (non-static) item, that item's `x`/`y` are set
to the dragged item's *pre-drag* position instead of being pushed
elsewhere — a direct position exchange, not a cascade. **Open design
question, needs deciding before implementation, not assumed**: what
happens when a drag's new position collides with *more than one* item
simultaneously (e.g. dragging a 2×2 item onto a spot straddling two
1×1 items). `gridstack.js`'s own behavior for this multi-collision case
should be checked directly before picking one of: (a) fall back to
push-aside for that specific move, (b) block the move entirely, or (c)
swap with whichever collision came first. Don't guess this — losing
data (two items' positions both changing unpredictably) is worse than
either fallback.

**Interaction with existing features**: `preventCollision` and
`collisionMode: 'swap'` are likely mutually exclusive in practice
(swap *is* a form of intentional collision) — needs an explicit
decision on which wins if both are set, documented in the prop's own
doc comment, not left to whichever the code happens to do.
`multiSelect`'s group move (`applyGroupMove` in `GridLayout.vue`)
should very likely stay push-only regardless of `collisionMode` —
swapping N passenger items simultaneously has no obvious "correct"
semantics and is worth scoping out explicitly rather than
half-supporting.

**Effort**: Significant — the single-collision case is a moderate,
contained change; the multi-collision decision and its interaction
with `preventCollision`/`multiSelect` is what pushes this up a tier.

**Tests**: unit tests on the swap logic in isolation (mirroring
`move-helper.spec.ts`'s existing structure); e2e test dragging item A
directly onto item B and confirming both items' positions are now
exchanged, not cascaded.

---

### A2. Sub-grid nesting

**Source**: `docs/PARITY_GAP_PLAN.md`'s own introduction and
`ROADMAP.md` both flag this as the largest remaining structural gap,
low priority "given `allowCrossGridDrag` covers the sibling case."

**Current state**: `GridLayout`/`GridItem` have no concept of one grid
being a descendant of another's own item content today — a `GridItem`'s
default slot can contain *anything* the consumer renders, including
(unofficially) another `GridLayout`, but nothing in either component's
own logic is aware of that nesting relationship (no coordinated resize
propagation, no nested-grid-aware collision/compaction, no nested
drag-and-drop handoff distinct from `allowCrossGridDrag`'s existing
sibling-grid mechanism).

**Design — deliberately not fully speculated here**: this is the one
item in this entire document that genuinely needs its own dedicated
design pass before any implementation estimate is trustworthy, not a
sketch written alongside everything else. At minimum, before starting:
confirm whether "sub-grid" means (a) a `GridLayout` nested inside a
`GridItem`'s content with no special relationship beyond normal DOM
nesting (mostly already possible today, just unofficial/untested), or
(b) genuine parent-aware behavior — a parent item that auto-sizes to
its nested grid's content height, coordinated compaction so a child
grid's item can't grow past its parent item's own bounds, etc. Options
(a) and (b) are entirely different scopes; (a) might already be a
**documentation and testing task**, not new code, while (b) is a real
architectural addition needing its own `docs/ARCHITECTURE.md`-level
design doc before implementation starts.

**Recommendation**: before committing effort here, explicitly test
option (a) — mount a `GridLayout` inside a `GridItem`'s default slot
with today's code, unmodified, and document what already works and
what breaks. That single investigation should come *before* writing
any design for (b), since it may turn out most of what "sub-grid
nesting" would ask for already works by accident of the slot-based
architecture, with the real gap being narrower (and cheaper) than the
"largest remaining structural gap" framing suggests.

**Effort**: Large, but genuinely unknown until the (a)-vs-(b)
investigation above happens — do not commit to Large without that
first pass; it may turn out to be Moderate.

---

### A3. Maximize/restore an item

**Source**: DevExpress/DevExtreme's Dashboard Designer (confirmed
present there; confirmed **absent** in Kendo TileLayout, per
`COMPARISON_COMMERCIAL.md`) — a separate comparison from the five
open-source alternatives `PARITY_GAP_PLAN.md` is built against.

**Current state**: no maximize/restore concept exists anywhere in
`GridLayout`/`GridItem` today.

**Design**: a `maximizedItemId?: string | number | null` prop/state on
`GridLayout` (two-way bindable, `v-model:maximizedItemId`, matching
`v-model:layout`'s existing convention) plus an exposed
`maximizeItem(id)`/`restoreItem()` method pair, mirroring
`compactNow()`/`duplicateItem()`'s existing "state on `GridLayout`,
exposed methods for consumer-triggered actions" shape. When set: the
target `GridItem` renders at the grid's full visible content area
(absolute-positioned, covering the container, above every other item
via a dedicated high `z-index` — reusing the `zIndex` prop's own
override mechanism rather than inventing a second one), and every
*other* item is hidden (`v-show`, not removed from `layout` — their
data must survive a restore unchanged) rather than actually
recompacted around the gap.

**Open design question, needs deciding before implementation**: what
happens to compaction/collision logic *while* an item is maximized.
Recommendation (per `ROADMAP.md`'s own note): freeze every other item
in place entirely — no compaction runs at all while `maximizedItemId`
is set, and normal compaction resumes on restore. This needs explicit
confirmation, not just inheriting from the recommendation without
re-checking it still makes sense once `multiSelect`/`allowCrossGridDrag`
interactions are considered (a maximized item should almost certainly
disable both while active — dragging into a hidden sibling grid, or
multi-selecting hidden items, has no sensible meaning).

**Effort**: Moderate — the show/hide and full-size positioning is
straightforward; the "freeze everything else" interaction with
existing drag/resize/`multiSelect` state needs care but isn't
architecturally new the way A1/A2 are.

**Tests**: unit test confirming every other item is hidden
(`v-show`, not removed — checking their `layout` entries are
unchanged) while one is maximized; e2e test confirming
maximize→restore round-trips back to the exact original visual layout.

---

## Part B — Syncfusion-comparison follow-ups

Both from `PARITY_GAP_VUE_COMMERCIAL_AND_CROSS_FRAMEWORK.md`'s open
items, neither previously given an implementation design.

### B1. `enablePersistence`-style one-flag convenience wrapper

**Source**: Syncfusion `DashboardLayout.enablePersistence` — a single
boolean that transparently saves/restores layout state, vs. this
project's explicit `useLayoutStorage()` composable a consumer wires up
themselves.

**Current state**: `useLayoutStorage`/`serializeLayout`/
`deserializeLayout` already exist and are the right underlying
building blocks — this item is purely about a thinner convenience
layer on top, not new persistence logic.

**Design**: a new `enablePersistence?: boolean` prop (default `false`)
plus `persistenceKey?: string` (default an auto-generated one, same
pattern `layoutId` already uses for `allowCrossGridDrag`) on
`GridLayout` directly. Internally, `onMounted` calls the existing
`useLayoutStorage`'s `load()` once and applies the result to `layout`
if present, and a `watch(() => props.layout, ..., { deep: true })`
calls `save()` on change — genuinely just `GridLayout.vue` wiring up
its own already-exported composable internally, no new persistence
mechanism.

**Open question**: whether `enablePersistence` should be mutually
exclusive with a consumer *also* using `useLayoutStorage` manually on
the same `layout` ref (double-saving isn't harmful, but is redundant
and worth a doc-comment warning at minimum, possibly a dev-mode console
warning if both are detected active on the same instance).

**Effort**: Small — this is deliberately scoped as thin sugar over
existing, already-tested logic, not new persistence behavior.

**Tests**: unit test confirming `enablePersistence: true` round-trips
a layout through mount→change→remount without the consumer touching
`useLayoutStorage` themselves.

---

### B2. Grid-wide default drag-handle selector

**Source**: Syncfusion `DashboardLayout.draggableHandle` — a grid-wide
default CSS selector restricting every panel's drag handle, vs. this
project's `dragAllowFrom`/`dragIgnoreFrom` being per-item-only props
today.

**Current state**: `GridItem`'s `dragAllowFrom`/`dragIgnoreFrom` have
no `GridLayout`-level default/inherit equivalent — every item must set
its own copy individually to get a shared handle selector across a
whole grid.

**Design**: add `dragAllowFrom?: string | null`/`dragIgnoreFrom?: string | null`
to `GridLayout` as grid-wide defaults, following the **exact** existing
null-means-inherit cascade pattern already used for `isDraggable`/
`isResizable`/`isBounded`/`showCloseButton`/etc: `GridItem`'s own prop
default stays `null`, and its `onMounted` resolution plus its
`setDragAllowFromHandler`/`setDragIgnoreFromHandler` eventBus cascade
(new, but mechanically identical to every existing handler of this
shape already in `GridItem.vue`) apply the parent's value only when the
item's own prop is `null`. This is the single most mechanically
well-trodden pattern in the entire codebase at this point — nine other
props already use it verbatim.

**Effort**: Small — copy an existing, proven pattern; no new
architecture, no design ambiguity.

**Tests**: mirror the exact test shape `showCloseButton`'s cascade
tests already use (`GridItem.spec.ts`'s "Should inherit X from
GridLayout" / "Should let a per-item X override GridLayout's default" /
"Should react when GridLayout's X default changes after mount" trio),
substituting `dragAllowFrom`/`dragIgnoreFrom`.

---

## Part C — Verification & tooling debt

Not features — re-running checks `PRODUCTION_READINESS.md` flagged as
"not re-verified this session," plus closing genuine tooling gaps.
Ordered by how quickly each one can rule itself in or out.

### C1. Quick re-verification (do these first — cheap, and tell you if anything else here is actually urgent)

- `npm run lint` / `npm run lint:style` in `packages/vue` — last
  confirmed clean before this session's changes.
- `npm audit --omit=dev --audit-level=high` — **done this session**:
  0 vulnerabilities in `packages/vue`'s own dependency tree (see
  `PRODUCTION_READINESS.md`). A whole-workspace `pnpm audit` (42
  findings) traced entirely to `packages/angular`'s scaffold
  devDependencies and the root's intentionally-pinned
  `vitepress@1.6.3` — neither reaches `packages/vue`.
- `npm run build:only` + `scripts/check-bundle-size.js` — confirm a
  current bundle-size figure (likely slightly smaller post-`mitt`
  removal, not measured).
- `npm run check:package-install` — pack-and-install smoke test.
- `npm run demo:build` / `npm run docs:build`.

**Effort**: Small, collectively — these are running existing scripts,
not writing new ones. Do this before anything else in this document;
a red result here is more urgent than any feature above.

### C2. Mutation testing re-run — done (infrastructure); results triage still open

**Update**: this item's own effort estimate ("Small to run") turned out
to badly understate what was actually needed. Getting `pnpm
test:mutation` to run at all against this package required a genuinely
significant fix, not just a re-run: this package's `@/core` alias
reaches into the sibling `packages/core` workspace package, which
Stryker's *default* sandboxing has no way to see (it only copies the
current project's own directory), so mutation testing never actually
executed cleanly here before. See [`docs/STRYKER.md`](./STRYKER.md)'s
own "Why the monorepo root" section for the full account — the fix
(invoking Stryker from the monorepo root, plus three further follow-on
issues that same change surfaced) is now in place and confirmed working
via a real run, not assumed.

What's still open, matching this item's original framing: *reading and
triaging* the results is a separate task from getting the infrastructure
working, and hasn't happened yet as a dedicated pass — see
[Interpreting results](./STRYKER.md#interpreting-results-going-forward)
in that same doc for how to approach it.

**Effort**: the infrastructure fix was Moderate, not Small (see above) —
already done. Triaging survived mutants from a real run remains Small
to Moderate, budgeting real time to read results rather than glance at
a summary score.

### C3. Visual regression baselines

`docs/VISUAL_REGRESSION.md` already documents *how* to generate these;
they simply don't exist yet. Requires the official, project-declared
Playwright browser build for a faithful baseline (not a substitute
build) — confirm that's available in whatever environment actually
generates them before starting, since a baseline captured against the
wrong browser build is worse than no baseline (false confidence).

**Effort**: Moderate — not because generating baselines is hard, but
because reviewing the *first* generated set for correctness (rather
than rubber-stamping whatever renders) takes real, careful attention;
a wrong baseline silently becomes "correct" for every future run once
committed.

### C4. CI-integrated SAST (e.g. CodeQL)

**Design**: a new `.github/workflows/codeql.yml` using GitHub's own
CodeQL Action, scoped to `javascript-typescript` — this is close to
boilerplate (GitHub's own quickstart template), not a custom design.

**Effort**: Small.

### C5. SBOM generation / npm provenance attestation

**Design**: `npm publish --provenance` (requires GitHub Actions OIDC
trust configured on the npm side — an `NPM_TOKEN`-adjacent setup step,
not just a CLI flag) for provenance; a separate SBOM step
(`@cyclonedx/cyclonedx-npm` or equivalent) generating a
`bom.json`/`bom.xml` artifact attached to each release.

**Effort**: Small to Moderate — mostly configuration, some of which
(the OIDC trust relationship) needs the same repo-admin-only access
`PRODUCTION_READINESS.md` already flags for `NPM_TOKEN`/branch
protection.

### C6. Automated accessibility testing (`axe-core`/equivalent)

**Design**: `@axe-core/playwright` integrated into the existing e2e
suite — a new assertion (`await expect(page).toHaveNoViolations()` or
equivalent) added to a handful of existing spec files' representative
pages (one per demo view is likely sufficient — the same components
are exercised repeatedly across specs, so exhaustive per-test coverage
would be redundant), rather than a wholesale new spec file.

**Effort**: Moderate — integration itself is small, but triaging
whatever axe-core actually flags on first run (some of which may be
demo-app-only issues, not library issues, and need distinguishing)
takes real review time.

### C7. Housekeeping — dead stub files

`packages/vue/package-lock.json.bak`, `packages/vue/vite.core.config.js`,
`packages/vue/tsconfig.build-types-core.json` — flagged as safe to
delete in an earlier session, still present. No assistant session has
had file-deletion capability to close this directly; needs a human (or
an assistant session with that tool available) to actually remove them.

**Effort**: Trivial once someone/something has delete access.

---

## Recommended overall sequence

Not a strict dependency chain — most items here are independent of
each other — but a reasonable order given effort-to-value ratio and
which items inform others:

1. **C1** (quick re-verification) — cheap, and a red result here
   changes the priority of everything else. **`npm audit` portion
   already done this session** — see above.
2. **B2** (`draggableHandle` default) — smallest real feature item,
   proven pattern, no design ambiguity.
3. **B1** (`enablePersistence` wrapper) — small, thin sugar over
   already-tested logic.
4. **C2** (mutation testing re-run) — cheap to run, catches regressions
   in exactly the surface this session changed.
5. **A3** (maximize/restore) — moderate, self-contained, clear value,
   no unresolved architectural questions once the freeze-while-maximized
   decision is confirmed.
6. **C4** (CodeQL) — small, independent, no reason to wait.
7. **A1** (swap-on-drag) — decide the multi-collision-fallback question
   first (a short investigation, not full implementation), then build.
8. **C6** (`axe-core` integration) — moderate, worth doing once the
   feature surface above has settled rather than mid-churn.
9. **C3** (visual regression baselines) — generate once the feature
   work above has landed, not before (a baseline captured mid-churn
   needs regenerating anyway).
10. **A2** (sub-grid nesting) — do the (a)-vs-(b) investigation
    described above *before* this slot in the sequence is treated as
    "starting the feature" — that investigation may substantially
    change this item's own effort estimate and could even resolve it
    as a documentation task rather than new code.
11. **C5** (SBOM/provenance) — depends on repo-admin access
    (`NPM_TOKEN`-adjacent OIDC setup) that may not be available on the
    same timeline as everything else; sequenced last because it's the
    most likely to be blocked on something outside this document's own
    control, not because it's unimportant.
12. **C7** (delete dead stub files) — trivial, do whenever delete
    access is available; not gated on anything else.

## Status

Not started — this is a planning document. Update each item's own
entry (and the corresponding `ROADMAP.md`/`PRODUCTION_READINESS.md`
line) as work actually begins/completes, matching how every other
tracked plan in this project is kept current.
