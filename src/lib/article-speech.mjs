const excludedContent = [
  'pre', 'figure', 'svg', 'script', 'style', 'nav', 'button', 'input', 'select', 'textarea',
  'sup', '.sl-anchor-link', '.sr-only', '.not-content', '.comments',
  '[hidden]', '[aria-hidden="true"]', '[data-footnotes]', '[data-pagefind-ignore]', '[data-reader-ignore]',
  'details:not([open])',
].join(',');

const blockTags = new Set([
  'P', 'DIV', 'SECTION', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'TR', 'DT', 'DD',
]);

function readingText(node) {
  if (node.nodeType === 3) return node.textContent || '';
  if (node.nodeType !== 1) return '';
  if (node.tagName === 'BR') return '\n';

  let text = [...node.childNodes].map(readingText).join('');
  if (node.tagName === 'TD' || node.tagName === 'TH') return `${text}，`;
  if (node.tagName === 'TR') text = text.replace(/，\s*$/u, '。');
  return blockTags.has(node.tagName) ? `\n${text}\n` : text;
}

export function splitSpeechText(text) {
  const characters = [...text.replace(/\s+/g, ' ').trim()];
  const chunks = [];
  const limit = 120;

  while (characters.length > limit) {
    const head = characters.slice(0, limit);
    let cut = head.findLastIndex(character => /[。！？!?；;]/u.test(character)) + 1;
    if (!cut) {
      const pause = head.findLastIndex(character => /[，,\s]/u.test(character)) + 1;
      cut = pause >= limit / 2 ? pause : limit;
    }
    const chunk = characters.splice(0, cut).join('').trim();
    if (chunk) chunks.push(chunk);
  }

  const remainder = characters.join('').trim();
  if (remainder) chunks.push(remainder);
  return chunks;
}

export function getArticleSpeechChunks(article, title = '') {
  const copy = article.cloneNode(true);
  copy.querySelectorAll(excludedContent).forEach(node => node.remove());
  const paragraphs = readingText(copy).split('\n').map(text => text.trim()).filter(Boolean);
  return [title, ...paragraphs].flatMap(splitSpeechText);
}

export function mountArticleReader(root) {
  const document = root.ownerDocument;
  const view = document.defaultView;
  const article = document.querySelector(root.dataset.readerContent || 'main .sl-markdown-content');
  const toggle = root.querySelector('[data-reader-toggle]');
  const label = root.querySelector('[data-reader-label]');
  const stopButton = root.querySelector('[data-reader-stop]');
  const status = root.querySelector('[data-reader-status]');

  root.hidden = true;
  if (!view?.speechSynthesis || !view.SpeechSynthesisUtterance || !article
    || !toggle || !label || !stopButton || !status
    || !getArticleSpeechChunks(article).length) return () => {};

  const synth = view.speechSynthesis;
  const controller = new view.AbortController();
  const signal = controller.signal;
  let state = 'idle';
  let chunks = [];
  let index = 0;
  let generation = 0;
  // Keep a reference until completion; some speech engines need this.
  let currentUtterance = null;

  function announce(message, error = false) {
    status.textContent = message;
    status.classList.toggle('sr-only', !error);
  }

  function setState(next) {
    state = next;
    root.dataset.state = next;
    label.textContent = next === 'playing' ? '暂停' : next === 'paused' ? '继续' : '朗读';
    toggle.setAttribute('aria-label', next === 'idle' ? '朗读文章' : `${label.textContent}朗读`);
    stopButton.hidden = next === 'idle';
  }

  function stop(message = '') {
    const active = state !== 'idle';
    generation++;
    currentUtterance = null;
    chunks = [];
    index = 0;
    if (active) synth.cancel();
    setState('idle');
    announce(message);
  }

  function speakNext() {
    if (state !== 'playing') return;
    if (index >= chunks.length) {
      stop('朗读结束');
      return;
    }

    const run = generation;
    const utterance = new view.SpeechSynthesisUtterance(chunks[index]);
    // Leave voice/rate/pitch unset: use the browser's defaults for the page language.
    utterance.lang = document.documentElement.lang || 'zh-CN';
    currentUtterance = utterance;
    utterance.onend = () => {
      if (run !== generation || currentUtterance !== utterance) return;
      currentUtterance = null;
      index++;
      if (index >= chunks.length) stop('朗读结束');
      else speakNext();
    };
    utterance.onerror = event => {
      if (run !== generation || currentUtterance !== utterance) return;
      stop();
      const message = event.error === 'not-allowed'
        ? '浏览器未允许朗读，请再次点击或检查网站权限。'
        : '朗读暂不可用，请检查浏览器或系统的语音设置。';
      announce(message, true);
    };

    try {
      synth.speak(utterance);
    } catch {
      stop();
      announce('朗读暂不可用，请检查浏览器或系统的语音设置。', true);
    }
  }

  toggle.addEventListener('click', () => {
    if (state === 'playing') {
      setState('paused');
      announce('已暂停朗读');
      synth.pause();
    } else if (state === 'paused') {
      setState('playing');
      announce('继续朗读');
      synth.resume();
      if (!currentUtterance) speakNext();
    } else {
      chunks = getArticleSpeechChunks(article, document.getElementById('_top')?.textContent || '');
      if (!chunks.length) return;
      generation++;
      synth.cancel();
      synth.resume();
      index = 0;
      setState('playing');
      announce('开始朗读');
      speakNext();
    }
  }, { signal });

  stopButton.addEventListener('click', () => stop('已停止朗读'), { signal });
  view.addEventListener('pagehide', () => stop(), { signal });
  root.hidden = false;
  setState('idle');

  return () => {
    controller.abort();
    stop();
    root.hidden = true;
  };
}
