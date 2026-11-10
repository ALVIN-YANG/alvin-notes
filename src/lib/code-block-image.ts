/** Draw the existing highlighted tokens, including content outside the scroll viewport. */
export async function renderCodeBlockImage(frame: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  const pre = frame.querySelector('pre');
  if (!pre) throw new Error('没有可复制的代码。');
  const style = getComputedStyle(pre);
  const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  await document.fonts.load(font);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器无法生成图片。');
  context.font = font;
  const lineHeight = parseFloat(style.lineHeight);
  const padding = 24;
  const rows = [...pre.querySelectorAll<HTMLElement>('.ec-line .code')].map((line) => {
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    const tokens: { text: string; color: string }[] = [];
    let node: Node | null;
    let column = 0;
    while ((node = walker.nextNode())) {
      const text = (node.textContent ?? '').replace(/\t|[^\t]/gu, (character) => {
        const length = character === '\t' ? Number(style.tabSize) - column % Number(style.tabSize) : 1;
        column += length;
        return character === '\t' ? ' '.repeat(length) : character;
      });
      tokens.push({ text, color: getComputedStyle(node.parentElement!).color });
    }
    return tokens;
  });
  const title = frame.querySelector('.header .title')?.textContent?.trim() ?? '';
  const titleHeight = title ? 32 : 0;
  const width = Math.ceil(Math.max(400, ...rows.map((row) =>
    row.reduce((sum, token) => sum + context.measureText(token.text).width, 0) + padding * 2)));
  const height = Math.ceil(Math.max(1, rows.length) * lineHeight + padding * 2 + titleHeight);
  const scale = 2;
  // Refuse oversized exports rather than silently clipping or exhausting the canvas.
  if (width * scale > 16384 || height * scale > 16384 || width * height * scale ** 2 > 32_000_000) {
    throw new Error('这段代码过长，无法生成完整图片，请复制文本。');
  }
  canvas.width = width * scale;
  canvas.height = height * scale;
  context.scale(scale, scale);
  context.beginPath();
  context.roundRect(0.5, 0.5, width - 1, height - 1, 16);
  context.fillStyle = style.backgroundColor;
  context.fill();
  context.strokeStyle = getComputedStyle(frame).borderTopColor;
  context.stroke();
  context.font = font;
  context.textBaseline = 'middle';
  if (title) {
    context.fillStyle = style.color;
    context.fillText(title, padding, padding + 8);
  }
  rows.forEach((row, index) => {
    let x = padding;
    const y = padding + titleHeight + lineHeight * (index + 0.5);
    row.forEach(({ text, color }) => {
      context.fillStyle = color;
      context.fillText(text, x, y);
      x += context.measureText(text).width;
    });
  });
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error('图片生成失败，请重试。'));
  }, 'image/png'));
}
