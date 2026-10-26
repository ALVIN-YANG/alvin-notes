import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {marked} from 'marked';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import {createHash} from 'node:crypto';
export async function verifyPhoenix(){
 const root=new URL('../',import.meta.url),m=JSON.parse(await readFile(new URL('vendor/phoenix/manifest.json',root),'utf8'));
 const docs=new Map(),problems=[];let diagrams=0,images=0,codeBlocks=0,links=0;
 const norm=s=>s.replace(/\s+/g,'');
 const code=node=>{const lines=[...node.querySelectorAll('.ec-line .code')];return(lines.length?lines.map(l=>l.textContent.replace(/\n$/,'')).join('\n'):node.textContent).replaceAll('\t','  ').split('\n').map(l=>l.trimEnd()).join('\n').trimEnd();};
 for(const page of m.pages){
  const raw=await readFile(new URL(`src/content/docs/phoenix/${page.slug}.md`,root),'utf8');const body=raw.replace(/^---\n[\s\S]*?\n---\n/,'');
  const doc=new JSDOM(await readFile(new URL(`dist${page.url}index.html`,root),'utf8'),{url:'https://blog.mlxb.cc'+page.url}).window.document;docs.set(page.url,doc);
  if(doc.querySelector('h1')?.textContent!==page.title)problems.push('Title: '+page.slug);
  const actual=doc.querySelector('.sl-markdown-content')?.cloneNode(true);if(!actual){problems.push('Empty: '+page.slug);continue;}
  const expected=JSDOM.fragment(marked.parse(body));
  const em=expected.querySelectorAll('pre code.language-mermaid');const am=actual.querySelectorAll('[data-mermaid-static]');if(em.length!==am.length)problems.push('Diagram loss: '+page.slug);diagrams+=am.length;em.forEach(n=>n.parentElement.remove());am.forEach(n=>n.remove());
  actual.querySelectorAll('.sl-anchor-link,.expressive-code .header,.copy,[data-pagefind-ignore]').forEach(n=>n.remove());
  if(norm(actual.textContent)!==norm(expected.textContent)){const a=norm(actual.textContent),b=norm(expected.textContent);let i=0;while(a[i]===b[i]&&i<Math.min(a.length,b.length))i++;problems.push(`Text ${page.slug} at ${i}: expected ${b.slice(i,i+60)} / got ${a.slice(i,i+60)}`);}
  for(const selector of ['img','table'])if(actual.querySelectorAll(selector).length!==expected.querySelectorAll(selector).length)problems.push(`Lost ${selector}: ${page.slug}`);
  images+=actual.querySelectorAll('img').length;
  const ac=[...actual.querySelectorAll('pre code')].map(code),ec=[];
  function collectCode(n){if(n.type==='code'&&n.lang!=='mermaid')ec.push(n.value.replaceAll('\t','  ').split('\n').map(l=>l.trimEnd()).join('\n').trimEnd());n.children?.forEach(collectCode);}
  collectCode(unified().use(remarkParse).use(remarkGfm).parse(body));codeBlocks+=ac.length;if(JSON.stringify(ac)!==JSON.stringify(ec))problems.push('Code: '+page.slug);
  for(const h of page.headings)if(!doc.getElementById(h.id))problems.push(`Heading: ${page.slug}#${h.id}`);
  if(doc.querySelector('meta[name="google-adsense-account"],script[src*="googlesyndication"],script[src*="doubleclick"],script[src*="_vercel/insights"]'))problems.push('Commercial/analytics script: '+page.slug);
  if(!doc.querySelector('.phoenix-source')?.textContent.includes('周志明')||!doc.querySelector('.phoenix-credit')?.textContent.includes('CC BY-NC-SA 4.0'))problems.push('Attribution: '+page.slug);
  if(doc.querySelector('script[type="application/ld+json"]')?.textContent.includes('Alvin Yang'))problems.push('Wrong author metadata: '+page.slug);
  for(const img of actual.querySelectorAll('img'))if(!img.getAttribute('src')?.startsWith('/images/phoenix/'))problems.push('External image: '+page.slug);
 }
 for(const [url,doc] of docs)for(const a of doc.querySelectorAll('a[href]')){const target=new URL(a.href);if(target.origin!=='https://blog.mlxb.cc'||!target.pathname.startsWith('/phoenix/'))continue;links++;const dest=docs.get(target.pathname);if(!dest||(target.hash&&!dest.getElementById(decodeURIComponent(target.hash.slice(1)))))problems.push(`Broken link ${url} -> ${a.href}`);}
 const search=JSON.parse(await readFile(new URL('public/phoenix-search.json',root),'utf8'));for(const r of search){const u=new URL(r.url,'https://blog.mlxb.cc');if(!docs.get(u.pathname)?.getElementById(decodeURIComponent(u.hash.slice(1))))problems.push('Search: '+r.url);}
 for(const a of Object.values(m.assets)){const bytes=await readFile(new URL('public'+a.src,root));if(createHash('sha256').update(bytes).digest('hex')!==a.sha256)problems.push('Asset: '+a.src);}
 for(const asset of Object.values(m.downloads)){const bytes=await readFile(new URL('public'+asset.url,root));if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)problems.push('Download: '+asset.url);}
 if(problems.length)throw Error(problems.join('\n'));
 console.log(`Phoenix verified: ${docs.size} pages, ${diagrams} diagrams, ${images} image occurrences, ${codeBlocks} code blocks, ${links} internal links; attribution and ad isolation passed.`);
}
if(process.argv[1]&&new URL(process.argv[1],'file:').href===import.meta.url)await verifyPhoenix();
