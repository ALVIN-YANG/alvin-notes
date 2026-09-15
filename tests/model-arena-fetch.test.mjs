import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EPOCH_BOARD_DEFINITIONS,
  buildBoardFromRows,
  resolveEpochArchiveFile,
} from '../scripts/fetch-model-arena.mjs';

test('Epoch ECI accepts the current nested file path and column names', () => {
  const definition = EPOCH_BOARD_DEFINITIONS.find(board => board.id === 'epoch-eci');
  const archive = {
    'epoch_capabilities_index/eci_scores.csv': new Uint8Array([1]),
  };

  assert.equal(resolveEpochArchiveFile(archive, definition), 'epoch_capabilities_index/eci_scores.csv');

  const board = buildBoardFromRows([
    {
      Model: 'GPT-6 Astra',
      'Display name': 'GPT-6 Astra',
      eci: '166.31',
      date: '2026-09-03',
      Organization: 'OpenAI',
    },
    {
      Model: 'Qwen 3.8 Max',
      'Display name': 'Qwen 3.8 Max',
      eci: '156.62',
      date: '2026-08-02',
      Organization: 'Alibaba',
    },
  ], definition, '2026-09-15T00:00:00.000Z');

  assert.equal(board.entries.length, 2);
  assert.equal(board.entries[0].model, 'GPT-6 Astra');
  assert.equal(board.entries[0].rawScore, 166.31);
  assert.equal(board.entries[0].releaseDate, '2026-09-03');
  assert.equal(board.entries[1].modelKey, 'qwen3.8');
});

test('Epoch ECI keeps compatibility with the previous flat file and columns', () => {
  const definition = EPOCH_BOARD_DEFINITIONS.find(board => board.id === 'epoch-eci');
  const archive = {
    'epoch_capabilities_index.csv': new Uint8Array([1]),
  };

  assert.equal(resolveEpochArchiveFile(archive, definition), 'epoch_capabilities_index.csv');

  const board = buildBoardFromRows([{
    'Model version': 'gpt-5',
    'Display name': 'GPT-5',
    'ECI Score': '140.5',
    'Release date': '2025-08-07',
    Organization: 'OpenAI',
  }], definition, '2026-09-15T00:00:00.000Z');

  assert.equal(board.entries.length, 1);
  assert.equal(board.entries[0].rawScore, 140.5);
  assert.equal(board.entries[0].releaseDate, '2025-08-07');
});
