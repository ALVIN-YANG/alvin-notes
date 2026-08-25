import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  analyzeWeeklyContent,
  callLLM,
  compactWeeklySnapshots,
  extractWeeklyDocument,
  findWeeklyStructureIssues,
  getLLMProviders,
} from '../scripts/fetch-ai-news.mjs';
import {
  getISOWeek,
  parseWeeklyReport,
} from '../src/lib/weekly-report.mjs';

const validReport = `# Agent 工具开始补齐运行边界

## 本期主线

这一周的变化集中在工具权限、运行隔离和版本兼容。几个发布都给出了可以继续核对的工程细节。

## 01 Agent 运行边界

权限和隔离成为本周最清楚的一组变化。

### [工具 A 更新权限说明](https://example.com/a)

\`一手\` · \`工具 A 官方\` · \`8 月 8 日\`

官方补充了权限范围。团队可以据此检查现有配置。

### [工具 B 发布隔离方案](https://example.com/b)

\`资讯\` · \`媒体 B\` · \`8 月 8 日\`

媒体 B 报道了新的隔离方案，具体限制仍要等官方文档。

### [工具 C 调整会话策略](https://example.com/c)

\`一手\` · \`工具 C 官方\` · \`8 月 7 日\`

会话策略增加了一个明确的失效条件。

## 02 开发工具

几个工具把原来需要手动完成的步骤放进了正式版本。

### [工具 D 发布新版](https://example.com/d)

\`一手\` · \`GitHub Releases\` · \`8 月 7 日\`

新版补充了工作区配置。

### [工具 E 改进日志](https://example.com/e)

\`开发者\` · \`开发者 E\` · \`8 月 6 日\`

日志增加了请求标识，排错时可以回到单次调用。

### [工具 F 修复兼容问题](https://example.com/f)

\`一手\` · \`GitHub Releases\` · \`8 月 6 日\`

这个版本修复了旧配置迁移失败的问题。

## 03 本地部署

本地推理的两个变化都能直接测试。

### [工具 G 降低显存占用](https://example.com/g)

\`社区\` · \`Hacker News AI\` · \`8 月 5 日\`

社区讨论给出了测试配置，结果需要在相同硬件上复核。

### [工具 H 发布新版本](https://example.com/h)

\`一手\` · \`GitHub Releases\` · \`8 月 5 日\`

新版本增加了一种量化格式。

## 项目与版本

| 项目 | 版本或状态 | 影响 | 链接 |
| --- | --- | --- | --- |
| 工具 A | v1.2 | 补充权限范围 | [Release](https://example.com/a-release) |
| 工具 F | v2.0 | 修复配置迁移 | [Release](https://example.com/f-release) |
| 工具 H | v3.1 | 增加量化格式 | [Release](https://example.com/h-release) |

## 下周观察

1. 工具 A 是否补充权限迁移文档。可以检查官方文档更新。
2. 工具 H 是否公布更多硬件结果。可以检查新版评测数据。
`;

test('新周报协议能通过结构检查并提取页面元数据', () => {
  assert.deepEqual(findWeeklyStructureIssues(validReport), []);
  const document = extractWeeklyDocument(validReport);
  const stats = analyzeWeeklyContent(document.content);
  assert.equal(document.headline, 'Agent 工具开始补齐运行边界');
  assert.deepEqual(stats, { themeCount: 3, storyCount: 8, sourceCount: 6, readMinutes: 4 });
});

test('结构检查会拒绝旧栏目和数量不足的周报', () => {
  const issues = findWeeklyStructureIssues('# 一篇长度足够的旧周报\n\n## 本周判断\n\n内容\n\n## 值得花时间看\n\n内容');
  assert.ok(issues.some(issue => issue.includes('本期主线')));
  assert.ok(issues.some(issue => issue.includes('主题栏目')));
});

test('周材料压缩会按链接去重并移除论文条目', () => {
  const compacted = compactWeeklySnapshots([
    { date: '2026-08-01', raw: '## 行业动态\n\n### [同一事件](https://example.com/a)\n\n旧摘要\n\n## 论文精选\n\n### [论文](https://arxiv.org/abs/1)\n\n内容' },
    { date: '2026-08-02', raw: '## 行业动态\n\n### [同一事件更新](https://example.com/a)\n\n新摘要' },
  ]);
  assert.equal((compacted.match(/https:\/\/example\.com\/a/g) || []).length, 1);
  assert.match(compacted, /新摘要/);
  assert.doesNotMatch(compacted, /arxiv/);
});

test('历史周报无需改写也能生成新版页面结构', () => {
  const markdown = readFileSync('src/content/docs/ai-news/2026-08-03-weekly.md', 'utf8').replace(/^---[\s\S]*?---\s*/, '');
  const report = parseWeeklyReport(markdown, { title: '周报 2026-08-03 ~ 2026-08-09' });
  assert.equal(report.sections.length, 4);
  assert.equal(report.storyCount, 5);
  assert.match(report.headline, /agent|Agent/);
  assert.equal(getISOWeek('2026-08-09'), '2026-W32');
});

test('LLM 提供方按 DeepSeek 和 OpenAI 兼容通道顺序配置', () => {
  const previous = {
    deepseek: process.env.DEEPSEEK_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };
  process.env.DEEPSEEK_API_KEY = 'deepseek-test';
  process.env.OPENAI_API_KEY = 'openai-test';
  assert.deepEqual(getLLMProviders().map(provider => provider.name), ['DeepSeek', 'OpenAI-compatible']);
  if (previous.deepseek === undefined) delete process.env.DEEPSEEK_API_KEY;
  else process.env.DEEPSEEK_API_KEY = previous.deepseek;
  if (previous.openai === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previous.openai;
});

test('DeepSeek 失败后会自动切换到 OpenAI 兼容通道', async () => {
  const previous = {
    deepseek: process.env.DEEPSEEK_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    fetch: globalThis.fetch,
  };
  process.env.DEEPSEEK_API_KEY = 'deepseek-test';
  process.env.OPENAI_API_KEY = 'openai-test';
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).startsWith('https://api.deepseek.com')) return new Response('', { status: 402, statusText: 'Payment Required' });
    return Response.json({ choices: [{ message: { content: '备用通道已接管' }, finish_reason: 'stop' }] });
  };

  try {
    const result = await callLLM('系统提示', '周报材料', { maxTokens: 100 });
    assert.equal(result, '备用通道已接管');
    assert.deepEqual(calls, [
      'https://api.deepseek.com/chat/completions',
      'https://api.openai.com/v1/chat/completions',
    ]);
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.deepseek === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = previous.deepseek;
    if (previous.openai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous.openai;
  }
});
