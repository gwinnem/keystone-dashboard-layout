import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import angular from 'angular-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

/**
 * ESLint 9/10 flat config for @keystone-dashboard-layout/angular.
 *
 * Adds the ESLint setup this package was missing entirely — confirmed
 * via a direct source check before this file existed: `package.json`'s
 * own `_comment_scripts` field stated plainly that `lint`/`lint:fix`
 * were "intentionally still omitted," and only `lint:style` (Stylelint,
 * for SCSS) was defined. Both Vue and React have real ESLint configs
 * already; this brings this package to the same baseline, not a
 * different one — every generic/TypeScript rule below is a direct port
 * of Vue's own (`packages/vue/eslint.config.js`) and React's own
 * (`packages/react/eslint.config.js`) identical rule set, the same way
 * React's own config is itself a port of Vue's. The `vue/*`-namespaced
 * rules those two configs carry have no equivalent need here — Angular
 * templates are linted through `angular-eslint`'s own template tooling
 * instead, layered on top of the shared generic rules rather than
 * replacing them.
 *
 * Named `eslint.config.mjs`, not `.js`: this package's own `package.json`
 * has no `"type": "module"` field (unlike Vue/React's, which both do),
 * and adding one risks changing how Jest/Karma/ts-node's existing
 * CommonJS-style config files (`jest.config.ts`, `karma.conf.js`) get
 * loaded — an `.mjs` extension forces ES module syntax for this one
 * file only, with zero risk to that existing tooling.
 *
 * Every template in this package's own components is written inline
 * (`template: \`...\`` inside the `.component.ts` file itself — a real,
 * confirmed fact from this package's own source, not an assumption: no
 * `.html` template file exists anywhere under `src/`). `angular.
 * processInlineTemplates`, applied to the `.ts` files block below,
 * extracts and lints those inline templates against the `**/*.html`
 * rule block that follows — the standard `angular-eslint` mechanism
 * for exactly this case, not a workaround.
 *
 * Deliberately not type-aware (no `parserOptions.project`/
 * `projectService` set): matches Vue's and React's own configs, neither
 * of which enables type-aware linting either — kept consistent across
 * all three packages rather than introducing an asymmetry, and this is
 * also the shape the official `angular-eslint` flat-config guidance
 * itself shows for a baseline setup.
 *
 * `pnpm lint` is advisory, not blocking, across this whole monorepo
 * (see .github/workflows/ci.yml's own comment on that job) — so
 * whatever this rule set surfaces in this package's existing code won't
 * fail CI outright, the same safety net Vue's own pre-existing issues
 * already rely on. This file has not yet been run against the real
 * codebase (no shell access to this project from the session that wrote
 * it) — running `pnpm install && pnpm --filter @keystone-dashboard-layout/angular lint`
 * is the next real step to confirm it resolves and actually lints
 * cleanly (or to see what it flags).
 */
export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'e2e-fixture/**',
      'reports/**',
      'playwright-report/**',
      'test-results/**',
      '.angular/**',
      '.stryker-tmp/**',
      '*.tgz',
    ],
  },

  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  ...angular.configs.tsRecommended,

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // TypeScript files, including inline Angular component templates
  // (extracted and linted separately via the `**/*.html` block below).
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
      },
    },
    processor: angular.processInlineTemplates,
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      '@angular-eslint/component-selector': ['error', {
        type: 'element',
        prefix: 'kdl',
        style: 'kebab-case',
      }],
      '@angular-eslint/directive-selector': ['error', {
        type: 'attribute',
        prefix: 'kdl',
        style: 'camelCase',
      }],
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      '@typescript-eslint/ban-ts-comment': ['warn'],
      '@typescript-eslint/default-param-last': ['error'],
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowHigherOrderFunctions: false,
      }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          custom: {
            regex: '^I[A-Z]',
            match: true,
          },
          format: ['PascalCase'],
          selector: 'interface',
        },
        {
          custom: {
            regex: '^E[A-Z]',
            match: true,
          },
          format: ['PascalCase'],
          selector: 'enum',
        },
        {
          custom: {
            regex: '^T[A-Z]',
            match: true,
          },
          format: ['PascalCase'],
          selector: 'typeAlias',
        },
      ],
      '@typescript-eslint/no-dupe-class-members': ['error'],
      '@typescript-eslint/no-empty-function': ['error'],
      '@typescript-eslint/no-redeclare': ['error'],
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/no-unused-vars': ['error'],
      '@typescript-eslint/no-useless-constructor': ['error'],
      'arrow-body-style': 'off',
      'arrow-parens': ['error', 'as-needed'],
      'block-scoped-var': 'warn',
      'class-methods-use-this': 'off',
      'default-param-last': 'off',
      'function-paren-newline': 'off',
      'func-call-spacing': 'off',
      'guard-for-in': ['warn'],
      indent: ['error', 2, {
        SwitchCase: 1,
      }],
      'keyword-spacing': [
        'error',
        {
          after: true,
          before: true,
          overrides: {
            catch: { after: false },
            for: { after: false },
            if: { after: false },
            switch: { after: false },
          },
        },
      ],
      'linebreak-style': 0,
      'lines-between-class-members': 'off',
      'max-len': ['warn', {
        code: 200,
        ignoreComments: true,
        ignoreRegExpLiterals: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
      }],
      'no-console': ['warn', { allow: ['error', 'groupCollapsed', 'groupEnd', 'info', 'trace', 'warn'] }],
      'no-continue': 'off',
      'no-dupe-class-members': 'off',
      'no-else-return': 'warn',
      'no-empty-function': 'off',
      'no-nested-ternary': 'warn',
      'no-param-reassign': [
        'warn',
        {
          props: false,
        },
      ],
      'no-plusplus': 'off',
      'no-redeclare': ['off'],
      'no-restricted-syntax': [
        'warn',
        'ForInStatement',
        'LabeledStatement',
        'WithStatement',
      ],
      'no-return-assign': ['error'],
      'no-shadow': 'off',
      'no-unused-expressions': ['error', { allowTernary: true }],
      'no-unused-vars': 'off',
      'no-useless-constructor': 'off',
      'no-void': 'off',
      'prefer-const': ['error', { ignoreReadBeforeAssign: false }],
      'prefer-destructuring': 'warn',
      'prefer-promise-reject-errors': 'off',
      quotes: 'off',
      semi: ['error', 'always'],
      'sort-keys': 'off',
      'space-before-function-paren': 'off',
    },
  },

  // Angular templates — including inline ones, extracted from `.ts`
  // files above via `processInlineTemplates`.
  ...angular.configs.templateRecommended,

  // Plain JS files (scripts/*.js) don't need explicit TS return-type
  // annotations or Angular selector rules.
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // Test files (unit specs co-located in src/, and e2e/*.spec.ts):
  // same rationale as Vue's and React's own identical override — most
  // of what triggers explicit-function-return-type/no-empty-function in
  // a test file is inline callback noise with no real safety value (a
  // mock's own `() => {}` stub, an `it('...', () => {...})` body), not a
  // case where either rule would catch a real bug. Every other rule
  // stays fully enforced in test files too.
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },

  // Enum files trip false positives on no-shadow (unchanged from Vue's
  // own identical override).
  {
    files: ['**/*.enum.ts'],
    rules: {
      'no-shadow': 'off',
    },
  },
];
