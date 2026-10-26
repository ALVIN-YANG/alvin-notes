import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { marked } from 'marked';
import Slugger from 'github-slugger';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const vendor = new URL('vendor/system-design-primer/', root);
const hash = data => createHash('sha256').update(data).digest('hex');
const systems = ['pastebin','twitter','web_crawler','mint','social_graph','query_cache','sales_rank','scaling_aws'];
const objects = ['hash_table','lru_cache','call_center','deck_of_cards','parking_lot','online_chat'];
const objectFiles = { hash_table:'hash_map', ...Object.fromEntries(objects.slice(1).map(x=>[x,x])) };

export async function buildSolutions({check, update, download, images}) {
  const translations = JSON.parse(await readFile(new URL('translations/object-oriented.zh.json', vendor), 'utf8'));
  const supplements = [], paths = {}, search = [], sources = {}, downloads = {};
  async function sourceFile(path) {
    const target = new URL(path, vendor);
    if (update) { await mkdir(dirname(target.pathname), {recursive:true}); await writeFile(target, await download(path)); }
    const content = await readFile(target, 'utf8');
    sources[path] = hash(content);
    return content;
  }
  for (const [kind, ids] of [['system_design',systems], ['object_oriented_design',objects], ['site',['circular_array']]]) {
    for (const id of ids) {
      const parent = kind === 'system_design' ? 'system-design-exercises' : 'object-oriented-design';
      const slug = `${parent}/${id.replaceAll('_','-')}`;
      const sourcePath = kind === 'site' ? 'src/data/system-design-supplements/circular-array.md' : `solutions/${kind}/${id}/${kind === 'system_design' ? 'README-zh-Hans.md' : `${objectFiles[id]}.ipynb`}`;
      const original = kind === 'site' ? await readFile(new URL(sourcePath, root), 'utf8') : await sourceFile(sourcePath);
      if (kind === 'site') sources[sourcePath] = hash(original);
      let markdown = original;
      if (kind === 'object_oriented_design') {
        const notebook = JSON.parse(original);
        if (notebook.cells.length !== 5 || notebook.cells.slice(0,4).some(c=>c.cell_type!=='markdown') || notebook.cells[4].cell_type!=='code') throw new Error(`Review changed notebook layout: ${sourcePath}`);
        const t = translations[id];
        const cell = notebook.cells[4];
        const outputs = cell.outputs.map(output => {
          if (output.output_type !== 'stream') throw new Error(`Review notebook output in ${sourcePath}`);
          return output.text.join('');
        }).join('');
        markdown = `本 Notebook 由 [Donne Martin](https://github.com/donnemartin) 编写。源码和许可信息见 [GitHub](https://github.com/donnemartin/system-design-primer)。\n\n# ${t.title}\n\n${t.constraints}\n\n## 解答\n\n\`\`\`python\n${cell.source.join('')}\n\`\`\`\n\n### 原 Notebook 输出\n\n\`\`\`text\n${outputs}\n\`\`\`\n`;
      }
      const tokens = marked.lexer(markdown), headings = [], slugger = new Slugger();
      let cursor = 0;
      for (const token of tokens) {
        const start = markdown.indexOf(token.raw,cursor); cursor=start+token.raw.length;
        if(token.type==='heading') headings.push({title:token.text,depth:token.depth,id:slugger.slug(token.text),start,end:cursor});
      }
      const titleHeading = headings.find(h=>h.depth===1);
      const body = markdown.slice(0,titleHeading.start)+markdown.slice(titleHeading.end);
      const url = `/system-design/${slug}/`;
      const anchors = Object.fromEntries(headings.map(h=>[h.id,`${url}#${h===titleHeading?'_top':h.id}`]));
      const assetUrls = new Set();
      marked.walkTokens(tokens,t=>{if(t.type==='image')assetUrls.add(t.href);});
      for(const asset of assetUrls) {
        if(images[asset])continue;
        if(!/^https?:\/\/i\.imgur\.com\/[\w.-]+$/.test(asset))throw new Error(`Review solution image ${asset}`);
        const filename=asset.split('/').at(-1);
        if(images[`images/${filename}`]) { images[asset]=images[`images/${filename}`]; continue; }
        const target=new URL(`public/images/system-design/${filename}`,root);
        let bytes=await readFile(target).catch(()=>null);
        if(!bytes || update) {
          if(check)throw new Error(`Missing solution image ${asset}`);
          bytes=await download(asset.replace(/^http:/,'https:'));
          await writeFile(target,bytes);
        }
        const {width,height}=await sharp(bytes).metadata();
        images[asset]={src:`/images/system-design/${filename}`,width,height,sha256:hash(bytes)};
      }
      const document={title:titleHeading.title,slug,url,parent,sourcePath,translated:kind==='object_oriented_design',siteSupplement:kind==='site',body,headings:headings.filter(h=>h!==titleHeading),anchors};
      supplements.push(document);
      paths[sourcePath]=url;
      if(kind==='system_design')paths[sourcePath.replace('README-zh-Hans.md','README.md')]=url;
      else if (kind==='object_oriented_design') paths[sourcePath.replace('.ipynb','.py')]=url+'#解答';
      headings.forEach((h,i)=>search.push({chapter:document.title,title:h.title,url:anchors[h.id],text:JSDOM.fragment(marked.parse(markdown.slice(h.end,headings[i+1]?.start??markdown.length))).textContent.replace(/\s+/g,' ').trim()}));
    }
  }
  for (const filename of ['System Design.apkg', 'System Design Exercises.apkg', 'OO Design.apkg']) {
    const sourcePath = `resources/flash_cards/${filename}`;
    const target = new URL(`public/downloads/system-design/${filename}`, root);
    let bytes = await readFile(target).catch(()=>null);
    if (!bytes || update) {
      if(check) throw new Error(`Missing download: ${sourcePath}`);
      bytes = await download(sourcePath);
      await mkdir(dirname(target.pathname), {recursive:true});
      await writeFile(target, bytes);
    }
    downloads[sourcePath] = {url:`/downloads/system-design/${encodeURIComponent(filename)}`,sha256:hash(bytes)};
  }
  sources['translations/object-oriented.zh.json']=hash(await readFile(new URL('translations/object-oriented.zh.json',vendor)));
  return {supplements,paths,search,sources,downloads};
}

// Upstream answers still contain English and misspelled main-document anchors.
export const referenceAliases = Object.fromEntries([
['index-of-system-design-topics','系统设计主题的索引'],['系统设计主题索引','系统设计主题的索引'],['SQL调优','sql-调优'],
['active-active','双工作切换active-active'],['active-passive','工作到备用切换active-passive'],
['application-caching','应用缓存'],['application-layer','应用层'],['asynchronism','异步'],['availability-patterns','可用性模式'],['back-pressure','背压'],['cache','缓存'],['cache-aside','缓存模式'],['caching-at-the-database-query-level','数据库查询级别的缓存'],['caching-at-the-object-level','对象级别的缓存'],['cdn-caching','cdn-缓存'],['client-caching','客户端缓存'],['consistency-patterns','一致性模式'],['content-delivery-network','内容分发网络cdn'],['database-caching','数据库缓存'],['denormalization','非规范化'],['document-store','文档类型存储'],['domain-name-system','域名系统'],['federation','联合'],['graph-database','图数据库'],['horizontal-scaling','水平扩展'],['key-value-store','键-值存储'],['latency-numbers-every-programmer-should-know','每个程序员都应该知道的延迟数'],['load-balancer','负载均衡器'],['master-slave-replication','主从复制'],['message-queues','消息队列'],['microservices','微服务'],['nosql','nosql'],['refresh-ahead','刷新'],['relational-database-management-system-rdbms','关系型数据库管理系统rdbms'],['remote-procedure-call-rpc','远程过程调用协议rpc'],['representational-state-transfer-rest','表述性状态转移rest'],['reverse-proxy-web-server','反向代理web-服务器'],['security','安全'],['service-discovery','服务发现'],['sharding','分片'],['sql-or-nosql','sql-还是-nosql'],['sql-tuning','sql-调优'],['task-queues','任务队列'],['under-development','正在完善中'],['use-good-indices','使用正确的索引'],['web-server-caching','web-服务器缓存'],['when-to-update-the-cache','何时更新缓存'],['wide-column-store','列型存储'],['write-behind-write-back','回写模式'],['write-through','直写模式']
]);
