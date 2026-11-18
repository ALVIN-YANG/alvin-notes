import type { APIRoute } from 'astro';
import article from '../../content/docs/rag/index.md?raw';

const markdown = article.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trimStart();

export const GET: APIRoute = () => new Response(markdown, {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
});
