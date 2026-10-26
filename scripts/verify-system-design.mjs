import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';

export async function verifySystemDesign() {
  const manifest = JSON.parse(await readFile(new URL('../vendor/system-design-primer/manifest.json', import.meta.url), 'utf8'));
  const chapters = manifest.chapters.flatMap(chapter => [chapter, ...manifest.supplements.filter(s => s.parent === chapter.slug)]);
  const documents = new Map();
  const problems = [];
  const normalize = text => text.replace(/\s+/g, '');
  for (const chapter of chapters) {
    const path = new URL(`../dist${chapter.url}index.html`, import.meta.url);
    const doc = new JSDOM(await readFile(path, 'utf8')).window.document;
    documents.set(chapter.url, doc);
    if (doc.querySelector('h1')?.textContent !== chapter.title) problems.push(`Wrong chapter title: ${chapter.slug}`);
    if (chapter.siteSupplement) {
      const attribution = doc.querySelector('.primer-source')?.textContent || '';
      if (!attribution.includes('本站补充') || attribution.includes('原著 Donne Martin')) problems.push(`Incorrect local attribution: ${chapter.slug}`);
    }
    const content = doc.querySelector('.sl-markdown-content');
    if (!content) { problems.push(`Missing chapter body: ${chapter.slug}`); continue; }
    const source = await readFile(new URL(`../src/content/docs/system-design/${chapter.slug}.md`, import.meta.url), 'utf8');
    const body = source.replace(/^---\n[\s\S]*?\n---\n/, '');
    const expected = JSDOM.fragment(marked.parse(body));
    const diagrams = [...expected.querySelectorAll('pre code.language-mermaid')];
    if (content.querySelectorAll('[data-mermaid-static] svg').length !== diagrams.length) problems.push(`Missing static diagram in ${chapter.slug}`);
    diagrams.forEach(node => node.parentElement.remove());
    const actual = content.cloneNode(true);
    actual.querySelectorAll('.sl-anchor-link, .copy, .expressive-code .header, [data-pagefind-ignore], [data-mermaid-static]').forEach(node => node.remove());
    if (normalize(actual.textContent) !== normalize(expected.textContent)) {
      const a = normalize(actual.textContent), b = normalize(expected.textContent);
      const i = [...b].findIndex((_, i) => a[i] !== b[i]);
      problems.push(`Rendered text differs in ${chapter.slug}: at ${i}, expected ${b.slice(Math.max(0, i - 20), i + 70)}, got ${a.slice(Math.max(0, i - 20), i + 70)}`);
    }
    for (const selector of ['img', 'table', 'pre']) {
      if (actual.querySelectorAll(selector).length !== expected.querySelectorAll(selector).length) problems.push(`Lost ${selector} in ${chapter.slug}`);
    }
    const actualCode = [...content.querySelectorAll('pre code')].map(node => {
      const lines = [...node.querySelectorAll('.ec-line .code')];
      return (lines.length ? lines.map(line=>line.textContent.replace(/\n$/, '')).join('\n') : node.textContent).trimEnd();
    });
    const expectedCode = [...expected.querySelectorAll('pre code')].map(node=>node.textContent.trimEnd());
    const visibleCode = blocks => blocks.map(code=>code.split('\n').map(line=>line.trimEnd()).join('\n'));
    if(JSON.stringify(visibleCode(actualCode))!==JSON.stringify(visibleCode(expectedCode))) problems.push(`Code changed in ${chapter.slug}`);
    for (const heading of chapter.headings) if (!doc.getElementById(heading.id)) problems.push(`Missing heading ${chapter.slug}#${heading.id}`);
    for (const img of content.querySelectorAll('img')) {
      if (!Object.values(manifest.images).some(asset => asset.src === img.getAttribute('src'))) problems.push(`Nonlocal image in ${chapter.slug}`);
    }
    for (const link of content.querySelectorAll('a[href]')) {
      if (/github\.com\/donnemartin\/system-design-primer(?:#|\/blob\/[^/]+\/(?:solutions|README))/.test(link.href)) problems.push(`Content still leaves site in ${chapter.slug}: ${link.href}`);
    }
    const index = chapters.indexOf(chapter);
    const pagination = [...doc.querySelectorAll('.pagination-links a')].map(a => a.getAttribute('href'));
    const expectedPagination = [chapters[index - 1]?.url, chapters[index + 1]?.url].filter(Boolean);
    if (JSON.stringify(pagination) !== JSON.stringify(expectedPagination)) problems.push(`Wrong pagination in ${chapter.slug}`);
  }
  for (const [url, doc] of documents) for (const link of doc.querySelectorAll('a[href^="/system-design/"]')) {
    const target = new URL(link.getAttribute('href'), 'https://example.test');
    const destination = documents.get(target.pathname);
    if (!destination || (target.hash && !destination.getElementById(decodeURIComponent(target.hash.slice(1))))) problems.push(`Broken internal link on ${url}: ${link.getAttribute('href')}`);
  }
  const searchRecords = JSON.parse(await readFile(new URL('../dist/system-design-search.json', import.meta.url), 'utf8'));
  if (searchRecords.length !== Object.keys(manifest.anchors).length - Object.keys(manifest.aliases).length + manifest.supplements.reduce((sum, doc) => sum + Object.keys(doc.anchors).length, 0)) problems.push('Search index omits source headings');
  for (const record of searchRecords) {
    const target = new URL(record.url, 'https://example.test');
    if (!documents.get(target.pathname)?.getElementById(decodeURIComponent(target.hash.slice(1)))) problems.push(`Broken search result: ${record.url}`);
  }
  const redirect = await readFile(new URL('../dist/system-design-knowledge/index.html', import.meta.url), 'utf8');
  if (!redirect.includes('/system-design/')) problems.push('Missing old URL redirect');
  if (problems.length) throw new Error(problems.join('\n'));
  console.log(`System Design Primer verified: ${chapters.length} full-text documents, local images, heading links, pagination and legacy redirect.`);
}
if (process.argv[1] && new URL(process.argv[1], 'file:').href === import.meta.url) await verifySystemDesign();
