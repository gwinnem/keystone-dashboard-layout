import js from '@eslint/js';

/**
 * Root-level ESLint 9 flat config.
 *
 * Only lints repo-level config/tooling files. Each package under packages/*
 * owns its own eslint.config.js (framework-specific plugins/parsers), so
 * this config explicitly ignores packages/** to avoid double-linting or
 * conflicting with those.
 */
export default [
  {
    ignores: [
      'packages/**',
      'vitepress-docs/**',
      'node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '.turbo/**',
    ],
  },
  js.configs.recommended,
];
