export function formatChineseTime(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function parseNextFlightPayloads(html) {
  const payloads = [];
  const pattern = /self\.__next_f\.push\((\[\s*1\s*,\s*"(?:\\[\s\S]|[^"\\])*"\s*\])\)/g;

  for (const match of html.matchAll(pattern)) {
    try {
      const args = JSON.parse(match[1]);
      if (args[0] === 1 && typeof args[1] === 'string') payloads.push(args[1]);
    } catch {
      // Ignore unrelated or incomplete Next Flight chunks.
    }
  }

  return payloads;
}

function extractJsonArray(text, startIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === '[') {
      depth += 1;
    } else if (character === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(startIndex, index + 1);
    }
  }

  return null;
}

function normalizeArenaEntries(value) {
  if (!Array.isArray(value)) return [];

  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return [];
    const rank = Number(entry.rank);
    const rating = Number(entry.rating);
    const votes = Number(entry.votes);
    if (!Number.isFinite(rank) || !Number.isFinite(rating) || !Number.isFinite(votes)) return [];
    if (typeof entry.modelDisplayName !== 'string' || typeof entry.modelOrganization !== 'string') return [];

    return [{
      rank,
      modelDisplayName: entry.modelDisplayName,
      rating,
      votes,
      modelOrganization: entry.modelOrganization,
    }];
  });
}

export function parseArenaTextEntries(html) {
  let bestEntries = [];

  for (const payload of parseNextFlightPayloads(html)) {
    const entriesPattern = /"entries"\s*:/g;
    for (const match of payload.matchAll(entriesPattern)) {
      const arrayStart = payload.indexOf('[', match.index + match[0].length);
      if (arrayStart === -1) continue;
      const arrayText = extractJsonArray(payload, arrayStart);
      if (!arrayText) continue;

      try {
        const entries = normalizeArenaEntries(JSON.parse(arrayText));
        if (entries.length > bestEntries.length) bestEntries = entries;
      } catch {
        // Keep scanning because a payload may contain several entries arrays.
      }
    }
  }

  return bestEntries;
}

export function parseArenaTextDataset(rows) {
  const overall = rows.filter(row => row.category === 'overall');
  if (!overall.length) throw new Error('Arena 官方数据集缺少 overall 分类');
  const dates = overall.map(row => row.leaderboard_publish_date);
  if (dates.some(date => typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)))) {
    throw new Error('Arena 官方数据集缺少有效的发布日期');
  }
  const latestDate = dates.sort().at(-1);
  const latestRows = overall
    .filter(row => row.leaderboard_publish_date === latestDate)
    .map(row => ({ ...row, rank: typeof row.rank === 'bigint' ? Number(row.rank) : row.rank }));
  if (latestRows.some(row =>
    ![row.rank, row.rating, row.vote_count].every(value => typeof value === 'number' && Number.isFinite(value)) ||
    !Number.isSafeInteger(row.rank) || row.rank < 1 || row.vote_count < 0 ||
    typeof row.model_name !== 'string' || !row.model_name.trim() || typeof row.organization !== 'string'
  )) throw new Error('Arena 官方数据集存在无效的模型成绩');

  return {
    updatedAt: `${latestDate}T00:00:00.000Z`,
    entries: latestRows.map(row => ({
      rank: row.rank,
      rating: row.rating,
      votes: row.vote_count,
      modelDisplayName: row.model_name,
      modelOrganization: row.organization,
    })),
  };
}

export function buildRefreshMetadata(existing, dataHash, checkedAtISO = new Date().toISOString()) {
  const hasStableUpdateTime = existing?.dataHash === dataHash && Number.isFinite(Date.parse(existing?.updatedAtISO || ''));
  const updatedAtISO = hasStableUpdateTime ? existing.updatedAtISO : checkedAtISO;
  return {
    checkedAt: formatChineseTime(checkedAtISO),
    checkedAtISO,
    updatedAt: formatChineseTime(updatedAtISO),
    updatedAtISO,
  };
}

function shanghaiDate(value) {
  const timestamp = Date.parse(value || '');
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));
}

export function shouldWriteArenaOutput(existing, output, force = false) {
  if (force || !existing) return true;
  if (existing.schemaVersion !== output.schemaVersion || existing.dataHash !== output.dataHash) return true;

  const previousCheckDate = shanghaiDate(existing.checkedAtISO);
  const currentCheckDate = shanghaiDate(output.checkedAtISO);
  return !previousCheckDate || !currentCheckDate || previousCheckDate !== currentCheckDate;
}
