import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    publishDate: z.coerce.date(),
    modifiedDate: z.coerce.date().optional(),
    category: z.enum([
      'economic-indicators',
      'stock-market-triggers',
      'market-sectors',
      'investor-education',
      'market-events',
    ]),
    series: z
      .enum([
        'market-trigger-of-the-day',
        'weekly-market-triggers',
        'economic-event-explained',
        'why-the-market-moved',
        'sector-impact',
        'investor-guide',
        'market-trigger-breakdown',
      ])
      .optional(),
    primaryKeyword: z.string(),
    secondaryKeywords: z.array(z.string()).default([]),
    author: z.string().default('MarketTriggers Editorial Team'),
    draft: z.boolean().default(false),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .default([]),
  }),
});

export const collections = { articles };
