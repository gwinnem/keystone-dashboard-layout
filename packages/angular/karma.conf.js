// Karma configuration for @keystone-dashboard-layout/angular.
// Standard Angular CLI template (the same one `ng new` would generate
// alongside an application, which --create-application=false skipped
// for the scratch workspace this library was generated in — see
// docs/PARITY_GAP_ANGULAR.md's own "Build tooling" section for why
// this had to be hand-assembled rather than scaffolded automatically).
//
// Karma runs in a real Chrome (or headless Chrome) engine, unlike the
// Vue/React packages' own Vitest+jsdom setup — see this package's own
// component .spec.ts files for what that means for things like
// ResizeObserver (genuinely native here, no mock needed).
'use strict';

// puppeteer bundles its own Chromium build, so CI/local runs don't
// depend on a system-installed Chrome being on PATH/CHROME_BIN — same
// robustness rationale Vue/React's own e2e suites get "for free" from
// Playwright's own bundled browsers. Guarded: falls back to whatever
// CHROME_BIN/PATH-resolved Chrome is already available if puppeteer
// isn't installed, rather than crashing this config file outright.
try {
  process.env.CHROME_BIN = require(`puppeteer`).executablePath();
} catch{
  // puppeteer not installed — fall back to CHROME_BIN/PATH-resolved Chrome.
}

module.exports = config => {
  config.set({
    autoWatch: true,
    basePath: ``,
    browsers: [`Chrome`],
    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in the browser
      jasmine: {},
    },
    colors: true,
    coverageReporter: {
      dir: require(`path`).join(__dirname, `./coverage`),
      reporters: [
        { type: `html` },
        { type: `text-summary` },
      ],
      subdir: `.`,
    },
    customLaunchers: {
      // For CI (`ng test --browsers=ChromeHeadlessCI --watch=false`) —
      // matches the same non-interactive, sandboxed-environment
      // rationale as any other CI browser flag set.
      ChromeHeadlessCI: {
        base: `ChromeHeadless`,
        flags: [`--no-sandbox`, `--disable-gpu`],
      },
    },
    frameworks: [`jasmine`, `@angular-devkit/build-angular`],
    jasmineHtmlReporter: {
      suppressAll: true, // removes duplicated traces
    },
    logLevel: config.LOG_INFO,
    plugins: [
      require(`karma-jasmine`),
      require(`karma-chrome-launcher`),
      require(`karma-jasmine-html-reporter`),
      require(`karma-coverage`),
      require(`@angular-devkit/build-angular/plugins/karma`),
    ],
    port: 9876,
    reporters: [`progress`, `kjhtml`],
    restartOnFileChange: true,
    singleRun: false,
  });
};
