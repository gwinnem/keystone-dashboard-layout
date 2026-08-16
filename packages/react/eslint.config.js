import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

/**
 * ESLint 9 flat config for @keystone-dashboard-layout/react.
 * Scaffold-level rules for now — tighten to match packages/vue's rule set
 * (naming conventions, explicit-function-return-type, etc.) once the real
 * component implementation lands.
 */
export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: 'module' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error'],
      'prefer-const': ['error'],
    },
  },
];
