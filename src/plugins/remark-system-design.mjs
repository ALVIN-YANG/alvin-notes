import { readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const manifest = JSON.parse(readFileSync(new URL('../../vendor/system-design-primer/manifest.json', import.meta.url), 'utf8'));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const sourceBase = `${manifest.repo}/blob/${manifest.commit}/`;

export default function remarkSystemDesign() {
  return (tree, file) => {
    if (!file.path?.replaceAll('\\', '/').includes('/content/docs/system-design/')) return;
    const fileSlug = file.path.replaceAll('\\', '/').split('/content/docs/system-design/')[1].replace(/\.md$/, '');
    const chapter = [...manifest.chapters, ...manifest.supplements].find(c => c.slug === fileSlug);
    if (!chapter) throw new Error(`Unknown system design chapter: ${file.path}`);
    let headingIndex = 0;
    function mainAnchor(fragment) {
      const id = decodeURIComponent(fragment);
      const target = manifest.anchors[manifest.referenceAliases[id] || id];
      if (!target) throw new Error(`Unknown main-document anchor: ${fragment}`);
      return target;
    }
    function destination(url) {
      if (url.startsWith('/system-design/') || url.startsWith('/images/system-design/')) return url;
      if (url.startsWith('#')) {
        if (chapter.sourcePath) {
          const target = chapter.anchors[decodeURIComponent(url.slice(1))];
          if (!target) throw new Error(`Unknown answer anchor: ${url}`);
          return target;
        }
        return mainAnchor(url.slice(1));
      }
      let sourcePath, fragment = '';
      const external = /^(?:[a-z][\w+.-]*:|\/\/)/i.test(url);
      if (external) {
        const parsed = new URL(url);
        if (parsed.hostname !== 'github.com' || !parsed.pathname.startsWith('/donnemartin/system-design-primer')) return url;
        fragment = parsed.hash.slice(1);
        sourcePath = parsed.pathname.replace(/^\/donnemartin\/system-design-primer\/?/, '').replace(/^blob\/[^/]+\//,'');
      } else {
        const [relative, hash] = url.split('#');
        fragment = hash || '';
        sourcePath = path.posix.normalize(path.posix.join(path.posix.dirname(chapter.sourcePath || 'README-zh-Hans.md'), decodeURIComponent(relative)));
      }
      if (!sourcePath || sourcePath === '.') return fragment ? mainAnchor(fragment) : url;
      if (/^README(?:-zh-Hans)?\.md$/.test(sourcePath)) return fragment ? mainAnchor(fragment) : '/system-design/';
      if (manifest.downloads[sourcePath]) return manifest.downloads[sourcePath].url;
      const target = manifest.solutionPaths[sourcePath];
      if (target) {
        if (!fragment) return target;
        const doc = manifest.supplements.find(s => s.url === target);
        const anchor = doc?.anchors[decodeURIComponent(fragment)];
        if (!anchor) throw new Error(`Unknown answer fragment: ${url}`);
        return anchor;
      }
      if (sourcePath.startsWith('solutions/')) throw new Error(`Unimported answer: ${sourcePath}`);
      if (external) return url;
      return new URL(sourcePath, sourceBase).href + (fragment ? `#${fragment}` : '');
    }
    function imageHtml(src, alt = '') {
      const image = manifest.images[src];
      if (!image) throw new Error(`Unknown Primer image: ${src}`);
      return `<a class="primer-image" href="${escape(image.src)}" data-primer-image aria-label="放大图片：${escape(alt || chapter.title)}" data-astro-prefetch="false"><img src="${escape(image.src)}" alt="${escape(alt)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async" /></a>`;
    }
    function visit(node, parent, index) {
      if (node.type === 'heading') {
        const heading = chapter.headings[headingIndex++];
        if (!heading || heading.depth !== node.depth) throw new Error(`Heading drift in ${chapter.slug}`);
        node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: heading.id } };
      }
      if (node.type === 'text' && node.value.includes('…') && node.position) {
        const original = String(file.value).slice(node.position.start.offset, node.position.end.offset);
        if (original.includes('...')) node.value = node.value.replaceAll('…', '...');
      }
      // Source table cells use literal JSON quotes. Smartypants runs before custom plugins.
      if (node.type === 'text' && parent?.type === 'tableCell') {
        node.value = node.value.replace(/[“”]/g, '"');
      }
      if (node.type === 'link' || node.type === 'definition') node.url = destination(node.url);
      if (node.type === 'image') {
        // The source contains no linked images. Refuse nested interactive markup on future imports.
        if (parent?.type === 'link') throw new Error('Review upstream linked image before importing');
        parent.children[index] = { type: 'html', value: imageHtml(node.url, node.alt) };
      }
      if (node.type === 'html') {
        // Preserve split inline HTML tags. Only complete <img> and URL attributes need adaptation.
        node.value = node.value.replace(/<img\b[^>]*>/gi, tag => {
          const img = JSDOM.fragment(tag).querySelector('img');
          return imageHtml(img.getAttribute('src'), img.getAttribute('alt') || '');
        }).replace(/\bhref=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g, (attribute, double, single, bare) => {
          const url = double ?? single ?? bare;
          // Generated image links already point to a local asset.
          return `href="${escape(url.startsWith('/images/system-design/') ? url : destination(url))}"`;
        });
      }
      node.children?.forEach((child, i) => visit(child, node, i));
    }
    visit(tree);
    if (headingIndex !== chapter.headings.length) throw new Error(`Missing headings in ${chapter.slug}`);
  };
}
