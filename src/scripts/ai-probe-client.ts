import { PROBES, STATUS_LABELS, validateProbeInput, createProbeReport, reportMarkdown } from '../lib/ai-probe.mjs';

type Result = { probeId:string; status:string; actual?:string; elapsedMs?:number; returnedModel?:string|null; finishReason?:string|null; usage?:{total_tokens?:number;prompt_tokens?:number;completion_tokens?:number}|null; error?:string; errorKind?:string; attempts?:number };
const root=document.querySelector<HTMLElement>('[data-ai-probe-tool]');
if(root) {
  const find=<T extends HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const form=find<HTMLFormElement>('[data-probe-form]');
  const credentials=find<HTMLFieldSetElement>('[data-probe-credentials]');
  const baseUrl=find<HTMLInputElement>('[name="baseUrl"]'), keyField=find<HTMLInputElement>('[name="apiKey"]'), modelField=find<HTMLInputElement>('[name="model"]');
  const start=find<HTMLButtonElement>('[data-probe-start]'), stop=find<HTMLButtonElement>('[data-probe-stop]');
  const jsonButton=find<HTMLButtonElement>('[data-probe-json]'), markdownButton=find<HTMLButtonElement>('[data-probe-markdown]');
  const formError=find<HTMLElement>('[data-probe-form-error]');
  let controller:AbortController|null=null;
  let report:ReturnType<typeof createProbeReport>|null=null;

  function render(results:Result[], metadata:{baseUrl:string;model:string;startedAt:string}) {
    report=createProbeReport({...metadata,results});
    find<HTMLElement>('[data-probe-report]').hidden=false;
    const {summary}=report;
    find<HTMLElement>('[data-probe-verdict]').textContent=controller?'正在检测':summary.verdict;
    find<HTMLElement>('[data-probe-score]').textContent=summary.complete?String(summary.score):'—';
    find<HTMLElement>('[data-probe-score-label]').textContent=summary.complete?'/ 100 分':'未完成不判分';
    find<HTMLElement>('[data-probe-summary]').textContent='已判分 '+summary.completed+' / '+summary.total+' 项，'+summary.passed+' 项通过。'+(!controller&&!summary.complete?'未运行或请求失败的项目不计作答错。':'');
    find<HTMLProgressElement>('[data-probe-progress]').value=results.filter(result=>['passed','failed','error','cancelled'].includes(result.status)).length;
    for(const result of results) {
      const row=find<HTMLElement>('[data-probe-id="'+result.probeId+'"]');
      row.dataset.state=result.status;
      row.querySelector<HTMLElement>('[data-probe-status]')!.textContent=STATUS_LABELS[result.status]||'未运行';
      const metrics=[];
      if(Number.isFinite(result.elapsedMs))metrics.push((result.elapsedMs!/1000).toFixed(2)+' 秒');
      if(result.usage) {
        if(Number.isSafeInteger(result.usage.prompt_tokens))metrics.push('输入 '+result.usage.prompt_tokens);
        if(Number.isSafeInteger(result.usage.completion_tokens))metrics.push('输出 '+result.usage.completion_tokens);
        if(Number.isSafeInteger(result.usage.total_tokens))metrics.push('共 '+result.usage.total_tokens+' tokens（自报）');
      }
      if(result.attempts===2)metrics.push('参数兼容重试 1 次');
      row.querySelector<HTMLElement>('[data-probe-metrics]')!.textContent=metrics.length?metrics.join(' · '):result.status==='running'?'正在等待平台回答…':'尚未取得耗时或用量。';
      const error=row.querySelector<HTMLElement>('[data-probe-error]')!;
      error.hidden=!result.error;error.textContent=result.error||'';
      row.querySelector<HTMLElement>('[data-probe-answer]')!.textContent=result.actual||'尚未获得最终回答。';
      row.querySelector<HTMLElement>('[data-probe-model]')!.textContent='返回型号（自报）：'+(result.returnedModel||'未提供')+' · 结束原因：'+(result.finishReason||'未提供');
      if(['failed','error'].includes(result.status))row.querySelector<HTMLDetailsElement>('details')!.open=true;
    }
    jsonButton.disabled=markdownButton.disabled=Boolean(controller);
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();if(controller)return;
    let apiKey=keyField.value.trim();
    let metadata;
    try {
      const input=validateProbeInput({baseUrl:baseUrl.value,apiKey,model:modelField.value,probeId:PROBES[0].id});
      if(baseUrl.value.includes(apiKey)||modelField.value.includes(apiKey))throw new Error('请只在 API Key 输入框中填写密钥。');
      metadata={baseUrl:input.endpoint.href,model:input.model,startedAt:new Date().toISOString()};
    } catch(error) { formError.textContent=error instanceof Error?error.message:'请检查检测参数。';formError.hidden=false;return; }
    formError.hidden=true;controller=new AbortController();const activeController=controller;
    credentials.disabled=true;start.disabled=true;stop.hidden=false;
    for(const detail of root.querySelectorAll<HTMLDetailsElement>('.probe-detail'))detail.open=false;
    const results:Result[]=PROBES.map(probe=>({probeId:probe.id,status:'pending'}));
    render(results,metadata);
    try {
      for(const result of results) {
        result.status='running';render(results,metadata);
        try {
          const timeout=AbortSignal.timeout(55000);
          const response=await fetch('/api/ai-probe',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({baseUrl:baseUrl.value,apiKey,model:metadata.model,probeId:result.probeId}),signal:AbortSignal.any([activeController.signal,timeout])});
          const data=await response.json();
          if(!response.ok)Object.assign(result,{status:'error',error:typeof data.error==='string'?data.error:'网站检测请求未完成（HTTP '+response.status+'）。',errorKind:data.errorKind||'request'});
          else if(data.probeId!==result.probeId||!['passed','failed','error'].includes(data.status)||typeof data.actual!=='string')Object.assign(result,{status:'error',error:'检测接口返回了无效结果。',errorKind:'protocol'});
          else Object.assign(result,data);
        } catch {
          Object.assign(result,{status:activeController.signal.aborted?'cancelled':'error',error:activeController.signal.aborted?'已停止等待；已发出的请求仍可能计费。':'网站连接中断或等待超时，本项无法判分。',errorKind:activeController.signal.aborted?'cancelled':'network'});
        }
        render(results,metadata);
        if(result.status==='error'||result.status==='cancelled') { for(const next of results)if(next.status==='pending')next.status='skipped';break; }
      }
    } finally {
      apiKey='';keyField.value='';controller=null;
      credentials.disabled=false;start.disabled=false;stop.hidden=true;
      render(results,metadata);
    }
  });

  stop.addEventListener('click',()=>controller?.abort());
  window.addEventListener('pagehide',()=>{controller?.abort();keyField.value='';});

  function download(format:'json'|'md') {
    if(!report||controller)return;
    const contents=format==='json'?JSON.stringify(report,null,2)+'\n':reportMarkdown(report);
    const url=URL.createObjectURL(new Blob([contents],{type:format==='json'?'application/json;charset=utf-8':'text/markdown;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='ai-probe-'+report.startedAt.slice(0,10)+'.'+format;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  jsonButton.addEventListener('click',()=>download('json'));markdownButton.addEventListener('click',()=>download('md'));
}
