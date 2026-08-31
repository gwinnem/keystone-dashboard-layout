import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { ROUTES } from './app/app.routes';

// Plain path-based (HTML5 pushState) routing — no withHashLocation().
// Real consequence, not a detail to skip: whatever host serves
// kdla.winnem.tech now MUST rewrite every unmatched path back to
// index.html (a standard "SPA fallback" rule — Netlify's _redirects,
// Vercel's rewrites, nginx's try_files, etc.), or a direct page-load/
// refresh at a deep route (e.g. /examples/01-basic-drag-resize, or any
// of astro-docs' own sidebar links pointing there — see
// astro.config.mjs's own Angular Examples section) will 404. This
// was the exact risk hash-based routing existed specifically to avoid
// — removing it is a deliberate choice to use here, not an oversight,
// but it does mean the fallback rule above is no longer optional.
bootstrapApplication(AppComponent, {
  providers: [provideRouter(ROUTES)],
}).catch((error) => console.error(error));
