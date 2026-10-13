import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readSourceContent } from '../src/lib/company-observer.mjs';
import { collectCompanyMaterials, validateCompanyProposal, applyCompanyProposal, syncCompanyWeek } from '../scripts/ai-company-weekly.mjs';

const real = JSON.parse(await readFile(new URL('../src/data/companies/catalog.json', import.meta.url))).companies[0];
const quote = 'The assistant completes bookings and returns a confirmation after the user approves.';
const published = 'October 12, 2026';
const material = { sourceId: 'product', url: 'https://example.com/', title: 'Official assistant', text: `${published} ${quote}`, hash: 'content-hash', links: [], publishedAt: '2026-10-12' };
const period = { start: '2026-10-06', end: '2026-10-13' };
const evidence = () => [{ sourceId: 'product', quote }];
function subject() {
  const company = structuredClone(real);
  company.id = 'example'; company.sources = [{ id: 'product', title: '产品', url: material.url, checkedAt: '2026-10-01', monitor: true, method: 'web' }];
  company.reviewedAt = company.analysisAt = '2026-09-01';
  for (const section of company.sections) for (const row of section.rows) {
    row.sources = row.kind === 'unknown' ? [] : ['product'];
    delete row.checkedAt;
  }
  return { catalog: { schemaVersion: 1, companies: [company] }, updates: { schemaVersion: 1, reports: [] }, monitor: { schemaVersion: 1, lastRun: null, sources: {}, candidates: [] } };
}
function proposed(company) {
  return { companyId: company.id, changes: [], confirmed: company.sections.flatMap(section => section.rows.map((row, rowIndex) => ({row,sectionId:section.id,rowIndex}))).filter(value=>['verified','disclosed'].includes(value.row.kind)).map(({row,...value})=>({...value,evidence:evidence()})), analysisReviewed: company.sections.flatMap(section=>section.rows.map((row,rowIndex)=>({row,sectionId:section.id,rowIndex}))).filter(value=>value.row.kind==='analysis').map(({row,...value})=>value), events: [] };
}
const fetcher = async () => new Response(`<title>Official assistant</title><main><h1>${published}</h1><p>${quote.repeat(3)}</p></main>`);
const now = new Date('2026-10-13T01:00:00Z');

test('保留文章 header 的正文与明确发布日期，清除脚本和导航',()=>{
  const content=readSourceContent(`<meta property="article:published_time" content="2026-10-12T00:00:00Z"><main><header><h1>Official announcement</h1><p>${quote.repeat(3)}</p></header></main><nav>Ignore navigation</nav><script>Ignore script</script>`,material.url);
  assert.ok(content.text.includes(quote)); assert.equal(content.publishedAt,'2026-10-12');assert.ok(!content.text.includes('Ignore'));
});

test('无原文的修改、跨公司结果、编造事件日期和旧消息不能发布',()=>{
  const company=subject().catalog.companies[0];const p=proposed(company);
  p.changes=[{sectionId:'product',rowIndex:0,text:'新的产品说明',kind:'disclosed',sources:['product'],asOf:'2026-10-13',evidence:[{sourceId:'product',quote:'Invented unsupported claim is not present.'}]}];
  assert.throws(()=>validateCompanyProposal(company,p,[material],period),/原文不存在/);
  p.changes=[];p.companyId='archived';assert.throws(()=>validateCompanyProposal(company,p,[material],period),/公司范围/);
  p.companyId=company.id;p.events=[{date:'2026-10-12',title:'新增预约能力',fact:'可以完成预约',impact:'可能减少操作',watch:'观察完成率',sources:['product'],evidence:evidence(),dateEvidence:{sourceId:'product',quote:published}}];
  assert.equal(validateCompanyProposal(company,p,[material],period),true);
  p.events[0].date='2026-10-11';assert.throws(()=>validateCompanyProposal(company,p,[material],period),/日期没有原文/);
  p.events[0].date='2026-09-30';assert.throws(()=>validateCompanyProposal(company,p,[material],period),/旧消息/);
});

test('部分确认只更新相应字段日期，不冒充整家公司复核',()=>{
  const company=subject().catalog.companies[0], p=proposed(company);
  p.confirmed=p.confirmed.slice(0,1);
  const applied=applyCompanyProposal(company,p,[material],period.end,true);
  assert.equal(applied.company.reviewedAt,'2026-09-01');assert.equal(applied.company.analysisAt,'2026-09-01');
  assert.equal(applied.company.sections[0].rows[0].checkedAt,'2026-10-13');assert.equal(company.sections[0].rows[0].checkedAt,undefined);
  assert.equal(applied.company.sections[0].rows[1].checkedAt,'2026-10-01');
  assert.equal(applied.company.sources[0].checkedAt,'2026-10-13');
});

test('发布日期可来自含年份的原文句子，缺年份或多个不同日期不能确认',()=>{
  const company=subject().catalog.companies[0], p=proposed(company);
  const dateQuote='Last updated Oct 08, 2026.';
  const dated={...material,publishedAt:null,text:`${dateQuote} October 09, 2026. October 08. ${quote}`};
  p.events=[{date:'2026-10-08',title:'新增预约能力',fact:'可以完成预约',impact:'可能减少操作',watch:'观察完成率',sources:['product'],evidence:evidence(),dateEvidence:{sourceId:'product',quote:dateQuote}}];
  assert.equal(validateCompanyProposal(company,p,[dated],period),true);
  p.events[0].dateEvidence.quote='October 08.';assert.throws(()=>validateCompanyProposal(company,p,[dated],period),/日期没有原文/);
  p.events[0].dateEvidence.quote=`${dateQuote} October 09, 2026.`;assert.throws(()=>validateCompanyProposal(company,p,[dated],period),/日期没有原文/);
});

test('引用失败的修复请求包含具体字段与错误引用，修正后才能发布',async()=>{
  const input=subject();let attempts=0;
  const incorrect='Invented unsupported claim is not present.';
  const result=await syncCompanyWeek(input,{fetcher,now,log:()=>{},generate:async(task,payload)=>{
    if(task==='verify')return {approved:true};
    const p=proposed(payload.company);
    if(attempts++===0)p.confirmed[0].evidence.push({sourceId:'product',quote:incorrect});
    else {assert.ok(payload.repair.includes(incorrect));assert.ok(payload.repair.includes('confirmed.product:0'));}
    return p;
  }});
  assert.equal(attempts,2);assert.equal(result.monitor.lastReview.status,'ok');
});

test('来源列表取自已验证引用，重复旧正文不改写历史日期，无效引用仍拒绝',async()=>{
  const input=subject(), company=input.catalog.companies[0];
  const unchanged=company.sections.find(section=>section.id==='funding').rows[0];
  const generate=invalid=>async(task,payload)=>{
    if(task==='verify')return {approved:true};
    const p=proposed(payload.company);
    p.changes=[
      {sectionId:'product',rowIndex:0,text:'助手可在用户确认后完成预约并返回确认结果。',kind:'disclosed',sources:['incorrect-source'],asOf:'2026-10-12',evidence:invalid?[{sourceId:'product',quote:'Invented unsupported claim is not present.'}]:evidence()},
      {sectionId:'funding',rowIndex:0,text:unchanged.text,kind:unchanged.kind,sources:[],asOf:'2026-10-13',evidence:[]}
    ];
    return p;
  };
  const result=await syncCompanyWeek(input,{fetcher,now,log:()=>{},generate:generate(false)});
  assert.equal(result.monitor.lastReview.status,'ok');assert.equal(result.monitor.lastReview.companies[0].changes,1);
  assert.deepEqual(result.catalog.companies[0].sections[0].rows[0].sources,['product']);
  assert.equal(result.catalog.companies[0].sections.find(section=>section.id==='funding').rows[0].asOf,unchanged.asOf);
  const rejected=await syncCompanyWeek(input,{fetcher,now,log:()=>{},generate:generate(true)});
  assert.equal(rejected.monitor.lastReview.status,'partial');assert.deepEqual(rejected.catalog,input.catalog);
});

test('生成或独立核对失败保留档案和旧日期，不把失败写成无新动态',async()=>{
  const input=subject();
  for (const mode of ['network','rejected']) {
    const result=await syncCompanyWeek(input,{fetcher,now,log:()=>{},generate:async(task,payload)=>{if(mode==='network')throw new Error('Unavailable');return task==='draft'?proposed(payload.company):{approved:false,reason:'没有证据'};}});
    assert.deepEqual(result.catalog,input.catalog);assert.equal(result.monitor.lastReview.status,'partial');assert.equal(result.updates.reports[0].status,'partial');assert.equal(result.updates.reports[0].items.length,0);
  }
});

test('成功运行更新档案和本期事件，同周跳过、强制重跑不重复发布',async()=>{
  const input=subject();
  const generate=async(task,payload)=>{if(task==='verify')return {approved:true};const p=proposed(payload.company);p.events=[{date:'2026-10-12',title:'新增预约能力',fact:'助手可在用户确认后完成预约',impact:'可能减少来回安排',watch:'观察真实完成率',sources:['product'],evidence:evidence(),dateEvidence:{sourceId:'product',quote:published}}];return p;};
  const first=await syncCompanyWeek(input,{fetcher,generate,now,log:()=>{}});
  assert.equal(first.monitor.lastReview.status,'ok');assert.equal(first.catalog.companies[0].reviewedAt,'2026-10-13');assert.equal(first.catalog.companies[0].analysisAt,'2026-10-13');assert.equal(first.updates.reports[0].items.length,1);
  const skipped=await syncCompanyWeek(first,{fetcher:async()=>{throw new Error('Must not fetch');},generate,now,log:()=>{}});assert.equal(skipped.skipped,true);
  const rerun=await syncCompanyWeek(first,{fetcher,generate,now,force:true,log:()=>{}});assert.equal(rerun.updates.reports[0].items.length,1);assert.equal(rerun.updates.reports.length,1);
});

test('只发现已登记网站内的公告，不访问跨站链接，抓取日期不充当发布日期',async()=>{
  const company=subject().catalog.companies[0];
  const visited=[];const collector=async url=>{visited.push(url);return new Response(`<main><p>${quote.repeat(3)}</p><a href="https://evil.example/press/x">October 12, 2026 Untrusted external article</a><a href="/blog/new-release">October 12, 2026 Official product announcement</a></main>`);};
  const result=await collectCompanyMaterials(company,period,{fetcher:collector});
  assert.deepEqual(visited,['https://example.com/','https://example.com/blog/new-release']);assert.equal(result.materials[1].publishedAt,null);
});
