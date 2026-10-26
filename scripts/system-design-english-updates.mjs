import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const vendor = new URL('../vendor/system-design-primer/', import.meta.url);
const changes = JSON.parse(readFileSync(new URL('translations/english-updates.json', vendor), 'utf8'));
export const englishSourcePaths = ['README.md', ...['pastebin','twitter','web_crawler','mint','social_graph','query_cache','sales_rank','scaling_aws'].map(id=>`solutions/system_design/${id}/README.md`)];
export function applyEnglishUpdates(path, text) {
  for (const patch of changes.patches.filter(p=>p.source===path)) {
    const english = readFileSync(new URL(patch.englishSource, vendor), 'utf8');
    if (!english.includes(patch.evidence)) throw new Error(`English evidence changed: ${patch.id}`);
    const count = text.split(patch.before).length - 1;
    if (count !== patch.count) throw new Error(`Chinese patch target changed: ${patch.id} (${count} vs ${patch.count})`);
    text = text.split(patch.before).join(patch.after);
  }
  return text;
}
export function englishRevision(commit) {
  if(commit!==changes.commit) throw new Error('Review English comparison before changing upstream revision');
  return {commit, patches:changes.patches.map(({id,source,englishSource})=>({id,source,englishSource})), sources:Object.fromEntries(englishSourcePaths.map(path=>[path,createHash('sha256').update(readFileSync(new URL(path,vendor))).digest('hex')]))};
}
