# Working with this monorepo in VS Code

A practical guide for day-to-day development in `keystone-dashboard-layout`
using VS Code. Covers setup, navigating the workspace, running/debugging
tasks, linting/formatting, and common gotchas specific to this repo's
pnpm + Turborepo layout.

## 1. First-time setup

1. **Install pnpm** (if you don't have it): `corepack enable` (Node 16.9+
   ships corepack; this reads the `packageManager` field in the root
   `package.json` and installs the matching pnpm version automatically).
2. **Open the repo root in VS Code** — `C:\gwinnem\keystone-dashboard-layout`.
   Open the *root*, not an individual package folder, so the workspace
   settings in `.vscode/` and the per-package ESLint configs are all
   picked up correctly.
3. **Install recommended extensions.** VS Code will prompt you ("This
   workspace has extension recommendations") — accept it, or open the
   Extensions panel and filter by `@recommended`. These come from
   `.vscode/extensions.json`:
   - **Vue.volar** — Vue 3 language support (packages/vue)
   - **dbaeumer.vscode-eslint** — ESLint, configured per-package (see §4)
   - **esbenp.prettier-vscode** — formatting
   - **stylelint.vscode-stylelint** — SCSS/Vue style linting
   - **angular.ng-template** — Angular language support (packages/angular, once scaffolded)
   - **editorconfig.editorconfig** — respects `.editorconfig`
   - **vitest.explorer** — run/debug Vitest tests from the Testing panel
   - **ms-playwright.playwright** — run/debug Playwright e2e tests
4. **Install dependencies:** open a terminal (`` Ctrl+` ``) and run:
   ```bash
   pnpm install
   ```
   This installs for every package in one pass — you don't `cd` into each
   package and install separately.

## 2. Workspace layout

```
.
├── packages/
│   ├── vue/          # reference implementation — Vue 3, full test suite
│   ├── react/         # scaffolded, implementation pending
│   └── angular/       # scaffolded, implementation pending
├── vitepress-docs/    # shared documentation site
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json # shared TS compiler options, extended per package
└── .vscode/           # this workspace's editor config (see below)
```

Each package under `packages/*` is self-contained: its own `package.json`,
`tsconfig.json` (extends the root `tsconfig.base.json`), and — where
applicable — its own `eslint.config.js`, `vite.config.js`, test config, etc.
Shared tooling (TypeScript, ESLint core, Prettier, Stylelint, Turborepo,
semantic-release) lives in the **root** `package.json`'s `devDependencies`
and is available to every package automatically (pnpm/Node resolve it via
the workspace root — no need to duplicate it per package).

Use VS Code's Explorer as normal; there's no need for a multi-root
workspace file — a single-folder window at the repo root sees everything.

## 3. Running things

### From the integrated terminal

Two patterns you'll use constantly:

**Run a script in every package that defines it** (via Turborepo, from the root):
```bash
pnpm build          # turbo run build
pnpm test           # turbo run test
pnpm test:coverage
pnpm lint
pnpm typecheck
```
Turborepo skips any package that doesn't define the script — e.g. running
`pnpm build` today only actually builds `packages/vue`, because
`packages/react` and `packages/angular` don't have a working `build` script
yet. Nothing fails; it's just a no-op for those packages.

**Run a script in one specific package**, using pnpm's `--filter`:
```bash
pnpm --filter @keystone-dashboard-layout/vue run dev
pnpm --filter @keystone-dashboard-layout/vue run test:e2e
pnpm --filter @keystone-dashboard-layout/react run typecheck
```
This is equivalent to `cd packages/vue && pnpm run dev`, but works from
anywhere in the repo and doesn't require you to actually change directory.

### From VS Code's Command Palette (no terminal typing needed)

Press `Ctrl+Shift+P` → **Tasks: Run Task** → pick one of the predefined
tasks in `.vscode/tasks.json`:

| Task | What it runs |
| --- | --- |
| `install` | `pnpm install` |
| `dev: vue` | Vue package dev server (background) |
| `build: all` | `pnpm build` (default build task, `Ctrl+Shift+B`) |
| `test: all` | `pnpm test` (default test task) |
| `test: vue (watch)` | Vitest watch mode for the Vue package (background) |
| `test:e2e: vue` | Playwright e2e suite |
| `lint: all` / `lint:fix: all` | ESLint across packages |
| `typecheck: all` | `pnpm typecheck` |
| `docs: dev` | VitePress docs dev server (background) |

Background tasks (dev servers, watch mode) show up in the terminal panel
and keep running until you stop them (trash-can icon or `Ctrl+C`).

### Running/debugging individual tests

With the **Vitest** extension installed, open the Testing panel
(flask icon in the Activity Bar) — it discovers `vitest.config.js` /
`vitest.config.ts` files across the workspace (currently
`packages/vue` and `packages/react`) and lets you run or debug individual
tests by clicking the gutter icon next to a `describe`/`it` block, no
terminal required.

With the **Playwright** extension, open the Testing panel the same way to
run/debug `packages/vue/e2e/*.spec.ts` files, including stepping through
with the Playwright Inspector.

## 4. Linting and formatting

- **ESLint**: each package under `packages/*` has its own `eslint.config.js`
  (ESLint 9 flat config) tailored to that framework — `packages/vue`'s
  includes `eslint-plugin-vue` rules, `packages/react`'s is a lighter
  scaffold-level config. The root `eslint.config.js` only lints repo-level
  files and explicitly ignores `packages/**`. The `.vscode/settings.json`
  in this repo sets `eslint.workingDirectories` so the extension applies
  the *correct* config depending on which file you have open — you
  shouldn't need to configure anything yourself.
- **Format on save** is enabled workspace-wide via Prettier
  (`.vscode/settings.json`). If a file doesn't format the way you expect,
  check `.prettierignore` at the root — it applies repo-wide.
- **Stylelint** validates `.scss`/`.vue` files (rules for SCSS-in-Vue via
  `stylelint-config-recommended-vue`). Run `pnpm lint:style` to check
  everything, or rely on the Stylelint extension's inline squiggles.

## 5. TypeScript project references

The root `tsconfig.json` is just a references pointer:
```jsonc
{
  "references": [
    { "path": "./packages/vue" },
    { "path": "./packages/react" },
    { "path": "./packages/angular" }
  ]
}
```
Each package's own `tsconfig.json` extends `../../tsconfig.base.json` and
adds package-specific options (e.g. `packages/vue` sets `jsx: "preserve"`
and a `@theme/*` path alias into `vitepress-docs`). If VS Code's IntelliSense
seems to be using the wrong TS version, check the status bar (bottom
right, click the TypeScript version number) and select **"Use Workspace
Version"** — the workspace is configured to point at the root's installed
TypeScript via `typescript.tsdk` in `.vscode/settings.json`.

## 6. Git and commits

- **Pre-commit hook**: `.husky/pre-commit` runs `npx lint-staged` (see the
  root `package.json`'s `lint-staged` field) — this runs ESLint/Stylelint/
  Prettier on staged files before every commit. If a commit seems to hang
  or fail unexpectedly, this is usually why — check the terminal output.
- **Commit messages**: this repo uses Conventional Commits (feeding
  semantic-release for `packages/vue`'s automated releases). Run
  `pnpm commit` from the root to get a guided commit message prompt
  (Commitizen) instead of writing one by hand.
- **Don't `cd` into a package and run `git` commands** expecting a separate
  repo — this is a single Git repository rooted at the top level; all
  packages share one `.git` folder and one commit history.

## 7. CI parity

Everything in `.github/workflows/ci.yml` runs `pnpm install --frozen-lockfile`
first — meaning **`pnpm-lock.yaml` must be committed and up to date**. If
you add or change a dependency in any package, run `pnpm install` locally
(regenerating the lockfile) and commit the updated `pnpm-lock.yaml` in the
same PR, or CI will fail at the install step.

To reproduce most of CI locally before pushing:
```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint:style
pnpm lint
pnpm test:coverage
pnpm build
```

## 8. Adding a new package

1. Create `packages/<name>/` with its own `package.json` (scoped as
   `@keystone-dashboard-layout/<name>`), `tsconfig.json` (extending
   `../../tsconfig.base.json`), and `src/`.
2. Add it to the root `tsconfig.json`'s `references` array.
3. Run `pnpm install` at the root to wire it into the pnpm workspace
   (it's already covered by `pnpm-workspace.yaml`'s `packages/*` glob —
   no change needed there).
4. Turborepo and the `.vscode/tasks.json` "all" tasks will pick up any
   script the new package defines automatically, next time they run.

## 9. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| ESLint not reporting errors in a package | Check `.vscode/settings.json`'s `eslint.workingDirectories` includes that package; reload the ESLint server (`Ctrl+Shift+P` → "ESLint: Restart ESLint Server") |
| `pnpm build`/`test` silently does nothing for a package | Expected for `packages/react`/`packages/angular` today — they don't define every script yet (see §3) |
| TypeScript errors that don't match what `tsc` reports in the terminal | VS Code is using its bundled TS, not the workspace's — see §5 |
| `pnpm install --frozen-lockfile` fails in CI but works locally | You changed a dependency without committing the regenerated `pnpm-lock.yaml` — see §7 |
| Pre-commit hook seems to hang | It's running lint-staged on your staged files — check the terminal, it's not actually stuck |
