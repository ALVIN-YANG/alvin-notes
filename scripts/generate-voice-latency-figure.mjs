// Reproduce this article's figure: node scripts/generate-voice-latency-figure.mjs
import { readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../public/images/ai/openclaw-streaming-latency/', import.meta.url);
const { hello } = JSON.parse(await readFile(new URL('observations.json', directory), 'utf8'));
if (hello.segments.reduce((sum, item) => sum + item.ms, 0) !== hello.totalMs) {
  throw new Error('The segment durations must add up to the observed total.');
}
const colors = ['#287f91', '#d69239', '#596ab2', '#3c8770'];
let position = 52;
const bars = hello.segments.map((item, index) => {
  const width = item.ms / hello.totalMs * 936;
  const element = `<rect x="${position.toFixed(2)}" y="161" width="${width.toFixed(2)}" height="70" fill="${colors[index]}"/>`;
  position += width;
  return element;
}).join('\n');
const legend = hello.segments.map((item, index) => {
  const x = 52 + index % 2 * 484;
  const y = 310 + Math.floor(index / 2) * 104;
  return `<rect x="${x}" y="${y - 20}" width="10" height="63" rx="5" fill="${colors[index]}"/>
  <text x="${x + 26}" y="${y}" font-size="23" fill="#526071">${item.label}</text>
  <text x="${x + 26}" y="${y + 39}" font-size="31" font-weight="700">${item.approximate ? '约 ' : ''}${item.ms.toLocaleString('en-US')} ms</text>`;
}).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="540" viewBox="0 0 1040 540" role="img" aria-labelledby="title desc">
<title id="title">一次真实语音从提交到起播的 7,418 毫秒</title>
<desc id="desc">四段依次为 ASR 收尾 579 毫秒，ASR final 到 HTTP 发出约 3686 毫秒，HTTP 发出到首个正文约 2463 毫秒，首个正文到 playing 690 毫秒。起点是 UI 提交，不含之前的 VAD 判停。</desc>
<rect width="1040" height="540" rx="24" fill="#faf8f3"/>
<g font-family="PingFang SC, Noto Sans CJK SC, Microsoft YaHei, sans-serif" fill="#17354f">
<text x="52" y="57" font-size="18" fill="#667783" letter-spacing="2">真实语音 · 单轮日志 · 2026-10-23</text>
<text x="52" y="108" font-size="33" font-weight="700">提交之后，还等了 7,418 ms</text>
<text x="52" y="145" font-size="18" fill="#667783">UI commit</text>
<text x="988" y="145" text-anchor="end" font-size="18" fill="#667783">首次 playing</text>
${bars}
<text x="52" y="260" font-size="17" fill="#667783">条形长度按同一轮耗时比例绘制</text>
${legend}
<text x="52" y="510" font-size="18" fill="#667783">不含提交前的 VAD 等待；HTTP 发出时点由日志推算；不代表平均或 P95。</text>
</g>
</svg>\n`;
await writeFile(new URL('hello-timeline.svg', directory), svg);
console.log('Generated hello-timeline.svg from observations.json');
