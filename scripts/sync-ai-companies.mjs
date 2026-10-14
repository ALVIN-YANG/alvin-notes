import { readFile, writeFile, rename, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { syncDirectory, validateDirectory } from '../src/lib/company-directory.mjs';

const root = new URL('../src/data/companies/', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const previous = await read('directory.json');
validateDirectory(previous);
if (process.argv.includes('--check')) {
  console.log(`公司目录校验通过：${previous.companies.length} 家，均有官网、活跃依据与来源`);
} else {
  const temporary = await mkdtemp(path.join(tmpdir(), 'alvin-company-registry-'));
  try {
    const result = await syncDirectory({ seed: (await read('seed.json')).companies, previous, state: await read('sync-state.json'), sources: await read('sources.json') }, {
      pdfText: async bytes => {
        const file = path.join(temporary, 'registry.pdf');
        await writeFile(file, bytes);
        const { stdout } = await promisify(execFile)(process.env.COMPANY_PYTHON || 'python3', ['-c', 'from pypdf import PdfReader; import sys; print("\\n".join(p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages))', file], { timeout: 30000, maxBuffer: 4_000_000 });
        return stdout;
      },
    });
    for (const [name, value] of [['directory.json', result.directory], ['sync-state.json', result.state]]) {
      await writeFile(new URL(`${name}.tmp`, root), `${JSON.stringify(value, null, 2)}\n`);
      await rename(new URL(`${name}.tmp`, root), new URL(name, root));
    }
    const summary = `公司名单同步：${result.directory.companies.length} 家；${result.state.lastRun.results.filter(record => record.ok).length} 个来源成功，${result.state.lastRun.results.filter(record => !record.ok).length} 个来源失败。未调用模型。`;
    console.log(summary);
    for (const [id, source] of Object.entries(result.state.sources)) if (source.error) console.error(`${id}: ${source.error}`);
    if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, { flag: 'a' });
    if (result.state.lastRun.status !== 'ok') process.exitCode = 1;
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
