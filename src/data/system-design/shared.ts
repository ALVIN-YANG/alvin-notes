import type {
  KnowledgeContentBlock,
  KnowledgePointSeed,
  KnowledgeReference,
} from '../create-knowledge-map';

export const primerUrl = 'https://github.com/donnemartin/system-design-primer/blob/master/README.md';
export const primerChineseUrl = 'https://github.com/donnemartin/system-design-primer/blob/master/README-zh-Hans.md';
export const primerLicenseUrl = 'https://github.com/donnemartin/system-design-primer/blob/master/LICENSE.txt';

export const h = (text: string): KnowledgeContentBlock => ({ type: 'heading', text });
export const p = (text: string): KnowledgeContentBlock => ({ type: 'paragraph', text });
export const list = (...items: string[]): KnowledgeContentBlock => ({ type: 'list', items });
export const code = (text: string, language = 'text'): KnowledgeContentBlock => ({ type: 'code', language, text });

export function primerReference(section: string, hash = ''): KnowledgeReference {
  return {
    title: 'System Design Primer',
    location: section,
    href: `${primerUrl}${hash}`,
  };
}

export function primerSolutionReference(slug: string, title: string): KnowledgeReference {
  return {
    title: `System Design Primer · ${title}`,
    location: '原题、讨论、代码与架构图',
    href: `https://github.com/donnemartin/system-design-primer/tree/master/solutions/system_design/${slug}`,
  };
}

export function oodSolutionReference(slug: string, title: string): KnowledgeReference {
  return {
    title: `System Design Primer · ${title}`,
    location: '原题与 Python 参考实现',
    href: `https://github.com/donnemartin/system-design-primer/tree/master/solutions/object_oriented_design/${slug}`,
  };
}

interface CardSeed {
  title: string;
  aliases?: readonly string[];
  coverage?: readonly string[];
  content: readonly KnowledgeContentBlock[];
  references: readonly KnowledgeReference[];
}

export function card(seed: CardSeed): Extract<KnowledgePointSeed, { title: string }> {
  return seed;
}

export const googleSreReference: KnowledgeReference = {
  title: 'Google SRE Books',
  location: 'SLO、过载、监控与可靠性工程',
  href: 'https://sre.google/books/',
};

export const awsBuildersReference: KnowledgeReference = {
  title: 'Amazon Builders’ Library',
  location: '超时、重试、幂等与分布式系统实践',
  href: 'https://builder.aws.com/learn/topics/builders-library',
};

export const azureArchitectureReference: KnowledgeReference = {
  title: 'Azure Architecture Center',
  location: '架构模式、质量属性与技术选型',
  href: 'https://learn.microsoft.com/en-us/azure/architecture/',
};
