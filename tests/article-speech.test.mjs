import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { getArticleSpeechChunks, mountArticleReader, splitSpeechText } from '../src/lib/article-speech.mjs';

function fixture(t, { supported = true, body = '<p>这是正文。</p>', contentSelector } = {}) {
  const dom = new JSDOM(`<html lang="zh-CN"><body><main>
    <h1 id="_top">文章标题</h1>
    <article-reader hidden>
      <button data-reader-toggle><span data-reader-label>朗读</span></button>
      <button data-reader-stop hidden>停止</button>
      <span class="sr-only" data-reader-status></span>
    </article-reader>
    <div class="sl-markdown-content">${body}</div>
  </main></body></html>`);
  const calls = [];
  const counts = { cancel: 0, pause: 0, resume: 0 };
  if (supported) {
    dom.window.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text; this.voice = null; }
    };
    dom.window.speechSynthesis = {
      speak: utterance => calls.push(utterance),
      cancel: () => counts.cancel++,
      pause: () => counts.pause++,
      resume: () => counts.resume++,
    };
  }
  const root = dom.window.document.querySelector('article-reader');
  if (contentSelector) root.dataset.readerContent = contentSelector;
  const dispose = mountArticleReader(root);
  t.after(() => { dispose(); dom.window.close(); });
  return {
    dom, root, calls, counts, dispose,
    toggle: root.querySelector('[data-reader-toggle]'),
    stop: root.querySelector('[data-reader-stop]'),
    status: root.querySelector('[data-reader-status]'),
  };
}

test('extracts prose in order without code, navigation helpers, footnotes or controls', t => {
  const { dom } = fixture(t, { body: `
    <h2>小节<a class="sl-anchor-link"><span class="sr-only">Section titled 小节</span>#</a></h2>
    <p>这是<a href="https://example.com">链接文字</a>，有 <code>RAG</code>。<sup>1</sup></p>
    <blockquote><p>一段引用。</p></blockquote>
    <ul><li><p>第一项</p><ul><li>子项</li></ul></li><li>第二项</li></ul>
    <table><tr><th>场景</th><th>结果</th></tr><tr><td>在线</td><td>成功</td></tr></table>
    <pre>不要朗读代码</pre><figure><svg><text>图中文字</text></svg></figure>
    <div class="not-content">交互组件</div><button>复制</button><p hidden>隐藏文字</p>
    <section data-footnotes><p>脚注来源</p></section>
    <section class="comments"><p>评论</p></section>
    <details><summary>折叠配置</summary><p>关闭的配置</p></details>
    <details open><summary>展开说明</summary><p>可见说明。</p></details>` });
  const chunks = getArticleSpeechChunks(dom.window.document.querySelector('.sl-markdown-content'), '标题');
  assert.deepEqual(chunks, [
    '标题', '小节', '这是链接文字，有 RAG。', '一段引用。',
    '第一项', '子项', '第二项', '场景，结果。', '在线，成功。', '展开说明', '可见说明。',
  ]);
});

test('splits long text into bounded chunks without splitting Unicode characters', () => {
  const text = `${'这是一个句子。'.repeat(40)}${'🙂'.repeat(150)}`;
  const chunks = splitSpeechText(text);
  assert(chunks.length > 1);
  assert(chunks.every(chunk => [...chunk].length <= 120));
  assert.equal(chunks.join(''), text);
  assert.deepEqual(splitSpeechText('   '), []);
});

test('starts only on click, uses the default voice, pauses, resumes and finishes', t => {
  const { root, calls, counts, toggle, stop } = fixture(t);
  assert.equal(root.hidden, false);
  assert.equal(calls.length, 0);
  toggle.click();
  assert.equal(root.dataset.state, 'playing');
  assert.equal(toggle.textContent, '暂停');
  assert.equal(stop.hidden, false);
  assert.equal(calls[0].text, '文章标题');
  assert.equal(calls[0].lang, 'zh-CN');
  assert.equal(calls[0].voice, null);
  toggle.click();
  assert.equal(root.dataset.state, 'paused');
  assert.equal(counts.pause, 1);
  toggle.click();
  assert.equal(root.dataset.state, 'playing');
  assert.equal(counts.resume, 2);
  calls[0].onend();
  assert.equal(calls[1].text, '这是正文。');
  calls[1].onend();
  assert.equal(root.dataset.state, 'idle');
  assert.equal(stop.hidden, true);
});

test('handles pausing at a chunk boundary without skipping the next chunk', t => {
  const { root, toggle, calls } = fixture(t);
  toggle.click();
  toggle.click();
  calls[0].onend();
  assert.equal(calls.length, 1);
  assert.equal(root.dataset.state, 'paused');
  toggle.click();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].text, '这是正文。');
});

test('stop invalidates delayed callbacks; restarting begins with the title', t => {
  const { root, calls, counts, toggle, stop } = fixture(t);
  toggle.click();
  const stale = calls[0];
  stop.click();
  assert.equal(root.dataset.state, 'idle');
  assert.equal(counts.cancel, 2);
  toggle.click();
  stale.onend();
  stale.onerror({ error: 'canceled' });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].text, '文章标题');
  assert.equal(root.dataset.state, 'playing');
});

test('speech failures return to idle and show an actionable message', t => {
  const { root, calls, toggle, status, stop } = fixture(t);
  toggle.click();
  calls[0].onerror({ error: 'language-unavailable' });
  assert.equal(root.dataset.state, 'idle');
  assert.equal(stop.hidden, true);
  assert.equal(status.classList.contains('sr-only'), false);
  assert.match(status.textContent, /语音设置/);
  toggle.click();
  assert.equal(status.classList.contains('sr-only'), true);
  assert.equal(root.dataset.state, 'playing');
});

test('navigation and teardown stop speech and remove click handlers', t => {
  const { dom, root, calls, counts, toggle, dispose } = fixture(t);
  toggle.click();
  dom.window.dispatchEvent(new dom.window.Event('pagehide'));
  assert.equal(root.dataset.state, 'idle');
  assert.equal(counts.cancel, 2);
  toggle.click();
  dispose();
  assert.equal(root.hidden, true);
  assert.equal(counts.cancel, 4);
  const previousCalls = calls.length;
  toggle.click();
  assert.equal(calls.length, previousCalls);
});

test('unsupported browsers and pages without prose keep controls hidden', t => {
  const unsupported = fixture(t, { supported: false });
  assert.equal(unsupported.root.hidden, true);
  unsupported.toggle.click();
  assert.equal(unsupported.calls.length, 0);
  const empty = fixture(t, { body: '<pre>code only</pre>' });
  assert.equal(empty.root.hidden, true);
});

test('custom report content excludes archives and decorative section numbers', t => {
  const { calls, toggle } = fixture(t, {
    contentSelector: '.report-sections',
    body: '<nav>往期周报</nav><div class="report-sections"><h2><span data-reader-ignore>01</span>本期主线</h2><p>周报正文。</p></div><p>下一期</p>',
  });
  toggle.click();
  calls[0].onend();
  assert.equal(calls[1].text, '本期主线');
  calls[1].onend();
  assert.equal(calls[2].text, '周报正文。');
  calls[2].onend();
  assert.equal(calls.length, 3);
});
