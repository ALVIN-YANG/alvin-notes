import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRefreshMetadata,
  parseArenaTextDataset,
  parseArenaTextEntries,
  shouldWriteArenaOutput,
} from '../scripts/model-arena-core.mjs';

function nextFlightHtml(entries) {
  const payload = `9:${JSON.stringify({ leaderboard: { entries } })}`;
  return `<script>self.__next_f.push([1,${JSON.stringify(payload)}])</script>`;
}

test('Arena official dataset uses only the latest overall snapshot and its publication date', () => {
  const row = { rank: 1n, rating: 1517.17, vote_count: 10083, model_name: 'Example Model (High)', organization: 'Example', category: 'overall', leaderboard_publish_date: '2026-10-22' };
  const board = parseArenaTextDataset([
    { ...row, category: 'coding', rating: 9999 },
    { ...row, leaderboard_publish_date: '2026-10-20', rating: 2000 },
    row,
  ]);
  assert.equal(board.updatedAt, '2026-10-22T00:00:00.000Z');
  assert.deepEqual(board.entries, [{ rank: 1, rating: 1517.17, votes: 10083, modelDisplayName: 'Example Model (High)', modelOrganization: 'Example' }]);
});

test('Arena official dataset rejects missing overall data, invalid dates and incomplete scores', () => {
  const row = { rank: 1, rating: 1500, vote_count: 10, model_name: 'Example Model', organization: 'Example', category: 'overall', leaderboard_publish_date: '2026-10-22' };
  for (const rows of [[], [{ ...row, category: 'coding' }], [{ ...row, leaderboard_publish_date: '' }], [{ ...row, rating: null }], [{ ...row, model_name: '' }]]) {
    assert.throws(() => parseArenaTextDataset(rows), /Arena/);
  }
});

test('Arena parser accepts the current entry shape with modelKey', () => {
  const entries = parseArenaTextEntries(nextFlightHtml([{
    rank: 1,
    rankUpper: 1,
    rankLower: 2,
    modelKey: 'example-model-text',
    modelDisplayName: 'example-model',
    rating: 1500.5,
    ratingUpper: 1502,
    ratingLower: 1499,
    votes: 99,
    modelOrganization: 'Example',
  }]));

  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], {
    rank: 1,
    modelDisplayName: 'example-model',
    rating: 1500.5,
    votes: 99,
    modelOrganization: 'Example',
  });
});

test('refresh metadata separates the last check from the last content change', () => {
  const metadata = buildRefreshMetadata({
    dataHash: 'same',
    updatedAtISO: '2026-08-14T00:00:00.000Z',
  }, 'same', '2026-08-16T00:00:00.000Z');

  assert.equal(metadata.checkedAtISO, '2026-08-16T00:00:00.000Z');
  assert.equal(metadata.checkedAt, '2026/08/16 08:00');
  assert.equal(metadata.updatedAtISO, '2026-08-14T00:00:00.000Z');
  assert.equal(metadata.updatedAt, '2026/08/14 08:00');
});

test('unchanged data is written once per Shanghai calendar day', () => {
  const existing = {
    schemaVersion: 2,
    dataHash: 'same',
    checkedAtISO: '2026-08-15T16:30:00.000Z',
  };

  assert.equal(shouldWriteArenaOutput(existing, {
    schemaVersion: 2,
    dataHash: 'same',
    checkedAtISO: '2026-08-16T01:00:00.000Z',
  }), false);
  assert.equal(shouldWriteArenaOutput(existing, {
    schemaVersion: 2,
    dataHash: 'same',
    checkedAtISO: '2026-08-16T16:30:00.000Z',
  }), true);
  assert.equal(shouldWriteArenaOutput(existing, {
    schemaVersion: 2,
    dataHash: 'changed',
    checkedAtISO: '2026-08-16T01:00:00.000Z',
  }), true);
});
