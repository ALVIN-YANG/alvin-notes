const novelty = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Fred|Good News|Jester|Junior|Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)(?:\s*\(|$)/iu;
const normalizeLanguage = language => String(language || '').replace(/_/gu, '-').toLowerCase();

export function chooseSpeechVoice(voices = [], language = 'en-US') {
  const requested = normalizeLanguage(language);
  const family = requested.split('-')[0];
  const eligible = voices.filter(voice => {
    const locale = normalizeLanguage(voice.lang);
    if (locale.split('-')[0] !== family || novelty.test(voice.name)) return false;
    // A Mandarin article should not fall back to a Cantonese voice.
    return family !== 'zh' || !/-hk\b/u.test(locale) || /-hk\b/u.test(requested);
  });
  const exact = voice => normalizeLanguage(voice.lang) === requested;
  const natural = voice => /Natural|Neural|Premium|Enhanced|Siri|自然|优质|增强|Google.*(?:English|普通话|中文)/iu.test(`${voice.name} ${voice.voiceURI || ''}`);
  const standard = voice => family === 'en'
    ? /\b(Samantha|Alex|Daniel|Karen|Moira|Tessa|Rishi|David|Zira|Mark)\b/iu.test(voice.name)
    : family === 'zh' && /Ting[- ]?ting|Lili|Mei[- ]?jia|Huihui|Yaoyao|Kangkang|Hanhan|婷婷|丽丽|美嘉|慧慧|瑶瑶|康康|涵涵/iu.test(voice.name);

  return eligible.find(voice => exact(voice) && natural(voice)) || eligible.find(natural)
    || eligible.find(voice => exact(voice) && voice.default) || eligible.find(voice => exact(voice) && standard(voice))
    || eligible.find(standard) || eligible.find(voice => voice.default) || eligible.find(exact) || eligible[0] || null;
}
