import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync(new URL('../../vendor/system-design-primer/manifest.json', import.meta.url), 'utf8'));
export function buildSystemDesignSidebar() {
  return manifest.chapters.map(chapter => {
    const children = manifest.supplements.filter(doc => doc.parent === chapter.slug);
    if (!children.length) return {label:chapter.title,link:chapter.url};
    return {label:chapter.title,collapsed:true,items:[
      {label:'题目总览',link:chapter.url},
      ...children.map(doc=>({label:doc.siteSupplement ? `${doc.title}（本站补充）` : doc.title,link:doc.url})),
    ]};
  });
}
