// Maintainer command: collect explicitly named Wikimedia portraits and retain attribution.
// Missing or non-free portraits require a reviewed override; never substitute another person.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { JSDOM } from 'jsdom';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const runFile = promisify(execFile);
const timeoutMs = Math.min(120000, Math.max(1000, Number(process.argv.find(arg => arg.startsWith('--timeout-ms='))?.split('=')[1]) || 20000));

const root = process.cwd();
const directory = path.join(root, 'public/images/people');
const manifestPath = path.join(root, 'src/data/ai-people-portraits.json');
const rosterPath = path.join(root, 'scripts/people-portrait-sources.json');
const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',');
const roster = JSON.parse(await readFile(rosterPath, 'utf8')).filter(entry => !only || only.includes(entry.id));
let manifest = {};
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch {}
await mkdir(directory, { recursive: true });
const plain = html => new JSDOM(`<body>${html || ''}</body>`).window.document.body.textContent.trim();
async function get(url, json = true) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'AlvinNotes-People/1.0 (https://blog.mlxb.cc)' }, signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return json ? await r.json() : Buffer.from(await r.arrayBuffer());
  } catch (error) {
    if (json) throw error;
    // Some image CDNs work through the system proxy but not Node's fetch transport.
    const { stdout } = await runFile('curl', ['--fail', '--location', '--max-time', String(Math.ceil(timeoutMs / 1000)), '--silent', '--show-error', url], { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 });
    return stdout;
  }
}
const failures = [];
if (process.argv.includes('--inspect')) await mkdir(path.join(root, 'docs/ai-people/research/portraits'), { recursive: true });
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < roster.length) {
    const entry = roster[cursor++];
    const { id, title } = entry;
    if (entry.skipReason) { console.log(`${id}: ${entry.skipReason}`); continue; }
    if (manifest[id]?.src && !process.argv.includes('--refresh')) { try { await access(path.join(root, 'public', manifest[id].src)); continue; } catch {} }
    try {
      let image;
      if (entry.imageUrl) {
        image = { url: entry.imageUrl, source: entry.source, credit: entry.credit, license: entry.license || '公开人物介绍配图；版权归原权利人', licenseUrl: entry.licenseUrl || entry.source };
      } else {
        if (!entry.wikipediaReviewed) throw new Error('请先核对百科中的身份，再设置 wikipediaReviewed；同名不代表同一人');
        const summary = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (summary.type !== 'standard' || !summary.originalimage?.source) throw new Error('No unambiguous portrait');
        const original = new URL(summary.originalimage.source);
        if (!original.pathname.includes('/commons/')) throw new Error('Not a Commons image');
        const parts = original.pathname.split('/');
        const filename = decodeURIComponent(parts[original.pathname.includes('/thumb/') ? parts.length - 2 : parts.length - 1]);
        const api = new URL('https://commons.wikimedia.org/w/api.php');
        api.search = new URLSearchParams({ action:'query', format:'json', prop:'imageinfo', iiprop:'url|extmetadata', iiurlwidth:'256', titles:`File:${filename}` });
        const result = await get(api);
        const info = Object.values(result.query?.pages || {})[0]?.imageinfo?.[0];
        if (!info) throw new Error('No image attribution');
        const meta = info.extmetadata || {};
        const license = plain(meta.LicenseShortName?.value);
        if (!/^(CC|Public domain|PD|GFDL|Attribution)/i.test(license)) throw new Error(`Unreviewed license: ${license}`);
        image = { url: info.thumburl || info.url, source: info.descriptionurl, credit: plain(meta.Artist?.value), license, licenseUrl: meta.LicenseUrl?.value || info.descriptionurl };
      }
      const bytes = await get(image.url, false);
      if (process.argv.includes('--inspect')) await sharp(bytes).rotate().png().toFile(path.join(root, `docs/ai-people/research/portraits/${id}.png`));
      let pipeline = sharp(bytes).rotate();
      if (entry.crop) {
        const { width, height } = await pipeline.metadata();
        pipeline = pipeline.extract({ left:Math.round(entry.crop[0]*width), top:Math.round(entry.crop[1]*height), width:Math.round(entry.crop[2]*width), height:Math.round(entry.crop[3]*height) });
      }
      await pipeline.resize(192,192,{fit:'cover',position:entry.position || sharp.strategy.attention}).webp({quality:83}).toFile(path.join(directory,`${id}.webp`));
      manifest[id] = { src:`/images/people/${id}.webp`, source:image.source, credit:image.credit, license:image.license, licenseUrl:image.licenseUrl, modification:'裁切、缩放并转换为 WebP', checkedAt:'2026-09-22' };
      console.log(`${id}: saved`);
    } catch (error) { failures.push({ id, reason:error.message }); console.log(`${id}: ${error.message}`); }
  }
}));
await writeFile(manifestPath, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2)+'\n');
console.log(JSON.stringify({saved:Object.keys(manifest).length,failures},null,2));
if (failures.length) process.exitCode = 1;
