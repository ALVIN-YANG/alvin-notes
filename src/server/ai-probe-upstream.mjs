import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';

export class ProbeRequestError extends Error {
  constructor(kind, message, upstreamStatus = null) {
    super(message); this.kind = kind; this.upstreamStatus = upstreamStatus;
  }
}

const blockedIPv4 = [[0,8],[0x0a000000,8],[0x64400000,10],[0x7f000000,8],[0xa9fe0000,16],[0xac100000,12],[0xc0000000,24],[0xc0000200,24],[0xc0586300,24],[0xc0a80000,16],[0xc6120000,15],[0xc6336400,24],[0xcb007100,24],[0xe0000000,4],[0xf0000000,4]];

function ipv6Number(address) {
  if (address.includes('.') || address.includes('%')) return null;
  const halves = address.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const parts = halves.length === 2 ? [...left,...Array(8-left.length-right.length).fill('0'),...right] : left;
  return parts.length === 8 ? parts.reduce((value,part)=>(value<<16n)+BigInt('0x'+part),0n) : null;
}

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const number = address.split('.').reduce((value,part)=>(value*256)+Number(part),0) >>> 0;
    return !blockedIPv4.some(([network,prefix]) => (number >>> (32-prefix)) === (network >>> (32-prefix)));
  }
  if (family === 6) {
    const number = ipv6Number(address);
    if (number === null || number >> 125n !== 1n) return false; // Only global unicast 2000::/3.
    const inRange = (network,prefix) => number >> BigInt(128-prefix) === network >> BigInt(128-prefix);
    return !inRange(ipv6Number('2001::'),23) && !inRange(ipv6Number('2001:db8::'),32) && !inRange(ipv6Number('2002::'),16) && !inRange(ipv6Number('3fff::'),20);
  }
  return false;
}

export async function resolvePublicAddress(endpoint, resolver = lookup) {
  const host = endpoint.hostname.replace(/^\[|\]$/gu,'');
  if (endpoint.protocol !== 'https:' || (endpoint.port && endpoint.port !== '443') || endpoint.username || endpoint.password) throw new ProbeRequestError('blocked_target','只允许公网 HTTPS 默认端口地址。');
  if (host === 'localhost' || /(?:^|\.)(?:localhost|local|internal)$/iu.test(host)) throw new ProbeRequestError('blocked_target','不支持本机、内网或保留地址。');
  let addresses;
  try { addresses = isIP(host) ? [{address:host,family:isIP(host)}] : await resolver(host,{all:true,verbatim:true}); }
  catch { throw new ProbeRequestError('network','无法解析目标域名，请检查 Base URL。'); }
  if (!addresses.length || addresses.some(value=>!isPublicAddress(value.address))) throw new ProbeRequestError('blocked_target','目标解析到内网或保留地址，无法检测。');
  return addresses.find(value=>value.family===4) || addresses[0];
}

function abortable(promise, signal) {
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(signal.reason);
    signal.addEventListener('abort',abort,{once:true});
    promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  });
}

// Resolve once, then pin the connection to that public IP. Never follow redirects.
export function postCompletion(endpoint, apiKey, body, address, signal, transport = request) {
  return new Promise((resolve,reject)=>{
    const payload=JSON.stringify(body);
    const upstream=transport(endpoint,{
      method:'POST', agent:false, family:address.family, autoSelectFamily:false, signal,
      lookup:(_host,options,callback)=>options?.all ? callback(null,[address]) : callback(null,address.address,address.family),
      headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':'Bearer '+apiKey,'Content-Length':Buffer.byteLength(payload),'User-Agent':'AlvinNotes-AIProbe/1.0'},
    },response=>{
      const chunks=[];let bytes=0;
      response.on('data',chunk=>{
        bytes+=chunk.length;
        if(bytes>1_000_000) { response.destroy(); upstream.destroy(); reject(new ProbeRequestError('protocol','接口响应过大，已停止读取。')); }
        else chunks.push(chunk);
      });
      response.on('end',()=>resolve({status:response.statusCode,body:Buffer.concat(chunks).toString('utf8')}));
      response.on('error',reject);
    });
    upstream.on('error',reject);
    upstream.end(payload);
  });
}

function statusError(status) {
  if(status>=300&&status<400) return new ProbeRequestError('redirect','目标返回重定向；请填写最终的 API 地址。',status);
  if(status===401) return new ProbeRequestError('authentication','API Key 无效或无权使用该模型。',status);
  if(status===403) return new ProbeRequestError('forbidden','平台拒绝访问，请检查账户权限或访问限制。',status);
  if(status===404) return new ProbeRequestError('endpoint','接口路径或模型不存在，请检查 Base URL 和模型名。',status);
  if(status===429) return new ProbeRequestError('rate_limit','平台限流或额度不足，请稍后再试。',status);
  if(status===400||status===422) return new ProbeRequestError('parameters','平台不接受检测参数，请检查模型与接口兼容性。',status);
  return new ProbeRequestError('upstream','平台返回 HTTP '+status+'；本项无法判分。',status);
}

export async function callPublicCompletion({endpoint,apiKey,model,probe,signal}, {resolver=lookup,transport=request,timeoutMs=45000}={}) {
  const deadline=AbortSignal.timeout(timeoutMs);
  const combined=signal ? AbortSignal.any([signal,deadline]) : deadline;
  let attempts=1;
  try {
    combined.throwIfAborted();
    const address=await abortable(resolvePublicAddress(endpoint,resolver),combined);
    const body={model,messages:[{role:'user',content:probe.prompt}],stream:false,temperature:0,max_tokens:1024};
    let response=await postCompletion(endpoint,apiKey,body,address,combined,transport);
    if(response.status===400 && /unsupported|not supported|unknown parameter|unrecognized parameter|不支持|未知参数/iu.test(response.body) && /max_tokens|temperature/iu.test(response.body)) {
      attempts=2;
      delete body.temperature;delete body.max_tokens;body.max_completion_tokens=2048;
      response=await postCompletion(endpoint,apiKey,body,address,combined,transport);
    }
    if(response.status<200||response.status>=300) throw statusError(response.status);
    let data;
    try { data=JSON.parse(response.body); } catch { throw new ProbeRequestError('protocol','接口没有返回有效的 JSON。'); }
    const choice=data?.choices?.[0], content=choice?.message?.content;
    if(!choice || (content!==null && typeof content!=='string' && !Array.isArray(content))) throw new ProbeRequestError('protocol','接口没有返回兼容的聊天结果。');
    const actual=typeof content==='string' ? content : Array.isArray(content) ? content.filter(value=>value?.type==='text'&&typeof value.text==='string').map(value=>value.text).join('') : '';
    if(actual.length>12000)throw new ProbeRequestError('protocol','最终回答过长，本项无法按完整答案判分。');
    return {actual,finishReason:typeof choice.finish_reason==='string'?choice.finish_reason.slice(0,80):null,returnedModel:typeof data.model==='string'?data.model.slice(0,160):null,usage:data.usage,attempts};
  } catch(error) {
    const failure=combined.aborted ? new ProbeRequestError(deadline.aborted?'timeout':'cancelled',deadline.aborted?'本项超过 45 秒，检测未完成。':'本项等待已停止。') : error instanceof ProbeRequestError ? error : new ProbeRequestError('network','无法连接平台，请检查地址、TLS 证书或网络。');
    failure.attempts=attempts;
    throw failure;
  }
}
