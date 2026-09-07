import { Component, Input, OnInit } from '@angular/core';

/**
 * Angular version of astro-docs's own ExampleTryIt.astro card shell —
 * same look (toolbar, filename, Preview/Source tabs, copy button,
 * footer), reimplemented with real Angular component state (a plain
 * `activeTab` property) for the tab switching, rather than Astro's own
 * vanilla-JS DOM-querying <script> tag, since that's the idiomatic
 * way to do it from inside a genuine Angular component. `<ng-content>`
 * carries the live preview. `sourceUrl` points at the real component
 * file, copied verbatim into the build output as a static asset (see
 * angular.json's own "examples-source" glob) and fetched at runtime —
 * deliberately not a duplicated string constant, so the displayed
 * source can never drift from the actual, real component code.
 *
 * "Open in StackBlitz" — same feature astro-docs's own ExampleTryIt.astro
 * has for every Vue/React example, ported here for parity (that one's
 * own header comment covers why this opens a new tab on stackblitz.com
 * rather than embedding an in-page editor: the live preview needs
 * cross-origin isolation headers that broke the embed's own iframe
 * entirely when tried). Reuses the SAME runtime-fetch mechanism already
 * proven here for the Source tab (`sourceUrl`/`fetch`), extended to the
 * three harness components and their CSS — angular.json's own second
 * "examples-source/harness" assets glob (added alongside this feature)
 * is what makes those fetchable the same way the demo component
 * already was. Bundles a real, minimal, standalone Angular CLI project
 * (package.json, angular.json, tsconfig files, main.ts, index.html)
 * around whichever one demo component this card is showing — not the whole
 * app, no router, no other 52 examples — resolving the demo's own
 * selector/class name from its real source via regex rather than a
 * second input, so no call site (all 53 page components) needed to
 * change to get this.
 */
@Component({
  selector: 'example-try-it',
  standalone: true,
  template: `
    <div class="try-it">
      <div class="try-it__card">
        <div class="try-it__toolbar">
          <span class="try-it__filename">{{ filename }}</span>
          <div class="try-it__toolbar-end">
            <div class="try-it__tabs">
              <button
                type="button"
                class="try-it__tab"
                [class.is-active]="activeTab === 'preview'"
                (click)="activeTab = 'preview'"
              >Preview</button>
              <button
                type="button"
                class="try-it__tab"
                [class.is-active]="activeTab === 'source'"
                (click)="activeTab = 'source'"
              >Source</button>
            </div>
            <button type="button" class="try-it__playground-open" (click)="openInStackBlitz()">
              {{ playgroundStatus === 'loading' ? 'Preparing…' : playgroundStatus === 'error' ? 'Failed — retry' : 'Open in StackBlitz ↗' }}
            </button>
          </div>
        </div>

        @if (activeTab === 'preview') {
          <div class="try-it__panel">
            <div class="try-it__stage">
              <ng-content></ng-content>
            </div>
          </div>
        } @else {
          <div class="try-it__panel try-it__panel--source">
            <button type="button" class="try-it__copy" [class.is-copied]="copied" (click)="copySource()">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
            <pre>{{ source ?? 'Loading source…' }}</pre>
          </div>
        }

        <div class="try-it__footer">
          <span>Live, running component — this page, this app.</span>
        </div>
      </div>
    </div>
  `,
})
export class ExampleTryItComponent implements OnInit {
  @Input({ required: true }) filename = '';
  @Input({ required: true }) sourceUrl = '';
  activeTab: 'preview' | 'source' = 'preview';
  copied = false;
  source: string | null = null;
  playgroundStatus: 'idle' | 'loading' | 'error' = 'idle';

  ngOnInit(): void {
    fetch(this.sourceUrl)
      .then((response) => response.text())
      .then((text) => {
        this.source = text;
      })
      .catch(() => {
        this.source = 'Could not load source.';
      });
  }

  copySource(): void {
    if (!this.source) return;
    navigator.clipboard
      .writeText(this.source)
      .then(() => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 1500);
      })
      .catch(() => {
        // Clipboard access can fail (permissions, insecure context) —
        // silently doing nothing is preferable to throwing, matching
        // astro-docs's own copy-button failure handling.
      });
  }

  openInStackBlitz(): void {
    if (this.playgroundStatus === 'loading') return;
    this.playgroundStatus = 'loading';
    this.buildPlaygroundFiles()
      .then((files) => {
        this.playgroundStatus = 'idle';
        if (!files) {
          this.playgroundStatus = 'error';
          return;
        }
        this.loadStackblitzSdk().then((sdk) => {
          sdk.openProject(
            {
              title: 'keystone-dashboard-layout example',
              description: 'Editable playground, seeded from a real docs example.',
              template: 'node',
              files,
            },
            { openFile: 'src/app/demo.component.ts' },
          );
        });
      })
      .catch(() => {
        this.playgroundStatus = 'error';
      });
  }

  // Harness files this card's own demo component may import — same
  // fixed set every one of the 53 examples draws from (confirmed
  // directly: no example imports anything else), so bundled
  // unconditionally rather than parsed out of the demo source. CSS
  // files are all globally loaded in the real app too (via
  // src/styles.css's own @import chain — nothing here is gated per
  // example there either), so bundling all of them regardless of
  // whether this specific demo happens to use their classes matches
  // the real app's own behavior exactly.
  private static readonly HARNESS_FILES = [
    'example-toggle.component.ts',
    'example-number-field.component.ts',
    'layout-json-viewer.component.ts',
    'example-controls.css',
    'try-it.css',
    'shared-example-item.css',
    'event-log.css',
    'multiple-grids.css',
    'drag-allow-ignore-elements.css',
  ];

  private buildPlaygroundFiles(): Promise<Record<string, string> | null> {
    const demoSourcePromise = this.source ? Promise.resolve(this.source) : fetch(this.sourceUrl).then((r) => r.text());
    const harnessPromises = ExampleTryItComponent.HARNESS_FILES.map((name) =>
      fetch(`/examples-source/harness/${name}`)
        .then((r) => r.text())
        .catch(() => ''),
    );

    return Promise.all([demoSourcePromise, ...harnessPromises]).then(([demoSource, ...harness]) => {
      const selectorMatch = demoSource.match(/selector:\s*'([^']+)'/);
      const classMatch = demoSource.match(/export class (\w+)/);
      if (!selectorMatch || !classMatch) return null;
      const selector = selectorMatch[1];
      const className = classMatch[1];

      // `demoSource`'s own real import is `../harness/example-toggle.
      // component` etc. — correct from its real location
      // (src/app/examples/*.component.ts, one level below src/app/),
      // but this generated project keeps the demo directly in
      // src/app/ (no nested examples/ folder), where harness/ is a
      // direct child — so `./harness/` is the right prefix here, not
      // a no-op. Confirmed by diffing before/after that nothing else
      // in a real example's file needs adjusting to run standalone.
      const demoRewritten = demoSource.replaceAll('../harness/', './harness/');

      const packageJson = {
        name: 'keystone-dashboard-layout-angular-example',
        private: true,
        version: '0.0.0',
        scripts: { start: 'ng serve --host 0.0.0.0', build: 'ng build' },
        dependencies: {
          '@angular/common': '^19.0.0',
          '@angular/compiler': '^19.0.0',
          '@angular/core': '^19.0.0',
          '@angular/platform-browser': '^19.0.0',
          rxjs: '^7.8.0',
          tslib: '^2.6.0',
          'zone.js': '^0.15.0',
          'keystone-dashboard-layout-angular': '^1.0.0',
          'keystone-dashboard-layout-core': '^1.0.0',
        },
        devDependencies: {
          '@angular/build': '^19.0.0',
          '@angular/cli': '^19.0.0',
          '@angular/compiler-cli': '^19.0.0',
          typescript: '~5.6.0',
        },
      };

      const angularJson = {
        $schema: './node_modules/@angular/cli/lib/config/schema.json',
        version: 1,
        newProjectRoot: 'projects',
        projects: {
          app: {
            projectType: 'application',
            root: '',
            sourceRoot: 'src',
            prefix: 'app',
            architect: {
              build: {
                builder: '@angular/build:application',
                options: {
                  outputPath: 'dist/app',
                  index: 'src/index.html',
                  browser: 'src/main.ts',
                  polyfills: ['zone.js'],
                  tsConfig: 'tsconfig.app.json',
                  styles: ['src/styles.css'],
                },
                configurations: {
                  development: { optimization: false, extractLicenses: false, sourceMap: true },
                },
                defaultConfiguration: 'development',
              },
              serve: {
                builder: '@angular/build:dev-server',
                configurations: {
                  development: { buildTarget: 'app:build:development' },
                },
                defaultConfiguration: 'development',
              },
            },
          },
        },
      };

      const tsconfigJson = {
        compileOnSave: false,
        compilerOptions: {
          outDir: './dist/out-tsc',
          strict: true,
          skipLibCheck: true,
          isolatedModules: true,
          experimentalDecorators: true,
          moduleResolution: 'bundler',
          importHelpers: true,
          target: 'ES2022',
          module: 'ES2022',
          lib: ['ES2022', 'dom'],
        },
        angularCompilerOptions: { strictTemplates: true },
      };

      const tsconfigAppJson = {
        extends: './tsconfig.json',
        compilerOptions: { outDir: './out-tsc/app', types: [] },
        files: ['src/main.ts'],
        include: ['src/**/*.ts'],
      };

      const files: Record<string, string> = {
        'package.json': JSON.stringify(packageJson, null, 2),
        'angular.json': JSON.stringify(angularJson, null, 2),
        'tsconfig.json': JSON.stringify(tsconfigJson, null, 2),
        'tsconfig.app.json': JSON.stringify(tsconfigAppJson, null, 2),
        'src/index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${this.filename} — keystone-dashboard-layout-angular</title>
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
`,
        'src/main.ts': `import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import 'keystone-dashboard-layout-angular/style.css';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent).catch((error) => console.error(error));
`,
        // Trimmed from the real app's own styles.css: same token
        // palette and the same harness-CSS @import chain (same
        // relative paths — src/app/harness/ is preserved as-is in
        // this generated project's own layout), minus the app-shell-
        // specific rules (topbar/sidebar/gallery) a single standalone
        // demo has no use for. The real library's own base grid
        // styles come from the JS-side `keystone-dashboard-layout-
        // angular/style.css` import in main.ts above instead of a CSS
        // @import here, matching this package's own documented
        // installation instructions (astro-docs's own angular/guide/
        // installation.mdx) rather than the real app's workspace-only
        // `../../packages/angular/src/styles/index.css` shortcut,
        // which only resolves inside this monorepo.
        'src/styles.css': `@import './app/harness/example-controls.css';
@import './app/harness/try-it.css';
@import './app/harness/shared-example-item.css';
@import './app/harness/event-log.css';
@import './app/harness/multiple-grids.css';
@import './app/harness/drag-allow-ignore-elements.css';

:root {
  --kg-ink: #14171a;
  --kg-ink-2: #1d2126;
  --kg-ink-3: #262b31;
  --kg-paper: #f1f0eb;
  --kg-paper-2: #ffffff;
  --kg-panel: #e9e9ea;
  --kg-paper-3: #e7e6df;
  --kg-blueprint: #4fb8c9;
  --kg-blueprint-deep: #2e7a88;
  --kg-amber: #f2a93b;
  --kg-amber-deep: #9c6208;
  --kg-line-dark: rgba(255, 255, 255, 0.1);
  --kg-line-light: rgba(20, 23, 26, 0.12);
  --kg-text-hi-dark: #f5f4ef;
  --kg-text-lo-dark: #9ca6aa;
  --kg-text-hi-light: #14171a;
  --kg-text-lo-light: #5b6266;
  --kg-font-display: 'Space Grotesk', sans-serif;
  --kg-font-body: 'IBM Plex Sans', sans-serif;
  --kg-font-mono: 'IBM Plex Mono', monospace;
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

body {
  background: var(--kg-ink);
  color: var(--kg-text-hi-dark);
  font-family: var(--kg-font-body);
  margin: 0;
  padding: 16px;
}
`,
        'src/app/app.component.ts': `import { Component } from '@angular/core';
import { ${className} } from './demo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [${className}],
  template: '<${selector}></${selector}>',
})
export class AppComponent {}
`,
        'src/app/demo.component.ts': demoRewritten,
        'src/app/harness/example-toggle.component.ts': harness[0],
        'src/app/harness/example-number-field.component.ts': harness[1],
        'src/app/harness/layout-json-viewer.component.ts': harness[2],
        'src/app/harness/example-controls.css': harness[3],
        'src/app/harness/try-it.css': harness[4],
        'src/app/harness/shared-example-item.css': harness[5],
        'src/app/harness/event-log.css': harness[6],
        'src/app/harness/multiple-grids.css': harness[7],
        'src/app/harness/drag-allow-ignore-elements.css': harness[8],
      };

      return files;
    });
  }

  // Lazy: the SDK script only loads from its CDN on the button's
  // first real click, not on page load — matching astro-docs's own
  // identical rationale in ExampleTryIt.astro.
  private stackblitzSdkPromise?: Promise<StackBlitzSdk>;
  private loadStackblitzSdk(): Promise<StackBlitzSdk> {
    const existing = (window as unknown as { StackBlitzSDK?: StackBlitzSdk }).StackBlitzSDK;
    if (existing) return Promise.resolve(existing);
    if (!this.stackblitzSdkPromise) {
      this.stackblitzSdkPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@stackblitz/sdk@1/bundles/sdk.umd.js';
        script.onload = () => {
          const sdk = (window as unknown as { StackBlitzSDK?: StackBlitzSdk }).StackBlitzSDK;
          if (sdk) resolve(sdk);
          else reject(new Error('StackBlitz SDK loaded but window.StackBlitzSDK is missing.'));
        };
        script.onerror = () => reject(new Error('Failed to load the StackBlitz SDK.'));
        document.head.append(script);
      });
    }
    return this.stackblitzSdkPromise;
  }
}

interface StackBlitzSdk {
  openProject: (
    project: { title: string; description: string; template: string; files: Record<string, string> },
    options?: Record<string, unknown>,
  ) => void;
}
