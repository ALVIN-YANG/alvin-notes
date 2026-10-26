import path from 'node:path';
export function resolvePhoenixLink(href,page,manifest) {
  if (!href) return page.url;
  if(/(?:^|\/)pdf\/the-fenix-project\.pdf(?:#.*)?$/.test(href))return '/downloads/phoenix/the-fenix-project.pdf';
  if(href.startsWith('/phoenix/')||href.startsWith('/images/phoenix/'))return href;
  let original,hash='';
  if(href.startsWith('#')){original='/'+page.source;hash=href.slice(1);}
  else if(/^(?:https?:)?\/\//.test(href)){
    const u=new URL(href.startsWith('//')?'https:'+href:href);
    if(u.hostname==='icyfenix.cn'||u.hostname==='www.icyfenix.cn'){original=decodeURIComponent(u.pathname);hash=u.hash.slice(1);}
    else if(u.hostname==='github.com'&&u.pathname.startsWith('/fenixsoft/awesome-fenix/blob/')){original='/'+u.pathname.split('/').slice(5).join('/');hash=u.hash.slice(1);}
    else return href;
  }else if(/^[a-z][\w+.-]*:/i.test(href))return href;
  else {const [name,fragment]=href.split('#');hash=fragment||'';original=name.startsWith('/')?name:path.posix.join('/'+path.posix.dirname(page.source),name);original=decodeURIComponent(original.split('?')[0]);}
  original=original.replace(/\/$/,'')||'/';
  if(original==='/tricks/graalvm') original='/tricks/2020/graalvm';
  const target=manifest.routes[original];
  if(!target){
    if(original.includes('/_private/'))return 'https://icyfenix.cn'+original;
    if(/\.(pdf|zip|tar|gz|pptx?)$/i.test(original))return 'https://icyfenix.cn'+original;
    throw Error(`Unknown Phoenix page: ${page.source} -> ${href} (${original})`);
  }
  if(!hash)return target;
  const p=manifest.pages.find(p=>p.url===target);let id=decodeURIComponent(hash);
  if(id==='网络通讯模型')id='网络通信模型';
  let anchor=p.anchors[id];
  const normalize=s=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  if(!anchor){const keys=Object.keys(p.anchors).filter(k=>normalize(k)===normalize(id));if(keys.length)anchor=p.anchors[keys[0]];}
  if(!anchor)throw Error(`Unknown Phoenix anchor: ${page.source} -> ${href} (${target}#${id})`);
  return target+'#'+anchor;
}
export function phoenixImageKey(src,page) {
 if(/^https?:/.test(src)||src.startsWith('//'))return src;
 const clean=decodeURIComponent(src.split('#')[0]);return clean.startsWith('/')?'.vuepress/public'+clean:path.posix.normalize(path.posix.join(path.posix.dirname(page.source),clean));
}
