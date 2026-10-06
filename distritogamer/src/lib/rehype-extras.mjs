// Tiny rehype plugin (no dependencies):
//  - blockquotes starting with **Tip:** / **Important:** / **Note:** / **Warning:** become <div class="callout ..." role="note"> 
//  - tables are wrapped in a scroll container
//  - absolute external links open in a new tab with safe rel attributes
const KINDS = { tip: 'Tip', important: 'Important', note: 'Note', warning: 'Warning' };

function text(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  return (node.children || []).map(text).join('');
}

function walk(node, parent, index, host, ctx) {
  if (node.type === 'element') {
    if (node.tagName === 'blockquote') {
      const p = node.children.find((c) => c.type === 'element' && c.tagName === 'p');
      const strong = p && p.children.find((c) => c.type === 'element' && c.tagName === 'strong');
      const label = strong ? text(strong).replace(/:\s*$/, '').toLowerCase() : '';
      if (strong && p.children[0] === strong && KINDS[label]) {
        node.tagName = 'div';
        node.properties = { className: ['callout', label], role: 'note' };
      }
    } else if (node.tagName === 'table' && parent) {
      parent.children[index] = { type: 'element', tagName: 'div', properties: { className: ['table-wrap'], role: 'region', ariaLabel: `Scrollable table ${++ctx.tables}`, tabIndex: 0 }, children: [node] };
    } else if (node.tagName === 'a') {
      const href = node.properties && node.properties.href;
      if (typeof href === 'string' && /^https?:\/\//.test(href) && !href.startsWith(host)) {
        node.properties.target = '_blank';
        node.properties.rel = ['noopener', 'noreferrer'];
      }
    }
  }
  (node.children || []).forEach((c, i) => walk(c, node, i, host, ctx));
}

export default function rehypeExtras(options = {}) {
  const host = options.host || 'https://distritogamer.com';
  return (tree) => walk(tree, null, 0, host, { tables: 0 });
}
