import corpus from '../data/interview-agent-sources.json' with { type: 'json' };

export const interviewCorpus = corpus;

export function getInterviewEvidence(id, dataset = corpus) {
  const slug = id.split('/').at(-1);
  const empty = { sources: [], companies: [], count: 0, recentCount: 0, recentCompanies: [], latest: '', collections: [] };
  if (!id.startsWith('interview/agent/')) return empty;
  const seen = new Set();
  const sources = [...dataset.sources]
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt) || a.id.localeCompare(b.id))
    .filter(source => {
      const key = `${source.authorId}:${source.company}`;
      if (!source.observations.some(item => item.question === slug) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const recentSources = sources.filter(source => source.postedAt >= dataset.recentSince && source.postedAt <= dataset.asOf);
  return {
    sources,
    companies: [...new Set(sources.map(source => source.company))],
    count: sources.length,
    recentCount: recentSources.length,
    recentCompanies: [...new Set(recentSources.map(source => source.company))],
    latest: sources[0]?.postedAt || '',
    collections: (dataset.collections || []).filter(source => source.observations.some(item => item.question === slug)),
  };
}

export function compareInterviewQuestions(a, b) {
  const first = getInterviewEvidence(a.id);
  const second = getInterviewEvidence(b.id);
  return second.recentCount - first.recentCount
    || second.recentCompanies.length - first.recentCompanies.length
    || second.count - first.count
    || second.companies.length - first.companies.length
    || second.latest.localeCompare(first.latest)
    || second.collections.length - first.collections.length
    || a.data.interview.order - b.data.interview.order
    || a.id.localeCompare(b.id);
}
