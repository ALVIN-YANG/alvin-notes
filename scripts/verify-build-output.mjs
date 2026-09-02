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
      group.points.map((point) => ({ point, group }))
    ))
  ));
  const problemCountsByLevel = { core: 0, scenario: 0, advanced: 0 };

  for (const { point, group } of algorithmPoints) {
    const visibleCodeBlocks = point.content.filter((block) => block.type === 'code');
    const checkpointBlocks = point.content.filter((block) => block.type === 'checkpoint');
    const hiddenCodeBlocks = checkpointBlocks.filter((block) => block.code);
    const isProblem = visibleCodeBlocks.length > 0 || hiddenCodeBlocks.length > 0;
    if (!isProblem) continue;
    algorithmProblemCount += 1;
    problemCountsByLevel[group.level] += 1;
    const source = point.content[0];
    if (source?.type !== 'link' || !/^https:\/\/leetcode\.cn\/problems\/[^/]+\/$/.test(source.href)) {
      problems.push(`Algorithm card must start with a LeetCode problem link: ${point.title}`);
    }
    if (!point.content.some((block) => block.type === 'visual')) {
      problems.push(`Algorithm card has no walkthrough visual: ${point.title}`);
    }
    if (checkpointBlocks.length < 2) {
      problems.push(`Algorithm card needs recall and mastery checkpoints: ${point.title}`);
    }

    if (group.level === 'core' && visibleCodeBlocks.length === 0) {
      problems.push(`Core algorithm card must keep the worked Java example visible: ${point.title}`);
    }
    if (group.level === 'scenario') {
      if (visibleCodeBlocks.length > 0 || hiddenCodeBlocks.length !== 1) {
        problems.push(`Scenario algorithm card must reveal exactly one Java answer on demand: ${point.title}`);
      }
      if (checkpointBlocks.length < 3) {
        problems.push(`Scenario algorithm card needs recall, answer and mastery checkpoints: ${point.title}`);
      }
    }
    if (group.level === 'advanced') {
      if (visibleCodeBlocks.length > 0 || hiddenCodeBlocks.length !== 1) {
        problems.push(`Advanced algorithm card must reveal exactly one Java answer on demand: ${point.title}`);
      }
      if (checkpointBlocks.length < 5) {
        problems.push(`Advanced algorithm card needs staged hints and mastery checkpoints: ${point.title}`);
      }
    }
  }

  const expectedProblemCountsByLevel = { core: 16, scenario: 15, advanced: 5 };
  for (const [level, expectedCount] of Object.entries(expectedProblemCountsByLevel)) {
    if (problemCountsByLevel[level] !== expectedCount) {
      problems.push(
        `Algorithm ${level} card count mismatch: expected=${expectedCount}, actual=${problemCountsByLevel[level]}`,
      );
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
    `Static build verified: no PWA or Mermaid runtime; ${outputDiagramCount} diagrams are inline SVG; all ${algorithmProblemCount} algorithm cards have the required worked, transfer or challenge teaching mode; all ${systemDesignCoverage.length} System Design Primer topics are covered; MiSans ${fontManifest.version.miSans} and Sarasa Mono SC ${fontManifest.version.sarasaMono} subsets are current.`,
  );
}
