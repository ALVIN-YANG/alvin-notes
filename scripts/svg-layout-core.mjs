// Runs in a real browser. Keep this function self-contained for page.evaluate().
export function checkSvgLayout() {
  const svg = document.querySelector('svg');
  const errors = [];
  if (!svg || !svg.viewBox.baseVal.width || !svg.viewBox.baseVal.height) return ['Missing valid viewBox'];
  const view = svg.viewBox.baseVal;
  const tolerance = 0.5;
  function bounds(element) {
    const box = element.getBBox();
    const matrix = svg.getScreenCTM().inverse().multiply(element.getScreenCTM());
    const points = [[box.x, box.y], [box.x + box.width, box.y],
      [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
      .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
    return { x: Math.min(...points.map(p => p.x)), y: Math.min(...points.map(p => p.y)),
      right: Math.max(...points.map(p => p.x)), bottom: Math.max(...points.map(p => p.y)) };
  }
  function inside(a, b, padding = 0) {
    return a.x >= b.x + padding - tolerance && a.y >= b.y + padding - tolerance
      && a.right <= b.right - padding + tolerance && a.bottom <= b.bottom - padding + tolerance;
  }
  const texts = [...svg.querySelectorAll('text')].filter(e => !e.closest('defs'));
  const boxes = new Map([...svg.querySelectorAll('[data-svg-box]')].map(e => [e.id, e]));
  const measured = [];
  const viewport = { x: view.x, y: view.y, right: view.x + view.width, bottom: view.y + view.height };
  for (const rect of svg.querySelectorAll('rect:not([data-svg-box])')) {
    if (rect.closest('defs')) continue;
    const b = bounds(rect);
    const background = Math.abs(b.x - view.x) < tolerance && Math.abs(b.y - view.y) < tolerance
      && Math.abs(b.right - viewport.right) < tolerance && Math.abs(b.bottom - viewport.bottom) < tolerance;
    if (!background && texts.some(text => {
      const t = bounds(text);
      const center = { x: (t.x + t.right) / 2, right: (t.x + t.right) / 2,
        y: (t.y + t.bottom) / 2, bottom: (t.y + t.bottom) / 2 };
      return inside(center, b);
    })) errors.push('Unmarked text container: add id and data-svg-box to its rectangle');
  }
  for (const shape of svg.querySelectorAll('rect,path,line,circle,ellipse,polygon,polyline')) {
    if (!shape.closest('defs') && !inside(bounds(shape), viewport)) errors.push(`Shape outside viewBox: ${shape.id || shape.tagName}`);
  }
  for (const text of texts) {
    const name = text.textContent.trim().slice(0, 90);
    const box = bounds(text);
    measured.push({ text, box, name });
    if (!inside(box, { x: view.x, y: view.y, right: view.x + view.width, bottom: view.y + view.height })) {
      errors.push(`viewBox overflow: ${name}`);
    }
    const owner = text.getAttribute('data-svg-container');
    if (owner) {
      const container = boxes.get(owner);
      if (!container) { errors.push(`Unknown container ${owner}: ${name}`); continue; }
      const padding = Number(container.getAttribute('data-svg-padding') ?? 16);
      if (!Number.isFinite(padding) || padding < 12) errors.push(`Container ${owner}: padding must be >= 12`);
      else if (!inside(box, bounds(container), padding)) errors.push(`Container ${owner} overflow / padding < ${padding}px: ${name}`);
      // A child card must also fit within any containing outer panel.
      const ancestorBoxes = [...boxes.values()].filter(e => e !== container && inside(bounds(container), bounds(e)));
      if (ancestorBoxes.some(e => !inside(box, bounds(e)))) errors.push(`Outer panel overflow: ${name}`);
    } else if (!text.hasAttribute('data-svg-label')) {
      errors.push(`Text needs data-svg-container or data-svg-label: ${name}`);
    } else if ([...boxes.values()].some(e => {
      const container = bounds(e);
      return Math.min(box.right, container.right) - Math.max(box.x, container.x) > 1
        && Math.min(box.bottom, container.bottom) - Math.max(box.y, container.y) > 1;
    })) {
      errors.push(`Text overlaps a node; node text must declare its container: ${name}`);
    }
  }
  for (let i = 0; i < measured.length; i++) {
    for (const b of measured.slice(i + 1)) {
      const a = measured[i];
      if (Math.min(a.box.right, b.box.right) - Math.max(a.box.x, b.box.x) > 1
        && Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.y, b.box.y) > 1) {
        errors.push(`Text overlap: ${a.name} / ${b.name}`);
      }
    }
  }
  if (svg.querySelector('foreignObject, script, image')) errors.push('Managed diagrams must use native SVG text/shapes, without scripts or external images');
  return errors;
}
