import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = new URL('../dist/', import.meta.url);
const contentDirectory = new URL('../src/content/docs/', import.meta.url);
const fontManifestPath = new URL('./font-subset-codepoints.json', import.meta.url);
const systemDesignCoveragePath = new URL('../src/data/system-design/primer-coverage.json', import.meta.url);
const systemDesignOutputPath = new URL('../dist/system-design-knowledge/index.html', import.meta.url);
const algorithmOutputPath = new URL('../dist/algorithm-knowledge/index.html', import.meta.url);
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

const algorithmHtml = await readFile(algorithmOutputPath, 'utf8');
const algorithmDataMatch = algorithmHtml.match(
  /<script type="application\/json" data-map-data>([\s\S]*?)<\/script>/,
);

let algorithmProblemCount = 0;
if (!algorithmDataMatch) {
  problems.push('Algorithm knowledge data is missing from the built page');
} else {
  const algorithmData = JSON.parse(algorithmDataMatch[1]);
  const algorithmPoints = algorithmData.domains.flatMap((domain) => (
    domain.groups.flatMap((group) => (
      group.points.map((point) => ({ point, group, domain }))
    ))
  ));
  const flattenBlocks = (blocks) => blocks.flatMap((block) => [
    block,
    ...flattenBlocks(block.blocks ?? []),
  ]);
  const templatePoints = algorithmPoints.filter(({ point, domain }) => (
    domain.module === 'templates' && point.key?.startsWith('template-')
  ));
  const practicePoints = algorithmPoints.filter(({ point, domain }) => (
    domain.module === 'practice' && point.key?.startsWith('codetop-')
  ));
  const pointKeys = new Set(algorithmPoints.map(({ point }) => point.key).filter(Boolean));
  const linkedPracticeKeys = [];

  algorithmProblemCount = practicePoints.length;
  if (algorithmData.domains.filter((domain) => domain.module === 'templates').length !== 6) {
    problems.push('Algorithm template module must contain six learning stages');
  }
  if (algorithmData.domains.filter((domain) => domain.module === 'practice').length !== 6) {
    problems.push('Algorithm practice module must contain six practice stages');
  }
  if (templatePoints.length !== 12) {
    problems.push(`Algorithm template count mismatch: expected=12, actual=${templatePoints.length}`);
  }
  if (practicePoints.length !== 30) {
    problems.push(`CodeTop practice count mismatch: expected=30, actual=${practicePoints.length}`);
  }

  for (const { point } of templatePoints) {
    const allBlocks = flattenBlocks(point.content);
    const related = point.content.find((block) => block.type === 'related');
    if (point.content.filter((block) => block.type === 'code').length !== 1) {
      problems.push(`Algorithm template must expose one minimal Java skeleton: ${point.title}`);
    }
    if (!allBlocks.some((block) => block.type === 'visual')) {
      problems.push(`Algorithm template has no worked visual: ${point.title}`);
    }
    if (allBlocks.filter((block) => block.type === 'checkpoint').length < 2) {
      problems.push(`Algorithm template needs completion and mastery checks: ${point.title}`);
    }
    if (!related || related.items.length === 0) {
      problems.push(`Algorithm template has no linked Top 30 practice: ${point.title}`);
    } else {
      linkedPracticeKeys.push(...related.items.map((item) => item.target));
    }
  }

  for (const { point } of practicePoints) {
    const allBlocks = flattenBlocks(point.content);
    const visibleCodeBlocks = point.content.filter((block) => block.type === 'code');
    const nestedCodeBlocks = allBlocks.filter((block) => block.type === 'code').length - visibleCodeBlocks.length;
    const checkpointCodeBlocks = allBlocks.filter((block) => block.type === 'checkpoint' && block.code).length;
    const checkpointBlocks = allBlocks.filter((block) => block.type === 'checkpoint');
    const templateLink = point.content.find((block) => (
      block.type === 'related' && block.items.some((item) => item.target.startsWith('template-'))
    ));
    const source = point.content[0];
    if (source?.type !== 'link' || !/^https:\/\/leetcode\.cn\/problems\/[^/]+\/$/.test(source.href)) {
      problems.push(`Algorithm card must start with a LeetCode problem link: ${point.title}`);
    }
    if (!allBlocks.some((block) => block.type === 'visual')) {
      problems.push(`Algorithm card has no walkthrough visual: ${point.title}`);
    }
    if (!templateLink) {
      problems.push(`Algorithm practice card has no template link: ${point.title}`);
    }
    if (visibleCodeBlocks.length > 0 || nestedCodeBlocks + checkpointCodeBlocks !== 1) {
      problems.push(`Algorithm practice must hide exactly one Java answer: ${point.title}`);
    }
    if (checkpointBlocks.length < 4) {
      problems.push(`Algorithm practice needs template, reasoning, coding and mastery gates: ${point.title}`);
    }
    for (const target of templateLink?.items.map((item) => item.target) ?? []) {
      if (!pointKeys.has(target)) problems.push(`Algorithm practice links to an unknown template: ${point.title}`);
    }
  }

  const expectedPracticeKeys = Array.from({ length: 30 }, (_, index) => `codetop-${index + 1}`);
  const actualPracticeKeys = practicePoints.map(({ point }) => point.key).sort((left, right) => (
    Number(left.split('-')[1]) - Number(right.split('-')[1])
  ));
  if (actualPracticeKeys.join('|') !== expectedPracticeKeys.join('|')) {
    problems.push('Algorithm practice module must contain CodeTop ranks 1 through 30 exactly once');
  }
  const linkedPracticeCounts = new Map();
  for (const key of linkedPracticeKeys) {
    linkedPracticeCounts.set(key, (linkedPracticeCounts.get(key) ?? 0) + 1);
  }
  for (const key of expectedPracticeKeys) {
    if (linkedPracticeCounts.get(key) !== 1) {
      problems.push(`CodeTop practice must belong to exactly one template: ${key}`);
    }
  }
}

const systemDesignCoverage = JSON.parse(await readFile(systemDesignCoveragePath, 'utf8'));
const systemDesignHtml = await readFile(systemDesignOutputPath, 'utf8');
const systemDesignDataMatch = systemDesignHtml.match(
  /<script type="application\/json" data-map-data>([\s\S]*?)<\/script>/,
);

if (!systemDesignDataMatch) {
  problems.push('System design knowledge data is missing from the built page');
} else {
  const systemDesignData = JSON.parse(systemDesignDataMatch[1]);
  const systemDesignPoints = systemDesignData.domains.flatMap((domain) => (
    domain.groups.flatMap((group) => (
      group.points.map((point) => ({ point, group, domain }))
    ))
  ));
  const requiredCoverage = new Set(systemDesignCoverage.map((entry) => entry.id));
  const coverageOwners = new Map();

  for (const record of systemDesignPoints) {
    for (const coverageId of record.point.coverage ?? []) {
      const owners = coverageOwners.get(coverageId) ?? [];
      owners.push(record.point.title);
      coverageOwners.set(coverageId, owners);
      if (!requiredCoverage.has(coverageId)) {
        problems.push(`Unknown System Design Primer coverage id: ${coverageId}`);
      }
    }

    const contentLength = record.point.content.reduce((total, block) => {
      const frameLength = block.frames?.reduce((frameTotal, frame) => (
        frameTotal
        + frame.step.length
        + frame.note.length
        + frame.rows.reduce((rowTotal, row) => (
          rowTotal
          + (row.label?.length ?? 0)
          + row.items.reduce((itemTotal, item) => itemTotal + item[0].length, 0)
        ), 0)
      ), 0) ?? 0;
      return total
        + (block.text?.length ?? 0)
        + (block.caption?.length ?? 0)
        + (block.label?.length ?? 0)
        + (block.items?.join('').length ?? 0)
        + frameLength;
    }, 0);
    const visualCount = record.point.content.filter((block) => block.type === 'visual').length;
    const references = record.point.references ?? record.group.references ?? [];
    const isSystemCase = (record.point.coverage ?? []).some((id) => id.startsWith('case.'));

    if (record.point.content.length < 5 || contentLength < 220) {
      problems.push(`System design card is too shallow: ${record.point.title}`);
    }
    if (visualCount < 1) {
      problems.push(`System design card has no relevant visual: ${record.point.title}`);
    }
    if (isSystemCase && visualCount < 3) {
      problems.push(`System design case needs capacity, architecture and flow visuals: ${record.point.title}`);
    }
    if (references.length === 0) {
      problems.push(`System design card has no source: ${record.point.title}`);
    }
  }

  for (const entry of systemDesignCoverage) {
    const owners = coverageOwners.get(entry.id) ?? [];
    if (owners.length === 0) {
      problems.push(`System Design Primer topic is uncovered: ${entry.id} (${entry.label})`);
    } else if (owners.length > 1) {
      problems.push(`System Design Primer topic has multiple owners: ${entry.id} (${owners.join(', ')})`);
    }
  }
}

if (problems.length > 0) {
  console.error(`Static build verification failed:\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(
    `Static build verified: no PWA or Mermaid runtime; ${outputDiagramCount} diagrams are inline SVG; 12 algorithm templates link to all ${algorithmProblemCount} CodeTop Top 30 practice cards; all ${systemDesignCoverage.length} System Design Primer topics are covered; MiSans ${fontManifest.version.miSans} and Sarasa Mono SC ${fontManifest.version.sarasaMono} subsets are current.`,
  );
}
