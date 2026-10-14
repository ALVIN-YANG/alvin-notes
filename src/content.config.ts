import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { getInterviewTopic } from './lib/interview-taxonomy.mjs';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				date: z.coerce.date().optional(),
				verifiedAgainst: z.string().min(1).optional(),
				hidePageTitle: z.boolean().optional(),
				interview: z.object({
					track: z.enum(['agent', 'infra']).optional(),
					module: z.string().min(1),
					topic: z.string().min(1),
					level: z.enum(['basic', 'intermediate', 'advanced']),
					order: z.number().int().positive(),
					tags: z.array(z.string().min(1)).min(1),
				}).superRefine((value, ctx) => {
					if (!getInterviewTopic(value.module, value.topic)) {
						ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['topic'], message: '题目必须属于已注册能力模块中的二级专题' });
					}
				}).optional(),
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
