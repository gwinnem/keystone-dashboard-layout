# Changelog

All notable changes to this project are documented in this file. Format is
loosely based on [Keep a Changelog](https://keepachangelog.com/); dates are
`YYYY-MM-DD`.

Entries from `[Unreleased]` onward are generated automatically by
[semantic-release](https://semantic-release.gitbook.io/) from conventional
commit messages on every merge to `main` — see
`.github/workflows/release.yml`. Scoped to commits touching this package's
own path via `semantic-release-monorepo` — see `.releaserc.json`'s own
`extends` entry.

## 1.0.0 (2026-09-08)

### Features

* First release. An Angular port sharing the same
  `keystone-dashboard-layout-core` engine as the Vue and React
  packages, built to full feature parity with Vue: drag/resize from
  all 8 edges/corners, 5 built-in compaction strategies plus a
  pluggable custom compactor, responsive breakpoints, cross-grid and
  outside-the-grid drag-and-drop, multi-select with group move/resize
  and align/distribute, undo/redo, keyboard accessibility, magnetic
  snap-to-grid, alignment guides, named layout presets, SVG export, and
  localizable ARIA strings — see
  [Features](https://kdl.winnem.tech/angular/features/) for the
  complete, linked list.
