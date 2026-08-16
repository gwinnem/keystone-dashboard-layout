/**
 * DEPRECATED — no longer used by any build script (see package.json's
 * `build`/`build:all`, which no longer references this file).
 *
 * This used to build the `vue-ts-responsive-grid-layout/core` npm
 * sub-export from `src/core/index.ts`. That entire directory has since
 * been extracted into its own workspace package,
 * `@keystone-dashboard-layout/core` (see ../core/) — the framework-
 * agnostic grid-layout algorithms now live and build there independently,
 * shared by the Vue, React, and Angular packages in this monorepo rather
 * than re-bundled per-framework.
 *
 * The `./core` subpath export has been removed from this package's
 * package.json accordingly. Consumers previously importing
 * `vue-ts-responsive-grid-layout/core` should switch to
 * `@keystone-dashboard-layout/core` directly once it's published — see
 * MIGRATION.md.
 *
 * Kept in the repo (rather than deleted) only so this history and the
 * migration note are easy to find; safe to actually delete once
 * consumers have migrated and this has been through at least one
 * released version with the deprecation noted in CHANGELOG.md.
 */
import { defineConfig } from 'vite';

export default defineConfig({});
