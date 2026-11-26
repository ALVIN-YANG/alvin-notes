import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

function parseFrontmatter(source) {
  const match = source.match(/^\uFEFF?---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) return {};
  return Object.fromEntries(match[1].split('\n').flatMap((line) => {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/);
    if (!field) return [];
    const value = field[2].replace(/^(['"])(.*)\1$/, '$2');
    return [[field[1], value]];
  }));
}

function isValidDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateArticleDates({ status, path, currentSource, previousSource = '', today }) {
  const current = parseFrontmatter(currentSource);
  const previous = parseFrontmatter(previousSource);
  const errors = [];
  if (!current.date) errors.push(`${path}: 缺少首次发布日 date`);
  else if (!isValidDay(current.date)) errors.push(`${path}: date 必须使用有效的 YYYY-MM-DD`);

  if (previous.date && current.date !== previous.date) {
    errors.push(`${path}: 已有文章的 date 不得从 ${previous.date} 改为 ${current.date}`);
  }
  if (status === 'A' && !current.lastUpdated) errors.push(`${path}: 新文章必须填写 lastUpdated`);
  if (status === 'A' && current.lastUpdated === 'false') errors.push(`${path}: 新文章的 lastUpdated 不能为 false`);
  if (status === 'A' && current.lastUpdated && current.date !== current.lastUpdated) {
    errors.push(`${path}: 新文章的 date 与 lastUpdated 应相同`);
  }
  if (current.lastUpdated && current.lastUpdated !== 'false') {
    if (!isValidDay(current.lastUpdated)) errors.push(`${path}: lastUpdated 必须使用有效的 YYYY-MM-DD`);
    if (current.date && isValidDay(current.date) && current.lastUpdated < current.date) {
      errors.push(`${path}: lastUpdated 不得早于 date`);
    }
    if (current.lastUpdated > today) errors.push(`${path}: lastUpdated 不得晚于当前日期 ${today}`);
  }
  return errors;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

export function checkContentDatePolicy({ baseRef = 'origin/main', today = new Date().toISOString().slice(0, 10) } = {}) {
  const trackedChanges = git(['diff', '--name-status', baseRef, '--', 'src/content/docs'])
    .split('\n').filter(Boolean);
  const untrackedChanges = git(['ls-files', '--others', '--exclude-standard', '--', 'src/content/docs'])
    .split('\n').filter(Boolean).map((path) => `A\t${path}`);
  const changes = [...trackedChanges, ...untrackedChanges];
  const errors = [];
  let checked = 0;
  for (const change of changes) {
    const fields = change.split('\t');
    const status = fields[0][0];
    if (status === 'D') continue;
    const previousPath = fields[0][0] === 'R' ? fields[1] : fields.at(-1);
    const currentPath = fields.at(-1);
    if (!/\.mdx?$/.test(currentPath) || currentPath.includes('/ai-news/')) continue;
    let previousSource = '';
    if (status !== 'A') previousSource = git(['show', `${baseRef}:${previousPath}`]);
    const currentSource = fs.readFileSync(currentPath, 'utf8');
    errors.push(...validateArticleDates({ status, path: currentPath, currentSource, previousSource, today }));
    checked++;
  }
  return { checked, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const baseRef = process.env.CONTENT_BASE_REF || 'origin/main';
  const { checked, errors } = checkContentDatePolicy({ baseRef });
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(`Content date policy passed for ${checked} changed article(s), compared with ${baseRef}.`);
}
