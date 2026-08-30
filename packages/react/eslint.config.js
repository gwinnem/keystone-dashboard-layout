import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

/**
 * ESLint 9 flat config for @keystone-dashboard-layout/react.
 *
 * Brought up to match packages/vue's own rule set (naming conventions,
 * explicit-function-return-type, the full style rule list, and so on) —
 * the previous version of this file was an intentionally minimal
 * "scaffold-level" placeholder (two bare rules: no-unused-vars,
 * prefer-const), with its own comment saying to tighten it "once the
 * real component implementation lands." That implementation has since
 * landed with full feature parity, so this brings the rule set to
 * parity too. Every rule below is a direct port of Vue's own
 * (`packages/vue/eslint.config.js`) generic/TypeScript rules — the
 * `vue/*`-namespaced rules there have no equivalent here at all (JSX/TSX
 * is a different templating model entirely, not a rule-for-rule port),
 * and are simply omitted rather than force-fit into something
 * React-shaped.
 *
 * `pnpm lint` is advisory, not blocking, across this whole monorepo
 * (see .github/workflows/ci.yml's own comment on that job) — so
 * whatever this stricter rule set newly surfaces in this package's
 * existing code won't fail CI outright, the same safety net Vue's own
 * ~800 pre-existing issues already rely on.
 */
export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'e2e-fixture/**', 'reports/**', '*.tgz'],
  },

  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
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

  // Plain JS files don't need explicit TS return-type annotations.
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // Test files: same rationale as Vue's own identical override — most of
  // what triggers explicit-function-return-type/no-empty-function in a
  // test file is inline callback noise with no real safety value (a
  // mock's own `() => {}` stub, an `it('...', () => {...})` body, a
  // `vi.fn()` implementation passed straight into a call), not a case
  // where either rule would catch a real bug. Every other rule stays
  // fully enforced in test files too.
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/__tests__/**/*.ts', '**/__tests__/**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
];
