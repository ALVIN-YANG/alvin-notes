import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';

export const CONCEPT_CATEGORIES = {
  model: '模型与生成', training: '训练与适配', retrieval: '知识与检索',
  context: '上下文与记忆', agent: 'Agent 与工具', quality: '评测与安全',
  multimodal: '多模态', data: '数据与学习', fundamentals: '基础与数学', research: '论文术语',
};

export const SOURCE_NOTICES = [
  { id: 'google', name: 'Google 机器学习术语表', url: 'https://developers.google.com/machine-learning/glossary?hl=zh-cn', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Google Developers；中文内容有节选，核心词条的短释义另行整理。' },
  { id: 'huggingface', name: 'Hugging Face Transformers', url: 'https://huggingface.co/docs/transformers/glossary', license: 'Apache 2.0', licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0', attribution: 'Copyright 2020 The HuggingFace Team；中文释义由本站整理。' },
];

export function cleanText(value = '') {
  return value.normalize('NFKC').replace(/\u200b|\u00ad/gu, '').replace(/\s+/gu, ' ').trim();
}

export function normalizedName(value) {
  return cleanText(value).toLowerCase().replace(/[\s_\-‐‑–—]+/gu, '').replace(/[^\p{L}\p{N}]/gu, '');
}

export function nameKeys(name) {
  const acronym = name.match(/\(([A-Z][A-Z0-9-]{1,9})\)/u)?.[1];
  const base = name.replace(/\s*\([^)]*\)\s*/gu, '').replace(/\bmodels\b/giu, 'model');
  return [...new Set([name, base, acronym].filter(Boolean).map(normalizedName))];
}

export function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function shortDefinition(value, limit = 140) {
  const text = cleanText(value);
  if (text.length <= limit) return text;
  const head = text.slice(0, limit);
  const sentence = head.lastIndexOf('。');
  return sentence >= 15 ? head.slice(0, sentence + 1) : `${head.replace(/[，、；：\s]+$/u, '')}…`;
}

function categoryFor(id, tags, name) {
  if (/context|prompt|memory|compaction/iu.test(`${id} ${name}`)) return 'context';
  if (/retriev|embedding|rag$|rerank|vector.*(search|database)/iu.test(`${id} ${name}`)) return 'retrieval';
  if (tags.includes('#agent')) return 'agent';
  if (/image|audio|vision|multimodal|speech|video/iu.test(`${id} ${tags.join(' ')}`)) return 'multimodal';
  if (tags.some(tag => /metric|fairness|responsible|evaluation/iu.test(tag)) || /hallucination|grounding|safety|benchmark/iu.test(id)) return 'quality';
  if (/train|tuning|gradient|optimizer|backprop|learning-rate|lora|rlhf/iu.test(id)) return 'training';
  if (tags.includes('#generativeAI') || /model|transformer|token|attention|inference|cache/iu.test(id)) return 'model';
  if (/data|feature|label|example|sample|clustering|supervised|unsupervised/iu.test(`${id} ${tags.join(' ')}`)) return 'data';
  return 'fundamentals';
}

export function parseGoogleGlossary(html, { language = 'en' } = {}) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const content = document.querySelector('.devsite-article-body');
  if (!content) throw new Error('Google 术语正文缺失，保留旧词库');
  const entries = [];
  for (const heading of content.querySelectorAll('h2[id]')) {
    const id = heading.id;
    if (/^[a-z]$/iu.test(id) || !id || /questions|faq/iu.test(id)) continue;
    const tags = [], paragraphs = [], references = [];
    let aliasOf = null;
    let node = heading.nextElementSibling;
    while (node && node.tagName !== 'H2') {
      const copy = node.cloneNode(true);
      copy.querySelectorAll('script,style,button,svg,devsite-code,pre,.devsite-anchor,.devsite-heading-link').forEach(element => element.remove());
      const text = cleanText(copy.textContent);
      if (node.tagName === 'DIV' && /^#/u.test(text)) tags.push(...text.match(/#[\w-]+/gu) || []);
      if (['P', 'UL', 'OL'].includes(node.tagName) && text && !/^\$|^\\\[/u.test(text)) {
        if (paragraphs.length === 0 && /^(?:Abbreviation for|Short for|Synonym for|See |缩写|简称|同义词|参阅|请参阅)/iu.test(text)) {
          const link = node.querySelector('a[href*="#"]');
          const target = link?.getAttribute('href')?.split('#')[1];
          if (target && text.length < 160) aliasOf = decodeURIComponent(target);
        }
        if (paragraphs.join('').length < 1600 && paragraphs.length < 6) paragraphs.push(shortDefinition(text, 500));
      }
      for (const link of copy.querySelectorAll('a[href]')) {
        const href = link.getAttribute('href');
        if (href?.includes('#')) references.push(href.split('#')[1]);
      }
      node = node.nextElementSibling;
    }
    if (!paragraphs.length) continue;
    entries.push({ id, name: cleanText(heading.textContent), paragraphs, tags, aliasOf, references: [...new Set(references)].slice(0, 8), language });
  }
  const footer = document.querySelector('devsite-content-footer')?.textContent || '';
  const updatedAt = footer.match(/\d{4}-\d{2}-\d{2}/u)?.[0] || null;
  dom.window.close();
  return { entries, updatedAt };
}

export function parseHuggingFaceGlossary(markdown) {
  const entries = [];
  const sections = markdown.split(/^### /mu).slice(1);
  for (const section of sections) {
    const [name, ...lines] = section.split('\n');
    const body = lines.join('\n').split(/^## /mu)[0];
    const clean = body.replace(/```[\s\S]*?```/gu, '').replace(/<[^>]+>/gu, '').replace(/!\[[^\]]*\]\([^)]*\)/gu, '').replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1').replace(/\[\[?`?([^\]`]+)`?\]?\]/gu, '$1').replace(/`([^`]+)`/gu, '$1');
    const paragraphs = clean.split(/\n\s*\n/u).map(cleanText).filter(Boolean).slice(0, 4);
    if (!paragraphs.length || /^(?:See |Also referred to)/u.test(paragraphs[0]) && paragraphs[0].length < 100) continue;
    entries.push({ id: cleanText(name).toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, ''), name: cleanText(name), paragraphs });
  }
  return entries;
}

function resolveAlias(entry, records, seen = new Set()) {
  if (!entry.aliasOf || seen.has(entry.id)) return entry.id;
  const target = records.get(entry.aliasOf) || [...records.values()].find(record => record.id !== entry.id && nameKeys(record.name).includes(normalizedName(entry.aliasOf)));
  if (!target) return entry.id;
  seen.add(entry.id);
  return resolveAlias(target, records, seen);
}

export function buildConcepts({ english, chinese, huggingface = [], curated, hfTranslations = {}, excluded = [], previous, now = new Date().toISOString() }) {
  if (english.entries.length < 300 || chinese.entries.length < 300) throw new Error('Google 抓取数量异常，保留旧词库');
  const enMap = new Map(english.entries.map(entry => [entry.id, entry]));
  const zhMap = new Map(chinese.entries.map(entry => [entry.id, entry]));
  const previousMap = new Map(previous?.terms?.map(term => [term.id, term]) || []);
  const previousHF = new Map((previous?.terms || []).filter(term => term.id.startsWith('huggingface:')).map(term => [normalizedName(term.term), term]));
  const curatedByGoogle = new Map(curated.filter(entry => entry.googleId).map(entry => [enMap.has(entry.googleId) ? resolveAlias(enMap.get(entry.googleId), enMap) : entry.googleId, entry]));
  const aliases = new Map();
  for (const entry of english.entries) {
    const canonical = resolveAlias(entry, enMap);
    if (canonical !== entry.id) aliases.set(canonical, [...aliases.get(canonical) || [], entry.name]);
  }
  const terms = [];
  for (const entry of english.entries) {
    if (resolveAlias(entry, enMap) !== entry.id) continue;
    const translated = zhMap.get(entry.id);
    if (!translated || !translated.paragraphs.length) continue;
    const custom = curatedByGoogle.get(entry.id);
    const existingHF = custom ? undefined : previousHF.get(normalizedName(entry.name));
    const paragraphs = translated.paragraphs;
    const category = custom?.category || categoryFor(entry.id, entry.tags, entry.name);
    terms.push({
      id: custom?.id || existingHF?.id || `google:${entry.id}`, term: custom?.term || entry.name, zh: custom?.zh || translated.name,
      aliases: [...new Set([entry.name, ...(aliases.get(entry.id) || []), ...(custom?.aliases || [])])].filter(name => name !== (custom?.term || entry.name)),
      category, scope: '通用概念', summary: custom?.summary || shortDefinition(paragraphs[0]),
      definition: custom?.definition || paragraphs.slice(0, 3).join('\n\n'),
      example: custom?.example || '', contrast: custom?.contrast || '',
      related: custom?.related || [], priority: custom?.priority ?? 1000,
      sources: [{ sourceId: 'google', title: `Google：${entry.name}`, url: `https://developers.google.com/machine-learning/glossary?hl=zh-cn#${entry.id}`, license: 'CC BY 4.0' }, ...(custom?.sources || []), ...(existingHF?.sources.filter(source => source.sourceId === 'huggingface') || [])],
      upstreamDefinition: custom ? paragraphs.join('\n\n') : undefined,
    });
  }
  for (const custom of curated) {
    if (terms.some(term => term.id === custom.id)) continue;
    terms.push({ ...custom, scope: custom.scope || '通用概念', aliases: custom.aliases || [], related: custom.related || [], definition: custom.definition || custom.summary, priority: custom.priority ?? 1000 });
  }
  const known = new Set(terms.flatMap(term => [term.term, term.zh, ...term.aliases]).flatMap(nameKeys));
  for (const entry of huggingface) {
    if (nameKeys(entry.name).some(key => known.has(key))) continue;
    const translation = hfTranslations[entry.id];
    if (!translation) continue;
    terms.push({ id: `huggingface:${entry.id}`, term: entry.name, zh: translation.zh, aliases: [], category: translation.category || categoryFor(entry.id, [], entry.name), scope: '通用概念', summary: translation.summary, definition: translation.definition || translation.summary, example: '', contrast: '', related: [], priority: 1000, sources: [{ sourceId: 'huggingface', title: `Hugging Face：${entry.name}`, url: `https://huggingface.co/docs/transformers/glossary#${entry.id}`, license: 'Apache 2.0' }] });
  }
  for (const previousTerm of previous?.terms || []) {
    if (!terms.some(term => term.id === previousTerm.id)) terms.push(previousTerm);
  }
  const excludedNames = new Set(excluded.flatMap(entry => nameKeys(entry.term)));
  for (let index = terms.length - 1; index >= 0; index--) {
    if ([terms[index].term, ...terms[index].aliases].flatMap(nameKeys).some(name => excludedNames.has(name))) terms.splice(index, 1);
  }
  for (const term of terms) {
    term.aliases = [...new Set(term.aliases)].filter(alias => alias && normalizedName(alias) !== normalizedName(term.term));
    const old = previousMap.get(term.id);
    const content = ({ firstSeenAt, updatedAt, ...fields }) => fields;
    const same = old && fingerprint(content(old)) === fingerprint(content(term));
    term.firstSeenAt = old?.firstSeenAt || now;
    term.updatedAt = same ? old.updatedAt : now;
  }
  terms.sort((a, b) => a.priority - b.priority || a.term.localeCompare(b.term, 'en'));
  const result = { version: 1, updatedAt: now, sources: SOURCE_NOTICES, upstreamUpdatedAt: { google: english.updatedAt, googleChinese: chinese.updatedAt }, terms };
  if (previous && fingerprint({ ...previous, updatedAt: '' }) === fingerprint({ ...result, updatedAt: '' })) result.updatedAt = previous.updatedAt;
  validateConcepts(result);
  return result;
}

export function validateConcepts(data) {
  if (data.version !== 1 || !Array.isArray(data.terms) || data.terms.length < 100) throw new Error('词库结构或数量异常');
  const ids = new Set();
  for (const term of data.terms) {
    if (!term.id || ids.has(term.id)) throw new Error(`重复或缺失词条 ID：${term.id}`);
    ids.add(term.id);
    for (const field of ['term', 'zh', 'summary', 'definition']) {
      if (typeof term[field] !== 'string' || !term[field].trim()) throw new Error(`词条 ${term.id} 缺少 ${field}`);
    }
    if (!CONCEPT_CATEGORIES[term.category]) throw new Error(`词条分类无效：${term.id}`);
    if (!Array.isArray(term.aliases) || !term.aliases.every(alias => typeof alias === 'string') || !Number.isFinite(term.priority)) throw new Error(`词条索引字段无效：${term.id}`);
    if (![term.firstSeenAt, term.updatedAt].every(value => typeof value === 'string' && Number.isFinite(Date.parse(value)))) throw new Error(`词条更新时间无效：${term.id}`);
    if (!term.sources?.length) throw new Error(`词条缺少来源：${term.id}`);
    for (const source of term.sources) {
      if (typeof source.title !== 'string' || !source.title || typeof source.url !== 'string' || !URL.canParse(source.url) || new URL(source.url).protocol !== 'https:') throw new Error(`来源无效：${term.id}`);
    }
  }
  return data;
}
