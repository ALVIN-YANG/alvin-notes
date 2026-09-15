/**
 * 实时模型榜数据生成器
 *
 * 只接入能够自动更新、保留原始成绩并可追溯到公开来源的数据。
 * 手工维护的国内榜、价格表和发布时间线不再参与生成。
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import {
  buildRefreshMetadata,
  parseArenaTextEntries,
  shouldWriteArenaOutput,
} from './model-arena-core.mjs';

const OUTPUT_PATH = 'src/data/model-arena.json';
const EPOCH_BUNDLE_URL = 'https://epoch.ai/data/benchmark_data.zip';
const ARTIFICIAL_ANALYSIS_URL = 'https://artificialanalysis.ai/api/v2/data/llms/models';
const MAX_BOARD_ENTRIES = 60;
const CACHE_MAX_AGE_MS = 72 * 60 * 60 * 1000;

const ARENA_URLS = [
  'https://arena.ai/leaderboard/text',
  'https://lmarena.ai/leaderboard',
  'https://chat.lmarena.ai/leaderboard',
];

export const EPOCH_BOARD_DEFINITIONS = [
  {
    id: 'epoch-eci',
    short: 'ECI',
    label: 'Epoch Capabilities Index',
    operatorId: 'epoch-ai',
    operator: 'Epoch AI',
    category: 'general',
    file: 'epoch_capabilities_index/eci_scores.csv',
    fileCandidates: ['epoch_capabilities_index/eci_scores.csv', 'epoch_capabilities_index.csv'],
    scoreField: 'eci',
    scoreFields: ['eci', 'ECI Score'],
    modelField: 'Model',
    modelFields: ['Model', 'Model version'],
    displayFields: ['Display name', 'Model name', 'Model'],
    organizationField: 'Organization',
    releaseDateField: 'date',
    releaseDateFields: ['date', 'Release date'],
    sourceUrl: 'https://epoch.ai/eci',
    description: '将多项公开评测拟合到同一能力尺度，适合作为通用能力基准。',
  },
  {
    id: 'arena-webdev',
    short: 'WEB',
    label: 'Arena WebDev',
    operatorId: 'lmarena',
    operator: 'Arena',
    category: 'code',
    file: 'webdev_arena_external.csv',
    scoreField: 'Arena Score',
    modelField: 'Model version',
    displayFields: ['Model version'],
    organizationField: 'Organization',
    releaseDateField: 'Release date',
    sourceUrl: 'https://arena.ai/leaderboard/code/webdev',
    description: '基于匿名两两比较的 Web 开发结果，反映页面生成与前端完成度。',
  },
  {
    id: 'deepswe',
    short: 'SWE',
    label: 'DeepSWE v1.1',
    operatorId: 'datacurve',
    operator: 'DataCurve',
    category: 'code',
    file: 'deepswe_external.csv',
    scoreField: 'Pass@1',
    modelField: 'Model version',
    displayFields: ['Name', 'Model version'],
    organizationField: 'Organization',
    releaseDateField: 'Release date',
    scoreMultiplier: 100,
    scoreSuffix: '%',
    sourceUrl: 'https://deepswe.datacurve.ai/',
    description: '在统一 mini-swe-agent harness 下比较代码模型，减少 Agent 外壳差异。',
  },
  {
    id: 'terminal-bench',
    short: 'TERM',
    label: 'Terminal-Bench 2.0',
    operatorId: 'terminal-bench',
    operator: 'Terminal-Bench',
    category: 'agent',
    file: 'terminalbench_external.csv',
    scoreField: 'Accuracy mean',
    modelField: 'Model version',
    displayFields: ['Name', 'Model version'],
    organizationField: 'Organization',
    releaseDateField: 'Release date',
    scoreMultiplier: 100,
    scoreSuffix: '%',
    sourceUrl: 'https://www.tbench.ai/leaderboard/terminal-bench/2.0',
    description: '评估模型和 Agent 在真实终端环境中完成端到端工程任务的能力。',
  },
  {
    id: 'apex-agents',
    short: 'APEX',
    label: 'APEX-Agents',
    operatorId: 'apex-agents',
    operator: 'APEX-Agents',
    category: 'agent',
    file: 'apex_agents_external.csv',
    scoreField: 'Pass@1 score',
    modelField: 'Model version',
    displayFields: ['Name', 'Model version'],
    organizationField: 'Organization',
    releaseDateField: 'Release date',
    scoreMultiplier: 100,
    scoreSuffix: '%',
    sourceUrl: 'https://www.mercor.com/apex/apex-agents-leaderboard/',
    description: '衡量模型在投行、咨询和法律等长链路知识工作中的 Agent 表现。',
  },
];

const CATEGORY_LABELS = {
  general: '通用',
  code: '代码',
  agent: 'Agent',
};

const SOURCE_PRIORITY = {
  'epoch-eci': 100,
  'artificial-analysis': 95,
  'arena-text': 90,
  'arena-webdev': 80,
  deepswe: 70,
  'terminal-bench': 60,
  'apex-agents': 50,
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/json,text/csv,*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

function sha(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function nowISO() {
  return new Date().toISOString();
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  let lastError = new Error(`无法访问 ${url}`);
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...BROWSER_HEADERS, ...options.headers },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`${url} 返回 HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 1200 * attempt));
    }
  }
  throw lastError;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const headers = (rows.shift() || []).map((header, index) => index === 0 ? header.replace(/^\uFEFF/, '') : header);
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function normalizeOrganization(value = '') {
  return value
    .replace('Google DeepMind', 'Google')
    .replace('Z.ai (Zhipu AI)', 'Z.ai')
    .replace('Meta AI', 'Meta')
    .replace(/^Moonshot$/, 'Moonshot AI')
    .trim() || '未知';
}

function canonicalModelKey(value = '') {
  let key = value
    .toLowerCase()
    .replace(/^[^/]+\//, '')
    .replace(/[()]/g, '-')
    .replace(/[_.\s]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  key = key.replace(/-prounknown$/, '-pro');

  const removableSuffix = /-(?:thinking|non-reasoning|reasoning|adaptive|none|unknown|low|medium|high|xhigh|max|promax|pro-max|codex-harness|pre-release|web-app|webapp|customtools|minimal|no-thinking|\d+k)$/;
  let previous = '';
  while (key !== previous) {
    previous = key;
    key = key
      .replace(removableSuffix, '')
      .replace(/-20\d{2}(?:-\d{2}){0,2}$/, '')
      .replace(/-\d{8}$/, '')
      .replace(/-preview$/, '');
  }

  return key
    .replace(/^gpt-(\d+)-(\d+)(?=-|$)/, 'gpt-$1.$2')
    .replace(/^glm-(\d+)-(\d+)(?=-|$)/, 'glm-$1.$2')
    .replace(/^gemini-(\d+)-(\d+)(?=-|$)/, 'gemini-$1.$2')
    .replace(/^claude-(opus|sonnet|haiku)-(\d+)-(\d+)(?=-|$)/, 'claude-$1-$2.$3')
    .replace(/^qwen-?(\d+)-(\d+)(?=-|$)/, 'qwen$1.$2')
    .replace(/^kimi-k(\d+)-(\d+)(?=-|$)/, 'kimi-k$1.$2');
}

function titleCaseModelKey(key) {
  const wordMap = {
    ai: 'AI', apex: 'APEX', claude: 'Claude', codex: 'Codex', deepseek: 'DeepSeek',
    fable: 'Fable', flash: 'Flash', gemini: 'Gemini', glm: 'GLM', gpt: 'GPT',
    grok: 'Grok', haiku: 'Haiku', kimi: 'Kimi', llama: 'Llama', max: 'Max',
    minimax: 'MiniMax', opus: 'Opus', pro: 'Pro', qwen: 'Qwen', sol: 'Sol',
    sonnet: 'Sonnet', terra: 'Terra', luna: 'Luna', muse: 'Muse', spark: 'Spark',
  };
  return key.split('-').map(part => wordMap[part] || (/^\d/.test(part) ? part : `${part[0]?.toUpperCase() || ''}${part.slice(1)}`)).join(' ');
}

function cleanDisplayName(value, key) {
  const cleaned = String(value || '')
    .replace(/\s*\(pro,\s*unknown thinking\)\s*$/i, ' Pro')
    .replace(/\s*\((?:none|unknown|low|medium|high|xhigh|max|promax|thinking|non-reasoning|no thinking|\d+k thinking|web)[^)]*\)\s*$/i, '')
    .replace(/[_-](?:none|unknown|low|medium|high|xhigh|max|promax|thinking|non-reasoning|minimal)$/i, '')
    .trim();
  if (!cleaned || /^[a-z0-9_.:/-]+$/.test(cleaned)) return titleCaseModelKey(key);
  return cleaned;
}

function getFirst(row, fields) {
  for (const field of fields) {
    if (row[field]) return row[field];
  }
  return '';
}

function normalizeReleaseDate(value) {
  const match = String(value || '').match(/20\d{2}-\d{2}-\d{2}/);
  return match?.[0] || null;
}

function scoreLabel(score, definition) {
  const value = score * (definition.scoreMultiplier || 1);
  const digits = value >= 100 ? 1 : 2;
  return `${value.toFixed(digits).replace(/\.0+$/, '')}${definition.scoreSuffix || ''}`;
}

export function buildBoardFromRows(rows, definition, remoteUpdatedAt) {
  const ranked = rows
    .map(row => {
      const rawScore = Number(getFirst(row, definition.scoreFields || [definition.scoreField]));
      const modelVersion = getFirst(row, definition.modelFields || [definition.modelField]) || getFirst(row, definition.displayFields);
      const modelKey = canonicalModelKey(modelVersion);
      if (!modelKey || !Number.isFinite(rawScore)) return null;
      return {
        modelKey,
        model: cleanDisplayName(getFirst(row, definition.displayFields), modelKey),
        organization: normalizeOrganization(row[definition.organizationField]),
        modelVersion,
        releaseDate: normalizeReleaseDate(getFirst(row, definition.releaseDateFields || [definition.releaseDateField])),
        rawScore,
        scoreLabel: scoreLabel(rawScore, definition),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.rawScore - left.rawScore);

  ranked.forEach((entry, index) => { entry.sourceRank = index + 1; });
  const bestByModel = new Map();
  ranked.forEach(entry => {
    const current = bestByModel.get(entry.modelKey);
    if (!current || entry.rawScore > current.rawScore) bestByModel.set(entry.modelKey, entry);
  });

  const entries = [...bestByModel.values()]
    .sort((left, right) => right.rawScore - left.rawScore)
    .slice(0, MAX_BOARD_ENTRIES)
    .map((entry, index, all) => ({
      ...entry,
      rank: index + 1,
      normalizedScore: all.length === 1 ? 100 : Number((100 * (1 - index / (all.length - 1))).toFixed(2)),
    }));

  return stabilizeBoard({
    ...definition,
    updatedAt: remoteUpdatedAt,
    status: 'live',
    entries,
  });
}

export function resolveEpochArchiveFile(archive, definition) {
  const candidates = definition.fileCandidates || [definition.file];
  return candidates.find(candidate => archive[candidate]) || null;
}

function stabilizeBoard(board, previousBoard = null) {
  const contentHash = sha(board.entries.map(entry => ({
    modelKey: entry.modelKey,
    rank: entry.rank,
    sourceRank: entry.sourceRank,
    rawScore: entry.rawScore,
    modelVersion: entry.modelVersion,
  })));
  const unchanged = previousBoard?.contentHash === contentHash;
  return {
    id: board.id,
    short: board.short,
    label: board.label,
    operatorId: board.operatorId,
    operator: board.operator,
    category: board.category,
    categoryLabel: CATEGORY_LABELS[board.category],
    sourceUrl: board.sourceUrl,
    description: board.description,
    status: board.status || 'live',
    updatedAt: unchanged ? previousBoard.updatedAt : (board.updatedAt || nowISO()),
    contentHash,
    entries: board.entries,
  };
}

async function fetchEpochBoards(previousBoards) {
  console.log('\n── Epoch AI Benchmarking Hub ──');
  const response = await fetchWithRetry(EPOCH_BUNDLE_URL, {}, 3);
  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const remoteUpdatedAt = response.headers.get('last-modified') || nowISO();

  return EPOCH_BOARD_DEFINITIONS.map(definition => {
    const archiveFile = resolveEpochArchiveFile(archive, definition);
    if (!archiveFile) {
      const candidates = definition.fileCandidates || [definition.file];
      throw new Error(`Epoch 数据包缺少 ${candidates.join(' 或 ')}`);
    }
    const bytes = archive[archiveFile];
    const rows = parseCSV(strFromU8(bytes));
    const board = buildBoardFromRows(rows, definition, remoteUpdatedAt);
    const stabilized = stabilizeBoard(board, previousBoards.get(definition.id));
    console.log(`  ✓ ${definition.label}: ${stabilized.entries.length} 个模型`);
    return stabilized;
  });
}

function parseArenaTextData(html) {
  return parseArenaTextEntries(html).map(entry => {
    const modelKey = canonicalModelKey(entry.modelDisplayName);
    return {
      modelKey,
      model: cleanDisplayName(entry.modelDisplayName, modelKey),
      organization: normalizeOrganization(entry.modelOrganization),
      modelVersion: entry.modelDisplayName,
      releaseDate: null,
      rawScore: entry.rating,
      scoreLabel: entry.rating.toFixed(1),
      sourceRank: entry.rank,
    };
  });
}

async function fetchArenaTextBoard(previousBoard) {
  console.log('\n── Arena Text ──');
  let lastError;
  for (const url of ARENA_URLS) {
    try {
      const response = await fetchWithRetry(url, { headers: { Accept: 'text/html' } }, 2);
      const parsed = parseArenaTextData(await response.text());
      if (parsed.length === 0) throw new Error('页面中没有可识别的榜单数据');

      const bestByModel = new Map();
      parsed.sort((left, right) => right.rawScore - left.rawScore).forEach(entry => {
        const current = bestByModel.get(entry.modelKey);
        if (!current || entry.rawScore > current.rawScore) bestByModel.set(entry.modelKey, entry);
      });
      const entries = [...bestByModel.values()]
        .sort((left, right) => right.rawScore - left.rawScore)
        .slice(0, MAX_BOARD_ENTRIES)
        .map((entry, index, all) => ({
          ...entry,
          rank: index + 1,
          normalizedScore: all.length === 1 ? 100 : Number((100 * (1 - index / (all.length - 1))).toFixed(2)),
        }));

      const board = stabilizeBoard({
        id: 'arena-text',
        short: 'ARENA',
        label: 'Arena Text',
        operatorId: 'lmarena',
        operator: 'Arena',
        category: 'general',
        categoryLabel: CATEGORY_LABELS.general,
        sourceUrl: 'https://arena.ai/leaderboard/text',
        description: '匿名两两盲选形成的人类偏好排名，补充客观题库难以覆盖的回答体验。',
        status: 'live',
        updatedAt: response.headers.get('last-modified') || nowISO(),
        entries,
      }, previousBoard);
      console.log(`  ✓ ${board.label}: ${entries.length} 个模型`);
      return board;
    } catch (error) {
      lastError = error;
      console.warn(`  ✗ ${url}: ${error.message}`);
    }
  }
  throw lastError || new Error('Arena Text 抓取失败');
}

async function fetchArtificialAnalysis(previousBoard) {
  const apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
  if (!apiKey) return { board: null, pricing: {} };

  console.log('\n── Artificial Analysis ──');
  const response = await fetchWithRetry(ARTIFICIAL_ANALYSIS_URL, {
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
  }, 2);
  const payload = await response.json();
  const pricing = {};
  const rows = (payload.data || [])
    .map(model => {
      const rawScore = Number(model.evaluations?.artificial_analysis_intelligence_index);
      const modelKey = canonicalModelKey(model.slug || model.name);
      if (!modelKey || !Number.isFinite(rawScore)) return null;
      if (model.pricing) {
        pricing[modelKey] = {
          input: Number(model.pricing.price_1m_input_tokens),
          output: Number(model.pricing.price_1m_output_tokens),
          sourceUrl: 'https://artificialanalysis.ai/models',
        };
      }
      return {
        modelKey,
        model: model.name,
        organization: normalizeOrganization(model.model_creator?.name),
        modelVersion: model.slug || model.name,
        releaseDate: null,
        rawScore,
        scoreLabel: rawScore.toFixed(1),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.rawScore - left.rawScore)
    .slice(0, MAX_BOARD_ENTRIES);

  const entries = rows.map((entry, index, all) => ({
    ...entry,
    rank: index + 1,
    sourceRank: index + 1,
    normalizedScore: all.length === 1 ? 100 : Number((100 * (1 - index / (all.length - 1))).toFixed(2)),
  }));
  const board = stabilizeBoard({
    id: 'artificial-analysis',
    short: 'AA',
    label: 'Artificial Analysis Intelligence Index',
    operatorId: 'artificial-analysis',
    operator: 'Artificial Analysis',
    category: 'general',
    sourceUrl: 'https://artificialanalysis.ai/leaderboards/models',
    description: '独立复跑多项评测，并提供官方模型价格、速度和延迟数据。',
    status: 'live',
    updatedAt: nowISO(),
    entries,
  }, previousBoard);
  console.log(`  ✓ ${board.label}: ${entries.length} 个模型`);
  return { board, pricing };
}

function cachedBoard(previousBoard, error) {
  if (!previousBoard) return null;
  const age = Date.now() - new Date(previousBoard.updatedAt).getTime();
  return {
    ...previousBoard,
    status: age > CACHE_MAX_AGE_MS ? 'stale' : 'cached',
    error: error.message,
  };
}

async function collectBoards(existing) {
  const previousBoards = new Map((existing?.sourceBoards || []).map(board => [board.id, board]));
  const boards = [];

  try {
    boards.push(...await fetchEpochBoards(previousBoards));
  } catch (error) {
    console.warn(`  ✗ Epoch 数据包：${error.message}`);
    EPOCH_BOARD_DEFINITIONS.forEach(definition => {
      const fallback = cachedBoard(previousBoards.get(definition.id), error);
      if (fallback) boards.push(fallback);
    });
  }

  try {
    boards.push(await fetchArenaTextBoard(previousBoards.get('arena-text')));
  } catch (error) {
    const fallback = cachedBoard(previousBoards.get('arena-text'), error);
    if (fallback) boards.push(fallback);
  }

  let pricing = {};
  try {
    const artificialAnalysis = await fetchArtificialAnalysis(previousBoards.get('artificial-analysis'));
    if (artificialAnalysis.board) boards.push(artificialAnalysis.board);
    pricing = artificialAnalysis.pricing;
  } catch (error) {
    console.warn(`  ✗ Artificial Analysis：${error.message}`);
    const fallback = cachedBoard(previousBoards.get('artificial-analysis'), error);
    if (fallback) boards.push(fallback);
  }

  return { boards, pricing };
}

function mean(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function calculateScore(evidence) {
  const byOperator = new Map();
  evidence.forEach(item => {
    if (!byOperator.has(item.operatorId)) byOperator.set(item.operatorId, []);
    byOperator.get(item.operatorId).push(item.normalizedScore);
  });
  return mean([...byOperator.values()].map(scores => mean(scores)));
}

function chooseModelName(evidence, modelKey) {
  return [...evidence]
    .sort((left, right) => (SOURCE_PRIORITY[right.sourceId] || 0) - (SOURCE_PRIORITY[left.sourceId] || 0))
    .map(item => item.model)
    .find(Boolean) || titleCaseModelKey(modelKey);
}

function buildModelData(sourceBoards, pricing) {
  const activeBoards = sourceBoards.filter(board => board.status !== 'stale' && board.entries.length > 0);
  const models = new Map();

  activeBoards.forEach(board => {
    board.entries.forEach(entry => {
      if (!models.has(entry.modelKey)) models.set(entry.modelKey, { modelKey: entry.modelKey, evidence: [] });
      models.get(entry.modelKey).evidence.push({
        sourceId: board.id,
        sourceShort: board.short,
        sourceLabel: board.label,
        operatorId: board.operatorId,
        operator: board.operator,
        category: board.category,
        categoryLabel: board.categoryLabel,
        sourceUrl: board.sourceUrl,
        status: board.status,
        updatedAt: board.updatedAt,
        rank: entry.rank,
        sourceRank: entry.sourceRank,
        sourceCount: board.entries.length,
        rawScore: entry.rawScore,
        scoreLabel: entry.scoreLabel,
        normalizedScore: entry.normalizedScore,
        modelVersion: entry.modelVersion,
        model: entry.model,
        organization: entry.organization,
        releaseDate: entry.releaseDate,
      });
    });
  });

  const records = [...models.values()].map(record => {
    const releaseDates = record.evidence.map(item => item.releaseDate).filter(Boolean).sort();
    const organization = record.evidence
      .sort((left, right) => (SOURCE_PRIORITY[right.sourceId] || 0) - (SOURCE_PRIORITY[left.sourceId] || 0))
      .map(item => item.organization)
      .find(value => value && value !== '未知') || '未知';
    const categoryScores = Object.fromEntries(Object.keys(CATEGORY_LABELS).map(category => {
      const categoryEvidence = record.evidence.filter(item => item.category === category);
      const score = calculateScore(categoryEvidence);
      return [category, score === null ? null : Number(score.toFixed(1))];
    }));
    const score = calculateScore(record.evidence);
    return {
      slug: record.modelKey,
      name: chooseModelName(record.evidence, record.modelKey),
      organization,
      releaseDate: releaseDates.at(-1) || null,
      score: score === null ? null : Number(score.toFixed(1)),
      coverage: Number((100 * record.evidence.length / activeBoards.length).toFixed(1)),
      sourceCount: record.evidence.length,
      operatorCount: new Set(record.evidence.map(item => item.operatorId)).size,
      categoryScores,
      pricing: pricing[record.modelKey] || null,
      evidence: record.evidence.sort((left, right) => left.rank - right.rank),
      ranks: {},
    };
  });

  const buildLeaderboard = (scope, minimumOperators) => records
    .filter(model => {
      if (scope === 'overall') return model.operatorCount >= minimumOperators && model.score !== null;
      return model.categoryScores[scope] !== null;
    })
    .sort((left, right) => {
      const leftScore = scope === 'overall' ? left.score : left.categoryScores[scope];
      const rightScore = scope === 'overall' ? right.score : right.categoryScores[scope];
      return rightScore - leftScore || right.coverage - left.coverage;
    })
    .slice(0, 30)
    .map((model, index) => {
      model.ranks[scope] = index + 1;
      return model;
    });

  const leaderboards = {
    overall: buildLeaderboard('overall', 2),
    general: buildLeaderboard('general', 1),
    code: buildLeaderboard('code', 1),
    agent: buildLeaderboard('agent', 1),
  };
  const visibleSlugs = new Set(Object.values(leaderboards).flat().map(model => model.slug));

  return {
    activeBoards,
    leaderboards: Object.fromEntries(Object.entries(leaderboards).map(([scope, items]) => [
      scope,
      items.map(model => ({
        slug: model.slug,
        name: model.name,
        organization: model.organization,
        releaseDate: model.releaseDate,
        score: scope === 'overall' ? model.score : model.categoryScores[scope],
        coverage: model.coverage,
        sourceCount: model.sourceCount,
        evidenceSources: model.evidence.map(item => item.sourceId),
        pricing: model.pricing,
      })),
    ])),
    models: records.filter(model => visibleSlugs.has(model.slug)).sort((left, right) => (right.score || 0) - (left.score || 0)),
  };
}

function validateSourceBoards(sourceBoards) {
  const problems = [];
  sourceBoards.forEach(board => {
    if (!board.entries.length) problems.push(`${board.label} 没有模型数据`);
    if (board.entries.some(entry => !entry.modelKey || !Number.isFinite(entry.rawScore))) problems.push(`${board.label} 存在无效条目`);
  });
  const activeOperators = new Set(sourceBoards.filter(board => board.status !== 'stale').map(board => board.operatorId));
  if (activeOperators.size < 3) problems.push(`只有 ${activeOperators.size} 个有效独立来源，至少需要 3 个`);
  return problems;
}

function buildOutput(sourceBoards, pricing, existing) {
  const { activeBoards, leaderboards, models } = buildModelData(sourceBoards, pricing);
  const contentFingerprint = sourceBoards.map(board => ({
    id: board.id,
    contentHash: board.contentHash,
    status: board.status,
    updatedAt: board.updatedAt,
  }));
  const dataHash = sha(contentFingerprint);
  const refreshMetadata = buildRefreshMetadata(existing, dataHash, nowISO());
  const operatorCount = new Set(activeBoards.map(board => board.operatorId)).size;

  return {
    schemaVersion: 2,
    ...refreshMetadata,
    dataHash,
    methodology: {
      operatorCount,
      boardCount: activeBoards.length,
      minimumOverallSources: 2,
      note: '各榜先按名次归一化，同一运营方的多张榜单先在组内平均，再计算跨来源共识分。缺榜不扣分，但会降低覆盖率。',
    },
    sourceBoards,
    leaderboards,
    models,
  };
}

async function runCheck(existing) {
  const { boards } = await collectBoards(existing);
  const problems = validateSourceBoards(boards);
  boards.forEach(board => console.log(`  ${board.status === 'live' ? '✓' : '↩'} ${board.label}: ${board.entries.length} 个模型 · ${board.status}`));
  if (problems.length) throw new Error(problems.join('；'));
  console.log(`\n✅ ${new Set(boards.map(board => board.operatorId)).size} 个独立来源、${boards.length} 张榜单均可用`);
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const force = process.argv.includes('--force');
  const existing = existsSync(OUTPUT_PATH) ? JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8')) : null;

  console.log('生成实时模型榜…');
  if (checkOnly) return runCheck(existing);

  const { boards, pricing } = await collectBoards(existing);
  const problems = validateSourceBoards(boards);
  if (problems.length) throw new Error(problems.join('；'));

  const output = buildOutput(boards, pricing, existing);
  if (!shouldWriteArenaOutput(existing, output, force)) {
    console.log('\n⏭ 榜单数据没有变化，跳过写入');
    return;
  }

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`\n✅ 已生成 ${OUTPUT_PATH}`);
  console.log(`   ${output.methodology.operatorCount} 个独立来源 · ${output.methodology.boardCount} 张榜单 · ${output.leaderboards.overall.length} 个总榜模型`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`\n❌ ${error.message}`);
    process.exit(1);
  });
}
