import type { APIRoute } from 'astro';
import { ragPracticeMarkdown } from '../../data/rag-practice';

export const GET: APIRoute = () => new Response(ragPracticeMarkdown(), {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
});
