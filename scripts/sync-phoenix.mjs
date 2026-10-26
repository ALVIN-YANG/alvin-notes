import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
import {marked} from 'marked';
import Slugger from 'github-slugger';
import {JSDOM} from 'jsdom';
import sharp from 'sharp';
const root=new URL('../',import.meta.url), vendor=new URL('vendor/phoenix/',root), upstream=new URL('upstream/',vendor);
const check=process.argv.includes('--check');
const commit='0a714b503441ae7d7c82c662744692a3717c1051';
const repo='https://github.com/fenixsoft/awesome-fenix';
const sha=x=>createHash('sha256').update(x).digest('hex');
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
async function emit(file,content){if(check){if(await readFile(file,'utf8').catch(()=>null)!==content)throw Error(`Stale: ${file.pathname}`);}else{await mkdir(path.dirname(file.pathname),{recursive:true});await writeFile(file,content);}}
const files=(await readdir(upstream,{recursive:true})).filter(f=>f.endsWith('.md')).sort();
const pages=[], routes={}, sources={};
for(const file of files){const raw=await readFile(new URL(file,upstream),'utf8');sources[file]=sha(raw);const front=raw.match(/^---\n([\s\S]*?)\n---\n/);const body=raw.replace(/^---\n[\s\S]*?\n---\n/,'');const title=body.match(/^# (.+)$/m)?.[1]?.replace(/<Badge[^>]*text="([^"]*)"[^>]*\/>/g,'（$1）')|| (file==='README.md'?'凤凰架构':file==='board.md'?'讨论区':'未完成章节');
const slug=file==='README.md'?'index':file==='SUMMARY.md'?'contents':file==='CHANGELOG.md'?'changelog':file.replace(/\.md$/,'').replace(/\/README$/,'/index');
const url='/phoenix/'+slug.replace(/(?:^|\/)index$/,'/').replace(/^\//,'').replace(/\/$/,'')+(slug==='index'?'':'/');
const page={source:file,slug,url,title,placeholder:file!=='board.md'&&body.replace(/^#.*$/gm,'').trim().length<10,rawBody:body};pages.push(page);
const originals=['/'+file,'/'+file.replace(/\.md$/,''),'/'+file.replace(/\.md$/,'.html')];if(file.endsWith('README.md'))originals.push('/'+file.replace(/README.md$/,''));if(front){const p=front[1].match(/^permalink:\s*(.+)$/m)?.[1]?.trim();if(p)originals.push(p,p+'/');}
for(const key of originals)routes[key.replace(/\/$/,'')||'/']=url;
}
// Parse only the sidebar's literal AST. Never execute upstream configuration or plugins.
const savedSidebar=await readFile(new URL('sidebar-source.json',vendor),'utf8').then(JSON.parse).catch(()=>null);
const config=savedSidebar ? 'module.exports = {sidebar: '+JSON.stringify(savedSidebar.value)+'}' : await readFile(new URL('.vuepress/config.js',upstream),'utf8');sources['.vuepress/config.js']=savedSidebar?.sha256 || sha(config);
const ast=parse(config,{ecmaVersion:'latest'});let sidebarNode;
function find(node){if(node?.type==='Property'&&(node.key.name||node.key.value)==='sidebar')sidebarNode=node.value;else if(node&&typeof node==='object')for(const v of Object.values(node)){if(Array.isArray(v))v.forEach(find);else if(v&&typeof v==='object')find(v);}}find(ast);
function literal(n){if(n.type==='Literal')return n.value;if(n.type==='ArrayExpression')return n.elements.map(literal);if(n.type==='ObjectExpression')return Object.fromEntries(n.properties.map(p=>[p.key.name||p.key.value,literal(p.value)]));throw Error(`Nonliteral sidebar: ${n.type}`);}
const used=new Set();
function resolveRoute(original){const key=decodeURIComponent(original).replace(/\/$/,'')||'/';const url=routes[key];if(!url)throw Error(`Missing sidebar source: ${original}`);used.add(url);return pages.find(p=>p.url===url);}
function nav(item){if(typeof item==='string'){const p=resolveRoute(item);return{label:p.title,link:p.url};}const children=(item.children||[]).map(nav);if(item.path){const p=resolveRoute(item.path);if(!children.length)return{label:item.title||p.title,link:p.url};children.unshift({label:p.title,link:p.url});}return{label:item.title,collapsed:true,items:children};}
await emit(new URL('sidebar-source.json',vendor),JSON.stringify({sha256:sources['.vuepress/config.js'],value:literal(sidebarNode)},null,2)+'\n');
const sidebar=literal(sidebarNode).map(nav);if(!used.has('/phoenix/'))sidebar.unshift({label:'关于本书与许可',link:'/phoenix/'});used.add('/phoenix/');
const extras=pages.filter(p=>!used.has(p.url));
if(extras.length)sidebar.push({label:'目录外文章与占位页',collapsed:true,items:extras.map(p=>({label:p.title+(p.placeholder?'（原文占位页）':''),link:p.url}))});
function toc(nodes,depth=0){return nodes.flatMap(n=>n.link?[`${'  '.repeat(depth)}- [${n.label}](${n.link})`]:[`${'  '.repeat(depth)}- ${n.label}`,...toc(n.items,depth+1)]);}
const allText=pages.map(p=>p.rawBody).join('');const statistics={pages:pages.length,mainPages:used.size,characters:allText.replace(/\s/g,'').length,date:'2026-09-28'};
function outsideCode(text,fn){return marked.lexer(text).map(token=>token.type==='code'?token.raw:fn(token.raw)).join('');}
function adapt(page){let body=page.rawBody;
body=body.replace(/<mermaid\b[^>]*>([\s\S]*?)<\/mermaid>/gi,(_,code)=>{let group=0;return '\n```mermaid\n'+code.trim().replace(/^([ \t]*)subgraph[ \t]*$/gm,()=>`subgraph phoenixGroup${++group}[" "]`)+'\n```\n';});
body=outsideCode(body,text=>text.replace(/^[ \t]+(?=<\/?(?:a|img|p|div|span|br)\b)/gm,'').replace(/^((?:>[ \t]*)+|[ \t]+):::[ \t]*(?:(?:center|right|tip|warning|quote|danger)([^\n]*))?$/gm,(_,prefix,title)=>prefix+(title?.trim()?`**${title.trim()}**`:'')).replace('http://localhost:3500','`http://localhost:3500`').replace(/^:::[ \t]*(tip|warning|danger|quote|center|right|not-print)([^\n]*)$/gm,(_,type,title)=>`\n<div class="phoenix-note phoenix-${type}">\n\n${title.trim()?`**${title.trim()}**\n`:''}`).replace(/^:::[ \t]*$/gm,'\n</div>\n')
.replace(/<\/?(?:GitHubWrapper|swiper|slide)\b[^>]*>/g,'\n')
.replace(/<TitleInfos\s*\/>/g,'\n# 凤凰架构\n\n构建可靠的大型分布式系统\n').replace(/<GithubInfos\s*\/>/g,'').replace(/<PublishInfos\s*\/>/g,'')
.replace(/<GlobalTOC\b[^>]*>[\s\S]*?<\/GlobalTOC>/g,toc(sidebar).join('\n'))
.replace(/<words\b([^>]*)\/>/g,(_,attrs)=>{const type=attrs.match(/type=['"]([^'"]*)/)?.[1];if(type==='total')return String(statistics.mainPages);if(type==='finish')return String(statistics.pages);if(type==='updatedText'||type==='updated')return statistics.date;if(type==='span'||type==='badge')return String(statistics.characters);return '';})
.replace(/<Badge\b[^>]*text="([^"]*)"[^>]*\/>/g,'（$1）')
.replace(/<iframe\b[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/iframe>/g,(_,url)=>`[观看原文配套视频（外部网站）](${url.startsWith('//')?'https:'+url:url})`)
.replace(/href="https:\/\/creativecommons.org\/licenses\/by\/4.0\/"/g,'href="https://creativecommons.org/licenses/by-nc-sa/4.0/"')
.replace(/\sstyle="[^"]*"/g,'')
.replace(/\^([^\s^]+)\^/g,'<sup>$1</sup>').replace(/(?<!~)~([^\s~]+)~(?!~)/g,'<sub>$1</sub>'));
const headings=[],slugger=new Slugger();let offset=0;
for(const token of marked.lexer(body)){const start=body.indexOf(token.raw,offset);offset=start+token.raw.length;if(token.type==='heading'){const text=JSDOM.fragment(marked.parseInline(token.text)).textContent;headings.push({title:text,depth:token.depth,id:slugger.slug(text),start,end:offset});}}
const h1=headings.find(h=>h.depth===1);page.title=h1?.title||page.title;page.anchors={};for(const h of headings){page.anchors[h.id]=h===h1?'_top':h.id;page.anchors['_'+h.id]=h===h1?'_top':h.id;const plain=h.id.replace(/可选$/,'');page.anchors[plain]=h===h1?'_top':h.id;}
page.headings=headings.filter(h=>h!==h1).map(({start,end,...h})=>h);
page.search=headings.map((h,i)=>({chapter:page.title,title:h.title,url:page.url+'#'+page.anchors[h.id],text:JSDOM.fragment(marked.parse(body.slice(h.end,headings[i+1]?.start??body.length))).textContent.replace(/\s+/g,' ').trim()}));
body=h1?body.slice(0,h1.start)+body.slice(h1.end):body;
if(page.source==='board.md')body='原站讨论区是动态评论页面，没有独立正文。本站保留此入口，讨论请前往[原项目 Issues](https://github.com/fenixsoft/awesome-fenix/issues)。\n';
if(page.placeholder)body='> 原仓库此页仅有标题或未提供正文，本站保留原状，相关内容可从目录中的子章节查阅。\n\n'+body;
return body;
}
for(const page of pages){page.body=adapt(page);
 const han=s=>(s.match(/\p{Script=Han}/gu)||[]).join('');
 const before=han(page.rawBody.replace(/^# [^\n]*(?:\n|$)/m,''));const after=han(page.body);let i=0;
 for(const character of after)if(before[i]===character)i++;
 if(i!==before.length)throw Error(`Chinese text lost in ${page.source}, around ${before.slice(i,i+40)}`);
}
const assets={}, repoTree=JSON.parse(await readFile(new URL('tree.json',vendor),'utf8')).tree;const known=new Set(repoTree.filter(x=>x.type==='blob').map(x=>x.path));
function assetPath(url,source){if(/^https?:/.test(url)||url.startsWith('//'))return null;const clean=decodeURIComponent(url.split('#')[0]);return clean.startsWith('/')?'.vuepress/public'+clean:path.posix.normalize(path.posix.join(path.posix.dirname(source),clean));}
const requests=new Map();
for(const page of pages){const refs=[];marked.walkTokens(marked.lexer(page.body),t=>{if(t.type==='image')refs.push(t.href);if(t.type==='html')for(const m of t.text.matchAll(/<img\b[^>]*src=["']([^"']+)["']/g))refs.push(m[1]);});for(const ref of refs){const local=assetPath(ref,page.source);const key=local||ref;if(local&&!known.has(local))throw Error(`Missing image ${page.source}: ${ref} (${local})`);requests.set(key,{original:key,remote:local?`https://raw.githubusercontent.com/fenixsoft/awesome-fenix/${commit}/${local}`:ref.replace(/^\/\//,'https://'),local});}}
for(const batch of Array.from({length:Math.ceil(requests.size/8)},(_,i)=>[...requests].slice(i*8,i*8+8))){await Promise.all(batch.map(async([key,req])=>{let ext=path.extname(req.local||new URL(req.remote).pathname);if(!/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(ext))ext='.svg';const src='/images/phoenix/'+sha(key).slice(0,16)+ext;const file=new URL('public'+src,root);let bytes=await readFile(file).catch(()=>null);if(!bytes){if(check)throw Error(`Missing asset ${key}`);const response=await fetch(req.remote);if(!response.ok)throw Error(`${req.remote}: ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());await mkdir(path.dirname(file.pathname),{recursive:true});await writeFile(file,bytes);}const meta=await sharp(bytes).metadata();assets[key]={src,sha256:sha(bytes),width:meta.width,height:meta.height};}));}
const pdfSource='.vuepress/public/pdf/the-fenix-project.pdf';
const pdfUrl='/downloads/phoenix/the-fenix-project.pdf';
const pdfFile=new URL('public'+pdfUrl,root);
let pdfBytes=await readFile(pdfFile).catch(()=>null);
if(!pdfBytes){if(check)throw Error('Missing original PDF');const response=await fetch(`https://raw.githubusercontent.com/fenixsoft/awesome-fenix/${commit}/${pdfSource}`);if(!response.ok)throw Error('PDF download failed');pdfBytes=Buffer.from(await response.arrayBuffer());await mkdir(path.dirname(pdfFile.pathname),{recursive:true});await writeFile(pdfFile,pdfBytes);}
const downloads={[pdfSource]:{url:pdfUrl,sha256:sha(pdfBytes)}};
const manifest={downloads,repo,commit,license:'CC BY-NC-SA-4.0',statistics,excluded:['introduction/_private/cv.md','introduction/_private/cv-ppt.md'],sources,routes,assets:Object.fromEntries(Object.entries(assets).sort(([a],[b])=>a<b?-1:a>b?1:0)),sidebar,pages:pages.map(({rawBody,body,search,...p})=>p)};
function links(nodes){return nodes.flatMap(n=>n.link?[n.link]:links(n.items));}
const readingOrder=[...new Set(links(sidebar))];
for(const page of pages){const i=readingOrder.indexOf(page.url);const neighbour=url=>({link:url,label:pages.find(p=>p.url===url).title});const data={title:page.title,comments:false,editUrl:false,tableOfContents:{minHeadingLevel:2,maxHeadingLevel:4},prev:i>0?neighbour(readingOrder[i-1]):false,next:i<readingOrder.length-1?neighbour(readingOrder[i+1]):false};await emit(new URL(`src/content/docs/phoenix/${page.slug}.md`,root),`---\n${JSON.stringify(data,null,2)}\n---\n${page.body}`);}
await emit(new URL('manifest.json',vendor),JSON.stringify(manifest,null,2)+'\n');await emit(new URL('public/phoenix-search.json',root),JSON.stringify(pages.flatMap(p=>p.search))+'\n');
console.log(`Phoenix: ${pages.length} public documents, ${used.size} main-directory entries, ${requests.size} images; pinned ${commit}`);
