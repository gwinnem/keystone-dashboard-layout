import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

/**
 * ESLint 9 flat config for @keystone-dashboard-layout/core.
 * This package has no framework dependency, so no vue/react/angular
 * plugins are needed here — plain TypeScript rules only.
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
    files: ['**/*.ts'],
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
