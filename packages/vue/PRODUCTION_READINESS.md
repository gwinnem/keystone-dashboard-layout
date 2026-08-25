# Production Readiness Checklist

Snapshot as of this document's own last edit — re-run the commands
inline before trusting a checked box in this file for anything
important; several of these change between sessions. Format: `[x]`
verified directly (a command was run, output checked, by either an
assistant session or the maintainer), `[ ]` genuinely open, `[~]`
partially done / caveat noted inline.

**Context note:** this package now lives at `packages/vue` inside a
monorepo (`@keystone-dashboard-layout/vue`, sibling to
`@keystone-dashboard-layout/core` and scaffolded React/Angular
packages) — a structural change since this document was last written
end-to-end. Several items below were re-verified fresh against that
current structure; others carry over from before the split and are
marked as such rather than silently assumed still true.

## Code quality

- [x] **Typecheck clean** — `vue-tsc --project tsconfig.json --noEmit`, re-verified this session after a real, substantial cleanup: the monorepo split had left `tsconfig.json` without an explicit `rootDir`, so TypeScript auto-computed one from `include` alone, and every cross-package `@/core/*` import (this package now legitimately imports from the sibling `core` package) fell outside it — a single root cause cascading into ~50 `TS6059` errors. Fixed (`rootDir` set to the common ancestor of `vue/src` and `core/src`, plus two missing `paths` entries for bare-barrel imports). Also fixed: a real indexing bug in `useGridItemResize.ts` (introduced by the `resizeHandles` feature's stronger `TResizeHandle` typing), a stale relative import in `components/index.ts` left over from the core-extraction, a `re-export-doesn't-import` bug in `grid-layout-props.interface.ts`, and a TS narrowing gap around `GridLayout.vue`'s two `getLayoutItem(...) ?? fallback` patterns. Full account in `docs/REFACTORING.md`.
- [x] **Unit/component tests passing** — 353/353 (`@keystone-dashboard-layout/vue`), 296/296 (`@keystone-dashboard-layout/core`), both re-run this session after the changes below.
- [x] **Test coverage** — `vue`: 99.65% statements / 95.05% branch / 99.64% functions / 99.64% lines. `core`: 99.11% statements / 97.05% branch / 99.27% functions / 99.18% lines (including the new `helpers/event-emitter.ts` at a clean 100% across the board). Both comfortably clear each package's own 90% gate.
- [x] **`resizeHandles` reactivity bug found and fixed** — every other item-level prop with the same null-means-inherit pattern (`isDraggable`/`isResizable`/`isBounded`/`showCloseButton`/`enableEditMode`/`useBorderRadius`/`borderRadiusPx`) has a direct prop watcher re-syncing its resolved ref when the prop itself changes reactively; `resizeHandles` never got one. Found via e2e (a demo control toggling it directly had no effect), fixed with the missing watcher, plus a new regression unit test.
- [~] **`lint`/`lint:style`** — not re-run this session; the last confirmed-clean state predates the monorepo split and this session's changes (mitt removal, `zIndex`/`#header`, the `resizeHandles` fix, the typecheck cleanup). Re-run `npm run lint`/`npm run lint:style` in `packages/vue` before trusting either is still 0 issues.
- [ ] **`npm audit`** — not re-run this session (no fresh dependency changes were made to warrant it, but it hasn't been independently re-verified against the monorepo's current lockfile either).
- [ ] **Mutation testing (Stryker)** — configured and previously run at least once, but **not re-run since this session's changes** (the emitter swap, `resizeHandles` fix, `zIndex`/`#header` additions). Worth a fresh run given how much of the changed surface (the internal eventBus, a previously-buggy watcher) is exactly what mutation testing is best at catching regressions in.

## Runtime dependencies

- [x] **Zero runtime dependencies**, genuinely — not just close. `mitt` (the last one) was removed this session, replaced with a small hand-rolled typed emitter (`@keystone-dashboard-layout/core`'s `createEventEmitter()`) implementing only the narrow `on`/`off`/`emit` surface actually used. Verified: `package.json`'s `dependencies` field for `vue`/`react`/`angular` now contains only the internal `@keystone-dashboard-layout/core` workspace reference; `core` itself declares none. `NOTICE.md` updated accordingly — it previously (correctly, at the time) named `mitt` as the one remaining bundled dependency; that's no longer accurate and has been corrected.

## Build & packaging

- [ ] **Bundle size** — not re-measured this session. The `mitt` removal should shrink the bundle further (mitt was already tiny, so the effect is likely small, not dramatic), but no fresh `npm run build:only` + `scripts/check-bundle-size.js` run has confirmed a current number. Re-run before quoting a figure.
- [ ] **Library build / demo build / docs build** — not re-run this session (`npm run build:only`, `npm run demo:build`, `npm run docs:build`). No source changes this session should plausibly break any of these (typecheck is clean, which is the build's own gate), but none has been directly confirmed.
- [ ] **Pack-and-install smoke test** (`npm run check:package-install`) — not re-run this session.
- [ ] **Publish status** — not verified this session. The package now publishes under `@keystone-dashboard-layout/vue` (post-monorepo-split naming) rather than the original package name this document was first written against; check the current npm registry state directly before trusting any prior claim about what's published.

## CI/CD & repository hygiene

Not independently re-verified this session — carried over from the last time this section was confirmed:

- [x] Three GitHub Actions workflows present and live: `ci.yml`, `mutation-testing.yml`, `release.yml` (as of the last check; confirm these still reference the current monorepo layout rather than the pre-split single-package structure).
- [ ] Branch protection requiring CI + review before merge — a GitHub repo setting, needs a repo admin.
- [ ] `NPM_TOKEN` secret configured — required for `release.yml` to actually publish.
- [x] CODEOWNERS references a real username, not a placeholder (as of the last check).
- [x] Husky/lint-staged wired up (as of the last check).

## Documentation

- [x] **`docs/REFACTORING.md`** — extended this session with two new numbered findings (#117, #118) covering the full e2e investigation: the `dynamic-items.spec.ts` `getByText` mystery (resolved — switched to a proven `data-testid` selector), the WebKit native-HTML5-DnD gap in `external-drop.spec.ts` (resolved — skipped with a named, confirmed mechanism), and the Firefox `autoScroll` gap in `item-overrides.spec.ts` (**not** resolved — skipped honestly as an open investigation, not dressed up as an equivalently-understood platform limitation like the other two).
- [x] **`ROADMAP.md`** — items 33–34 (`zIndex`, `#header` slot) added and marked done this session, sourced from a direct read of Syncfusion DashboardLayout's actual API reference rather than marketing copy.
- [x] **`PARITY_GAP_VUE_COMMERCIAL_AND_CROSS_FRAMEWORK.md`** — Syncfusion section rewritten this session with confirmed findings (full property/method list read directly), replacing earlier "not confirmed" hedging.
- [x] **`FEATURES.md`** — `zIndex`, `#header`, and (found missing while there) `resizeHandles`/`#resize-handle` entries added.
- [x] **`CHANGELOG.md`** — `[Unreleased]` entries added for the `mitt` removal, `zIndex`/`#header`, and the `resizeHandles` fix.
- [x] **`NOTICE.md`** — corrected to reflect zero runtime dependencies (see above).
- [~] **Everything else in this section** (`README.md`/`INSTALL.md`/`docs/ARCHITECTURE.md`/`docs/ACCESSIBILITY.md`/`MIGRATION.md`/`SUPPORT.md`/`SECURITY.md`) — not independently re-checked this session; no session change should have made any of them stale, but that's an inference, not a direct verification.
- [ ] No CI-integrated SAST/static analysis (e.g. CodeQL).
- [ ] No SBOM generation or npm provenance attestation (`--provenance`).
- [ ] No automated accessibility testing (`axe-core`/equivalent).

## Testing depth

- [x] **Full Playwright e2e suite run against real Chromium, Firefox, and WebKit** this session — a meaningful correction to this document's own prior state, which described only a workaround-Chromium-build environment with no real cross-browser testing possible at all. That limitation no longer applies to how this suite has actually been exercised most recently.
- [x] **Every genuine e2e bug found this session was fixed and confirmed** across a full run: the `resizeHandles` reactivity bug (see Code quality above), and a real test-design bug in `dynamic-items.spec.ts` (switched from an unreliable `getByText` match to the proven `data-testid` selector the file's own other test already used).
- [x] **Two Playwright/browser-specific limitations identified with a confirmed, named mechanism and skipped accordingly, each with an inline comment at every skip site**:
  - `touch-input.spec.ts` — CDP's `Input.dispatchTouchEvent` is Chromium-only; skipped on Firefox/WebKit.
  - `external-drop.spec.ts` — native HTML5 drag-and-drop cannot be simulated via `page.mouse` in WebKit (no CDP-equivalent translation layer, unlike Chromium); skipped there specifically, confirmed by contrast against the one test in the same file that uses the library's own pointer-based `allowCrossGridDrag` instead and needs no skip.
- [ ] **One genuinely unresolved e2e gap, honestly recorded as such**: `item-overrides.spec.ts`'s `autoScroll` test fails on Firefox only. Three separate fix attempts (a `beforeEach` settle-wait, a drag-activation confirmation, polling `scrollTop` live during the hold rather than after teardown) all ruled out the two most plausible mechanisms (a one-shot timing race, a teardown-order race) without finding the actual cause — `scrollTop` never advances at all in Firefox across a full 5-second window despite the drag confirmed active throughout, and the underlying `findScrollableAncestor`/`scrollBy` logic reads as entirely browser-agnostic on inspection. Skipped on Firefox with an inline comment recording this history; see `docs/REFACTORING.md` #118 for anyone picking it back up with real Firefox devtools access.
- [ ] Visual regression baselines still don't exist (`docs/VISUAL_REGRESSION.md`).
- [~] Cross-grid drag/drop, outside-drop, and their combination — coverage carried over from before this session, not independently re-checked, but nothing this session touched should have affected it.

## Accessibility

Carried over from before this session, not independently re-checked:

- [x] Keyboard move/resize implemented and tested.
- [x] `aria-roledescription`/`aria-describedby`/`role="group"` on draggable/resizable items.
- [~] Deliberately *not* a full WAI-ARIA grid/application widget pattern — a documented, intentional scope limit.
- [x] Localizable UI/ARIA strings (`ariaLabels`).

## Security

- [x] **Zero runtime dependencies** (see above) — the strongest possible position on third-party runtime-dependency risk, an improvement over the prior "one small, well-understood dependency (`mitt`) remaining" state.
- [ ] `npm audit` not re-run this session (see Code quality above).
- [x] No `eval`/dynamic code execution anywhere in this session's changed source (checked directly for the new `event-emitter.ts` and the modified `GridItem.vue`/`GridLayout.vue`).
- [x] No telemetry, analytics, or network calls introduced by any change this session.

## Browser/runtime support

- [x] Node engine range (`^18.0.0 || ^20.0.0 || >=22.0.0`) respected by this session's own changes — the `rootDir`/`import.meta.dirname` config work specifically used a `?? path.dirname(fileURLToPath(...))` fallback pattern (rather than `import.meta.dirname` alone) precisely to keep Node 18 support intact, across every config file in the monorepo that needed it.
- [~] Everything else in this section carried over, not independently re-checked.

## Known, open, and deliberately deferred

From `ROADMAP.md`/`PARITY_GAP_VUE.md`, still genuinely unimplemented as of this session:

- [ ] Swap-on-drag collision mode.
- [ ] Sub-grid nesting.
- [ ] Align/distribute commands over a `multiSelect` selection.
- [ ] Maximize/restore an item.
- [ ] An open, pluggable `positionStrategy` interface (the `compactor` prop covers the equivalent need for compaction specifically; positioning itself is still a closed two-choice toggle).
- [ ] Spacing guides with distance labels; per-input-type drag-activation thresholds; async persistence backends; a fast/O(n log n) compactor; a worker-based layout engine (all `docs/PARITY_GAP_PLAN.md` items).
- [ ] Lower-priority Syncfusion-comparison items: a one-flag `enablePersistence`-style convenience wrapper around the existing `useLayoutStorage`; a grid-wide default drag-handle selector (`draggableHandle` equivalent).
- [ ] A Nuxt module with a real, systematic SSR audit (one specific bug found and fixed previously; not an exhaustive sweep).

## Housekeeping debt (no tool access to close these directly)

- [ ] A few dead stub files flagged in an earlier session as safe to delete once through a release cycle, still present: `packages/vue/package-lock.json.bak`, `packages/vue/vite.core.config.js`, `packages/vue/tsconfig.build-types-core.json`. No file-deletion capability was available to close this directly this session.

## The short version

**Code quality (typecheck, unit/component tests, coverage) and the e2e suite**: freshly verified this session, in good shape, with one honestly-unresolved Firefox-specific gap recorded rather than hidden. **Build/packaging/publish status, lint, mutation testing, and CI/CD**: not touched this session — re-run before trusting any specific number or checkmark in those sections. **Feature completeness**: several genuinely large, unimplemented items remain on the roadmap (swap-on-drag, sub-grid nesting, align/distribute, a worker engine, among others) — see "Known, open, and deliberately deferred" above for the current, accurate list.
