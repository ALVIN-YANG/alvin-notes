import { readFile, writeFile, rename } from 'node:fs/promises';
import { checkCompanySources, validateCompanies } from '../src/lib/company-observer.mjs';

const directory = new URL('../src/data/companies/', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name, directory), 'utf8'));
const catalog = await read('catalog.json');
const updates = await read('updates.json');
validateCompanies(catalog, updates);
if (process.argv.includes('--check')) {
  console.log(`已校验 ${catalog.companies.length} 份公司档案及动态引用`);
} else {
  const { state, skipped } = await checkCompanySources(catalog, await read('monitor.json'), { force: process.argv.includes('--force') });
  if (skipped) {
    console.log('本周已完成来源检查；如需重试，使用 --force');
  } else {
    const temporary = new URL('monitor.json.tmp', directory);
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`);
    await rename(temporary, new URL('monitor.json', directory));
    console.log(`来源检查：${state.lastRun.successCount} 成功，${state.lastRun.failureCount} 失败；${state.candidates.filter(item => item.status === 'pending').length} 条待核实变化`);
    for (const [key, value] of Object.entries(state.sources)) if (value.error) console.error(`${key}: ${value.error}`);
    if (state.lastRun.failureCount) process.exitCode = 1;
  }
}
