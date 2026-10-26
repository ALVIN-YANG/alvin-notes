/** Build metadata only for dated articles from the content collection. */
export function createArticleJsonLd({ slug, entry }, canonicalUrl) {
  const { data, body } = entry;
  if (slug.startsWith('phoenix/')) return null;
  if (data.template === 'splash' || slug.startsWith('tools/') || !body?.trim()) return null;
  if (!(data.date instanceof Date) || !Number.isFinite(data.date.getTime())) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonicalUrl}#article`,
    mainEntityOfPage: canonicalUrl,
    headline: data.title,
    description: data.description,
    inLanguage: 'zh-CN',
    author: {
      '@type': 'Person',
      name: 'Alvin Yang',
      url: new URL('/about/', canonicalUrl).href,
    },
    datePublished: data.date.toISOString(),
    ...(data.lastUpdated instanceof Date && Number.isFinite(data.lastUpdated.getTime())
      ? { dateModified: data.lastUpdated.toISOString() }
      : {}),
  };

  // Keep author-controlled text inside the JSON script, even if it contains HTML.
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
