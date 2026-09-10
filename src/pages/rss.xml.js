import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site';

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function toRfc822(date) {
  return date.toUTCString();
}

export async function GET() {
  const docs = await getCollection('docs', (entry) => {
    const id = entry.id;
    return (
      Boolean(id)
      && !id.endsWith('index')
      && !id.includes('_category_')
      && id !== 'about'
      && !id.startsWith('ai-news/')
      && Boolean(entry.data.title)
    );
  });

  const items = docs
    .map((doc) => {
      const dateValue = doc.data.lastUpdated || doc.data.date;
      const pubDate = dateValue ? new Date(dateValue) : new Date(0);
      const path = `/${doc.id.replace(/\/index$/, '/')}/`;
      return {
        title: doc.data.title,
        description: doc.data.description || '',
        link: new URL(path, siteConfig.site).href,
        pubDate,
      };
    })
    .filter((item) => item.pubDate.getTime() > 0)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 30);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.title)}</title>
    <link>${escapeXml(siteConfig.site)}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${toRfc822(new Date())}</lastBuildDate>
    <atom:link href="${escapeXml(new URL('/rss.xml', siteConfig.site).href)}" rel="self" type="application/rss+xml"/>
${items
  .map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${toRfc822(item.pubDate)}</pubDate>
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
