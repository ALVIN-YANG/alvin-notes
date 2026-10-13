import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountInterviewBank } from '../src/lib/interview-bank.mjs';

function setup(t, query = '', { saved, storageBlocked = false } = {}) {
  const items = [['agent','one','basic'],['agent','two','advanced'],['infra','three','basic']];
  const dom = new JSDOM(`<html lang="zh-CN"><body><div data-interview-bank>
    <button data-ib-track="agent"></button><button data-ib-track="infra"></button>
    <input data-ib-search><button data-ib-level=""></button><button data-ib-level="advanced"></button>
    ${items.map(([track,id,level],index)=>`<div data-ib-question data-id="interview/${track}/${id}" data-track="${track}" data-level="${level}" data-search="${id}" data-panel="panel-${index}"><a href="/old/${id}/">${id}</a></div>`).join('')}
    <span data-ib-position></span><span data-ib-count></span><div data-ib-empty hidden></div><button data-ib-reset></button>
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

test('each direction and question keeps its own reading position', t => {
  const f=setup(t);
  f.scroll.scrollTop=120;
  f.key('ArrowRight');
  f.scroll.scrollTop=260;
  f.doc.querySelector('[data-ib-track="infra"]').click();
  assert.equal(f.active(),'panel-2');
  assert.equal(f.scroll.scrollTop,0);
  f.scroll.scrollTop=80;
  f.doc.querySelector('[data-ib-track="agent"]').click();
  assert.equal(f.active(),'panel-1');
  assert.equal(f.scroll.scrollTop,260);
  f.key('ArrowLeft');assert.equal(f.scroll.scrollTop,120);
  f.doc.querySelector('[data-ib-track="infra"]').click();
  assert.equal(f.scroll.scrollTop,80);
});

test('an explicit link overrides cached direction, question and filters', t => {
  const first=setup(t);
  first.doc.querySelector('[data-ib-track="infra"]').click();
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
