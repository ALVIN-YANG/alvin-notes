export type KnowledgeLevel = 'core' | 'scenario' | 'advanced';

export type KnowledgeVisualTokenState =
  | 'plain'
  | 'active'
  | 'focus'
  | 'target'
  | 'duplicate'
  | 'evicted'
  | 'muted'
  | 'arrow'
  | 'gap'
  | 'result';

export interface KnowledgeVisualRow {
  label?: string;
  items: readonly (readonly [value: string, state: KnowledgeVisualTokenState])[];
}

export interface KnowledgeVisualFrame {
  step: string;
  rows: readonly KnowledgeVisualRow[];
  note: string;
}

export type KnowledgeContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: readonly string[] }
  | { type: 'code'; language?: string; text: string }
  | {
      type: 'visual';
      kind: 'flow' | 'sequence' | 'linked-list' | 'stack' | 'tree' | 'grid' | 'table';
      label: string;
      caption: string;
      frames: readonly KnowledgeVisualFrame[];
      sourceHref?: string;
      sourceLabel?: string;
    };

export type KnowledgePointSeed =
  | readonly [
      title: string,
      note: string,
      interviewChecks?: readonly string[],
    ]
  | {
      title: string;
      content: readonly KnowledgeContentBlock[];
      references?: readonly KnowledgeReference[];
    };

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
      points: group.points.map((point, pointIndex) => {
        const normalized = Array.isArray(point)
          ? {
              title: point[0],
              content: [
                { type: 'paragraph' as const, text: point[1] },
                ...(point[2]?.length
                  ? [
                      { type: 'heading' as const, text: '面试要能回答' },
                      { type: 'list' as const, items: [...point[2]] },
                    ]
                  : []),
              ],
            }
          : point;

        return {
          id: `${seed.slug}-${domainIndex + 1}-${groupIndex + 1}-${pointIndex + 1}`,
          title: normalized.title,
          content: normalized.content,
          ...('references' in normalized && normalized.references
            ? { references: normalized.references }
            : {}),
        };
      }),
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
