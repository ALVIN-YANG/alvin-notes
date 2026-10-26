/** Offline generation by default. Explicit --update=<commit> fetches a new pinned snapshot. */
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { marked } from 'marked';
import Slugger from 'github-slugger';
import sharp from 'sharp';
import { JSDOM } from 'jsdom';
import { buildSolutions, referenceAliases } from './system-design-solutions.mjs';
import { applyEnglishUpdates, englishRevision, englishSourcePaths } from './system-design-english-updates.mjs';

const root = new URL('../', import.meta.url);
const vendor = new URL('vendor/system-design-primer/', root);
const output = new URL('src/content/docs/system-design/', root);
const images = new URL('public/images/system-design/', root);
const check = process.argv.includes('--check');
const update = process.argv.find(arg => arg.startsWith('--update='))?.split('=')[1];
const repo = 'https://github.com/donnemartin/system-design-primer';
const old = await readFile(new URL('manifest.json', vendor), 'utf8').then(JSON.parse).catch(() => null);
const commit = update || old?.commit || 'ae9bbd7b02d90b9866215de185217d33f39ab733';
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Use a full upstream commit SHA');
if (check && update) throw new Error('--check cannot update the snapshot');
async function download(path) {
  const response = await fetch(path.startsWith('https://') ? path : `https://raw.githubusercontent.com/donnemartin/system-design-primer/${commit}/${path}`);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
for (const dir of [vendor, output, images]) await mkdir(dir, { recursive: true });
if (update) {
  for (const file of ['README-zh-Hans.md', 'LICENSE.txt', ...englishSourcePaths]) await writeFile(new URL(file, vendor), await download(file));
}
const upstreamSource = await readFile(new URL('README-zh-Hans.md', vendor), 'utf8');
const source = applyEnglishUpdates('README-zh-Hans.md', upstreamSource);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const tokens = marked.lexer(source);
let offset = 0;
const slugger = new Slugger();
const headings = [];
for (const token of tokens) {
  const start = source.indexOf(token.raw, offset);
  if (start < 0) throw new Error('Cannot locate source token');
  offset = start + token.raw.length;
  if (token.type === 'heading') headings.push({ title: token.text, depth: token.depth, id: slugger.slug(token.text), start, end: offset });
}
const chapterSlugs = ['index', 'flash-cards', 'contributing', 'topic-index', 'study-guide', 'interview-approach', 'system-design-exercises', 'object-oriented-design', 'getting-started', 'performance-scalability', 'latency-throughput', 'availability-consistency', 'consistency-patterns', 'availability-patterns', 'dns', 'cdn', 'load-balancer', 'reverse-proxy', 'application-layer', 'database', 'cache', 'asynchronism', 'communication', 'security', 'appendix', 'work-in-progress', 'credits', 'contact', 'license'];
const sections = headings.filter(h => h.depth === 2);
if (sections.length !== chapterSlugs.length || (old && sections.some((section, index) => (index === 0 ? '系统设计入门' : section.title) !== old.chapters[index]?.title))) throw new Error('Upstream chapter structure changed: review chapterSlugs before importing');
// The only omitted source line is GitHub's language switcher, not document prose.
const languageLine = source.split('\n').find(line => line.startsWith('*[English](README.md)'));
if (!languageLine) throw new Error('Cannot identify language navigation');
const chapters = sections.map((section, index) => {
  const start = index === 0 ? 0 : section.start;
  const end = sections[index + 1]?.start ?? source.length;
  const title = index === 0 ? '系统设计入门' : section.title;
  const removedHeading = index === 0 ? headings.find(h => h.depth === 1) : section;
  const raw = source.slice(start, end);
  const body = raw.replace(source.slice(removedHeading.start, removedHeading.end), '').replace(languageLine + '\n', '');
  const slug = chapterSlugs[index];
  return { title, slug, url: slug === 'index' ? '/system-design/' : `/system-design/${slug}/`, start, end, body, headings: headings.filter(h => h.start >= start && h.start < end && h !== removedHeading) };
});
const anchors = {};
for (const heading of headings) {
  const chapter = chapters.find(c => heading.start >= c.start && heading.start < c.end);
  const present = chapter.headings.includes(heading);
  anchors[heading.id] = chapter.url + (present ? `#${heading.id}` : '#_top');
}
// Three broken fragment links in the pinned original; repair destinations, never prose.
const aliases = { '如何处理一个系统设计面试题': '如何处理一个系统设计的面试题', '七层负载均衡': '七层负载均衡器', memcached: '应用缓存' };
for (const [alias, target] of Object.entries(aliases)) {
  if (!anchors[target]) throw new Error(`Missing anchor alias target: ${target}`);
  anchors[alias] = anchors[target];
}
const assets = new Set();
marked.walkTokens(tokens, token => {
  if (token.type === 'image') assets.add(token.href);
  if (token.type === 'html') for (const match of token.text.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/g)) assets.add(match[1]);
  if (token.type === 'link' && token.href.startsWith('#') && !anchors[decodeURIComponent(token.href.slice(1))]) throw new Error(`Unmapped internal link ${token.href}`);
});
const imageManifest = {};
for (const asset of assets) {
  const external = asset.startsWith('https://camo.githubusercontent.com/');
  if (!external && !/^images\/[\w.-]+$/.test(asset)) throw new Error(`Review unexpected image path: ${asset}`);
  const filename = external ? `external-${sha256(asset).slice(0, 12)}.png` : asset.slice('images/'.length);
  const path = new URL(filename, images);
  let buffer = !update && await readFile(path).catch(() => null);
  if (!buffer) {
    if (check) throw new Error(`Missing image ${asset}`);
    // The stale GitHub camo URL encodes the original image URL in its final hex segment.
    const downloadUrl = external ? Buffer.from(asset.split('/').at(-1), 'hex').toString('utf8').replace(/^http:/, 'https:') : asset;
    buffer = await download(downloadUrl);
    await writeFile(path, buffer);
  }
  const { width, height } = await sharp(buffer).metadata();
  imageManifest[asset] = { src: `/images/system-design/${filename}`, width, height, sha256: sha256(buffer) };
}
const solutions = await buildSolutions({ check, update, download, images: imageManifest });
const documents = chapters.flatMap(chapter => [chapter, ...solutions.supplements.filter(s => s.parent === chapter.slug)]);
const manifest = { englishRevision: englishRevision(commit), downloads: solutions.downloads, supplements: solutions.supplements.map(({body,...doc})=>doc), solutionPaths: solutions.paths, solutionSources: solutions.sources, referenceAliases, repo, commit, source: 'README-zh-Hans.md', sha256: sha256(upstreamSource), renderedSha256: sha256(source), omittedNavigation: languageLine, aliases, anchors, images: imageManifest, chapters: chapters.map(({ body, ...chapter }) => chapter) };
async function emit(path, content) {
  if (check) {
    if (await readFile(path, 'utf8').catch(() => null) !== content) throw new Error(`Out of date: ${path.pathname}`);
  } else await writeFile(path, content);
}
for (const [index, chapter] of documents.entries()) {
  const frontmatter = { title: chapter.title, sidebar: { order: index + 1 }, tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 4 }, editUrl: false, comments: false, prev: index ? { link: documents[index - 1].url, label: documents[index - 1].title } : false, next: index + 1 < documents.length ? { link: documents[index + 1].url, label: documents[index + 1].title } : false };
  // Preserve the upstream snapshot, but make the explicitly labelled local answer reachable.
  if (chapter.slug === 'object-oriented-design') {
    const row = /^(\| 设计一个环形数组\s*\| )\[待解决\]\(#贡献\)/m;
    if (!row.test(chapter.body)) throw new Error('Review upstream circular-array row before supplementing');
    chapter.body = chapter.body.replace(row, '$1[本站补充解答](/system-design/object-oriented-design/circular-array/)');
  }
  // Frontmatter parsing trims leading indentation; fence the original indented license block.
  const renderedBody = chapter.slug === 'license' ? chapter.body.replace(/^ {4}Creative Commons[\s\S]*$/, block => '```text\n' + block.replace(/^ {4}/gm, '').trimEnd() + '\n```\n') : chapter.body;
  // JSON is valid YAML: source punctuation cannot accidentally become frontmatter syntax.
  if (!check && chapter.slug.includes('/')) await mkdir(new URL(chapter.slug.slice(0,chapter.slug.lastIndexOf('/'))+'/', output), {recursive:true});
  await emit(new URL(`${chapter.slug}.md`, output), `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${renderedBody.replace(/<a href=([^\s"'<>]+)\s*>/g, '<a href="$1">')}`);
}
const expectedFiles = new Set(documents.map(c => `${c.slug}.md`));
for (const file of (await readdir(output, {recursive:true})).filter(file=>file.endsWith('.md'))) if (!expectedFiles.has(file)) {
  if (check || !old?.chapters.some(c => `${c.slug}.md` === file)) throw new Error(`Unexpected chapter file: ${file}`);
  await unlink(new URL(file, output));
}
const searchRecords = headings.map((heading, index) => {
  const chapter = chapters.find(c => heading.start >= c.start && heading.start < c.end);
  const text = JSDOM.fragment(marked.parse(source.slice(heading.end, headings[index + 1]?.start ?? source.length))).textContent.replace(/\s+/g, ' ').trim();
  return { chapter: chapter.title, title: heading.title, url: anchors[heading.id], text };
});
await emit(new URL('public/system-design-search.json', root), JSON.stringify([...searchRecords, ...solutions.search]) + '\n');
await emit(new URL('manifest.json', vendor), JSON.stringify(manifest, null, 2) + '\n');
console.log(`${check ? 'Verified' : 'Generated'} ${chapters.length} chapters + ${solutions.supplements.length} solutions, ${Object.keys(imageManifest).length} image references; source SHA-256 ${manifest.sha256}`);
