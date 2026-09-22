import foundations from './people/foundations.json';
import language from './people/language.json';
import alignment from './people/alignment.json';
import vision from './people/vision.json';
import systems from './people/systems.json';
import china from './people/china.json';
import leaders from './people/leaders.json';
import evaluation from './people/evaluation.json';
import community from './people/community.json';
import training from './people/training.json';
import retrieval from './people/retrieval.json';
import generation from './people/generation.json';
import agents from './people/agents.json';
import openResearch from './people/open-research.json';
import sourceCatalog from './people/sources.json';
import portraitCatalog from './ai-people-portraits.json';
import publicLinkCatalog from './ai-people-links.json';

export const categories = ['基础与架构', '训练与推理', '多模态', 'Agent 与工具', '对齐与评测', '模型与团队', '开源与教育'];
export const reviewedAt = '2026-09-22';
type Portrait = { src: string; source: string; credit: string; license: string; licenseUrl: string; modification: string };
export type PersonLink = {
  platform: string; label: string; url: string; verifiedFrom: string; verifiedAt: string;
};
export type Person = {
  id: string; name: string; alias: string; category: string; tag: string;
  bio: string[]; sources: { label: string; url: string }[]; portrait?: Portrait; links: PersonLink[];
};
const sources = sourceCatalog as Record<string, string[]>;
const portraits = portraitCatalog as Record<string, Portrait>;
const publicLinks = publicLinkCatalog as Record<string, PersonLink[]>;
export const people: Person[] = [
  ...foundations, ...language, ...alignment, ...vision, ...systems,
  ...china, ...leaders, ...evaluation, ...community,
  ...training, ...retrieval, ...generation, ...agents, ...openResearch,
].map(person => ({
  ...person,
  portrait: portraits[person.id],
  links: publicLinks[person.id] || [],
  sources: person.sources.map(id => {
    if (!sources[id]) throw new Error(`Missing source ${id} for ${person.id}`);
    return { label: sources[id][0], url: sources[id][1] };
  }),
}));

export function initials(name: string) {
  return /[\u3400-\u9fff]/u.test(name) ? name.slice(-2) : name.split(/\s+/).map(word => word[0]).filter(Boolean).slice(0, 2).join('');
}
