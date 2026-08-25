import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// Structured data collections, per PLAN.md section 4.3 — props/events/
// slots/examples are real structured data on the source VitePress site,
// not loose prose, so they get real schemas here instead of hand-
// maintained Markdown tables that drift out of sync with each other.
const props = defineCollection({
  type: 'data',
  schema: z.object({
    component: z.enum(['GridLayout', 'GridItem']),
    name: z.string(),
    type: z.string(),
    default: z.string().optional(),
    description: z.string(),
    relatedExampleSlugs: z.array(z.string()).optional(),
  }),
});

const examples = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    order: z.number(),
    category: z.enum([
      'drag-resize',
      'layout-collision',
      'multi-select',
      'responsive',
      'i18n-accessibility',
      'cross-grid-dnd',
      'styling',
      'developer-experience',
    ]),
    // Name of the .vue file under src/components/examples/, without
    // extension — kept separate from the page's own slug so renaming a
    // route later doesn't also require renaming the component file.
    componentName: z.string(),
  }),
});

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  props,
  examples,
};
