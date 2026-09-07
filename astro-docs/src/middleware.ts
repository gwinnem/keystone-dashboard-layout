import { defineMiddleware } from 'astro:middleware';

// Reverted: site-wide Cross-Origin-Opener-Policy/Cross-Origin-
// Embedder-Policy headers were tried here to let the StackBlitz
// "Playground" tab's `template: 'node'` WebContainer preview actually
// run (see ExampleTryIt.astro's own `playground` prop). Confirmed
// directly this made things WORSE, not better: before these headers,
// the embed's iframe loaded fine (Monaco editor with real code, just
// its own "Unable to run Embedded Project" message where the live
// preview would be). After adding COOP/COEP, the stackblitz.com iframe
// stopped loading at all ("stackblitz.com refused to connect") — a
// harder failure. Left as a no-op middleware (not deleted outright)
// pending a decision on whether to keep chasing this or drop the
// live-running-preview feature and keep just the editable-source view.
export const onRequest = defineMiddleware((_context, next) => next());
