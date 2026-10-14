import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountInterviewBank } from '../src/lib/interview-bank.mjs';

function setup(t, query = '?module=ai-agent', { saved, storageBlocked = false } = {}) {
  const items = [['agent','one','basic','ai-agent',['Tool','RAG']],['agent','two','advanced','ai-agent',['Trace']],['infra','three','basic','models',['KV cache']],['agent','four','advanced','system-design',['Tool','Agent']]];
  const dom = new JSDOM(`<html lang="zh-CN"><body><div data-interview-bank>
    <select data-ib-module-select>${['all','product','fundamentals','system-design','ai-agent','models','reliability','delivery'].map(id=>`<option value="${id}">${id}</option>`).join('')}</select>
    <input data-ib-search><button data-ib-level=""></button><button data-ib-level="advanced"></button>
    ${items.map(([track,id,level,module,tags],index)=>`<div data-ib-question data-id="interview/${track}/${id}" data-track="${track}" data-module="${module}" data-level="${level}" data-search="${id} ${tags.join(' ').toLowerCase()}" data-panel="panel-${index}"><a href="/old/${id}/"><span data-ib-number></span>${id}</a></div>`).join('')}
    <span data-ib-position></span><span data-ib-count></span><div data-ib-empty hidden><p data-ib-empty-message></p></div><button data-ib-reset></button>
    <button data-ib-prev></button><button data-ib-next></button><div data-ib-scroll tabindex="0">
    ${items.map(([,id],index)=>`<article id="panel-${index}" data-ib-answer><h2>${id}</h2><p>${id} 的答案。</p><details data-reader-ignore><summary>资料</summary><p>不朗读资料。</p></details></article>`).join('')}
    </div><p data-ib-reading-empty></p><div data-ib-reader hidden><button data-reader-toggle><span data-reader-label></span></button><button data-reader-stop></button><span data-reader-status></span></div>
    </div></body></html>`, {url:`https://example.com/interview/${query}`});
  const doc = dom.window.document;
  if (saved !== undefined) dom.window.localStorage.setItem('alvin:interview-progress:v1', saved);
  if (storageBlocked) Object.defineProperty(dom.window, 'localStorage', { get() { throw new Error('Storage disabled'); } });
  const utterances = [];
  const calls = {cancel:0,pause:0,resume:0};
  dom.window.SpeechSynthesisUtterance = class {constructor(text){this.text=text;}};
  dom.window.speechSynthesis = {getVoices:()=>[], speak:u=>utterances.push(u), cancel:()=>calls.cancel++,pause:()=>calls.pause++,resume:()=>calls.resume++};
  const scroll=doc.querySelector('[data-ib-scroll]');
  scroll.scrollBy=({top})=>{scroll.scrollTop+=top;};
  const root=doc.querySelector('[data-interview-bank]');
  const cleanup=mountInterviewBank(root);
  t.after(()=>{cleanup();dom.window.close();});
  const key=(key, target=doc.body, options={})=>target.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options}));
  const active=()=>doc.querySelector('[data-ib-answer]:not([hidden])')?.id;
  return {dom,doc,root,scroll,key,active,utterances,calls,cleanup};
}

test('selects a linked question and switches inline without navigating away',t=>{
  const f=setup(t,'?track=agent&question=two');
  assert.equal(f.active(),'panel-1');
  f.key('ArrowLeft');
  assert.equal(f.active(),'panel-0');
  assert.equal(new URL(f.dom.window.location.href).searchParams.get('question'),'one');
  const event=new f.dom.window.MouseEvent('click',{bubbles:true,cancelable:true,button:0});
  f.doc.querySelector('[data-id="interview/agent/two"] a').dispatchEvent(event);
  assert.equal(event.defaultPrevented,true);
  assert.equal(f.active(),'panel-1');
  assert.equal(f.dom.window.location.pathname,'/interview/');
});

test('keyboard navigation stays within filtered results and handles an empty list',t=>{
  const f=setup(t);
  f.key('ArrowLeft');assert.equal(f.active(),'panel-0');
  f.key('ArrowRight');f.key('ArrowRight');assert.equal(f.active(),'panel-1');
  f.doc.querySelector('[data-ib-level="advanced"]').click();
  assert.equal(f.doc.querySelector('[data-ib-position]').textContent,'1 / 1');
  f.key('ArrowLeft');assert.equal(f.active(),'panel-1');
  const search=f.doc.querySelector('[data-ib-search]');
  search.value='missing';search.dispatchEvent(new f.dom.window.Event('input'));
  assert.equal(f.active(),undefined);assert.equal(f.root.querySelector('[data-ib-empty]').hidden,false);
  f.key('ArrowRight');
  f.doc.querySelector('[data-ib-reset]').click();assert.equal(f.active(),'panel-0');
});

test('arrow keys scroll the answer and shortcuts leave typing, composition and dialogs alone',t=>{
  const f=setup(t);
  f.key('ArrowDown');assert.equal(f.scroll.scrollTop,80);
  f.key('ArrowUp');assert.equal(f.scroll.scrollTop,0);
  f.key('ArrowRight',f.doc.querySelector('input'));assert.equal(f.active(),'panel-0');
  f.key('ArrowRight',f.doc.body,{isComposing:true});assert.equal(f.active(),'panel-0');
  f.key('ArrowRight',f.doc.body,{metaKey:true});assert.equal(f.active(),'panel-0');
  const dialog=f.doc.createElement('dialog');dialog.setAttribute('open','');f.doc.body.append(dialog);
  f.key('ArrowRight');assert.equal(f.active(),'panel-0');
});

test('R plays only the selected question, pauses and resumes; Esc stops it',t=>{
  const f=setup(t);
  f.key('r');assert.equal(f.utterances[0].text,'one');
  f.key('r');assert.equal(f.root.querySelector('[data-ib-reader]').dataset.state,'paused');
  f.key('r');assert.equal(f.root.querySelector('[data-ib-reader]').dataset.state,'playing');
  f.key('Escape');assert.equal(f.root.querySelector('[data-ib-reader]').dataset.state,'idle');
  assert.equal(f.calls.pause,1);assert(f.calls.cancel>=2);
});

test('switching questions stops speech and ignores callbacks from the old question',t=>{
  const f=setup(t);
  f.key('r');const old=f.utterances[0];
  f.scroll.scrollTop=200;
  f.key('ArrowRight');assert.equal(f.scroll.scrollTop,0);
  assert.equal(f.root.querySelector('[data-ib-reader]').dataset.state,'idle');
  old.onend();assert.equal(f.utterances.length,1);
  f.key('r');assert.equal(f.utterances[1].text,'two');
  old.onerror({error:'canceled'});assert.equal(f.root.querySelector('[data-ib-reader]').dataset.state,'playing');
});

test('reopening restores the question, filter and scroll without restarting speech', t => {
  const first=setup(t);
  first.key('ArrowRight');
  first.doc.querySelector('[data-ib-level="advanced"]').click();
  first.scroll.scrollTop=240;
  first.dom.window.dispatchEvent(new first.dom.window.Event('pagehide'));
  const saved=first.dom.window.localStorage.getItem('alvin:interview-progress:v1');
  const reopened=setup(t,'',{saved});
  assert.equal(reopened.active(),'panel-1');
  assert.equal(reopened.scroll.scrollTop,240);
  assert.equal(reopened.doc.querySelector('[data-ib-level="advanced"]').getAttribute('aria-pressed'),'true');
  assert.equal(reopened.utterances.length,0);
});

test('each module and question keeps its own reading position', t => {
  const f=setup(t);
  f.scroll.scrollTop=120;
  f.key('ArrowRight');
  f.scroll.scrollTop=260;
  chooseModule(f, 'models');
  assert.equal(f.active(),'panel-2');
  assert.equal(f.scroll.scrollTop,0);
  f.scroll.scrollTop=80;
  chooseModule(f, 'ai-agent');
  assert.equal(f.active(),'panel-1');
  assert.equal(f.scroll.scrollTop,260);
  f.key('ArrowLeft');assert.equal(f.scroll.scrollTop,120);
  chooseModule(f, 'models');
  assert.equal(f.scroll.scrollTop,80);
});

test('an explicit link overrides cached module, question and filters', t => {
  const first=setup(t);
  chooseModule(first, 'models');
  first.cleanup();
  const saved=first.dom.window.localStorage.getItem('alvin:interview-progress:v1');
  const linked=setup(t,'?track=agent&question=two',{saved});
  assert.equal(linked.active(),'panel-1');
  assert.equal(linked.doc.querySelector('[data-ib-count]').textContent,'2 题');
});

test('invalid or unavailable storage does not break reading', t => {
  for (const options of [{saved:'invalid JSON'},{saved:JSON.stringify({version:1,track:'bad',lastQuestions:{agent:'deleted'},positions:{'interview/agent/one':-100}})},{storageBlocked:true}]) {
    const f=setup(t,'',options);
    assert.equal(f.active(),'panel-0');
    assert.equal(f.scroll.scrollTop,0);
    f.key('ArrowRight');assert.equal(f.active(),'panel-1');
  }
});

function chooseModule(f, value) {
  const select = f.doc.querySelector('[data-ib-module-select]');
  select.value = value;
  select.dispatchEvent(new f.dom.window.Event('change'));
}

function searchFor(f, value) {
  const input = f.doc.querySelector('[data-ib-search]');
  input.value = value;
  input.dispatchEvent(new f.dom.window.Event('input'));
}

test('the only dropdown has seven categories plus all; tags remain searchable', t => {
  const f = setup(t, '?module=all');
  assert.equal(f.doc.querySelectorAll('select').length, 1);
  assert.equal(f.doc.querySelector('[data-ib-module-select]').options.length, 8);
  assert.equal(f.doc.querySelector('[data-ib-count]').textContent, '4 题');
  searchFor(f, 'tool');
  assert.equal(f.doc.querySelector('[data-ib-count]').textContent, '2 题');
  f.key('ArrowRight');assert.equal(f.active(), 'panel-3');
  assert.equal(f.doc.querySelector('[data-id="interview/agent/four"] [data-ib-number]').textContent, '02');
  f.doc.querySelector('[data-ib-level="advanced"]').click();
  assert.equal(f.doc.querySelector('[data-ib-count]').textContent, '1 题');
  f.doc.querySelector('[data-ib-reset]').click();
  assert.equal(f.doc.querySelector('[data-ib-count]').textContent, '4 题');
  const url = new URL(f.dom.window.location.href);
  assert.equal(url.searchParams.has('topic'), false);
  assert.equal(url.searchParams.has('tag'), false);
});

test('legacy deep links follow a question into its new module and normalize the URL', t => {
  const f = setup(t, '?track=agent&question=four');
  assert.equal(f.active(), 'panel-3');
  const url = new URL(f.dom.window.location.href);
  assert.equal(url.searchParams.get('module'), 'system-design');
  assert.equal(url.searchParams.has('track'), false);
  assert.equal(f.doc.querySelector('[data-ib-count]').textContent, '1 题');
  const infra = setup(t, '?track=infra');
  assert.equal(infra.active(), 'panel-2');
  assert.equal(new URL(infra.dom.window.location.href).searchParams.get('module'), 'models');
});

test('legacy reading progress migrates by stable question ID without replaying speech', t => {
  const saved = JSON.stringify({version:1,track:'agent',level:'',query:'',lastQuestions:{agent:'interview/agent/four'},positions:{'interview/agent/four':210}});
  const f = setup(t, '', {saved});
  assert.equal(f.active(), 'panel-3');
  assert.equal(f.scroll.scrollTop, 210);
  assert.equal(f.utterances.length, 0);
  const updated = JSON.parse(f.dom.window.localStorage.getItem('alvin:interview-progress:v1'));
  assert.equal(updated.version, 3);
  assert.equal(updated.module, 'system-design');
  assert.equal(updated.positions['interview/agent/four'], 210);
});

test('an empty ability module is explicit and cannot navigate or start speech', t => {
  const f = setup(t);
  f.key('r');
  const before = f.calls.cancel;
  chooseModule(f, 'product');
  assert.equal(f.active(), undefined);
  assert.equal(f.doc.querySelector('[data-ib-count]').textContent, '0 题');
  assert.match(f.doc.querySelector('[data-ib-reading-empty]').textContent, /暂未收录独立题目/);
  assert(f.calls.cancel > before);
  assert.equal(f.doc.querySelector('[data-ib-reader]').hidden, true);
  f.key('ArrowRight'); f.key('r');
  assert.equal(f.active(), undefined);
  chooseModule(f, 'ai-agent');
  assert.equal(f.active(), 'panel-0');
});

test('previous topic progress restores the active question and clears removed filters', t => {
  const saved = JSON.stringify({
    version:2,module:'ai-agent',topic:'ai-api',tag:'RAG',level:'',query:'',
    lastQuestions:{'ai-agent:ai-api':'interview/agent/one','ai-agent:ai-runtime':'interview/agent/two','models:':'interview/infra/three'},
    positions:{'interview/agent/one':120,'interview/agent/two':340},
  });
  const f = setup(t, '', {saved});
  assert.equal(f.active(), 'panel-0');
  assert.equal(f.scroll.scrollTop, 120);
  assert.equal(f.doc.querySelector('[data-ib-count]').textContent, '2 题');
  f.key('ArrowRight');
  assert.equal(f.active(), 'panel-1');
  assert.equal(f.scroll.scrollTop, 340);
  const updated = JSON.parse(f.dom.window.localStorage.getItem('alvin:interview-progress:v1'));
  assert.equal(updated.version, 3);
  assert.equal(updated.topic, undefined);
  assert.equal(updated.tag, undefined);
  assert.equal(updated.lastQuestions['ai-agent'], 'interview/agent/two');
});

test('previous topic links open the whole module and preserve a linked question', t => {
  const f = setup(t, '?module=ai-agent&topic=ai-runtime&question=two');
  assert.equal(f.active(), 'panel-1');
  assert.equal(f.doc.querySelector('[data-ib-count]').textContent, '2 题');
  const url = new URL(f.dom.window.location.href);
  assert.equal(url.searchParams.has('topic'), false);
  assert.equal(url.searchParams.get('module'), 'ai-agent');
  const reopened = setup(t, url.search);
  assert.equal(reopened.active(), 'panel-1');
});

test('previous tag links become a visible search without a hidden filter', t => {
  const f = setup(t, '?module=all&topic=design-async&tag=Tool&question=four');
  assert.equal(f.active(), 'panel-3');
  assert.equal(f.doc.querySelector('[data-ib-count]').textContent, '2 题');
  assert.equal(f.doc.querySelector('[data-ib-search]').value, 'Tool');
  const url = new URL(f.dom.window.location.href);
  assert.equal(url.searchParams.get('q'), 'Tool');
  assert.equal(url.searchParams.has('topic'), false);
  assert.equal(url.searchParams.has('tag'), false);
  f.doc.querySelector('[data-ib-reset]').click();
  assert.equal(f.doc.querySelector('[data-ib-count]').textContent, '4 题');
});
