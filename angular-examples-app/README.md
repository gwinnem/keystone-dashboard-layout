# Keystone Dashboard Layout — Angular Examples (standalone app)

A real, standalone Angular CLI application — **not** part of the pnpm
workspace (same deliberate choice as `astro-docs`; see its own
`package.json` description) — hosting live, deployable examples of
`keystone-dashboard-layout-angular`.

## Why this exists

The original plan was to embed Angular examples directly inside
`astro-docs` as Astro islands, via the community
`@analogjs/astro-angular` integration (there's no official
`@astrojs/angular`). That approach hit a wall this session couldn't
resolve without direct access to a running dev server: components
consistently resolved to `undefined` when Astro's MDX renderer tried
to render them, even after fixing a real version mismatch
(`@analogjs/astro-angular` unconditionally importing an Angular 20+-only
API against an Angular 19 install) and a real `tsconfig` scoping gap
(the Angular compiler's own program never included
`packages/angular/src/**`, since it's outside `astro-docs`'s own
directory tree). Since further diagnosis needed to actually run
against a live server, this separate app sidesteps the fragile
integration entirely — Angular renders through its own native,
well-supported CLI/esbuild build here, not through Astro's Vite
pipeline at all.

## Why it reaches into `packages/angular/src` directly

`packages/angular` has no working build output yet (`ng-packagr` was
never actually run — see that package's own `package.json`/
`ng-package.json` history). Rather than wait on that, `tsconfig.json`'s
own `paths` field aliases `keystone-dashboard-layout-angular` straight
to `../packages/angular/src/index.ts`, and `tsconfig.app.json`'s own
`include` explicitly covers `../packages/angular/src/**/*.ts` too — a
real, confirmed requirement (Angular's own compiler needs a file inside
its *program*, not just resolvable by module resolution, to process its
decorators/templates at all). Once `packages/angular` has a real build,
switch this to a normal `link:../packages/angular` dependency instead
and drop the `paths` alias.

`keystone-dashboard-layout-core` *does* have a real build already, so
it's a normal `link:../packages/core` dependency here, no alias needed.

## Local development

This directory has its own `pnpm-workspace.yaml` (with no `packages`
field) so pnpm treats it as its own, independent project rather than
walking up and absorbing it into the monorepo root's own workspace
(which only declares `packages/*`) — without it, `pnpm install` run
from inside here silently does nothing for this app at all, reporting
only "Scope: all N workspace projects" / "Already up to date" for the
unrelated root packages instead. Same pattern `astro-docs` already
uses for the same reason.

```sh
pnpm install
pnpm dev
```

Serves at `http://localhost:4200/` by default (Angular CLI's own
default port, distinct from `astro-docs`'s `4321`).

## Building for deployment

```sh
pnpm build
```

Outputs a static, deployable bundle to
`dist/keystone-dashboard-layout-angular-examples/browser/` — a plain
static site (client-side routed via `@angular/router`), deployable to
any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, and
so on). Since routing is client-side, whichever host you pick needs a
catch-all/SPA-fallback rule redirecting all paths to `index.html` — the
specific mechanism (`_redirects`, `vercel.json`, a 404.html trick, etc.)
depends on which host you choose.

## Once deployed

Let me know the deployed URL and I'll update `astro-docs`'s Angular
Examples pages to link to (or `<iframe>`) the real, live pages here,
replacing the current single, non-functional
`/angular/examples/basic-drag-resize/` island attempt.

## Current status

All 53 examples now exist under `src/app/examples/`, matching the
full example set the Vue and React packages already have (52 from
the original set, plus a 53rd, resize direction toggles, added to
all three frameworks together afterward), each with its own route in
`app.routes.ts` and its own sidebar link in `app.component.ts`
(navigation lives there now, not in `home.component.ts`, which is now
the full examples gallery, not a plain welcome message). Not yet
deployed publicly (see “Once deployed” above) — currently only
verified via `pnpm dev` (`http://localhost:4200/`).

Verification depth varies by example: 33–45 were individually
live-verified against real browser interaction this session (drag/
resize dispatched via `PointerEvent`s, DOM state inspected directly),
surfacing and fixing several real bugs along the way — most
significantly, `enableUndoRedo` silently not tracking externally-
driven `layout` length changes, fixed directly in
`GridLayoutComponent` (see that file's own `commitUndoPoint`/
`lastSnapshot` doc comments for the full account). Examples 1–32 were
verified in an earlier session. Examples 46–52 exist as files but
weren’t part of either verification pass — treat them with the same
caution 33–45 were treated with before this session’s own pass
through them.

## Donate

If you enjoyed this project — or just feeling generous, consider buying me a 🍺. Cheers!

<a href="https://paypal.me/gwinnem/">
    <img src="https://raw.githubusercontent.com/gwinnem/vue-responsive-grid-layout/dev/docs/paypal-images/blue.svg" height="40" alt="paypal">
</a>

## License

MIT — see [LICENSE](./LICENSE).
