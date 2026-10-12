import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseSpeechVoice } from '../src/lib/speech-voices.mjs';

test('localized Mac character voices are excluded for every language', () => {
  const normal = { name: '婷婷', lang: 'zh-CN' };
  const character = { name: 'Flo (中文（中国大陆）)', lang: 'zh-CN', default: true };
  assert.equal(chooseSpeechVoice([character, normal], 'zh-CN'), normal);
  assert.equal(chooseSpeechVoice([character], 'zh-CN'), null);
});

test('Mandarin voices do not fall back to Cantonese, and premium voice URIs are recognized', () => {
  const cantonese = { name: 'Sin-ji', lang: 'zh-HK', default: true };
  const standard = { name: '婷婷', lang: 'zh-CN' };
  const premium = { name: '婷婷', voiceURI: 'com.apple.voice.premium.zh-CN.Tingting', lang: 'zh-CN' };
  assert.equal(chooseSpeechVoice([cantonese], 'zh-CN'), null);
  assert.equal(chooseSpeechVoice([cantonese, standard, premium], 'zh-CN'), premium);
  assert.equal(chooseSpeechVoice([cantonese], 'zh-HK'), cantonese);
});

test('language codes are normalized while preserving regional preferences', () => {
  const us = { name: 'Microsoft Zira', lang: 'en_US' };
  const british = { name: 'Daniel', lang: 'en-GB' };
  assert.equal(chooseSpeechVoice([british, us], 'en-US'), us);
  assert.equal(chooseSpeechVoice([us, british], 'en-GB'), british);
  assert.equal(chooseSpeechVoice([], 'zh-CN'), null);
});
