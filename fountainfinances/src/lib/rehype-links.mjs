/** Open external links in a new tab safely and wrap tables for horizontal scrolling on mobile. */
export default function rehypeLinks() {
  return (tree) => {
    const walk = (node, parent) => {
      if (node.type === 'element') {
        if (node.tagName === 'a' && typeof node.properties?.href === 'string' && /^https?:\/\//.test(node.properties.href)) {
          node.properties.target = '_blank';
          node.properties.rel = ['noopener'];
        }
        if (node.tagName === 'table' && parent && !(parent.properties?.className || []).includes('table-scroll')) {
          const idx = parent.children.indexOf(node);
          parent.children[idx] = { type: 'element', tagName: 'div', properties: { className: ['table-scroll'] }, children: [node] };
          node.children?.forEach((c) => walk(c, node));
          return;
        }
      }
      if (node.children) [...node.children].forEach((c) => walk(c, node));
    };
    walk(tree, null);
  };
}
