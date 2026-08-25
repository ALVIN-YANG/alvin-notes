import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				date: z.coerce.date().optional(),
				verifiedAgainst: z.string().min(1).optional(),
				hidePageTitle: z.boolean().optional(),
				comments: z.boolean().optional(),
				headline: z.string().min(1).optional(),
				reportFormat: z.enum(['modular']).optional(),
				snapshotCount: z.number().int().nonnegative().optional(),
				storyCount: z.number().int().nonnegative().optional(),
				themeCount: z.number().int().nonnegative().optional(),
				sourceCount: z.number().int().nonnegative().optional(),
				readMinutes: z.number().int().positive().optional(),
			}),
		}),
	}),
};
