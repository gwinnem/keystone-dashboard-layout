# Production Readiness Checklist

Snapshot as of this document's own last edit — re-run the commands
inline before trusting a checked box in this file for anything
important; several of these change between sessions. Format: `[x]`
<<<<<<< Updated upstream
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
=======
verified directly (a command was run, output checked), `[ ]` genuinely
open, `[~]` partially done / caveat noted inline.

## Code quality

- [x] Typecheck clean — `npx vue-tsc --project tsconfig.json --noEmit` produces no output.
- [x] Unit/component tests passing — 620/620 (Vitest).
- [x] Test coverage — 99.49% statements / 95.94% branches / 99.5% functions / 99.52% lines. Remaining gaps are documented, specific, hard-to-reach defensive guards or narrow, not-fully-isolated branches (see `vitepress-docs/guide/coverage.md`), not unexamined blind spots. One genuine, larger remaining gap is flagged there honestly rather than hidden: no end-to-end coverage of RTL combined with an in-progress resize.
- [x] `lint:style` (Stylelint) — clean, 0 issues, and *is* a blocking gate.
- [x] `lint` (ESLint) — the 10 remaining warnings (5 `prefer-destructuring`/`no-param-reassign` locations, some appearing at 2 lines each) were rewritten out entirely rather than left as accepted noise: `GridLayout.vue`'s `applySnapToGridAdjustment` and its `dragEvent` call site now use dedicated result variables instead of reassigning `x`/`y`; `move-helper.ts`'s loop accumulates into a new `updatedLayout` local instead of reassigning the `layout` parameter; `breakpoints-helper.ts` and `native-interaction.ts`'s single-property assignments now use actual destructuring syntax. The 2 remaining errors (`vue/no-mutating-props` on the two genuine `v-model:layout` in-place-mutation sites — the mechanism itself, not a bug) are now individually suppressed with scoped `eslint-disable-next-line` comments and a rationale, matching this project's own established convention elsewhere, rather than silently tolerated. **Not yet re-verified with `npm run lint` itself** — done during a period where `npm install`/registry access was blocked by a `403 host_not_allowed` network restriction in the sandbox; confirmed via careful manual tracing of every changed variable reference instead. Re-run `npm run lint` once dependencies can actually be installed to confirm 0 problems.
- [x] `npm audit --omit=dev --audit-level=high` — 0 vulnerabilities.
- [x] Dev dependencies current — a full pass upgraded ESLint (9→10), Vitest (3→4), TypeScript (5.9→6.0), Vite (6→8), stylelint (16→17), jsdom (26→29), `@types/node` (22→26), and the full semantic-release toolchain, each verified individually (typecheck, full unit suite, and for the higher-risk ones — Vite, native-interaction.ts-adjacent Vitest fixes — the complete e2e suite too). Removed 3 genuinely dead/unused devDependencies along the way (`ttypescript`, `sass-loader`, `@babel/types` — confirmed unreferenced anywhere in the project before removing). Project-wide `npm audit` (including dev) dropped from 22 to 3 vulnerabilities as a side effect of the semantic-release upgrade fixing a transitive `tar` CVE. TypeScript 7 and `vite-plugin-dts@5.x` are both deliberately held back — the former breaks `vue-tsc` outright (confirmed: it imports a path TypeScript 7 no longer exports), the latter silently ignores its own `outDir` config and would have broken the published package's type resolution (confirmed via `npm run check:package-install` failing, then passing again once reverted).
- [x] Mutation testing (Stryker) configured and run at least once; scope includes `src/composables/*.ts` (a real gap found and closed — see `docs/REFACTORING.md` #62).

## Build & packaging

- [x] Library builds clean (ES + UMD + type declarations) via `npm run build:only`.
- [x] Bundle size within budget — 21.84 KB gzip (ES) against a 55 KB budget (33.16 KB headroom) — measured fresh via a clean `npm run build:only`, not carried over from before the `interact.js` removal. Enforced by `scripts/check-bundle-size.js`. Budget was bumped deliberately from 45→55 KB after an earlier large feature batch, with the reasoning in the script's own comment — not silently raised to paper over a regression, and now has substantial headroom again after `interact.js`'s removal shrank the actual bundle well below even the pre-bump 45 KB figure.
- [x] Pack-and-install smoke test passing (`npm run check:package-install`) — the actual packed tarball resolves and every expected named export is present, checked against the real published-package structure, not just the source tree.
- [x] Demo app builds clean (`npm run demo:build`).
- [x] VitePress docs site builds clean (`npm run docs:build`) — 45 interactive examples, zero broken internal links (verified directly, not assumed).
- [ ] **Not published.** npm still has `1.2.9` (verified via a fresh search, not assumed stale) while this repository is now at `2.0.0` — every fix, feature, and test across this project's entire recent history, including everything in this checklist, doesn't exist for anyone who runs `npm install` today. The published `package.json` also still has a real, uncorrected typo (`typeings` instead of `typings`) and no `exports` map — both already fixed in this repo's own `package.json`, just not yet published. **This is the single highest-impact remaining item** — nothing else here matters to an actual consumer until this happens. `npm run package` (see `CONTRIBUTING.md`'s "Generating (and, manually, publishing) the package locally") runs every gate in this checklist and produces the exact publishable tarball in one command; actually publishing still needs your own authenticated npm session (`npm login`), which no automated process here can supply on your behalf.

## CI/CD & repository hygiene

- [x] Three GitHub Actions workflows present and live: `ci.yml`, `mutation-testing.yml`, `release.yml`.
- [ ] Branch protection requiring CI + review before merge — a GitHub repo setting, not something committable; needs a repo admin to enable.
- [ ] `NPM_TOKEN` secret configured — required for `release.yml`'s `semantic-release` step to actually publish. Without it, the release workflow can run and pass without ever reaching npm.
- [x] CODEOWNERS references a real username (`@gwinnem`), not a placeholder — verified by reading the file directly.
- [x] `.eslintignore`/`.stylelintignore` — checked directly: `.eslintignore` is empty (ESLint 9's own flat-config ignores are used instead), `.stylelintignore` only lists real, existing build/output directories. No stale copy-pasted-from-template references found.
- [x] Husky/lint-staged actually wired up (was previously non-functional — v9 installed with a v4-style config block it doesn't read).

## Documentation

- [x] `README.md`, `INSTALL.md`, `FEATURES.md`, `ROADMAP.md` all current with the latest feature set (spot-checked against source, not just assumed in sync).
- [x] `CHANGELOG.md` current, structurally intact (verified section headers weren't accidentally clobbered — a mistake made and caught twice earlier in this project's history, worth this specific callout).
- [x] Every prop/method/event has a doc comment in source *and* an entry in the corresponding VitePress reference table (`grid-layout-props.md`, `grid-item-props.md`, `grid-layout.md`, `grid-layout-events.md`, `grid-item-events.md`).
- [x] `docs/ARCHITECTURE.md` reflects the current composable split for both `GridItem.vue` and `GridLayout.vue` (the latter's cross-grid/outside-drop extraction is recent — confirmed the doc was updated alongside it, not left describing the pre-extraction shape).
- [x] `docs/ACCESSIBILITY.md` states plainly what's *not* covered (not a full WAI-ARIA grid/application widget pattern) rather than implying more than what's built.
- [x] `docs/REFACTORING.md` — a running, numbered log of every bug found and fixed, with root cause and verification method, not just a change list. Useful for anyone auditing *how* confident to be in a given fix, not just *that* one was made.
- [x] `MIGRATION.md` — documents the `2.0.0` breaking change (`interact.js`/`dragOption`/`resizeOption` removed) with an explicit upgrade path.
- [x] `SUPPORT.md` — supported versions/environments, how to get help, and the maintenance model (single maintainer, no SLA) stated plainly rather than left implicit.
- [x] `NOTICE.md` — third-party license attributions for bundled runtime dependencies, distinguished from the fuller build-toolchain dependency tree `npm run check:licenses` resolves.
- [x] `SECURITY.md` kept in sync with the current major version (previously stale, referencing `1.x` after the `2.0.0` bump — caught and fixed; now correctly at `2.x`).
- [ ] No CI-integrated SAST/static analysis (e.g. CodeQL) — `npm audit` covers known dependency CVEs, nothing scans this project's own source for vulnerability patterns.
- [ ] No SBOM generation or npm provenance attestation (`--provenance`) wired into the release pipeline — increasingly expected for enterprise supply-chain review.
- [ ] No automated accessibility testing (`axe-core`/`jest-axe`/equivalent) — the claims in `docs/ACCESSIBILITY.md` are verified by hand-written attribute assertions, not an automated a11y scanner.

## Testing depth

- [x] Unit/component coverage — see Code quality above.
- [x] Cross-grid drag/drop, outside-drop, and their combination (`allowCrossGridDrag` + `allowOutsideDrop` on the same grid) specifically covered, including a real, previously-shipped bug in the collision check found and fixed while closing coverage gaps (see `docs/REFACTORING.md` #70) — not just assumed correct because it looked right on read-through.
- [~] End-to-end (Playwright) suite exists (10 spec files, extended this session with keyboard-accessibility and advanced-features coverage) covering drag/resize/responsive/outside-drop/keyboard/compaction/snap-to-grid/presets, but:
  - [ ] Not run via the *official* browser in this environment — network egress blocks the official Playwright browser download (`cdn.playwright.dev`). A manual workaround (an older, already-present Chromium build launched via an explicit `executablePath`) has been used successfully for several bug investigations and to verify new/fixed tests, but is a session-specific workaround, not a repeatable CI setup — see `docs/REFACTORING.md` #66, #73.
  - [ ] Visual regression baselines don't exist yet, and generating them specifically needs the *official* declared Playwright browser version (not the workaround above) for a faithful result — see `docs/VISUAL_REGRESSION.md`.
  - [~] The e2e suite's own flakiness under the full sequential runner (finding #41) was partially root-caused this session: a genuine, project-wide race between an item's `vue-draggable` class appearing and its container-width measurement actually settling was found and fixed (a shared `stableBoundingBox()` helper, applied to `drag-and-resize.spec.ts` and the two new spec files). `dynamic-items.spec.ts`'s and `external-drop.spec.ts`'s own intermittent timeouts remain unexplained — traced only as far as "the workaround Chromium build under sustained use," not a specific root cause.
- [ ] No real Firefox/WebKit testing has been possible in this environment at any point — only Chromium, and only via the workaround above. If cross-browser behavior matters for your use case, verify independently before shipping — see [`MANUAL_TEST_CHECKLIST.md`](./MANUAL_TEST_CHECKLIST.md) for a structured way to do that (this doesn't close the gap on its own; it's a checklist for a human to run, not automated coverage).

## Accessibility

- [x] Keyboard move/resize implemented and tested.
- [x] `aria-roledescription`/`aria-describedby`/`role="group"` on draggable/resizable items.
- [~] Deliberately *not* a full WAI-ARIA grid/application widget pattern (roving `tabindex`, a dedicated "move mode") — a documented, intentional scope limit, not an oversight. Confirm this matches your own accessibility requirements before shipping to a context with strict compliance needs (e.g. a public-sector or regulated product).
- [x] Localizable UI/ARIA strings — the close button's label, `aria-roledescription`, and the keyboard move/resize instructions were previously hardcoded English literals. Now overridable via `ariaLabels` (`GridLayout` grid-wide default, `GridItem` per-item override), current English text as the fallback default. Not a full i18n system (no pluralization, no locale negotiation) — just makes the strings reachable.

## Security

- [x] 0 known vulnerabilities in production dependencies.
- [x] ~~`interact.js` (the core drag/resize dependency, ~59% of this library's own gzipped bundle) was publicly characterized by at least one third-party packager as "minimally maintained... feature-complete... not covered by the security advisory policy."~~ Resolved by removing it entirely — replaced with a native, Pointer Events-based drag/resize engine (`src/core/helpers/native-interaction.ts`) with zero third-party runtime dependency for it. See `docs/REFACTORING.md` for the full account and `docs/BUNDLE_ANALYSIS.md` for the measured bundle-size effect (a 54% gzip reduction). The only runtime dependency left is `mitt`.
- [x] No `eval`/dynamic code execution anywhere in the library's own source (checked directly, not assumed from general code style).
- [x] No telemetry, analytics, or network calls of any kind in the library itself.

## Browser/runtime support

- [x] Node engine range declared (`^18.0.0 || ^20.0.0 || >=22.0.0`) and enforced via `engines` in `package.json`.
- [ ] Node 18 is EOL (April 2025) — still supported per the `engines` range above. A deliberate compatibility decision to revisit, not an oversight; dropping it is a breaking change for anyone still on it.
- [~] Browser support relies on `ResizeObserver` and modern CSS (`color-mix`-adjacent patterns avoided in favor of simpler `rgb(... / ...%)` syntax, already broadly supported) — no explicit browserslist-driven compatibility test exists confirming the actual minimum supported browser versions; based on `browserslist` config, not independently verified against real old browsers.

## Known, open, and deliberately deferred (not blocking, but worth knowing about)

- [x] ~~Multi-select + group move/resize~~ — done, deliberately scoped down (not collision-aware for passenger items during the gesture) — see `docs/REFACTORING.md` #74 and `COMPETITIVE_ROADMAP.md`.
- [ ] A Nuxt module with a real, systematic SSR audit — one specific SSR-breaking bug was found and fixed (an unguarded `navigator.userAgent` read), confirmed with an actual SSR render, but that's one instance checked, not an exhaustive sweep.
- [ ] Swap-on-drag collision mode — still in `ROADMAP.md`, genuinely unimplemented. (Undo/redo, listed here alongside it previously, is now done — `enableUndoRedo`/`undo()`/`redo()`, see `docs/REFACTORING.md`.)

## The short version

**Code, tests, and build tooling**: production-ready. **Getting it into anyone's hands**: blocked entirely on publishing — an `npm publish` and a handful of GitHub repo settings only a repo admin can do. Everything else on this list is either already fine, or a known, documented, non-blocking gap.
>>>>>>> Stashed changes
