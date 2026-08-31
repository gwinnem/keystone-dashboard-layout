import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';

/**
 * Standalone entry point for the e2e Playwright test fixture — not a
 * demo app. Imports the library directly from `../src` (via relative
 * imports in each scenario) so Playwright always exercises current,
 * uncompiled source, matching Vue/React's own "no build step" e2e
 * target and React's own `e2e-fixture` in particular (a minimal
 * harness, not a full showcase app).
 *
 * Served via the Angular CLI's own dev-server (`ng serve`), not Vite —
 * this package's own `package.json` `_comment_scripts` field already
 * documents why: `@analogjs/vite-plugin-angular` hit a genuinely
 * unresolved upstream ecosystem bug for this package's Angular ^19.0.0
 * target (analogjs/analog#1502 / angular/angular-cli#31732), the same
 * reason unit tests moved to Jest instead of Vitest. The Angular CLI's
 * own dev-server has no such issue, since it's Angular's own first-party
 * tooling — the natural choice for an Angular-specific e2e fixture,
 * matching how Vue/React each use their own framework's real build
 * tooling (Vite) for their own e2e fixtures.
 */
bootstrapApplication(AppComponent).catch(err => console.error(err));
