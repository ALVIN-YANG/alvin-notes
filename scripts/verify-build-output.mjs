import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = new URL('../dist/', import.meta.url);
const contentDirectory = new URL('../src/content/docs/', import.meta.url);
const fontManifestPath = new URL('./font-subset-codepoints.json', import.meta.url);
const fontSourceDirectories = [
  new URL('../src/content/docs/', import.meta.url),
  new URL('../src/components/', import.meta.url),
  new URL('../src/pages/', import.meta.url),
  new URL('../src/data/', import.meta.url),
];
const fontSourceFiles = [
  new URL('../astro.config.mjs', import.meta.url),
  new URL('../src/content.config.ts', import.meta.url),
];
const fontSourceExtensions = /\.(?:astro|css|json|md|mdx|mjs|ts)$/;
const requiredFontFiles = new Set([
  'fonts/misans/NOTICE.txt',
  'fonts/misans/misans-regular-subset.woff2',
  'fonts/misans/misans-semibold-subset.woff2',
  'fonts/misans/misans-bold-subset.woff2',
  'fonts/sarasa/OFL.txt',
  'fonts/sarasa/sarasa-mono-sc-regular-subset.woff2',
  'fonts/sarasa/sarasa-mono-sc-bold-subset.woff2',
]);
const forbiddenPwaFiles = new Set(['manifest.webmanifest', 'registerSW.js', 'sw.js']);
const problems = [];
const emittedFontFiles = new Set();
let sourceDiagramCount = 0;
let outputDiagramCount = 0;

async function walk(directory, inspectFile) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(entryPath, inspectFile);
    } else {
      await inspectFile(entryPath, entry.name);
    }
  }
}

await walk(contentDirectory.pathname, async (file, name) => {
  if (!/\.mdx?$/.test(name)) return;
  const source = await readFile(file, 'utf8');
  sourceDiagramCount += source.match(/```mermaid\s*\n/g)?.length ?? 0;
});

const fontManifest = JSON.parse(await readFile(fontManifestPath, 'utf8'));
const subsetCodepoints = new Set(
  [...fontManifest.characters].map((character) => character.codePointAt(0)),
);
const missingCodepoints = new Set();

async function checkFontSource(file, name = path.basename(file)) {
  if (!fontSourceExtensions.test(name)) return;
  const source = await readFile(file, 'utf8');
  for (const character of source) {
    const codepoint = character.codePointAt(0);
    if (codepoint <= 0x20 || codepoint === 0x7f) continue;
    if (!subsetCodepoints.has(codepoint)) missingCodepoints.add(codepoint);
  }
}

for (const directory of fontSourceDirectories) {
  await walk(directory.pathname, checkFontSource);
}
for (const file of fontSourceFiles) {
  await checkFontSource(file.pathname);
}

if (missingCodepoints.size > 0) {
  const preview = [...missingCodepoints]
    .slice(0, 12)
    .map((codepoint) => `${String.fromCodePoint(codepoint)} (U+${codepoint.toString(16).toUpperCase()})`)
    .join(', ');
  problems.push(`Font subset is stale; run npm run fonts:update. Missing: ${preview}`);
}

await walk(outputDirectory.pathname, async (file, name) => {
  const relativePath = path.relative(outputDirectory.pathname, file);

  if (requiredFontFiles.has(relativePath)) {
    emittedFontFiles.add(relativePath);
  }

  if (forbiddenPwaFiles.has(name) || /^workbox-.*\.js$/.test(name)) {
    problems.push(`PWA artifact emitted: ${relativePath}`);
  }

  if (/^mermaid(?:\.core)?\..*\.js$/i.test(name)) {
    problems.push(`Mermaid client bundle emitted: ${relativePath}`);
  }

  if (!name.endsWith('.html')) return;
  const html = await readFile(file, 'utf8');
  outputDiagramCount += html.match(/<div class="mermaid-static__canvas"/g)?.length ?? 0;

  if (/class="language-mermaid"|<pre class="mermaid"|mermaid\.core\.|mermaid-static__theme/.test(html)) {
    problems.push(`Uncompiled Mermaid markup emitted: ${relativePath}`);
  }
});

for (const fontFile of requiredFontFiles) {
  if (!emittedFontFiles.has(fontFile)) {
    problems.push(`Font artifact missing: ${fontFile}`);
  }
}

if (outputDiagramCount !== sourceDiagramCount) {
  problems.push(`Static Mermaid count mismatch: source=${sourceDiagramCount}, output=${outputDiagramCount}`);
}

if (problems.length > 0) {
  console.error(`Static build verification failed:\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(
    `Static build verified: no PWA or Mermaid runtime; ${outputDiagramCount} diagrams are inline SVG; MiSans ${fontManifest.version.miSans} and Sarasa Mono SC ${fontManifest.version.sarasaMono} subsets are current.`,
  );
}
