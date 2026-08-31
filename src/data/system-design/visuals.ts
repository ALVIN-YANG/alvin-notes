import type {
  KnowledgeContentBlock,
  KnowledgeVisualRow,
  KnowledgeVisualTokenState,
} from '../create-knowledge-map';

type SystemVisual = Extract<KnowledgeContentBlock, { type: 'visual' }>;
type Token = readonly [value: string, state: KnowledgeVisualTokenState];
type Row = readonly [label: string, items: readonly Token[]];

function rows(entries: readonly Row[]): readonly KnowledgeVisualRow[] {
  return entries.map(([label, items]) => ({ label, items }));
}

function path(items: readonly Token[]): readonly Token[] {
  return items.flatMap((item, index) => (
    index === items.length - 1 ? [item] : [item, ['→', 'arrow'] as const]
  ));
}

export function architectureVisual(
  label: string,
  tiers: readonly Row[],
  note: string,
  caption = '组件按职责分层，箭头表示主要数据方向。',
): SystemVisual {
  return {
    type: 'visual',
    kind: 'architecture',
    label,
    caption,
    frames: [{
      step: '高层架构',
      rows: rows(tiers.map(([tier, items]) => [tier, path(items)] as const)),
      note,
    }],
  };
}

interface SequenceStep {
  title: string;
  active: readonly string[];
  note: string;
}

export function sequenceVisual(
  label: string,
  actors: readonly Token[],
  steps: readonly SequenceStep[],
  caption = '逐步查看一次请求经过的组件和状态变化。',
): SystemVisual {
  return {
    type: 'visual',
    kind: 'sequence',
    label,
    caption,
    frames: steps.map((step) => ({
      step: step.title,
      rows: [{
        label: '调用链',
        items: path(actors.map(([value, state]) => [
          value,
          step.active.includes(value) ? 'active' : state,
        ] as const)),
      }],
      note: step.note,
    })),
  };
}

export function failureVisual(
  label: string,
  normal: readonly Token[],
  failed: readonly Token[],
  recovered: readonly Token[],
  notes: readonly [string, string, string],
): SystemVisual {
  return {
    type: 'visual',
    kind: 'failure',
    label,
    caption: '对比正常、故障和恢复三个阶段，明确系统保留了什么能力。',
    frames: [
      { step: '正常', rows: [{ label: '路径', items: path(normal) }], note: notes[0] },
      { step: '故障', rows: [{ label: '路径', items: path(failed) }], note: notes[1] },
      { step: '恢复', rows: [{ label: '路径', items: path(recovered) }], note: notes[2] },
    ],
  };
}

export function capacityVisual(
  label: string,
  metrics: readonly Row[],
  note: string,
): SystemVisual {
  return {
    type: 'visual',
    kind: 'capacity',
    label,
    caption: '估算先写单位和假设，再决定机器、分片与缓存规模。',
    frames: [{ step: '数量级', rows: rows(metrics), note }],
  };
}

export function tradeoffVisual(
  label: string,
  options: readonly Row[],
  note: string,
): SystemVisual {
  return {
    type: 'visual',
    kind: 'tradeoff',
    label,
    caption: '选型要同时写适用条件、收益和代价。',
    frames: [{ step: '方案取舍', rows: rows(options), note }],
  };
}

export const tokens = {
  client: (value: string): Token => [value, 'client'],
  service: (value: string): Token => [value, 'service'],
  cache: (value: string): Token => [value, 'cache'],
  queue: (value: string): Token => [value, 'queue'],
  store: (value: string): Token => [value, 'store'],
  metric: (value: string): Token => [value, 'metric'],
  danger: (value: string): Token => [value, 'danger'],
  muted: (value: string): Token => [value, 'muted'],
  result: (value: string): Token => [value, 'result'],
  plain: (value: string): Token => [value, 'plain'],
};
