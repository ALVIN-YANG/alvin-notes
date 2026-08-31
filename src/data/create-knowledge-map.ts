export type KnowledgeLevel = 'core' | 'scenario' | 'advanced';

export type KnowledgePointSeed = readonly [
  title: string,
  note: string,
  interviewChecks?: readonly string[],
];

export interface KnowledgeReference {
  title: string;
  location: string;
  href?: string;
}

export interface KnowledgeGroupSeed {
  title: string;
  level: KnowledgeLevel;
  references?: readonly KnowledgeReference[];
  points: readonly KnowledgePointSeed[];
}

export interface KnowledgeDomainSeed {
  title: string;
  short: string;
  summary: string;
  articles?: readonly { title: string; href: string }[];
  groups: readonly KnowledgeGroupSeed[];
}

interface KnowledgeMapSeed {
  slug: string;
  updatedAt: string;
  sources?: readonly { title: string; href: string }[];
  domains: readonly KnowledgeDomainSeed[];
}

export function createKnowledgeMap(seed: KnowledgeMapSeed) {
  const domains = seed.domains.map((domain, domainIndex) => ({
    id: `${seed.slug}-d${domainIndex + 1}`,
    code: String(domainIndex + 1),
    title: domain.title,
    short: domain.short,
    summary: domain.summary,
    articles: domain.articles ?? [],
    groups: domain.groups.map((group, groupIndex) => ({
      id: `${seed.slug}-d${domainIndex + 1}-g${groupIndex + 1}`,
      title: group.title,
      level: group.level,
      references: group.references ?? [],
      points: group.points.map(([title, note, interviewChecks], pointIndex) => ({
        id: `${seed.slug}-${domainIndex + 1}-${groupIndex + 1}-${pointIndex + 1}`,
        title,
        content: [
          { type: 'paragraph', text: note },
          ...(interviewChecks?.length
            ? [
                { type: 'heading', text: '面试要能回答' },
                { type: 'list', items: [...interviewChecks] },
              ]
            : []),
        ],
      })),
    })),
  }));

  const groups = domains.flatMap((domain) => domain.groups);
  const points = groups.flatMap((group) => group.points);

  return {
    meta: {
      version: 1,
      updatedAt: seed.updatedAt,
      domainCount: domains.length,
      groupCount: groups.length,
      pointCount: points.length,
      sources: seed.sources ?? [],
    },
    domains,
  };
}
