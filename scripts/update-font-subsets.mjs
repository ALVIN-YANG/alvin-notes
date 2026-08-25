import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fontVersion = '1.0.41';
const outputDirectory = path.join(repositoryRoot, 'public/fonts/sarasa');
const manifestPath = path.join(repositoryRoot, 'scripts/font-subset-codepoints.json');
const sourceRoots = [
  'src/content/docs',
  'src/components',
  'src/pages',
  'src/data',
];
const sourceFiles = ['astro.config.mjs', 'src/content.config.ts'];
const sourceExtensions = new Set(['.astro', '.css', '.json', '.md', '.mdx', '.mjs', '.ts']);

async function walk(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(entryPath, files);
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

async function collectCorpus() {
  const files = sourceFiles.map((file) => path.join(repositoryRoot, file));
  for (const root of sourceRoots) {
    files.push(...await walk(path.join(repositoryRoot, root)));
  }

  const source = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  const characters = [...new Set(source)];
  const codepoints = characters
    .map((character) => character.codePointAt(0))
    .filter((codepoint) => codepoint > 0x20 && codepoint !== 0x7f)
    .sort((left, right) => left - right);

  return { characters, codepoints };
}

async function download(url, destination) {
  console.log(`Downloading ${path.basename(destination)}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download ${url}: ${response.status} ${response.statusText}`);
  }
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function run(command, args) {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: repositoryRoot,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
}

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'alvin-sarasa-'));

try {
  const suppliedSource = process.env.SARASA_FONT_SOURCE_DIR;
  let uiSourceDirectory;
  let monoSourceDirectory;

  if (suppliedSource) {
    uiSourceDirectory = path.join(suppliedSource, 'ui');
    monoSourceDirectory = path.join(suppliedSource, 'mono');
  } else {
    const uiArchive = path.join(temporaryDirectory, 'sarasa-ui-sc.7z');
    const monoArchive = path.join(temporaryDirectory, 'sarasa-mono-sc.7z');
    uiSourceDirectory = path.join(temporaryDirectory, 'ui');
    monoSourceDirectory = path.join(temporaryDirectory, 'mono');
    await mkdir(uiSourceDirectory);
    await mkdir(monoSourceDirectory);

    await download(
      `https://github.com/be5invis/Sarasa-Gothic/releases/download/v${fontVersion}/SarasaUiSC-TTF-Unhinted-${fontVersion}.7z`,
      uiArchive,
    );
    await download(
      `https://github.com/be5invis/Sarasa-Gothic/releases/download/v${fontVersion}/SarasaMonoSC-TTF-Unhinted-${fontVersion}.7z`,
      monoArchive,
    );
    await run('bsdtar', ['-xf', uiArchive, '-C', uiSourceDirectory]);
    await run('bsdtar', ['-xf', monoArchive, '-C', monoSourceDirectory]);
  }

  const { characters, codepoints } = await collectCorpus();
  const corpusPath = path.join(temporaryDirectory, 'corpus.txt');
  await writeFile(corpusPath, characters.join(''));

  const virtualEnvironment = path.join(temporaryDirectory, 'venv');
  await run('python3', ['-m', 'venv', virtualEnvironment]);
  const pip = path.join(virtualEnvironment, 'bin', 'pip');
  const pyftsubset = path.join(virtualEnvironment, 'bin', 'pyftsubset');
  await run(pip, ['install', '--quiet', 'fonttools', 'brotli']);

  await mkdir(outputDirectory, { recursive: true });
  const fonts = [
    ['SarasaUiSC-Regular.ttf', uiSourceDirectory, 'sarasa-ui-sc-regular-subset.woff2'],
    ['SarasaUiSC-SemiBold.ttf', uiSourceDirectory, 'sarasa-ui-sc-semibold-subset.woff2'],
    ['SarasaUiSC-Bold.ttf', uiSourceDirectory, 'sarasa-ui-sc-bold-subset.woff2'],
    ['SarasaMonoSC-Regular.ttf', monoSourceDirectory, 'sarasa-mono-sc-regular-subset.woff2'],
    ['SarasaMonoSC-Bold.ttf', monoSourceDirectory, 'sarasa-mono-sc-bold-subset.woff2'],
  ];

  const subsetOptions = [
    `--text-file=${corpusPath}`,
    '--flavor=woff2',
    '--layout-features=*',
    '--name-IDs=*',
    '--name-legacy',
    '--name-languages=*',
    '--notdef-glyph',
    '--notdef-outline',
    '--recommended-glyphs',
  ];

  for (const [inputName, inputDirectory, outputName] of fonts) {
    console.log(`Building ${outputName}...`);
    await run(pyftsubset, [
      path.join(inputDirectory, inputName),
      ...subsetOptions,
      `--output-file=${path.join(outputDirectory, outputName)}`,
    ]);
  }

  await download(
    `https://raw.githubusercontent.com/be5invis/Sarasa-Gothic/v${fontVersion}/LICENSE`,
    path.join(outputDirectory, 'OFL.txt'),
  );
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      font: 'Sarasa Gothic',
      version: fontVersion,
      characters: codepoints.map((codepoint) => String.fromCodePoint(codepoint)).join(''),
    }, null, 2)}\n`,
  );

  console.log(`Sarasa Gothic ${fontVersion}: ${codepoints.length} source codepoints subsetted.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
