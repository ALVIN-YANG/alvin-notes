import corpus from '../data/interview-agent-sources.json' with { type: 'json' };

export const interviewCorpus = corpus;

export function getInterviewEvidence(id) {
  const slug = id.split('/').at(-1);
  if (!id.startsWith('interview/agent/')) return { sources: [], companies: [], count: 0, latest: '' };
  const seen = new Set();
  const sources = corpus.sources.filter(source => {
    const key = `${source.authorId}:${source.company}`;
    if (!source.observations.some(item => item.question === slug) || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.postedAt.localeCompare(a.postedAt) || a.id.localeCompare(b.id));
  return {
    sources,
    companies: [...new Set(sources.map(source => source.company))],
    count: sources.length,
    latest: sources[0]?.postedAt || '',
  };
}

export function compareInterviewQuestions(a, b) {
  const track = a.data.interview.track.localeCompare(b.data.interview.track);
  if (track) return track;
  if (a.data.interview.track === 'agent') {
    const first = getInterviewEvidence(a.id);
    const second = getInterviewEvidence(b.id);
    const heat = second.count - first.count
      || second.companies.length - first.companies.length
      || second.latest.localeCompare(first.latest);
    if (heat) return heat;
  }
  return a.data.interview.order - b.data.interview.order || a.id.localeCompare(b.id);
}
