import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { PROBES, gradeAnswer, normalizeEndpoint, validateProbeInput, summarizeResults, createProbeReport, reportMarkdown } from '../src/lib/ai-probe.mjs';
import { isPublicAddress, resolvePublicAddress, callPublicCompletion, ProbeRequestError } from '../src/server/ai-probe-upstream.mjs';
import { createProbeHandler } from '../api/ai-probe.js';

const fakeKey='synthetic-key-for-tests';
const input={baseUrl:'https://relay.example/v1',apiKey:fakeKey,model:'test-model',probeId:'instruct'};
const context=()=>validateProbeInput(input);
const success={actual:'CORRECT',finishReason:'stop',returnedModel:'reported-model',usage:{prompt_tokens:10,completion_tokens:2,total_tokens:12},attempts:1};
const origin='https://blog.mlxb.cc';
const incoming=(value=input,headers={})=>new Request(origin+'/api/ai-probe',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(value)});

function transport(sequence,calls=[]) {
  return (url,options,callback)=>{
    const request=new EventEmitter();request.destroy=()=>{};
    request.end=payload=>{
      calls.push({url:url.href,options,payload:JSON.parse(payload)});
      queueMicrotask(()=>{
        const next=sequence.shift();
        if(next instanceof Error) { request.emit('error',next);return; }
        const response=new PassThrough();response.statusCode=next.status;callback(response);
        response.end(typeof next.body==='string'?next.body:JSON.stringify(next.body));
      });
    };
    return request;
  };
}
const completionBody=(content='CORRECT')=>({model:'reported-model',choices:[{message:{content},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:2,total_tokens:12}});
const resolver=async()=>[{address:'8.8.8.8',family:4}];

test('完整答案判分，不接受碰巧包含正确词或数字的错误答案',()=>{
  const correct={instruct:'CORRECT',base64:'the magic word is falcon',needle:'7391',reason:'$0.05',math:'408',code:'3'};
  for(const probe of PROBES)assert.equal(gradeAnswer(probe.id,correct[probe.id]),true);
  for(const [id,wrong] of [['instruct','incorrect CORRECT'],['instruct','Correct'],['base64','falcon'],['needle','17391'],['reason','$0.10 and $0.05'],['math','4080'],['code','13']])assert.equal(gradeAnswer(id,wrong),false);
  assert.equal(gradeAnswer('reason','5 cents'),true);
  assert.equal(PROBES.reduce((total,p)=>total+p.weight,0),100);
});

test('只对六项完整答题评分，请求错误或未运行不按答错处理',()=>{
  const rows=PROBES.map(probe=>({probeId:probe.id,status:'passed'}));
  assert.equal(summarizeResults(rows).score,100);
  rows[0].status='failed';assert.equal(summarizeResults(rows).score,85);assert.equal(summarizeResults(rows).verdict,'部分基础题异常');
  rows[1].status='error';assert.equal(summarizeResults(rows).score,null);
  assert.equal(summarizeResults(rows.slice(0,4)).complete,false);
});

test('归一化 SDK 风格地址，禁止 URL 凭据、非 HTTPS 和任意自定义题目',()=>{
  for(const [base,expected] of [['https://relay.example','https://relay.example/v1/chat/completions'],['https://relay.example/openai/v1/','https://relay.example/openai/v1/chat/completions'],['https://relay.example/v1/chat/completions?api-version=2026','https://relay.example/v1/chat/completions?api-version=2026']])assert.equal(normalizeEndpoint(base).href,expected);
  for(const base of ['http://relay.example/v1','https://user:pass@relay.example/v1','https://relay.example:8443/v1','https://relay.example/v1?api_key=hidden','https://relay.example/v1#hidden'])assert.throws(()=>normalizeEndpoint(base));
  assert.throws(()=>validateProbeInput({...input,prompt:'arbitrary request'}),/固定检测题/);
  assert.throws(()=>validateProbeInput({...input,probeId:'unknown'}),/检测题不存在/);
  assert.throws(()=>validateProbeInput({...input,model:fakeKey}),/只在 API Key/);
});

test('拒绝内网、环回、云元数据、保留地址和 IPv4 映射 IPv6',async()=>{
  for(const ip of ['0.0.0.0','10.0.0.1','100.64.0.1','127.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','192.0.2.1','198.18.0.1','203.0.113.1','224.0.0.1','255.255.255.255','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1','2002:7f00:1::','3fff::1'])assert.equal(isPublicAddress(ip),false,ip);
  for(const ip of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111','2404:6800:4005:80a::200e'])assert.equal(isPublicAddress(ip),true,ip);
  for(const base of ['https://localhost/v1','https://2130706433/v1','https://0x7f000001/v1','https://[::ffff:127.0.0.1]/v1'])await assert.rejects(resolvePublicAddress(normalizeEndpoint(base)),/本机|内网/);
  await assert.rejects(resolvePublicAddress(context().endpoint,async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]),/内网/);
});

test('连接固定到已核验的公网 IP，参数重试不重新解析 DNS',async()=>{
  const calls=[];let resolutions=0;
  const result=await callPublicCompletion(context(),{resolver:async()=>{resolutions++;return [{address:resolutions===1?'8.8.8.8':'127.0.0.1',family:4}];},transport:transport([{status:400,body:'unsupported parameter max_tokens'},{status:200,body:completionBody()}],calls)});
  assert.equal(resolutions,1);assert.equal(calls.length,2);assert.equal(result.attempts,2);
  assert.equal(calls[0].options.agent,false);assert.equal(calls[0].payload.stream,false);
  assert.equal(calls[1].payload.max_completion_tokens,2048);assert.equal(calls[1].payload.max_tokens,undefined);assert.equal(calls[1].payload.temperature,undefined);
  for(const call of calls)call.options.lookup('relay.example',{},(error,address,family)=>{assert.equal(error,null);assert.equal(address,'8.8.8.8');assert.equal(family,4);});
});

test('重定向、鉴权错误、限流和网络错误不自动重试，不转发错误正文',async()=>{
  for(const [status,kind] of [[302,'redirect'],[401,'authentication'],[429,'rate_limit'],[500,'upstream']]) {
    const calls=[];
    await assert.rejects(callPublicCompletion(context(),{resolver,transport:transport([{status,body:'Do not expose '+fakeKey}],calls)}),error=>error.kind===kind&&!error.message.includes(fakeKey));
    assert.equal(calls.length,1);
  }
  const calls=[];await assert.rejects(callPublicCompletion(context(),{resolver,transport:transport([new Error(fakeKey)],calls)}),error=>error.kind==='network'&&!error.message.includes(fakeKey));assert.equal(calls.length,1);
  const billingCalls=[];await assert.rejects(callPublicCompletion(context(),{resolver,transport:transport([{status:400,body:'insufficient balance for max_tokens'}],billingCalls)}),error=>error.kind==='parameters');assert.equal(billingCalls.length,1);
  const retryCalls=[];await assert.rejects(callPublicCompletion(context(),{resolver,transport:transport([{status:400,body:'unsupported parameter max_tokens'},new Error(fakeKey)],retryCalls)}),error=>error.kind==='network'&&error.attempts===2);assert.equal(retryCalls.length,2);
});

test('DNS 等待也受截止时间约束，已取消的请求不会开始解析',{timeout:1000},async(t)=>{
  // AbortSignal.timeout() 不保持事件循环存活；模拟未完成的 DNS 时需要活动句柄。
  const keepAlive=setTimeout(()=>{},2000);
  t.after(()=>clearTimeout(keepAlive));
  await assert.rejects(callPublicCompletion(context(),{resolver:async()=>new Promise(()=>{}),timeoutMs:10}),error=>error.kind==='timeout');
  let resolved=false;const controller=new AbortController();controller.abort();
  await assert.rejects(callPublicCompletion({...context(),signal:controller.signal},{resolver:async()=>{resolved=true;return [];}}),error=>error.kind==='cancelled');assert.equal(resolved,false);
});

test('超长或非 JSON 回答不能通过截断后片段取得分数',async()=>{
  await assert.rejects(callPublicCompletion(context(),{resolver,transport:transport([{status:200,body:completionBody('CORRECT'+' '.repeat(12000)+'WRONG')}])}),error=>error.kind==='protocol');
  await assert.rejects(callPublicCompletion(context(),{resolver,transport:transport([{status:200,body:'<html>not a chat response</html>'}])}),error=>error.kind==='protocol');
});

test('转发入口限制方法、来源、正文大小和固定题范围',async()=>{
  let calls=0;const handler=createProbeHandler({complete:async()=>{calls++;return success;}});
  assert.equal((await handler(new Request(origin+'/api/ai-probe'))).status,405);
  assert.equal((await handler(incoming(input,{Origin:'https://untrusted.example'}))).status,403);
  assert.equal((await handler(incoming({...input,prompt:'unapproved'}))).status,400);
  assert.equal((await handler(incoming({...input,model:'x'.repeat(20000)}))).status,400);
  assert.equal(calls,0);
  const result=await handler(incoming());assert.equal(result.headers.get('cache-control'),'no-store');assert.equal((await result.json()).status,'passed');
});

test('空最终答复和截断返回未完成；不把推理预算耗尽当作答题错误',async()=>{
  for(const answer of [{...success,actual:''},{...success,finishReason:'length'}]) {
    const result=await (await createProbeHandler({complete:async()=>answer})(incoming())).json();
    assert.equal(result.status,'error');assert.equal(result.errorKind,'incomplete_response');
  }
});

test('恶意上游回显 Key 时脱敏，未选择的用量字段不会传给浏览器',async()=>{
  const response=await createProbeHandler({complete:async()=>({...success,actual:fakeKey,returnedModel:fakeKey,usage:{total_tokens:12,apiKey:fakeKey}})})(incoming());
  const text=await response.text();assert.ok(!text.includes(fakeKey));assert.ok(text.includes('[已隐藏]'));assert.ok(!text.includes('apiKey'));
  const failed=await createProbeHandler({complete:async()=>{throw new Error(fakeKey);}})(incoming());assert.ok(!(await failed.text()).includes(fakeKey));
  const quotedKey='synthetic-"quoted-key';
  const quoted=await createProbeHandler({complete:async()=>({...success,actual:quotedKey,returnedModel:quotedKey})})(incoming({...input,apiKey:quotedKey}));
  assert.equal((await quoted.json()).actual,'[已隐藏]');
});

test('限制同一客户端并发，窗口过期后允许新请求',async()=>{
  const waiting=[];
  const handler=createProbeHandler({complete:()=>new Promise(resolve=>waiting.push(resolve))});
  const first=handler(incoming()),second=handler(incoming());
  while(waiting.length<2)await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await handler(incoming())).status,429);
  waiting.forEach(resolve=>resolve(success));await Promise.all([first,second]);
  let clock=0;const limited=createProbeHandler({complete:async()=>success,now:()=>clock});
  for(let i=0;i<60;i++)assert.equal((await limited(incoming())).status,200);
  assert.equal((await limited(incoming())).status,429);clock=600001;assert.equal((await limited(incoming())).status,200);
});

test('报告只选取检测字段，不带 Key 或 URL 参数，代码围栏无法逃逸',()=>{
  const rows=PROBES.map(probe=>({probeId:probe.id,status:'passed',actual:'```\n# untrusted\n```',apiKey:fakeKey}));
  const report=createProbeReport({baseUrl:input.baseUrl+'?api-version=2026',model:input.model,startedAt:'2026-10-13T00:00:00Z',results:rows,apiKey:fakeKey});
  const json=JSON.stringify(report),markdown=reportMarkdown(report);
  assert.ok(!json.includes(fakeKey));assert.ok(!markdown.includes(fakeKey));assert.ok(!report.endpoint.includes('?'));
  assert.ok(markdown.includes('````\n```\n# untrusted\n```\n````'));assert.equal(report.summary.score,100);
});
