import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const miSansVersion = '2025-07-14';
const sarasaVersion = '1.0.41';
const miSansOutputDirectory = path.join(repositoryRoot, 'public/fonts/misans');
const sarasaOutputDirectory = path.join(repositoryRoot, 'public/fonts/sarasa');
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

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'alvin-fonts-'));

try {
  const suppliedMiSansArchive = process.env.MISANS_FONT_ARCHIVE;
  const suppliedSarasaSource = process.env.SARASA_MONO_FONT_SOURCE_DIR;
  const miSansSourceDirectory = path.join(temporaryDirectory, 'misans');
  let monoSourceDirectory;

  await mkdir(miSansSourceDirectory);
  const miSansArchive = suppliedMiSansArchive
    ? path.resolve(suppliedMiSansArchive)
    : path.join(temporaryDirectory, 'MiSans.zip');
  if (!suppliedMiSansArchive) {
    await download('https://hyperos.mi.com/font-download/MiSans.zip', miSansArchive);
  }
  await run('bsdtar', [
    '-xf',
    miSansArchive,
    '-C',
    miSansSourceDirectory,
    'MiSans/woff2/MiSans-Regular.woff2',
    'MiSans/woff2/MiSans-Semibold.woff2',
    'MiSans/woff2/MiSans-Bold.woff2',
  ]);

  if (suppliedSarasaSource) {
    monoSourceDirectory = path.resolve(suppliedSarasaSource);
  } else {
    const monoArchive = path.join(temporaryDirectory, 'sarasa-mono-sc.7z');
    monoSourceDirectory = path.join(temporaryDirectory, 'mono');
    await mkdir(monoSourceDirectory);

    await download(
      `https://github.com/be5invis/Sarasa-Gothic/releases/download/v${sarasaVersion}/SarasaMonoSC-TTF-Unhinted-${sarasaVersion}.7z`,
      monoArchive,
    );
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

  await mkdir(miSansOutputDirectory, { recursive: true });
  await mkdir(sarasaOutputDirectory, { recursive: true });
  const fonts = [
    [
      path.join(miSansSourceDirectory, 'MiSans/woff2/MiSans-Regular.woff2'),
      path.join(miSansOutputDirectory, 'misans-regular-subset.woff2'),
    ],
    [
      path.join(miSansSourceDirectory, 'MiSans/woff2/MiSans-Semibold.woff2'),
      path.join(miSansOutputDirectory, 'misans-semibold-subset.woff2'),
    ],
    [
      path.join(miSansSourceDirectory, 'MiSans/woff2/MiSans-Bold.woff2'),
      path.join(miSansOutputDirectory, 'misans-bold-subset.woff2'),
    ],
    [
      path.join(monoSourceDirectory, 'SarasaMonoSC-Regular.ttf'),
      path.join(sarasaOutputDirectory, 'sarasa-mono-sc-regular-subset.woff2'),
    ],
    [
      path.join(monoSourceDirectory, 'SarasaMonoSC-Bold.ttf'),
      path.join(sarasaOutputDirectory, 'sarasa-mono-sc-bold-subset.woff2'),
    ],
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

  for (const [inputPath, outputPath] of fonts) {
    console.log(`Building ${path.basename(outputPath)}...`);
    await run(pyftsubset, [
      inputPath,
      ...subsetOptions,
      `--output-file=${outputPath}`,
    ]);
  }

  await download(
    `https://raw.githubusercontent.com/be5invis/Sarasa-Gothic/v${sarasaVersion}/LICENSE`,
    path.join(sarasaOutputDirectory, 'OFL.txt'),
  );
  await writeFile(
    path.join(miSansOutputDirectory, 'NOTICE.txt'),
    [
      '本网站界面使用 MiSans 字体。',
      '官方来源：https://hyperos.mi.com/font/',
      '许可协议：https://hyperos.mi.com/font-download/MiSans字体知识产权许可协议.pdf',
      '',
    ].join('\n'),
  );
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      font: 'MiSans + Sarasa Mono SC',
      version: {
        miSans: miSansVersion,
        sarasaMono: sarasaVersion,
      },
      characters: codepoints.map((codepoint) => String.fromCodePoint(codepoint)).join(''),
    }, null, 2)}\n`,
  );

  console.log(
    `MiSans ${miSansVersion} + Sarasa Mono SC ${sarasaVersion}: ${codepoints.length} source codepoints subsetted.`,
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
