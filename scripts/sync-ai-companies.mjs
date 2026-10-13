import { readFile, writeFile, rename } from 'node:fs/promises';
import { checkCompanySources, validateCompanies } from '../src/lib/company-observer.mjs';
import { syncCompanyWeek } from './ai-company-weekly.mjs';

const directory = new URL('../src/data/companies/', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name, directory), 'utf8'));
const catalog = await read('catalog.json');
const updates = await read('updates.json');
const archive = await read('archive.json');
validateCompanies(catalog, updates);
validateCompanies(archive, archive);
if (process.argv.includes('--check')) {
  console.log(`已校验 ${catalog.companies.length} 份公司档案及动态引用`);
} else if (process.argv.includes('--sources-only')) {
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
} else {
  const result = await syncCompanyWeek({ catalog, updates, monitor: await read('monitor.json') }, { force: process.argv.includes('--force') });
  if (result.skipped) {
    console.log('本周已完成资料、动态与商业分析核对，跳过重复运行');
  } else {
    if (process.env.COMPANY_REVIEW_LOG) await writeFile(process.env.COMPANY_REVIEW_LOG, `${JSON.stringify(result.audit, null, 2)}\n`);
    for (const [name, data] of Object.entries({ 'catalog.json': result.catalog, 'updates.json': result.updates, 'monitor.json': result.monitor })) {
      await writeFile(new URL(`${name}.tmp`, directory), `${JSON.stringify(data, null, 2)}\n`);
    }
    for (const name of ['catalog.json', 'updates.json', 'monitor.json']) await rename(new URL(`${name}.tmp`, directory), new URL(name, directory));
    const review = result.monitor.lastReview;
    const summary = `公司周同步：${review.successCount} 家完整复核，${review.failureCount} 家未完成；${result.monitor.lastRun.successCount} 个来源成功，${result.monitor.lastRun.failureCount} 个来源失败。`;
    console.log(summary);
    if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n\n${review.companies.map(value => `- ${value.companyId}: ${value.status} · ${value.changes} 项更新 · ${value.events} 条事件${value.error ? ` · ${value.error}` : ''}`).join('\n')}\n`, { flag: 'a' });
    if (review.status !== 'ok') process.exitCode = 1;
  }
}
