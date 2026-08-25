// This file is required by karma.conf.js and loads recursively all
// the .spec and framework files.
//
// Confirmed necessary via a fresh Karma run, not assumed up front: when
// no explicit `main` test-entry file exists, the Karma builder
// auto-generates a synthetic, in-memory bootstrap module containing
// this exact same content — but that virtual module isn't covered by
// any real file path tsconfig.spec.json's own `include`/`files` can
// reference, so its own type-check fails with "is missing from the
// TypeScript compilation." A real, physical file here, explicitly
// listed in tsconfig.spec.json's own `files` array and referenced as
// angular.json's `main` option, replaces the need for that synthetic
// module entirely.
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  },
);
