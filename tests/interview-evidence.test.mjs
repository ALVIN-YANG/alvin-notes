import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { compareInterviewQuestions, getInterviewEvidence, interviewCorpus } from '../src/lib/interview-evidence.mjs';

const report = (id, authorId, company, postedAt, questions = ['example']) => ({
  id, authorId, company, postedAt,
  observations: questions.map(question => ({ question, prompt: '原帖考察方向' })),
});
const fixture = sources => ({
  asOf: '2026-10-14', recentSince: '2026-07-17', sources,
  collections: [{ id: 'list', observations: [{ question: 'example' }, { question: 'list-only' }] }],
});

test('counts a topic once per author and company and keeps the newest matching report', () => {
  const data = fixture([
    report('older', 'a', '字节跳动', '2026-06-01'),
    report('newer', 'a', '字节跳动', '2026-09-01'),
    report('another-company', 'a', '美团', '2026-10-01'),
    report('another-author', 'b', '字节跳动', '2026-10-02'),
  ]);
  const result = getInterviewEvidence('interview/agent/example', data);
  assert.equal(result.count, 3);
  assert.equal(result.recentCount, 3);
  assert.equal(result.companies.length, 2);
  assert(!result.sources.some(source => source.id === 'older'));
  assert.equal(result.latest, '2026-10-02');
});

test('the recent window includes both boundaries and excludes old and future dates', () => {
  const data = fixture([
    report('before', 'a', '字节跳动', '2026-07-16'),
    report('start', 'b', '字节跳动', '2026-07-17'),
    report('end', 'c', '美团', '2026-10-14'),
    report('after', 'd', '百度', '2026-10-15'),
  ]);
  const result = getInterviewEvidence('interview/agent/example', data);
  assert.equal(result.recentCount, 2);
  assert.deepEqual(result.recentCompanies.sort(), ['字节跳动', '美团'].sort());
});

test('curated lists never increase candidate-report frequency or company coverage', () => {
  const result = getInterviewEvidence('interview/agent/list-only', fixture([]));
  assert.equal(result.count, 0);
  assert.equal(result.recentCount, 0);
  assert.deepEqual(result.companies, []);
  assert.equal(result.collections.length, 1);
  assert.equal(getInterviewEvidence('interview/infra/example', fixture([])).collections.length, 0);
});

test('published provenance refers to existing questions with unique posts and observations', () => {
  const dir = new URL('../src/content/docs/interview/agent/', import.meta.url);
  const files = readdirSync(dir).filter(file => file.endsWith('.mdx'));
  const slugs = new Set(files.map(file => file.slice(0, -4)));
  assert.equal(new Set(interviewCorpus.sources.map(source => source.postId)).size, interviewCorpus.sources.length);
  for (const source of [...interviewCorpus.sources, ...interviewCorpus.collections]) {
    assert.equal(new Set(source.observations.map(item => item.question)).size, source.observations.length);
    assert(source.observations.every(item => slugs.has(item.question)), source.id);
    assert(new URL(source.url).protocol === 'https:');
    if (source.kind === 'candidate-report') {
      assert(source.authorId && source.author && source.company && source.role);
      assert.match(source.postedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert(source.postedAt <= interviewCorpus.asOf, source.id);
    }
  }
  const titles = files.map(file => readFileSync(new URL(file, dir), 'utf8').match(/^title: (.+)$/m)[1]);
  assert.equal(new Set(titles).size, files.length);
});

test('published question numbers follow the heat order, while Infra keeps its own order', () => {
  const dir = new URL('../src/content/docs/interview/agent/', import.meta.url);
  const entries = readdirSync(dir).filter(file => file.endsWith('.mdx')).map(file => ({
    id: `interview/agent/${file.slice(0, -4)}`,
    data: { interview: { track: 'agent', order: Number(readFileSync(new URL(file, dir), 'utf8').match(/  order: (\d+)/)[1]) } },
  })).sort(compareInterviewQuestions);
  assert.deepEqual(entries.map(entry => entry.data.interview.order), entries.map((_, index) => index + 1));
  const infra = order => ({ id: `interview/infra/${order}`, data: { interview: { track: 'infra', order } } });
  assert(compareInterviewQuestions(infra(1), infra(2)) < 0);
  assert(compareInterviewQuestions(entries[0], infra(1)) < 0);
});
