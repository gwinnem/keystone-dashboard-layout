# Changelog

All notable changes to this project are documented in this file. Format is
loosely based on [Keep a Changelog](https://keepachangelog.com/); dates are
`YYYY-MM-DD`.

Entries from `[Unreleased]` onward are generated automatically by
[semantic-release](https://semantic-release.gitbook.io/) from conventional
commit messages on every merge to `main` — see
`.github/workflows/release.yml`.

## 1.0.1 (2026-09-08)

### Features

* First stable release of the framework-agnostic grid-layout engine
  shared by the Vue, React, and Angular packages: bin-packing,
  collision detection, five built-in compaction strategies plus a
  pluggable custom-compactor interface, responsive breakpoint
  resolution, alignment-guide and magnetic-snap math, ARIA label
  resolution, layout serialization/deserialization, SVG export, and a
  native Pointer-Events-based drag/resize engine. Zero runtime
  dependencies.
