import { JSDOM } from 'jsdom';

export const directoryCategories = ['大模型', 'AI Agent', 'AI 编程', '基础设施', '生成工具', '语音技术', '行业应用'];
export const directoryRegions = ['全部', '国外', '国内', '杭州'];
export const dateLabel = value => (value || '').slice(0, 10).replaceAll('-', '.');
const day = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function publicUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw new Error('无效的公开网址');
  for (const key of [...url.searchParams.keys()]) if (/^utm_|^ref$|^via$/i.test(key)) url.searchParams.delete(key);
  url.hash = '';
  return url.href;
}
export function websiteKey(value) { return new URL(publicUrl(value)).hostname.replace(/^www\./, '').toLowerCase(); }
export function inRegion(company, region) { return region === '全部' || (region === '杭州' ? company.city === '杭州' || company.hangzhouTeam === true : company.region === region); }

export function validateDirectory(directory) {
  if (directory.schemaVersion !== 1 || !Array.isArray(directory.companies)) throw new Error('公司目录结构无效');
  const ids = new Set(), websites = new Set();
  for (const company of directory.companies) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(company.id) || ids.has(company.id) || ['index', 'changes', 'methodology'].includes(company.id)) throw new Error(`公司 ID 重复或无效：${company.id}`);
    ids.add(company.id);
    for (const key of ['name', 'summary', 'location']) if (!company[key]?.trim()) throw new Error(`${company.id} 缺少 ${key}`);
    if (!['国内', '国外'].includes(company.region) || !directoryCategories.includes(company.category)) throw new Error(`${company.id} 地区或分类无效`);
    const website = websiteKey(company.website);
    if (websites.has(website)) throw new Error(`官网重复：${website}`);
    websites.add(website);
    if (!company.sources?.length || !company.activity?.label || !['active', 'public-product'].includes(company.activity.kind) || !day(company.activity.asOf)) throw new Error(`${company.id} 缺少来源或活跃依据`);
    for (const source of company.sources) {
      publicUrl(source.url);
      if (!source.title?.trim() || !day(source.asOf)) throw new Error(`${company.id} 来源标题或日期无效`);
    }
    if (!day(company.syncedAt)) throw new Error(`${company.id} 同步日期无效`);
  }
  return true;
}

export function classifyYc(company) {
  const text = `${company.name} ${company.tags?.join(' ')} ${company.one_liner} ${company.long_description}`;
  if (/coding|code generation|AI code|software engineer|developer productivity/i.test(text)) return 'AI 编程';
  if (/speech recognition|voice AI|voice agent|text.to.speech|transcription/i.test(text)) return '语音技术';
  if (/video generation|image generation|generative video|avatar|AI video/i.test(text)) return '生成工具';
  if (/foundation model|large language model|AI research lab/i.test(text)) return '大模型';
  if (/infrastructure|data labeling|developer tools|inference|API|observability/i.test(text)) return '基础设施';
  if (/agent|assistant|copilot/i.test(text)) return 'AI Agent';
  return '行业应用';
}

export function companiesFromYc(records, source, today) {
  if (!Array.isArray(records) || records.length < 10) throw new Error('YC 名单为空或结构发生变化');
  return records.filter(company => company.status === 'Active' && company.website && company.url && company.one_liner && company.tags?.some(tag => /^artificial intelligence$|^generative ai$|^ai$/i.test(tag)))
    .sort((a, b) => Number(b.top_company) - Number(a.top_company) || Number(b.isHiring) - Number(a.isHiring) || (b.team_size || 0) - (a.team_size || 0) || a.id - b.id)
    .slice(0, source.limit).map(company => ({
      id: `yc-${company.slug}`, name: company.name, website: publicUrl(company.website), category: classifyYc(company),
      summary: company.one_liner.trim(), location: company.all_locations?.trim() || '来源未提供所在地', city: company.all_locations?.includes('Hangzhou') ? '杭州' : '',
      region: company.regions?.some(region => /China|Hong Kong|Taiwan/.test(region)) ? '国内' : '国外',
      activity: { kind: 'active', label: 'YC 标记 Active', asOf: today }, syncedAt: today,
      sources: [{ title: 'YC 公司档案', url: publicUrl(company.url), asOf: today, sourceId: source.id }],
      sourceId: source.id, sourceSummary: company.one_liner.trim(),
    }));
}

export function mergeDirectory(seed, imported, previous, { ycRecords, today }) {
  const records = structuredClone([...seed, ...imported]);
  const seenIds = new Set(), seenWebsites = new Set();
  const upstream = new Map(ycRecords.map(company => [`yc-${company.slug}`, company]));
  for (const company of previous) {
    if (company.sourceId !== 'yc' || records.some(record => record.id === company.id)) continue;
    const current = upstream.get(company.id);
    if (!current || current.status === 'Active') records.push(structuredClone(company));
  }
  const result = [];
  for (const company of records) {
    const website = websiteKey(company.website);
    if (seenIds.has(company.id) || seenWebsites.has(website)) continue;
    seenIds.add(company.id); seenWebsites.add(website);
    const old = previous.find(record => record.id === company.id);
    result.push({ ...company, summary: old?.summary || company.summary, syncedAt: company.sourceId === 'yc' ? company.syncedAt : (old?.syncedAt || today) });
  }
  return result;
}

export function registryAttachments(html, baseUrl) {
  const dom = new JSDOM(html, { url: baseUrl });
  const links = [...dom.window.document.querySelectorAll('a[href]')].map(a => ({ url: a.href, title: a.textContent.trim() }))
    .filter(link => link.url.startsWith('https://www.cac.gov.cn/') && link.url.includes('/downloadfile.jsp') && /生成式人工智能服务/.test(link.title));
  dom.window.close();
  if (!links.length) throw new Error('未找到官方备案名单附件');
  return links.at(-1);
}

export function registryMatches(text, seed, source, title, today) {
  if (!/备案单位|登记单位/.test(text) || !/\d{4}\/\d{1,2}\/\d{1,2}/.test(text)) throw new Error('官方名单未取得可解析的单位与日期');
  const blocks = text.split(/(?=^\d+\s+(?:北京市|上海市|天津市|重庆市|[\u4e00-\u9fff]{2,5}(?:省|自治区)))/m);
  return seed.flatMap(company => {
    const matches = blocks.filter(block => company.aliases?.some(alias => block.replace(/\s+/g, '').includes(alias.replace(/\s+/g, ''))));
    if (!matches.length) return [];
    const dates = matches.flatMap(block => [...block.matchAll(/(\d{4})\/(\d{1,2})\/(\d{1,2})/g)].map(match => `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`)).sort();
    return [{ companyId: company.id, title, url: source.url, asOf: dates.at(-1), syncedAt: today, sourceId: source.id }];
  });
}

export async function syncDirectory({ seed, previous, state, sources }, { fetcher = fetch, pdfText, now = new Date() } = {}) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const nextState = structuredClone(state), results = [];
  let imported = previous.companies.filter(company => company.sourceId === 'yc'), ycRecords = [];
  nextState.sources ||= {};
  await Promise.all(sources.filter(source => source.mode === 'automatic').map(async source => {
    const old = state.sources?.[source.id] || {};
    try {
      const response = await fetcher(source.url, { signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (source.kind === 'yc') {
        const records = await response.json();
        const selected = companiesFromYc(records, source, today);
        ycRecords = records;
        imported = selected;
        nextState.sources[source.id] = { syncedAt: today, count: imported.length, error: null };
      } else {
        const attachment = registryAttachments(await response.text(), source.url);
        const document = await fetcher(attachment.url, { signal: AbortSignal.timeout(25000) });
        if (!document.ok) throw new Error(`附件 HTTP ${document.status}`);
        const bytes = new Uint8Array(await document.arrayBuffer());
        if (bytes.length > 10_000_000) throw new Error('官方附件超过 10 MB');
        const matches = registryMatches(await pdfText(bytes), seed, source, attachment.title, today);
        nextState.sources[source.id] = { syncedAt: today, title: attachment.title, matches, count: matches.length, error: null };
      }
      results.push({ id: source.id, ok: true });
    } catch (error) {
      nextState.sources[source.id] = { ...old, attemptedAt: today, error: String(error.message).slice(0, 180) };
      results.push({ id: source.id, ok: false });
    }
  }));
  const companies = mergeDirectory(seed, imported, previous.companies, { ycRecords, today });
  for (const company of companies) for (const source of sources) {
    const match = nextState.sources[source.id]?.matches?.find(record => record.companyId === company.id);
    if (match && !company.sources.some(reference => reference.sourceId === source.id)) company.sources.push({ title: match.title, url: match.url, asOf: match.asOf, sourceId: source.id });
  }
  const directory = { schemaVersion: 1, companies };
  validateDirectory(directory);
  nextState.lastRun = { attemptedAt: today, status: results.every(result => result.ok) ? 'ok' : 'partial', results: results.sort((a,b) => a.id.localeCompare(b.id)) };
  return { directory, state: nextState };
}
