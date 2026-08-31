import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';

// Generates one OG image per page, at build time (this is a static
// site — no SSR adapter configured — so these are real files in
// dist/og/*.png after `astro build`, not generated on demand).
//
// Covers every page in the `docs` content collection (all of Vue's/
// React's/Angular's/Core's guide, features, components, API, and
// example pages), plus one hand-added 'home' entry for the custom
// root landing page (src/pages/index.astro), which isn't part of the
// `docs` collection at all since it's a plain Astro page, not a
// Starlight-rendered one — src/pages/index.astro references this same
// '/og/home.png' URL directly in its own <head>, kept in sync with the
// key used here.
const docsEntries = await getCollection('docs');

const pages = Object.fromEntries(
  docsEntries.map(({ id, data }) => [
    id,
    { title: data.title, description: data.description },
  ]),
);

pages.home = {
  title: 'Keystone Dashboard Layout',
  description: 'A draggable, resizable dashboard grid for Vue, React & Angular — one framework-agnostic engine, minimal runtime dependencies, idiomatic components for all three.',
};

export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'slug',
  pages,
  getImageOptions: (_id, page: { title: string; description?: string }) => ({
    title: page.title,
    description: page.description,
    // This project's own real design tokens (src/styles/tokens.css),
    // not arbitrary colors — --kg-ink for the background, --kg-blueprint
    // for the border, matching the actual site branding rather than a
    // generic default.
    bgGradient: [[20, 23, 26]],
    border: { color: [79, 184, 201], width: 6 },
    padding: 100,
    font: {
      title: { color: [245, 244, 239], size: 66, weight: 'Bold' },
      description: { color: [156, 166, 170], size: 32 },
    },
  }),
});
