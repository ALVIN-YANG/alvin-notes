import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import mermaid from 'isomorphic-mermaid';

// Mermaid 11 expects this browser API while compiling diagram-level CSS.
// The static renderer already uses JSDOM, so expose its implementation to Node.
globalThis.CSSStyleSheet ??= new JSDOM('').window.CSSStyleSheet;

let renderQueue = Promise.resolve();

function enqueueRender(task) {
  const result = renderQueue.then(task);
  renderQueue = result.catch(() => undefined);
  return result;
}

function collectDiagrams(node, diagrams = []) {
  if (!Array.isArray(node?.children)) return diagrams;

  node.children.forEach((child, index) => {
    if (child.type === 'code' && child.lang === 'mermaid') {
      diagrams.push({ parent: node, index, source: child.value.trim() });
      return;
    }

    collectDiagrams(child, diagrams);
  });

  return diagrams;
}

function diagramId(source, index) {
  const digest = createHash('sha256').update(`${source}:${index}`).digest('hex').slice(0, 12);
  return `mermaid-${digest}`;
}

async function renderDiagrams(diagrams) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    htmlLabels: false,
    fontFamily: "'Sarasa UI SC Web', 'Sarasa UI SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    flowchart: { htmlLabels: false, diagramPadding: 12 },
    theme: 'default',
  });

  const rendered = [];
  for (const [index, diagram] of diagrams.entries()) {
    const { svg } = await mermaid.render(diagramId(diagram.source, index), diagram.source);
    rendered.push(svg);
  }

  return rendered;
}

export default function remarkStaticMermaid() {
  return async (tree, file) => {
    const diagrams = collectDiagrams(tree);
    if (diagrams.length === 0) return;

    let rendered;
    try {
      rendered = await enqueueRender(() => renderDiagrams(diagrams));
    } catch (error) {
      const source = file?.path ?? file?.history?.[0] ?? 'unknown Markdown file';
      throw new Error(`Failed to render Mermaid diagrams in ${source}`, { cause: error });
    }

    diagrams.forEach((diagram, index) => {
      diagram.parent.children[diagram.index] = {
        type: 'html',
        value: [
          '<figure class="mermaid-static" data-mermaid-static aria-label="Mermaid 图表">',
          `<div class="mermaid-static__canvas">${rendered[index]}</div>`,
          '</figure>',
        ].join(''),
      };
    });
  };
}
