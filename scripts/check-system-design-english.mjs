/** Content parity checks beyond generated-file identity: English additions and references. */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { marked } from 'marked';
import { applyEnglishUpdates, englishSourcePaths } from './system-design-english-updates.mjs';
const vendor = new URL('../vendor/system-design-primer/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', vendor), 'utf8'));
const read = path => readFileSync(new URL(path, vendor), 'utf8');
function destination(url, sourcePath) {
  if(url.startsWith('/system-design/')) return url.replace(/#_top$/,'').replace(/\/$/,'');
  const u=new URL(url,`${manifest.repo}/blob/${manifest.commit}/${sourcePath}`);
  if(u.hostname==='github.com'&&u.pathname.startsWith('/donnemartin/system-design-primer')) {
    if(u.hash) {
      const key=decodeURIComponent(u.hash.slice(1));
      const aliases={...manifest.referenceAliases,'fail-over':'故障切换','user-datagram-protocol-udp':'用户数据报协议udp'};
      if(manifest.anchors[aliases[key]||key])return destination(manifest.anchors[aliases[key]||key],sourcePath);
    }
    const path=u.pathname.replace(/^\/donnemartin\/system-design-primer\/(?:blob\/[^/]+\/|tree\/[^/]+\/)?/,'');
    if(manifest.solutionPaths[path])return destination(manifest.solutionPaths[path],sourcePath);
    if(manifest.downloads[decodeURIComponent(path)])return manifest.downloads[decodeURIComponent(path)].url;
  }
  if(manifest.downloads[decodeURIComponent(url)])return manifest.downloads[decodeURIComponent(url)].url;
  return u.href.replace(/^http:/,'https:').replace(/\/$/,'');
}
function links(text,path) {
  const result=new Set();
  marked.walkTokens(marked.lexer(text),token=>{if(token.type==='link'&&token.href!=='TRANSLATIONS.md'&&!token.href.startsWith('#'))result.add(destination(token.href,path));});
  return result;
}
for(const enPath of englishSourcePaths) {
  const zhPath=enPath.replace('README.md','README-zh-Hans.md');
  const en=read(enPath),zh=applyEnglishUpdates(zhPath,read(zhPath));
  const translated=links(zh,zhPath);
  const missing=[...links(en,enPath)].filter(url=>!translated.has(url));
  assert.deepEqual(missing,[],`Missing English references: ${enPath}`);
}
const updated=applyEnglishUpdates('README-zh-Hans.md',read('README-zh-Hans.md'));
for(const text of ['### 可用率的量化','0.998001','0.999999','60.48','相互独立','流量较小','设计 API 限流器','设计证券或数字资产交易所'])assert.ok(updated.includes(text),text);
assert.ok(Math.abs(7*24*3600*(1-.9999)-60.48)<1e-8);
assert.ok(Math.abs(.999*.999-.998001)<1e-12);
assert.ok(Math.abs(1-(1-.999)**2-.999999)<1e-12);
const mint=applyEnglishUpdates('solutions/system_design/mint/README-zh-Hans.md',read('solutions/system_design/mint/README-zh-Hans.md'));
for(const text of ['每秒 *平均* 200 次读请求数','*平均* 2000 次交易写入每秒','250 微秒','self.created_at = created_at'])assert.ok(mint.includes(text),text);
console.log('English parity checked: 9 source documents, reference coverage, availability arithmetic and Mint corrections.');
