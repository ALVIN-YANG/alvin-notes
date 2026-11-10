import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { checkSvgLayout } from './svg-layout-core.mjs';

const root = new URL('../', import.meta.url);
const recordUrl = new URL('scripts/svg-layout-record.json', root);
const hash = value => createHash('sha256').update(value).digest('hex');
async function walk(directory) {
  const entries = await readdir(new URL(directory, root), { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(`${directory}/${e.name}`)
    : e.name.endsWith('.svg') ? [`${directory}/${e.name}`] : []))).flat();
}
const files = await walk('public');
const fontPaths = ['public/fonts/misans/misans-regular-subset.woff2', 'public/fonts/misans/misans-semibold-subset.woff2',
  'public/fonts/sarasa/sarasa-mono-sc-regular-subset.woff2'];
const fonts = await Promise.all(fontPaths.map(p => readFile(new URL(p, root))));
const lock = JSON.parse(await readFile(new URL('package-lock.json', root), 'utf8'));
const checkerHash = hash(Buffer.concat([await readFile(new URL('scripts/svg-layout-core.mjs', root)),
  await readFile(new URL(import.meta.url)), Buffer.from(lock.packages['node_modules/playwright'].version), ...fonts]));
const record = JSON.parse(await readFile(recordUrl, 'utf8'));
const sources = new Map(await Promise.all(files.map(async p => [p, await readFile(new URL(p, root))])));
const verifyRecord = process.argv.includes('--record-only');
const update = process.argv.includes('--update');
const selected = process.argv.find(a => a.startsWith('--file='))?.slice(7);
if (selected && !sources.has(selected)) throw new Error(`Unknown SVG: ${selected}`);
if (verifyRecord) {
  const stale = files.filter(p => record.files[p]?.sha256 !== hash(sources.get(p)));
  stale.push(...Object.keys(record.files).filter(p => !sources.has(p)));
  if (record.checkerHash !== checkerHash) stale.push('validator / bundled fonts');
  if (stale.length) throw new Error(`SVG layout record is stale: ${stale.join(', ')}. Run npm run svg:check -- --update`);
  console.log(`SVG layout record verified: ${files.length} assets, ${Object.values(record.files).filter(e => e.mode === 'checked').length} browser-checked diagrams.`);
  process.exit(0);
}

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, javaScriptEnabled: false });
const page = await context.newPage();
// Prevent SVG assets from issuing network requests during validation.
await page.route('**/*', route => route.abort());
const problems = [];
let checked = 0;
try {
  for (const path of files) {
    if (selected && path !== selected) continue;
    const source = sources.get(path).toString('utf8');
    if (!selected && record.files[path]?.mode === 'legacy' && record.files[path].sha256 === hash(sources.get(path))) continue;
    const parsed = new JSDOM(source, { contentType: 'image/svg+xml' }).window.document;
    if (parsed.documentElement.tagName !== 'svg') { problems.push(`${path}: Invalid SVG`); continue; }
    const profiles = ['native', 'sans', 'mono'];
    for (const profile of profiles) {
      const fontCss = `@font-face {font-family:SvgCheckSans;src:url(data:font/woff2;base64,${fonts[0].toString('base64')});font-weight:100 549}
        @font-face {font-family:SvgCheckSans;src:url(data:font/woff2;base64,${fonts[1].toString('base64')});font-weight:550 900}
        @font-face {font-family:SvgCheckMono;src:url(data:font/woff2;base64,${fonts[2].toString('base64')})}
        ${profile !== 'native' ? `svg text,svg tspan {font-family:${profile === 'sans' ? 'SvgCheckSans' : 'SvgCheckMono'} !important}` : ''}`;
      await page.setContent(`<style>body{margin:0}${fontCss}</style>${source}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(async () => {
        await Promise.all([document.fonts.load('24px SvgCheckSans'), document.fonts.load('600 24px SvgCheckSans'), document.fonts.load('24px SvgCheckMono')]);
        await document.fonts.ready;
      });
      const errors = await page.evaluate(checkSvgLayout);
      problems.push(...errors.map(e => `${path} [${profile}]: ${e}`));
    }
    checked++;
  }
} finally { await browser.close(); }
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else if (update) {
  if (selected) throw new Error('--file cannot update the full validation record');
  const next = { version: 1, checkerHash, files: {} };
  for (const path of files) next.files[path] = { sha256: hash(sources.get(path)),
    mode: record.files[path]?.mode === 'legacy' && record.files[path].sha256 === hash(sources.get(path)) ? 'legacy' : 'checked' };
  await writeFile(recordUrl, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`SVG layout passed: ${checked} diagrams × 3 font profiles; record updated.`);
} else { console.log(`SVG layout passed: ${checked} diagrams × 3 font profiles.`); }
