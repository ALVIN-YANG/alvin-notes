import { createHash } from 'node:crypto';
import { validateProbeInput, gradeAnswer, expectedAnswer, selectUsage } from '../src/lib/ai-probe.mjs';
import { callPublicCompletion, ProbeRequestError } from '../src/server/ai-probe-upstream.mjs';

const origins=['https://blog.mlxb.cc'];
if(process.env.VERCEL_ENV==='preview' && process.env.VERCEL_URL) origins.push('https://'+process.env.VERCEL_URL);

function json(data,status=200) {
  return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}

async function readInput(request) {
  const reader=request.body?.getReader();
  if(!reader) throw new Error('检测参数为空。');
  const chunks=[];let bytes=0;
  while(true) {
    const {done,value}=await reader.read();if(done)break;
    bytes+=value.length;if(bytes>16384) { await reader.cancel();throw new Error('检测参数过大。'); }
    chunks.push(Buffer.from(value));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('检测参数不是有效 JSON。'); }
}

// These limits are per function instance; no user data or keys are persisted.
export function createProbeHandler({complete=callPublicCompletion,allowedOrigins=origins,now=Date.now}={}) {
  const clients=new Map();let active=0;
  return async request=>{
    if(request.method!=='POST') return json({error:'只支持 POST 请求。'},405);
    if(!allowedOrigins.includes(request.headers.get('origin'))) return json({error:'请从 AI 降智检测页面发起检测。'},403);
    if(!/^application\/json(?:\s*;|$)/iu.test(request.headers.get('content-type')||'')) return json({error:'只接受 JSON 检测参数。'},415);
    let input;
    try { input=validateProbeInput(await readInput(request)); } catch(error) { return json({error:error.message},400); }
    const at=now(), key=createHash('sha256').update(request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'unknown').digest('hex');
    for(const [id,value] of clients) if(!value.active && at-value.since>600000) clients.delete(id);
    const client=clients.get(key)||{since:at,count:0,active:0};
    if(client.active>=2||active>=20||client.count>=60||(!clients.has(key)&&clients.size>=2000)) return json({error:'网站检测请求过于频繁，请稍后再试。',errorKind:'rate_limit'},429);
    client.count++;client.active++;active++;clients.set(key,client);
    const result={probeId:input.probe.id,expected:expectedAnswer(input.probe.id),status:'error',actual:'',usage:null,returnedModel:null,finishReason:null,attempts:1};
    try {
      const answer=await complete({...input,signal:request.signal});
      Object.assign(result,{actual:answer.actual,usage:selectUsage(answer.usage),returnedModel:answer.returnedModel,finishReason:answer.finishReason,attempts:answer.attempts});
      if(!answer.actual.trim()||answer.finishReason==='length') Object.assign(result,{errorKind:'incomplete_response',error:'未取得完整最终答案；可能是输出预算不足，不能按答错判分。'});
      else result.status=gradeAnswer(input.probe.id,answer.actual)?'passed':'failed';
    } catch(error) {
      result.errorKind=error instanceof ProbeRequestError?error.kind:'network';
      result.error=error instanceof ProbeRequestError?error.message:'本项请求未完成，请检查平台连接。';
      if(error instanceof ProbeRequestError) result.upstreamStatus=error.upstreamStatus;
      result.attempts=error.attempts||1;
    } finally { client.active--;active--; }
    result.elapsedMs=Math.max(0,now()-at);
    // Never return upstream error bodies. A hostile endpoint can echo the credential.
    const safe=Object.fromEntries(Object.entries(result).map(([name,value])=>[name,typeof value==='string'?value.replaceAll(input.apiKey,'[已隐藏]'):value]));
    return json(safe);
  };
}

export default {fetch:createProbeHandler()};
