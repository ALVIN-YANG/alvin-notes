import {readFileSync} from 'node:fs';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import {JSDOM} from 'jsdom';
import {resolvePhoenixLink,phoenixImageKey} from '../lib/phoenix-links.mjs';
const m=JSON.parse(readFileSync(new URL('../../vendor/phoenix/manifest.json',import.meta.url),'utf8'));
const escape=x=>String(x).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
export default function remarkPhoenix(){return(tree,file)=>{
 if(!file.path?.includes('/content/docs/phoenix/'))return;
 const slug=file.path.split('/content/docs/phoenix/')[1].replace(/\.md$/,'');const page=m.pages.find(p=>p.slug===slug);if(!page)throw Error(`Unknown Phoenix source ${slug}`);
 const textNodes=new Map();
 function collect(node){if(node.type==='text'&&node.position)textNodes.set(node.position.start.offset+':'+node.position.end.offset,node.value);node.children?.forEach(collect);}
 collect(unified().use(remarkParse).use(remarkGfm).parse(String(file.value)));
 let n=0;
 function img(src,alt='',linked=false,displayWidth){const a=m.assets[phoenixImageKey(src,page)];if(!a)throw Error(`Unknown image: ${src}`);const width=Number(displayWidth)>0?Math.min(Number(displayWidth),a.width):a.width;const height=Math.round(width*a.height/a.width);const html=`<img src="${escape(a.src)}" alt="${escape(alt)}" width="${width}" height="${height}" loading="lazy" decoding="async" />`;return linked?html:`<a href="${a.src}" class="primer-image" data-primer-image aria-label="放大图片：${escape(alt||page.title)}">${html}</a>`;}
 function walk(node,parent,i){
  if(node.type==='text'&&node.position){const original=textNodes.get(node.position.start.offset+':'+node.position.end.offset);if(original!==undefined)node.value=original;}
  if(node.type==='heading'){const h=page.headings[n++];if(!h)throw Error(`Heading overflow ${slug}`);node.data={...node.data,hProperties:{...node.data?.hProperties,id:h.id}};}
  if(node.type==='link'||node.type==='definition')node.url=resolvePhoenixLink(node.url,page,m);
  if(node.type==='image'){parent.children[i]={type:'html',value:img(node.url,node.alt,parent.type==='link')};return;}
  if(node.type==='html'){
   if(node.value.includes('<img')){const fragment=JSDOM.fragment(node.value);for(const el of fragment.querySelectorAll('img'))el.outerHTML=img(el.getAttribute('src'),el.getAttribute('alt')||'',Boolean(el.closest('a')),el.getAttribute('width'));const container=fragment.ownerDocument.createElement('div');container.append(fragment);node.value=container.innerHTML;}
   node.value=node.value
    .replace(/\bhref=(?:"([^"]*)"|'([^']*)')/g,(_,a,b)=>`href="${escape(resolvePhoenixLink(a??b,page,m))}"`);
  }
  node.children?.forEach((c,j)=>walk(c,node,j));
 }walk(tree);if(n!==page.headings.length)throw Error(`Heading loss ${slug}`);
};}
