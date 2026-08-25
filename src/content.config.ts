import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				verifiedAgainst: z.string().min(1).optional(),
				hidePageTitle: z.boolean().optional(),
				comments: z.boolean().optional(),
			}),
		}),
	}),
};
