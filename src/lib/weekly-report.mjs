const H2_PATTERN = /^##\s+(.+)$/gm;
const H3_PATTERN = /^###\s+(.+)$/gm;

export function stripMarkdown(value = '') {
  return value
    .replace(/^>\s?/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~#|]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugifyHeading(value = '') {
  const slug = stripMarkdown(value)
    .toLowerCase()
    .replace(/^\d{1,2}[.、\s]+/, '')
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

function splitByHeading(markdown, pattern) {
  const matches = [...markdown.matchAll(pattern)];
  return matches.map((match, index) => ({
    heading: match[1].trim(),
    body: markdown.slice(match.index + match[0].length, matches[index + 1]?.index ?? markdown.length).trim(),
  }));
}

export function parseSourceMeta(markdown = '') {
  const match = markdown.match(/^`([^`\n]+)`\s*·\s*`([^`\n]+)`\s*·\s*`([^`\n]+)`$/m);
  if (!match) return null;
  return { type: match[1], source: match[2], date: match[3] };
}

export function parseWeeklyReport(markdown = '', data = {}) {
  const prefaceEnd = markdown.search(H2_PATTERN);
  H2_PATTERN.lastIndex = 0;
  const preface = prefaceEnd > 0 ? markdown.slice(0, prefaceEnd).trim() : '';
  const sections = splitByHeading(markdown, H2_PATTERN).map((section, sectionIndex) => {
    const itemMatches = [...section.body.matchAll(H3_PATTERN)];
    H3_PATTERN.lastIndex = 0;
    const intro = itemMatches.length > 0 ? section.body.slice(0, itemMatches[0].index).trim() : section.body;
    const items = splitByHeading(section.body, H3_PATTERN).map((item, itemIndex) => ({
      ...item,
      index: itemIndex + 1,
      title: stripMarkdown(item.heading),
      meta: parseSourceMeta(item.body),
    }));
    const numberMatch = section.heading.match(/^(\d{1,2})[.、\s]+(.+)$/);
    return {
      ...section,
      index: sectionIndex + 1,
      number: numberMatch?.[1]?.padStart(2, '0') || null,
      title: stripMarkdown(numberMatch?.[2] || section.heading),
      slug: slugifyHeading(section.heading),
      intro,
      items,
      isTheme: Boolean(numberMatch),
    };
  });

  const themes = sections.filter(section => section.isTheme);
  const stories = themes.length > 0
    ? themes.flatMap(section => section.items)
    : sections.flatMap(section => section.items);
  const sources = new Set(stories.map(story => story.meta?.source).filter(Boolean));
  const mainline = sections.find(section => /^(本期主线|本周判断)$/.test(section.title));
  const fallbackHeadline = stripMarkdown(mainline?.intro || mainline?.body || '')
    .split(/[。！？]/)[0]
    .slice(0, 42);
  const plainLength = stripMarkdown(markdown).length;

  return {
    preface,
    sections,
    themes,
    storyCount: Number(data.storyCount) || stories.length,
    themeCount: Number(data.themeCount) || themes.length || Math.min(1, sections.length),
    sourceCount: Number(data.sourceCount) || sources.size,
    readMinutes: Number(data.readMinutes) || Math.max(4, Math.ceil(plainLength / 500)),
    snapshotCount: Number(data.snapshotCount) || Number(markdown.match(/从\s*(\d+)\s*份/)?.[1]) || 0,
    headline: data.headline || fallbackHeadline || data.title || '这一周值得留下的 AI 工程变化',
  };
}

export function getISOWeek(dateValue) {
  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function getReportDateRange(title = '', dateValue = '') {
  const match = title.match(/(\d{4}-\d{2}-\d{2})\s*[~～至]\s*(\d{4}-\d{2}-\d{2})/);
  if (match) return { start: match[1], end: match[2] };
  const end = String(dateValue).slice(0, 10);
  return { start: '', end };
}
